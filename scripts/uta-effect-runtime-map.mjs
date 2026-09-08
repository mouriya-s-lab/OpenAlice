import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const mapDirectory = resolve(repoRoot, 'docs/uta-effect-runtime-mapping')
const manifestPath = join(mapDirectory, 'mapping.json')
const coveragePath = join(mapDirectory, 'coverage.md')
const checkOnly = process.argv.includes('--check')

const STATUS_LABELS = new Map([
  ['equivalent', '已有等价能力'],
  ['partial', '部分存在'],
  ['missing', '缺失'],
  ['incompatible', '架构不适配'],
  ['retain-boundary', '保留在边界'],
  ['delete-legacy', '删除旧权威'],
  ['evidence-only', '仅验证证据'],
])

function fail(message) {
  throw new Error(`[uta-effect-runtime-map] ${message}`)
}

function asPosix(path) {
  return path.split(sep).join('/')
}

function escapeCell(value) {
  const text = Array.isArray(value) ? value.join('；') : String(value ?? '')
  return text.replaceAll('|', '\\|').replaceAll('\n', '<br>') || '—'
}

function slugify(value) {
  return value
    .toLowerCase()
    .replaceAll(/`/g, '')
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '')
}

function entryId(entry) {
  const identity = `${entry.path}:${entry.start}-${entry.end}:${entry.symbol}`
  return `MAP-${createHash('sha256').update(identity).digest('hex').slice(0, 10).toUpperCase()}`
}

async function discoverTypeScriptFiles(rootPath) {
  const absoluteRoot = resolve(repoRoot, rootPath)
  if (!existsSync(absoluteRoot)) fail(`scope root does not exist: ${rootPath}`)

  const found = []
  async function walk(directory) {
    const children = await readdir(directory, { withFileTypes: true })
    for (const child of children) {
      const absolute = join(directory, child.name)
      if (child.isDirectory()) {
        await walk(absolute)
      } else if (child.isFile() && child.name.endsWith('.ts') && !child.name.endsWith('.d.ts')) {
        found.push(asPosix(relative(repoRoot, absolute)))
      }
    }
  }
  await walk(absoluteRoot)
  return found
}

async function discoverScope(scopeRoots) {
  const files = new Set()
  for (const rootPath of scopeRoots) {
    if (rootPath === 'packages/uta-broker-*/src') {
      const packages = await readdir(resolve(repoRoot, 'packages'), { withFileTypes: true })
      for (const entry of packages) {
        if (!entry.isDirectory() || !entry.name.startsWith('uta-broker-')) continue
        const brokerRoot = `packages/${entry.name}/src`
        for (const path of await discoverTypeScriptFiles(brokerRoot)) files.add(path)
      }
      continue
    }
    for (const path of await discoverTypeScriptFiles(rootPath)) files.add(path)
  }
  return [...files].sort()
}

function parseChapters(architectureText) {
  const lines = (architectureText.endsWith('\n') ? architectureText.slice(0, -1) : architectureText).split('\n')
  const headings = []
  for (let index = 0; index < lines.length; index += 1) {
    const match = /^## (\d+)\. (.+)$/.exec(lines[index])
    if (match) headings.push({ number: Number(match[1]), title: match[2], start: index + 1 })
  }
  const chapters = headings.map((heading, index) => ({
    ...heading,
    end: index + 1 < headings.length ? headings[index + 1].start - 1 : lines.length,
    slug: slugify(heading.title),
  }))
  const expected = Array.from({ length: 20 }, (_, index) => index + 1)
  if (JSON.stringify(chapters.map(({ number }) => number)) !== JSON.stringify(expected)) {
    fail(`architecture must contain top-level chapters 1-20; found ${chapters.map(({ number }) => number).join(', ')}`)
  }
  return chapters
}

async function validateSourceReferences(source, label, lineCountCache) {
  const references = source.split(';').map((part) => part.trim()).filter(Boolean)
  if (references.length === 0) fail(`${label}: no source references`)
  for (const reference of references) {
    const match = /^(.+):(\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*)$/.exec(reference)
    if (!match) fail(`${label}: invalid source reference ${reference}`)
    const [, path, rangesText] = match
    let lineCount = lineCountCache.get(path)
    if (lineCount === undefined) {
      const absolutePath = resolve(repoRoot, path)
      if (!existsSync(absolutePath)) fail(`${label}: source path does not exist: ${path}`)
      const text = await readFile(absolutePath, 'utf8')
      lineCount = text.split('\n').length - (text.endsWith('\n') ? 1 : 0)
      lineCountCache.set(path, lineCount)
    }
    for (const rangeText of rangesText.split(',')) {
      const [startText, endText = startText] = rangeText.split('-')
      const start = Number(startText)
      const end = Number(endText)
      if (start < 1 || end < start || end > lineCount) {
        fail(`${label}: source range ${path}:${rangeText} exceeds 1-${lineCount}`)
      }
    }
  }
}

function classify(path) {
  return path.includes('.spec.') || path.includes('.e2e.') || path.includes('/__test__/') || path.includes('/__tests__/')
    ? 'test'
    : 'production'
}

function unionLength(ranges) {
  if (ranges.length === 0) return 0
  const sorted = ranges.toSorted((left, right) => left.start - right.start || left.end - right.end)
  let total = 0
  let currentStart = sorted[0].start
  let currentEnd = sorted[0].end
  for (const range of sorted.slice(1)) {
    if (range.start <= currentEnd + 1) {
      currentEnd = Math.max(currentEnd, range.end)
    } else {
      total += currentEnd - currentStart + 1
      currentStart = range.start
      currentEnd = range.end
    }
  }
  return total + currentEnd - currentStart + 1
}

function uncoveredRanges(lineCount, ranges) {
  const covered = new Uint8Array(lineCount + 1)
  for (const { start, end } of ranges) covered.fill(1, start, end + 1)
  const result = []
  let start
  for (let line = 1; line <= lineCount + 1; line += 1) {
    if (line <= lineCount && covered[line] === 0 && start === undefined) start = line
    if ((line > lineCount || covered[line] === 1) && start !== undefined) {
      result.push(start === line - 1 ? `${start}` : `${start}-${line - 1}`)
      start = undefined
    }
  }
  return result
}

function validateEntry(entry, file, chapterNumbers) {
  const requiredStrings = ['symbol', 'behavior', 'replacement', 'gap', 'requiredChange', 'evidenceRole', 'status']
  for (const key of requiredStrings) {
    if (typeof entry[key] !== 'string') fail(`${file.path}: entry ${entry.start}-${entry.end} has invalid ${key}`)
  }
  if (!Number.isInteger(entry.start) || !Number.isInteger(entry.end) || entry.start < 1 || entry.end < entry.start || entry.end > file.lineCount) {
    fail(`${file.path}: invalid range ${entry.start}-${entry.end} for ${file.lineCount} lines`)
  }
  if (!STATUS_LABELS.has(entry.status)) fail(`${file.path}:${entry.start}-${entry.end}: invalid status ${entry.status}`)
  if (!['implementation', 'test', 'barrel', 'boundary'].includes(entry.evidenceRole)) {
    fail(`${file.path}:${entry.start}-${entry.end}: invalid evidenceRole ${entry.evidenceRole}`)
  }
  for (const key of ['targetChapters', 'targetSections', 'targetAbstractions']) {
    if (!Array.isArray(entry[key]) || entry[key].length === 0) fail(`${file.path}:${entry.start}-${entry.end}: ${key} must be nonempty`)
  }
  for (const chapter of entry.targetChapters) {
    if (!chapterNumbers.has(chapter)) fail(`${file.path}:${entry.start}-${entry.end}: unknown chapter ${chapter}`)
  }
  for (const section of entry.targetSections) {
    const match = /^§?(\d+)(?:\.|\s)/.exec(section)
    if (match && chapterNumbers.has(Number(match[1])) && !entry.targetChapters.includes(Number(match[1]))) {
      fail(`${file.path}:${entry.start}-${entry.end}: target section ${section} requires chapter ${match[1]}`)
    }
  }
  if (['partial', 'missing', 'incompatible'].includes(entry.status) && (!entry.gap.trim() || !entry.requiredChange.trim())) {
    fail(`${file.path}:${entry.start}-${entry.end}: ${entry.status} requires gap and requiredChange`)
  }
}

function duplicateGroups(entries) {
  const occurrencesByPath = new Map()
  for (const entry of entries) {
    for (const chapter of entry.targetChapters) {
      const occurrence = { entry, chapter }
      const occurrences = occurrencesByPath.get(entry.path) ?? []
      occurrences.push(occurrence)
      occurrencesByPath.set(entry.path, occurrences)
    }
  }

  const connections = []
  for (const occurrences of occurrencesByPath.values()) {
    for (let left = 0; left < occurrences.length; left += 1) {
      for (let right = left + 1; right < occurrences.length; right += 1) {
        const a = occurrences[left]
        const b = occurrences[right]
        if (a.chapter === b.chapter) continue
        const overlapStart = Math.max(a.entry.start, b.entry.start)
        const overlapEnd = Math.min(a.entry.end, b.entry.end)
        if (overlapStart <= overlapEnd) connections.push({ a, b, overlapStart, overlapEnd })
      }
    }
  }

  const parent = new Map()
  const keyOf = ({ entry, chapter }) => `${entry.id}@${chapter}`
  function find(key) {
    if (!parent.has(key)) parent.set(key, key)
    const current = parent.get(key)
    if (current !== key) parent.set(key, find(current))
    return parent.get(key)
  }
  function union(left, right) {
    const a = find(left)
    const b = find(right)
    if (a !== b) parent.set(b, a)
  }
  for (const { a, b } of connections) union(keyOf(a), keyOf(b))

  const grouped = new Map()
  for (const connection of connections) {
    const root = find(keyOf(connection.a))
    const group = grouped.get(root) ?? { occurrences: new Map(), intersections: [] }
    group.occurrences.set(keyOf(connection.a), connection.a)
    group.occurrences.set(keyOf(connection.b), connection.b)
    group.intersections.push({ start: connection.overlapStart, end: connection.overlapEnd })
    grouped.set(root, group)
  }

  const sortedGroups = [...grouped.values()].toSorted((left, right) => {
    const a = [...left.occurrences.values()][0]
    const b = [...right.occurrences.values()][0]
    return a.entry.path.localeCompare(b.entry.path) || a.entry.start - b.entry.start
  })
  const markerByOccurrence = new Map()
  const groups = sortedGroups.map((group, index) => {
    const marker = `DUP-${String(index + 1).padStart(3, '0')}`
    const occurrences = [...group.occurrences.values()].toSorted((left, right) => left.chapter - right.chapter || left.entry.start - right.entry.start)
    for (const occurrence of occurrences) markerByOccurrence.set(keyOf(occurrence), marker)
    return { marker, occurrences, intersections: group.intersections }
  })
  return { groups, markerByOccurrence }
}

function metric(files, kind = undefined) {
  const selected = kind ? files.filter((file) => file.kind === kind) : files
  const totalLines = selected.reduce((sum, file) => sum + file.lineCount, 0)
  const mappedLines = selected.reduce((sum, file) => sum + file.mappedLines, 0)
  const mappedFiles = selected.filter((file) => file.entries.length > 0).length
  return {
    files: selected.length,
    mappedFiles,
    filePercent: selected.length === 0 ? 100 : (mappedFiles / selected.length) * 100,
    totalLines,
    mappedLines,
    linePercent: totalLines === 0 ? 100 : (mappedLines / totalLines) * 100,
  }
}

function renderRelationshipDiagram(chapterEntries, chapterNotes) {
  const lines = ['flowchart LR', `  Legacy["旧 UTA：${chapterEntries.length} 个源码行为块"]`]
  for (const [index, [status, label]] of [...STATUS_LABELS].entries()) {
    const matching = chapterEntries.filter((entry) => entry.status === status)
    if (matching.length === 0) continue
    const targets = new Map()
    for (const entry of matching) {
      for (const target of entry.targetAbstractions) {
        targets.set(target, (targets.get(target) ?? 0) + 1)
      }
    }
    const topTargets = [...targets]
      .toSorted((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 3)
      .map(([target]) => target.replaceAll('"', "'").replaceAll('`', ''))
      .join('<br/>')
    lines.push(`  Legacy -->|${label}| Status${index}["${label}：${matching.length}"]`)
    lines.push(`  Status${index} --> Target${index}["主要新抽象<br/>${topTargets}"]`)
  }
  if (chapterNotes.length > 0) {
    lines.push(`  Architecture["目标架构"] -->|当前源码无完整实现| TargetOnly["章节级缺口：${chapterNotes.length}"]`)
  }
  return lines.join('\n')
}

function renderChapterNotes(notes) {
  if (notes.length === 0) return '本章没有独立于源码行映射的目标级缺口。'
  const rows = notes.map((note) =>
    `| ${escapeCell(note.source)} | ${escapeCell(note.obligation)} | ${escapeCell(note.gap)} | ${escapeCell(note.requiredChange)} |`,
  )
  return `| 依据 | 目标义务 | 当前缺口 | 必须补充或调整 |
|---|---|---|---|
${rows.join('\n')}`
}

function renderChapter(chapter, entries, markerByOccurrence, architecturePath, chapterNotes) {
  const chapterEntries = entries.filter((entry) => entry.targetChapters.includes(chapter.number))
  const rows = chapterEntries
    .toSorted((left, right) => left.path.localeCompare(right.path) || left.start - right.start || left.end - right.end)
    .map((entry) => {
      const source = `[\`${entry.path}:${entry.start}-${entry.end}\`](../../${entry.path}#L${entry.start}-L${entry.end})`
      const marker = markerByOccurrence.get(`${entry.id}@${chapter.number}`) ?? '—'
      const target = `${escapeCell(entry.targetSections)}<br>${escapeCell(entry.targetAbstractions)}<br>${escapeCell(entry.replacement)}`
      const mismatch = entry.gap ? escapeCell(entry.gap) : '—'
      const change = entry.requiredChange ? escapeCell(entry.requiredChange) : '—'
      return `| \`${entry.id}\` | ${source} | ${escapeCell(entry.symbol)} | ${escapeCell(entry.behavior)} | ${STATUS_LABELS.get(entry.status)} | ${target} | ${mismatch} | ${change} | ${marker === '—' ? marker : `**${marker}**`} |`
    })

  const statusCounts = new Map()
  for (const entry of chapterEntries) {
    statusCounts.set(entry.status, (statusCounts.get(entry.status) ?? 0) + 1)
  }
  const summary = [...STATUS_LABELS]
    .filter(([status]) => statusCounts.has(status))
    .map(([status, label]) => `${label} ${statusCounts.get(status)}`)
    .join('；') || '本章没有当前源码映射。'

  return `<!-- Auto-generated by scripts/uta-effect-runtime-map.mjs from mapping.json. Do not edit by hand. -->
<!-- Regenerate with \`node scripts/uta-effect-runtime-map.mjs\`. -->

# UTA 功能替代关系：第 ${chapter.number} 章 ${chapter.title}

目标架构原文：[\`${architecturePath}:${chapter.start}-${chapter.end}\`](../uta-effect-runtime-architecture.md#L${chapter.start}-L${chapter.end})。

## 结论

${summary}。状态只描述当前实现相对于目标架构的关系，不表示迁移已经落地。

## 替代关系图

\`\`\`mermaid
${renderRelationshipDiagram(chapterEntries, chapterNotes)}
\`\`\`

## 章节级目标缺口

${renderChapterNotes(chapterNotes)}

## 源码映射

| 映射 ID | 当前源码 | 符号或行为块 | 当前功能 | 替代状态 | 新 UTA 抽象与做法 | 不适配位置与原因 | 必须补充或调整 | 重复索引 |
|---|---|---|---|---|---|---|---|---|
${rows.length > 0 ? rows.join('\n') : '| — | — | — | 本章没有当前实现 | 缺失 | 按目标架构从首个可执行切片建立 | 当前代码没有可替代实现 | 以架构验证契约驱动新增 | — |'}

## 重复索引说明

\`DUP-*\` 表示同一源码行范围也被其他章节引用。重复是跨架构关注点，不计入覆盖率两次；完整交叉表见 [覆盖率与重复索引报告](coverage.md)。
`
}

function renderCoverage(scopeRoots, files, duplicates, architecturePath, chapters) {
  const metrics = [
    ['全部', metric(files)],
    ['生产代码', metric(files, 'production')],
    ['测试与验收代码', metric(files, 'test')],
  ]
  const metricRows = metrics.map(([label, value]) =>
    `| ${label} | ${value.mappedFiles}/${value.files} | ${value.filePercent.toFixed(2)}% | ${value.mappedLines}/${value.totalLines} | ${value.linePercent.toFixed(2)}% |`,
  )
  const fileRows = files.map((file) => {
    const uncovered = uncoveredRanges(file.lineCount, file.entries)
    return `| [\`${file.path}\`](../../${file.path}) | ${file.kind === 'test' ? '测试/验收' : '生产'} | ${file.entries.length} | ${file.mappedLines}/${file.lineCount} | ${file.linePercent.toFixed(2)}% | ${uncovered.length > 0 ? escapeCell(uncovered.join(', ')) : '—'} |`
  })
  const duplicateRows = duplicates.groups.map((group) => {
    const occurrences = group.occurrences.map(({ entry, chapter }) => `第 ${chapter} 章 \`${entry.id}\` [${entry.path}:${entry.start}-${entry.end}](../../${entry.path}#L${entry.start}-L${entry.end})`)
    const intersections = [...new Set(group.intersections.map(({ start, end }) => start === end ? `${start}` : `${start}-${end}`))]
    return `| **${group.marker}** | ${escapeCell(group.occurrences[0].entry.path)} | ${escapeCell(intersections)} | ${escapeCell(occurrences)} |`
  })
  const chapterRows = chapters.map((chapter) => {
    const filename = `${String(chapter.number).padStart(2, '0')}-${chapter.slug}.md`
    return `- [第 ${chapter.number} 章 ${chapter.title}](${filename})`
  })

  return `<!-- Auto-generated by scripts/uta-effect-runtime-map.mjs from mapping.json. Do not edit by hand. -->
<!-- Regenerate with \`node scripts/uta-effect-runtime-map.mjs\`; verify with \`node scripts/uta-effect-runtime-map.mjs --check\`. -->

# UTA Effect Runtime 映射覆盖率与重复索引

架构基线：[\`${architecturePath}\`](../uta-effect-runtime-architecture.md)。覆盖率是源码物理行的区间并集；空行、import、注释和生成式样板仍在分母中。重复区间只计算一次。

## 审计范围

${scopeRoots.map((root) => `- \`${root}\``).join('\n')}

` +
  `\`packages/ibkr\` 是下层 IBKR SDK，不是旧 UTA 运行时；仅通过 UTA adapter 的调用范围评估。Alice 其他消费者通过上述 SDK/supervisor 边界评估，不把整个 Alice 进程计入覆盖率。

## 分章替代映射

${chapterRows.join('\n')}

## 汇总

| 范围 | 已映射文件 | 文件覆盖率 | 唯一映射行 | 物理行覆盖率 |
|---|---:|---:|---:|---:|
${metricRows.join('\n')}

## 每文件覆盖率

| 源码 | 类别 | 映射块 | 唯一映射行 | 行覆盖率 | 未映射物理行 |
|---|---|---:|---:|---:|---|
${fileRows.join('\n')}

## 重复索引

重复索引定义为同一源码文件的行区间被两个或更多架构章节交叉引用。重叠连通分量共享一个 \`DUP-*\` 标记；各章节文档在对应行显示同一标记。

| 标记 | 源码 | 交叉行 | 章节与映射 |
|---|---|---|---|
${duplicateRows.length > 0 ? duplicateRows.join('\n') : '| — | — | — | 没有跨章节重复索引 |'}
`
}

async function writeOrCheck(path, content, stale) {
  if (checkOnly) {
    const current = existsSync(path) ? await readFile(path, 'utf8') : undefined
    if (current !== content) stale.push(asPosix(relative(repoRoot, path)))
    return
  }
  await writeFile(path, content)
}

async function main() {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  if (!Array.isArray(manifest.scopeRoots) || manifest.scopeRoots.length === 0) fail('mapping.json scopeRoots must be nonempty')
  if (!Array.isArray(manifest.files)) fail('mapping.json files must be an array')
  const chapterNotes = manifest.chapterNotes ?? []
  if (!Array.isArray(chapterNotes)) fail('mapping.json chapterNotes must be an array')
  const architecturePath = manifest.architecture ?? 'docs/uta-effect-runtime-architecture.md'
  const architectureText = await readFile(resolve(repoRoot, architecturePath), 'utf8')
  const chapters = parseChapters(architectureText)
  const chapterNumbers = new Set(chapters.map(({ number }) => number))
  const sourceLineCounts = new Map([[architecturePath, architectureText.split('\n').length - (architectureText.endsWith('\n') ? 1 : 0)]])
  for (const [index, note] of chapterNotes.entries()) {
    if (!chapterNumbers.has(note.chapter)) fail(`chapterNotes[${index}]: unknown chapter ${note.chapter}`)
    for (const field of ['source', 'obligation', 'gap', 'requiredChange']) {
      if (typeof note[field] !== 'string' || note[field].trim() === '') {
        fail(`chapterNotes[${index}].${field}: must be a nonempty string`)
      }
    }
    await validateSourceReferences(note.source, `chapterNotes[${index}].source`, sourceLineCounts)
  }
  const discovered = await discoverScope(manifest.scopeRoots)
  const manifestPaths = manifest.files.map(({ path }) => path).toSorted()
  if (JSON.stringify(discovered) !== JSON.stringify(manifestPaths)) {
    const discoveredSet = new Set(discovered)
    const manifestSet = new Set(manifestPaths)
    const missing = discovered.filter((path) => !manifestSet.has(path))
    const stale = manifestPaths.filter((path) => !discoveredSet.has(path))
    fail(`scope mismatch; missing mappings: ${missing.join(', ') || 'none'}; stale mappings: ${stale.join(', ') || 'none'}`)
  }

  const files = []
  const entries = []
  for (const file of manifest.files) {
    const sourceText = await readFile(resolve(repoRoot, file.path), 'utf8')
    const lineCount = sourceText.split('\n').length - (sourceText.endsWith('\n') ? 1 : 0)
    if (file.lineCount !== lineCount) fail(`${file.path}: recorded lineCount ${file.lineCount}, current ${lineCount}`)
    if (!Array.isArray(file.entries) || file.entries.length === 0) fail(`${file.path}: no mapping entries`)
    if (file.lineCount >= 100 && file.entries.length < 2) {
      fail(`${file.path}: ${file.lineCount} lines cannot be represented by one coarse mapping entry`)
    }
    for (const rawEntry of file.entries) {
      validateEntry(rawEntry, file, chapterNumbers)
      const entry = { ...rawEntry, path: file.path, id: entryId({ ...rawEntry, path: file.path }) }
      entries.push(entry)
    }
    const ranges = file.entries.map(({ start, end }) => ({ start, end }))
    const mappedLines = unionLength(ranges)
    files.push({
      ...file,
      entries: ranges,
      kind: classify(file.path),
      mappedLines,
      linePercent: lineCount === 0 ? 100 : (mappedLines / lineCount) * 100,
    })
  }

  const entryIds = new Set()
  for (const entry of entries) {
    if (entryIds.has(entry.id)) fail(`duplicate mapping identity: ${entry.id} (${entry.path}:${entry.start}-${entry.end} ${entry.symbol})`)
    entryIds.add(entry.id)
  }

  const duplicates = duplicateGroups(entries)
  await mkdir(mapDirectory, { recursive: true })
  const stale = []
  for (const chapter of chapters) {
    const filename = `${String(chapter.number).padStart(2, '0')}-${chapter.slug}.md`
    const notes = chapterNotes.filter((note) => note.chapter === chapter.number)
    await writeOrCheck(join(mapDirectory, filename), renderChapter(chapter, entries, duplicates.markerByOccurrence, architecturePath, notes), stale)
  }
  await writeOrCheck(coveragePath, renderCoverage(manifest.scopeRoots, files, duplicates, architecturePath, chapters), stale)
  if (stale.length > 0) fail(`generated files are stale: ${stale.join(', ')}`)

  const all = metric(files)
  console.log(JSON.stringify({
    mode: checkOnly ? 'check' : 'write',
    chapters: chapters.length,
    files: all.files,
    mappedFiles: all.mappedFiles,
    fileCoveragePercent: Number(all.filePercent.toFixed(2)),
    totalLines: all.totalLines,
    mappedLines: all.mappedLines,
    lineCoveragePercent: Number(all.linePercent.toFixed(2)),
    duplicateGroups: duplicates.groups.length,
  }, null, 2))
}

await main()
