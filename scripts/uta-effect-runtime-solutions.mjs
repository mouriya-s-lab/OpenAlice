import { createHash } from 'node:crypto'
import { execFile as execFileCallback } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const solutionsDir = join(repoRoot, 'docs/uta-effect-runtime-design/solutions')
const ownershipPath = join(solutionsDir, 'ownership.json')
const mappingPath = join(repoRoot, 'docs/uta-effect-runtime-mapping/mapping.json')
const compositionContractPath = join(solutionsDir, 'composition-contract.md')
const indexPath = join(solutionsDir, 'index.md')
const coveragePath = join(solutionsDir, 'coverage.json')
const execFile = promisify(execFileCallback)

const designBasis = 'capability-composition-v1'
const compositionContractAnchorIds = new Set([
  'K01', 'K02', 'K03', 'K04', 'K05', 'K06',
  'K07', 'K08', 'K09', 'K10', 'K11', 'K12',
])
const architecturePath = 'docs/uta-effect-runtime-architecture.md'
const investigationArchitectureBaseline = {
  repository: 'mouriya-s-lab/OpenAlice',
  revision: 'a5f23756531cc552b7e12b6d655ae1ffbcd28b64',
  files: {
    en: {
      path: architecturePath,
      blob: 'aa4b47c7bc8e0678a7c89134306dc0219ad489c5',
      sha256: '77df9a168f1ec71b5610f42f0cc10d8494fd47010f86426d5f906ee01a584ee6',
      lineCount: 1505,
    },
    zhCN: {
      path: 'docs/uta-effect-runtime-architecture.zh-CN.md',
      blob: 'e5d37d7fc8bea2eade62a96ca4fe930b77329988',
      sha256: '2ba6f1fa00b7a12954107f308b5677e6d23be892d8eb5aecda35ce3ae1fceeba',
      lineCount: 1305,
    },
  },
}

const args = process.argv.slice(2)
const allowedFlags = new Set(['--check', '--reviewed', '--help', '-h'])
for (const arg of args) {
  if (!allowedFlags.has(arg)) throw new Error(`[uta-effect-runtime-solutions] unknown flag ${arg}`)
}
const checkOnly = args.includes('--check')
const reviewedOnly = args.includes('--reviewed')
const helpWanted = args.includes('--help') || args.includes('-h')
const usage = `uta-effect-runtime-solutions: render substantive manual solutions (no generic text)

usage:
  node scripts/uta-effect-runtime-solutions.mjs [--check] [--reviewed]

  default           validate inputs, then write solutions/index.md,
                    solutions/coverage.json and solutions/<Group>/entries.md
  --check           validate inputs, then byte-compare generated files without writes
  --reviewed        additionally require an exact-current-hash accepted review for every entry
                    (blocked-on-evidence remains separately reported and is not done)
`
if (helpWanted) {
  console.log(usage)
  process.exit(0)
}

const allowedAssessments = new Set(['designed', 'blocked-on-evidence'])
const allowedVerdicts = new Set(['accepted', 'changes-required'])
const allowedDispositions = new Set(['retained', 'reframed'])
const entryStringFields = ['currentBehavior', 'problem', 'targetModel', 'effectBoundary', 'durability']
const entryArrayFields = ['sourceEvidence', 'pureTransitions', 'errors', 'preservedBehavior', 'replacementSteps', 'verificationCases', 'openQuestions']
const requiredEntryArrays = new Set(['sourceEvidence', 'preservedBehavior', 'replacementSteps', 'verificationCases'])


function fail(message) {
  throw new Error(`[uta-effect-runtime-solutions] ${message}`)
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isNonemptyString(value) {
  return typeof value === 'string' && value.trim() !== ''
}

function asPosix(path) {
  return path.split(sep).join('/')
}

function repoRelative(path) {
  return asPosix(relative(repoRoot, path))
}

function sha256Hex(value) {
  return createHash('sha256').update(value).digest('hex')
}

function entryId(entry) {
  const identity = `${entry.path}:${entry.start}-${entry.end}:${entry.symbol}`
  return `MAP-${sha256Hex(identity).slice(0, 10).toUpperCase()}`
}

function parseJson(raw, label) {
  try {
    return JSON.parse(raw.toString('utf8'))
  } catch {
    fail(`${label} is not valid JSON`)
  }
}

async function readRequired(path, label) {
  try {
    return await readFile(path)
  } catch (error) {
    if (error?.code === 'ENOENT') fail(`${label} missing at ${repoRelative(path)}`)
    throw error
  }
}

async function readOptional(path) {
  try {
    return await readFile(path)
  } catch (error) {
    if (error?.code === 'ENOENT') return undefined
    throw error
  }
}

function validateArchitectureBaseline(value) {
  if (!isRecord(value)) fail('investigation architecture baseline must be an object')
  const { repository, revision, files } = value
  if (repository !== 'mouriya-s-lab/OpenAlice') {
    fail('architectureBaseline.repository must be mouriya-s-lab/OpenAlice')
  }
  if (!/^[0-9a-f]{40}$/.test(revision ?? '')) {
    fail('architectureBaseline.revision must be a lowercase 40-character Git commit')
  }
  if (!isRecord(files)) fail('architectureBaseline.files must be an object')

  const validatedFiles = {}
  for (const key of ['en', 'zhCN']) {
    const file = files[key]
    if (!isRecord(file)) fail(`architectureBaseline.files.${key} must be an object`)
    for (const field of ['path', 'blob', 'sha256']) {
      if (!isNonemptyString(file[field])) {
        fail(`architectureBaseline.files.${key}.${field} must be a nonempty string`)
      }
    }
    if (key === 'en' && file.path !== architecturePath) {
      fail(`architectureBaseline.files.en.path must equal architecture ${architecturePath}`)
    }
    if (!/^[0-9a-f]{40}$/.test(file.blob)) {
      fail(`architectureBaseline.files.${key}.blob must be a lowercase 40-character Git blob id`)
    }
    if (!/^[0-9a-f]{64}$/.test(file.sha256)) {
      fail(`architectureBaseline.files.${key}.sha256 must be a lowercase SHA256`)
    }
    if (!Number.isSafeInteger(file.lineCount) || file.lineCount < 1) {
      fail(`architectureBaseline.files.${key}.lineCount must be a positive integer`)
    }
    validatedFiles[key] = {
      path: file.path,
      blob: file.blob,
      sha256: file.sha256,
      lineCount: file.lineCount,
    }
  }
  return { repository, revision, files: validatedFiles }
}

async function readGitText(args, label) {
  try {
    const { stdout } = await execFile('git', ['-C', repoRoot, ...args], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    })
    return stdout
  } catch (error) {
    const detail = typeof error?.stderr === 'string' && error.stderr.trim() !== ''
      ? error.stderr.trim()
      : error?.message ?? 'unknown git error'
    fail(`${label}: ${detail}`)
  }
}

async function readGitBlob(args, label) {
  try {
    const { stdout } = await execFile('git', ['-C', repoRoot, ...args], {
      encoding: null,
      maxBuffer: 32 * 1024 * 1024,
    })
    return stdout
  } catch (error) {
    const detail = typeof error?.stderr === 'string' && error.stderr.trim() !== ''
      ? error.stderr.trim()
      : error?.message ?? 'unknown git error'
    fail(`${label}: ${detail}`)
  }
}

function countLines(text) {
  return text.split('\n').length - (text.endsWith('\n') ? 1 : 0)
}

async function loadArchitectureBaseline(metadata) {
  const files = {}
  for (const key of ['en', 'zhCN']) {
    const file = metadata.files[key]
    const objectName = `${metadata.revision}:${file.path}`
    const objectType = (await readGitText(
      ['cat-file', '-t', objectName],
      `architectureBaseline.files.${key}`,
    )).trim()
    if (objectType !== 'blob') {
      fail(`architectureBaseline.files.${key}.path does not resolve to a Git blob`)
    }
    const actualBlob = (await readGitText(
      ['rev-parse', '--verify', objectName],
      `architectureBaseline.files.${key}`,
    )).trim()
    if (actualBlob !== file.blob) {
      fail(`architectureBaseline.files.${key}.blob mismatch: metadata ${file.blob}, Git ${actualBlob}`)
    }
    const bytes = await readGitBlob(
      ['cat-file', 'blob', objectName],
      `architectureBaseline.files.${key}`,
    )
    const actualSha256 = sha256Hex(bytes)
    if (actualSha256 !== file.sha256) {
      fail(`architectureBaseline.files.${key}.sha256 mismatch: metadata ${file.sha256}, Git ${actualSha256}`)
    }
    const actualLineCount = countLines(bytes.toString('utf8'))
    if (actualLineCount !== file.lineCount) {
      fail(`architectureBaseline.files.${key}.lineCount mismatch: metadata ${file.lineCount}, Git ${actualLineCount}`)
    }
    files[key] = { ...file, bytes }
  }
  return { ...metadata, files }
}

function validateStringArray(value, label, nonempty) {
  if (!Array.isArray(value) || (nonempty && value.length === 0)) {
    fail(`${label} must be an ${nonempty ? 'nonempty ' : ''}array`)
  }
  for (const [index, item] of value.entries()) {
    if (!isNonemptyString(item)) fail(`${label}[${index}] must be a nonempty string`)
  }
  return value
}

function requireExactSet(label, expected, actual) {
  const missing = [...expected].filter((id) => !actual.has(id)).sort()
  const extra = [...actual].filter((id) => !expected.has(id)).sort()
  if (missing.length || extra.length) {
    fail(`${label} mismatch. missing (${missing.length}): ${missing.join(', ') || '—'}; extra (${extra.length}): ${extra.join(', ') || '—'}`)
  }
}

function parseCompositionContractAnchors(raw) {
  const headings = [...raw.toString('utf8').matchAll(/^##[ \t]+(K(?:0[1-9]|1[0-2]))(?:[ \t]+|$)[^\r\n]*$/gm)]
  const anchors = headings.map((match) => match[1])
  if (anchors.length !== compositionContractAnchorIds.size || new Set(anchors).size !== anchors.length) {
    fail('composition-contract.md must contain exactly one heading for each K01-K12 anchor')
  }
  requireExactSet('composition contract K01-K12 heading set', compositionContractAnchorIds, new Set(anchors))
  return new Set(anchors)
}


function buildCanonical(manifest) {
  if (!isRecord(manifest)) fail('mapping.json must contain an object')
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) fail('mapping.json files must be a nonempty array')
  if (!Array.isArray(manifest.chapterNotes)) fail('mapping.json chapterNotes must be an array')
  const architectureBaseline = validateArchitectureBaseline(investigationArchitectureBaseline)

  const maps = new Map()
  const sourceFiles = new Set()
  let rawOccurrences = 0
  let uniqueOccurrences = 0
  for (const [fileIndex, file] of manifest.files.entries()) {
    if (!isRecord(file) || !isNonemptyString(file.path)) fail(`mapping.json files[${fileIndex}].path must be a nonempty string`)
    if (sourceFiles.has(file.path)) fail(`mapping.json duplicate source file ${file.path}`)
    sourceFiles.add(file.path)
    if (!Array.isArray(file.entries) || file.entries.length === 0) fail(`${file.path}: entries must be a nonempty array`)
    for (const [entryIndex, rawEntry] of file.entries.entries()) {
      if (!isRecord(rawEntry)) fail(`${file.path}: entries[${entryIndex}] must be an object`)
      if (!Number.isSafeInteger(rawEntry.start) || !Number.isSafeInteger(rawEntry.end) || rawEntry.start < 1 || rawEntry.end < rawEntry.start) {
        fail(`${file.path}: invalid range ${rawEntry.start}-${rawEntry.end}`)
      }
      if (!isNonemptyString(rawEntry.symbol)) fail(`${file.path}:${rawEntry.start}-${rawEntry.end}: symbol must be nonempty`)
      if (!Array.isArray(rawEntry.targetChapters) || rawEntry.targetChapters.length === 0) {
        fail(`${file.path}:${rawEntry.start}-${rawEntry.end}: targetChapters must be a nonempty array`)
      }
      for (const chapter of rawEntry.targetChapters) {
        if (!Number.isSafeInteger(chapter) || chapter < 1) {
          fail(`${file.path}:${rawEntry.start}-${rawEntry.end}: chapter must be a positive integer, got ${chapter}`)
        }
      }
      const id = entryId({ path: file.path, start: rawEntry.start, end: rawEntry.end, symbol: rawEntry.symbol })
      if (maps.has(id)) fail(`duplicate mapping identity ${id} (${file.path}:${rawEntry.start}-${rawEntry.end} ${rawEntry.symbol})`)
      const targetChapters = [...new Set(rawEntry.targetChapters)].sort((a, b) => a - b)
      rawOccurrences += rawEntry.targetChapters.length
      uniqueOccurrences += targetChapters.length
      maps.set(id, {
        id,
        path: file.path,
        start: rawEntry.start,
        end: rawEntry.end,
        symbol: rawEntry.symbol,
        sourceTargetChapters: rawEntry.targetChapters.slice(),
        targetChapters,
      })
    }
  }

  const notes = new Map()
  const notesInOrder = []
  const noteOrdinals = new Map()
  for (const [index, rawNote] of manifest.chapterNotes.entries()) {
    if (!isRecord(rawNote)) fail(`mapping.json chapterNotes[${index}] must be an object`)
    if (!Number.isSafeInteger(rawNote.chapter) || rawNote.chapter < 1) {
      fail(`chapterNotes[${index}].chapter must be a positive integer`)
    }
    for (const field of ['source', 'obligation', 'gap', 'requiredChange']) {
      if (!isNonemptyString(rawNote[field])) fail(`chapterNotes[${index}].${field} must be nonempty`)
    }
    const ordinal = (noteOrdinals.get(rawNote.chapter) ?? 0) + 1
    noteOrdinals.set(rawNote.chapter, ordinal)
    const id = `NOTE-${rawNote.chapter}-${ordinal}`
    if (notes.has(id)) fail(`duplicate note identity ${id}`)
    const note = {
      id,
      chapter: rawNote.chapter,
      ordinalWithinChapter: ordinal,
      source: rawNote.source,
      obligation: rawNote.obligation,
      gap: rawNote.gap,
      requiredChange: rawNote.requiredChange,
    }
    notes.set(id, note)
    notesInOrder.push(note)
  }

  const mapIds = new Set(maps.keys())
  const noteIds = new Set(notes.keys())
  const chapters = [...new Set([
    ...[...maps.values()].flatMap((record) => record.targetChapters),
    ...notesInOrder.map((note) => note.chapter),
  ])].sort((a, b) => a - b)
  const chapterMaps = new Map(chapters.map((chapter) => [chapter, []]))
  const chapterNotes = new Map(chapters.map((chapter) => [chapter, []]))
  for (const record of maps.values()) {
    for (const chapter of record.targetChapters) chapterMaps.get(chapter).push(record)
  }
  for (const note of notesInOrder) chapterNotes.get(note.chapter).push(note)
  return {
    maps,
    notes,
    notesInOrder,
    mapIds,
    noteIds,
    sourceFiles,
    architectureBaseline,
    chapters,
    chapterMaps,
    chapterNotes,
    rawOccurrences,
    uniqueOccurrences,
    repeatedMemberships: rawOccurrences - uniqueOccurrences,
  }
}

function validateOwnership(ownership, canonical) {
  if (!isRecord(ownership) || !Array.isArray(ownership.groups)) fail('ownership.json groups must be an array')
  const names = new Set()
  const fileOwners = new Map()
  const idOwners = new Map()
  const groups = []

  for (const [index, rawGroup] of ownership.groups.entries()) {
    if (!isRecord(rawGroup)) fail(`ownership.groups[${index}] must be an object`)
    if (!isNonemptyString(rawGroup.group)) fail(`ownership.groups[${index}].group must be nonempty`)
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(rawGroup.group)) fail(`invalid group directory name ${rawGroup.group}`)
    if (names.has(rawGroup.group)) fail(`ownership.json duplicate group ${rawGroup.group}`)
    names.add(rawGroup.group)
    if (!isNonemptyString(rawGroup.tier)) fail(`${rawGroup.group}: tier must be nonempty`)
    if (!Array.isArray(rawGroup.files)) fail(`${rawGroup.group}: files must be an array`)
    const files = rawGroup.files.slice()
    if (new Set(files).size !== files.length) fail(`${rawGroup.group}: files contains duplicates`)
    for (const file of files) {
      if (!isNonemptyString(file)) fail(`${rawGroup.group}: files must contain nonempty strings`)
      if (fileOwners.has(file)) fail(`source file ${file} is owned by both ${fileOwners.get(file)} and ${rawGroup.group}`)
      fileOwners.set(file, rawGroup.group)
    }
    if (rawGroup.group === 'TargetGaps') {
      if (files.length !== 0) fail('TargetGaps files must be empty')
    } else if (files.length === 0) {
      fail(`${rawGroup.group}: files must be nonempty`)
    }
    if (!Array.isArray(rawGroup.expectedIds) || rawGroup.expectedIds.length === 0) {
      fail(`${rawGroup.group}: expectedIds must be a nonempty array`)
    }
    const expectedIds = rawGroup.expectedIds.slice()
    if (new Set(expectedIds).size !== expectedIds.length) fail(`${rawGroup.group}: expectedIds contains duplicates`)
    for (const id of expectedIds) {
      if (!isNonemptyString(id)) fail(`${rawGroup.group}: expectedIds must contain nonempty strings`)
      if (!id.startsWith('MAP-') && !id.startsWith('NOTE-')) fail(`${rawGroup.group}: unknown ID prefix ${id}`)
      if (idOwners.has(id)) fail(`ID ${id} is owned by both ${idOwners.get(id)} and ${rawGroup.group}`)
      idOwners.set(id, rawGroup.group)
      if (rawGroup.group === 'TargetGaps' && !id.startsWith('NOTE-')) fail(`TargetGaps may only own NOTE ids, got ${id}`)
      if (rawGroup.group !== 'TargetGaps' && !id.startsWith('MAP-')) fail(`${rawGroup.group} may only own MAP ids, got ${id}`)
    }
    groups.push({ group: rawGroup.group, tier: rawGroup.tier, files, expectedIds, fileSet: new Set(files) })
  }

  requireExactSet('ownership MAP set', canonical.mapIds, new Set([...idOwners.keys()].filter((id) => id.startsWith('MAP-'))))
  requireExactSet('ownership NOTE set', canonical.noteIds, new Set([...idOwners.keys()].filter((id) => id.startsWith('NOTE-'))))
  requireExactSet('ownership source file set', canonical.sourceFiles, new Set(fileOwners.keys()))

  for (const group of groups) {
    for (const id of group.expectedIds) {
      if (!id.startsWith('MAP-')) continue
      const record = canonical.maps.get(id)
      if (!group.fileSet.has(record.path)) {
        fail(`${group.group}: ${id} maps to ${record.path}:${record.start}-${record.end}, outside this group's files`)
      }
    }
  }
  return groups
}

function validateEntry(group, entry, compositionContractAnchors) {
  if (!isRecord(entry)) fail(`${group}: entry must be an object`)
  if (!allowedAssessments.has(entry.assessment)) {
    fail(`${group}: ${entry.id} assessment must be one of ${[...allowedAssessments].join(', ')}`)
  }
  if (!allowedDispositions.has(entry.contractDisposition)) {
    fail(`${group}: ${entry.id} contractDisposition must be one of ${[...allowedDispositions].join(', ')}`)
  }
  if (!isNonemptyString(entry.contractRationale)) {
    fail(`${group}: ${entry.id} contractRationale must be a nonempty string`)
  }
  const contractAnchors = validateStringArray(entry.contractAnchors, `${group}: ${entry.id} contractAnchors`, true)
  for (const anchor of contractAnchors) {
    if (!compositionContractAnchors.has(anchor)) {
      fail(`${group}: ${entry.id} contractAnchors contains ${JSON.stringify(anchor)}, not an actual K01-K12 composition heading`)
    }
  }
  for (const field of entryStringFields) {
    if (!isNonemptyString(entry[field])) fail(`${group}: ${entry.id} field ${field} must be a nonempty string`)
  }
  for (const field of entryArrayFields) {
    validateStringArray(entry[field], `${group}: ${entry.id} field ${field}`, requiredEntryArrays.has(field))
  }
}


function validateReviews(group, expectedIds, hashes, reviewsRaw) {
  if (reviewsRaw === undefined) {
    return { present: false, byId: new Map(), accepted: 0, changesRequired: 0 }
  }
  const reviews = parseJson(reviewsRaw, `${group}: reviews.json`)
  if (!isRecord(reviews) || reviews.group !== group) fail(`${group}: reviews.json group must be exactly ${JSON.stringify(group)}`)
  if (reviews.designBasis !== designBasis) {
    fail(`${group}: reviews.json designBasis must be exactly ${JSON.stringify(designBasis)}`)
  }
  const expectedHashes = [
    ['analysesSha256', hashes.analyses, 'analyses.json'],
    ['designSha256', hashes.design, 'design.md'],
    ['contractSha256', hashes.compositionContract, 'composition-contract.md'],
  ]
  for (const [field, expected, label] of expectedHashes) {
    if (typeof reviews[field] !== 'string' || !/^[0-9a-f]{64}$/.test(reviews[field])) {
      fail(`${group}: reviews.json ${field} must be lowercase SHA256 hex`)
    }
    if (reviews[field] !== expected) {
      fail(`${group}: reviews.json is stale; ${field} does not match exact current ${label} SHA256 ${expected}`)
    }
  }
  if (!Array.isArray(reviews.entries)) fail(`${group}: reviews.json entries must be an array`)
  const reviewIds = []
  for (const [index, review] of reviews.entries.entries()) {
    if (!isRecord(review) || !isNonemptyString(review.id)) fail(`${group}: reviews.entries[${index}].id must be nonempty`)
    if (!allowedVerdicts.has(review.verdict)) fail(`${group}: ${review.id} verdict must be accepted or changes-required`)
    if (!isNonemptyString(review.reason)) fail(`${group}: ${review.id} reason must be nonempty`)
    reviewIds.push(review.id)
  }
  if (new Set(reviewIds).size !== reviewIds.length) fail(`${group}: reviews.json contains duplicate ids`)
  requireExactSet(`${group}: reviews.json id set`, new Set(expectedIds), new Set(reviewIds))
  const byId = new Map(reviews.entries.map((review) => [review.id, review]))
  const accepted = reviews.entries.filter((review) => review.verdict === 'accepted').length
  return { present: true, byId, accepted, changesRequired: reviews.entries.length - accepted }
}


async function sourceFilesHash(group, canonical) {
  const paths = group.files.length > 0
    ? group.files
    : [...new Set(canonical.notesInOrder
      .filter((note) => group.expectedIds.includes(note.id))
      .flatMap((note) => parseNoteSourcePaths(note.source)))]
  const hash = createHash('sha256')
  for (const file of paths.slice().sort()) {
    let bytes
    if (file === architecturePath) {
      bytes = canonical.architectureBaseline.files.en.bytes
    } else {
      try {
        bytes = await readFile(resolve(repoRoot, file))
      } catch (error) {
        if (error?.code === 'ENOENT') fail(`${group.group}: source file missing at ${file}`)
        throw error
      }
    }
    hash.update(`${file}\n`)
    hash.update(bytes)
    hash.update('\n')
  }
  return hash.digest('hex')
}

function mappingSlice(group, canonical) {
  if (group.files.length === 0) {
    const expected = new Set(group.expectedIds)
    return canonical.notesInOrder.filter((note) => expected.has(note.id))
  }
  return group.expectedIds.slice().sort().map((id) => {
    const record = canonical.maps.get(id)
    return {
      id: record.id,
      path: record.path,
      start: record.start,
      end: record.end,
      symbol: record.symbol,
      sourceTargetChapters: record.sourceTargetChapters,
      targetChapters: record.targetChapters,
    }
  })
}

async function loadGroup(group, canonical, compositionContract) {
  const groupDir = join(solutionsDir, group.group)
  const analysesPath = join(groupDir, 'analyses.json')
  const designPath = join(groupDir, 'design.md')
  const reviewsPath = join(groupDir, 'reviews.json')
  const entriesPath = join(groupDir, 'entries.md')

  const analysesRaw = await readRequired(analysesPath, `${group.group}: analyses.json`)
  const analysesHash = sha256Hex(analysesRaw)
  const analyses = parseJson(analysesRaw, `${group.group}: analyses.json`)
  if (!isRecord(analyses) || analyses.group !== group.group) fail(`${group.group}: analyses.json group must be exactly ${JSON.stringify(group.group)}`)
  if (analyses.designBasis !== designBasis) {
    fail(`${group.group}: analyses.json designBasis must be exactly ${JSON.stringify(designBasis)}`)
  }
  if (!Array.isArray(analyses.entries)) fail(`${group.group}: analyses.json entries must be an array`)
  validateStringArray(analyses.crossGroupContracts, `${group.group}: crossGroupContracts`, false)
  validateStringArray(analyses.additionalFindings, `${group.group}: additionalFindings`, false)

  const actualIds = []
  for (const [index, entry] of analyses.entries.entries()) {
    if (!isRecord(entry) || !isNonemptyString(entry.id)) fail(`${group.group}: entries[${index}].id must be nonempty`)
    actualIds.push(entry.id)
  }
  if (new Set(actualIds).size !== actualIds.length) fail(`${group.group}: analyses.json contains duplicate ids`)
  requireExactSet(`${group.group}: analyses.json id set`, new Set(group.expectedIds), new Set(actualIds))
  const entriesById = new Map(analyses.entries.map((entry) => [entry.id, entry]))
  const contractDisposition = { retained: 0, reframed: 0 }
  for (const id of group.expectedIds) {
    const entry = entriesById.get(id)
    validateEntry(group.group, entry, compositionContract.anchors)
    contractDisposition[entry.contractDisposition] += 1
  }

  const designRaw = await readRequired(designPath, `${group.group}: design.md`)
  if (designRaw.toString('utf8').trim() === '') fail(`${group.group}: design.md must be nonempty`)
  const designHash = sha256Hex(designRaw)
  const reviews = validateReviews(group.group, group.expectedIds, {
    analyses: analysesHash,
    design: designHash,
    compositionContract: compositionContract.hash,
  }, await readOptional(reviewsPath))

  const sourceHash = await sourceFilesHash(group, canonical)
  const mappingHash = sha256Hex(JSON.stringify(mappingSlice(group, canonical)))
  const blockedIds = group.expectedIds.filter((id) => entriesById.get(id).assessment === 'blocked-on-evidence').sort()
  const openQuestionIds = group.expectedIds.filter((id) => entriesById.get(id).openQuestions.length > 0).sort()
  const openQuestionTotal = openQuestionIds.reduce((sum, id) => sum + entriesById.get(id).openQuestions.length, 0)
  const reviewPending = group.expectedIds.filter((id) => reviews.byId.get(id)?.verdict !== 'accepted').length

  return {
    ...group,
    kind: group.group === 'TargetGaps' ? 'NOTE' : 'MAP',
    designBasis,
    contractDisposition,
    expected: group.expectedIds.length,
    designed: group.expectedIds.length - blockedIds.length,
    blocked: blockedIds.length,
    blockedIds,
    openQuestionIds,
    openQuestionEntries: openQuestionIds.length,
    openQuestionTotal,
    reviewPresent: reviews.present,
    reviewAccepted: reviews.accepted,
    reviewPending,
    reviewChanges: reviews.changesRequired,
    hashes: {
      sourceFiles: sourceHash,
      mappingSlice: mappingHash,
      analyses: analysesHash,
      design: designHash,
      compositionContract: compositionContract.hash,
    },
    analyses,
    entriesById,
    reviewById: reviews.byId,
    analysesPath,
    designPath,
    reviewsPath,
    entriesPath,
  }
}

function summarize(groups, canonical) {
  const totals = {
    groups: groups.length,
    uniqueMaps: canonical.maps.size,
    notes: canonical.notes.size,
    uniqueOccurrences: canonical.uniqueOccurrences,
    rawOccurrences: canonical.rawOccurrences,
    repeatedMemberships: canonical.repeatedMemberships,
    designed: 0,
    blocked: 0,
    contractDisposition: { retained: 0, reframed: 0 },
    reviewAccepted: 0,
    reviewPending: 0,
    openQuestionEntries: 0,
    openQuestionsTotal: 0,
    blockedList: [],
    openQuestionList: [],
    missingReviews: [],
    groupById: new Map(),
  }
  for (const group of groups) {
    totals.designed += group.designed
    totals.blocked += group.blocked
    totals.contractDisposition.retained += group.contractDisposition.retained
    totals.contractDisposition.reframed += group.contractDisposition.reframed
    totals.reviewAccepted += group.reviewAccepted
    totals.reviewPending += group.reviewPending
    totals.openQuestionEntries += group.openQuestionEntries
    totals.openQuestionsTotal += group.openQuestionTotal
    for (const id of group.expectedIds) {
      totals.groupById.set(id, group)
      const entry = group.entriesById.get(id)
      if (entry.assessment === 'blocked-on-evidence') totals.blockedList.push({ id, group: group.group })
      if (entry.openQuestions.length > 0) totals.openQuestionList.push({ id, group: group.group, count: entry.openQuestions.length })
      if (group.reviewById.get(id)?.verdict !== 'accepted') totals.missingReviews.push({ id, group: group.group })
    }
  }
  const byId = (a, b) => a.id.localeCompare(b.id) || a.group.localeCompare(b.group)
  totals.blockedList.sort(byId)
  totals.openQuestionList.sort(byId)
  totals.missingReviews.sort(byId)
  return totals
}

async function verifyQuestionClosures(groups) {
  const inputPath = join(solutionsDir, 'question-inputs.json')
  const inputRaw = await readRequired(inputPath, 'question-inputs.json')
  const input = parseJson(inputRaw, 'question-inputs.json')
  if (!isRecord(input) || !Array.isArray(input.entries) || input.originalCount !== input.entries.length) {
    fail('question-inputs.json must bind its exact original question count')
  }
  const owners = new Map(groups.map((group) => [group.group, group]))
  const byGroup = new Map(groups.map((group) => [group.group, []]))
  const keyOf = (entry) => JSON.stringify([entry.id, entry.question])
  const originalKeys = new Set()
  for (const question of input.entries) {
    if (!isRecord(question) || !isNonemptyString(question.question)) fail('invalid original question')
    const owner = owners.get(question.group)
    if (!owner?.entriesById.has(question.id)) fail(`original question has no owner: ${question.group}/${question.id}`)
    const key = JSON.stringify([question.group, question.id, question.question])
    if (originalKeys.has(key)) fail(`duplicate original question ${key}`)
    originalKeys.add(key)
    byGroup.get(question.group).push(question)
  }
  const dispositions = { 'source-resolved': 0, 'integration-resolved': 0, 'design-decided': 0, 'empirical-retained': 0 }
  const perGroup = []
  for (const group of groups) {
    const expected = byGroup.get(group.group)
    if (expected.length === 0) {
      if (group.openQuestionTotal !== 0) fail(`${group.group}: open question absent from original input inventory`)
      continue
    }
    const path = join(solutionsDir, group.group, 'questions-closure.json')
    const raw = await readRequired(path, `${group.group}: questions-closure.json`)
    const closure = parseJson(raw, `${group.group}: questions-closure.json`)
    if (!isRecord(closure) || closure.group !== group.group || !Array.isArray(closure.entries)) {
      fail(`${group.group}: invalid question closure envelope`)
    }
    const actual = new Set()
    const retainedById = new Map()
    let retained = 0
    for (const entry of closure.entries) {
      if (!isRecord(entry) || !isNonemptyString(entry.id) || !isNonemptyString(entry.question)) fail(`${group.group}: invalid closure entry`)
      if (!Object.hasOwn(dispositions, entry.disposition)) fail(`${group.group}/${entry.id}: invalid question disposition`)
      if (!isNonemptyString(entry.resolution)) fail(`${group.group}/${entry.id}: missing concrete question resolution`)
      if (typeof entry.evidence === 'string') {
        if (!isNonemptyString(entry.evidence)) fail(`${group.group}/${entry.id}: empty question evidence`)
      } else {
        validateStringArray(entry.evidence, `${group.group}/${entry.id}: question evidence`, true)
      }
      const key = keyOf(entry)
      if (actual.has(key)) fail(`${group.group}: duplicate question closure ${key}`)
      actual.add(key)
      dispositions[entry.disposition] += 1
      if (entry.disposition === 'empirical-retained') {
        retained += 1
        retainedById.set(entry.id, (retainedById.get(entry.id) ?? 0) + 1)
      }
    }
    requireExactSet(`${group.group}: original question closure set`, new Set(expected.map(keyOf)), actual)
    if (closure.remainingCount !== retained) fail(`${group.group}: remainingCount is not the retained question count`)
    for (const entry of group.entriesById.values()) {
      if (entry.openQuestions.length !== (retainedById.get(entry.id) ?? 0)) {
        fail(`${group.group}/${entry.id}: open questions disagree with retained closure dispositions`)
      }
    }
    perGroup.push({ group: group.group, original: expected.length, resolved: expected.length - retained, retained, path: repoRelative(path), sha256: sha256Hex(raw) })
  }
  return { original: input.entries.length, resolved: input.entries.length - dispositions['empirical-retained'], retained: dispositions['empirical-retained'], dispositions, inputSha256: sha256Hex(inputRaw), groups: perGroup }
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function escapeBody(value) {
  const text = String(value)
  if (text.trim() === '') return '—'
  return escapeHtml(text).replaceAll('\r\n', '<br>').replaceAll('\n', '<br>').replaceAll('\r', '<br>')
}

function escapeItem(value) {
  return escapeHtml(value).replaceAll('\r\n', '<br>').replaceAll('\n', '<br>').replaceAll('\r', '<br>')
}



function appendField(lines, key, value) {
  const label = escapeHtml(key)
  if (Array.isArray(value)) {
    if (value.length === 0) {
      lines.push(`- ${label}: —`)
    } else if (value.every((item) => typeof item === 'string')) {
      lines.push(`- ${label}:`)
      for (const item of value) lines.push(`  - ${escapeItem(item)}`)
    } else {
      lines.push(`- ${label}: ${escapeBody(JSON.stringify(value))}`)
    }
    return
  }
  if (typeof value === 'string') {
    lines.push(`- ${label}: ${escapeBody(value)}`)
    return
  }
  lines.push(`- ${label}: ${escapeBody(JSON.stringify(value))}`)
}


function parseNoteSourcePaths(source) {
  const paths = []
  for (const part of source.split(';')) {
    const ref = part.trim()
    const match = /^(.+):\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*$/.exec(ref)
    if (match && !paths.includes(match[1].trim())) paths.push(match[1].trim())
  }
  return paths
}
function renderNoteSourcePath(path, architectureBaseline) {
  if (path === architecturePath) {
    const url = `https://github.com/${architectureBaseline.repository}/blob/${architectureBaseline.revision}/${path}`
    return `[${escapeHtml(path)}](${url}) (pinned historical revision ${architectureBaseline.revision})`
  }
  return `[${escapeHtml(path)}](../../../../${path})`
}

function appendContractAnchors(lines, anchors) {
  lines.push('- contractAnchors:')
  for (const anchor of anchors) {
    lines.push(`  - [${escapeItem(anchor)}](../composition-contract.md)`)
  }
}

function renderGroupEntries(group, canonical) {
  const lines = [
    '<!-- Generated by scripts/uta-effect-runtime-solutions.mjs from ownership.json + mapping.json + analyses.json (+ reviews.json). -->',
    '',
    `# ${escapeHtml(group.group)} — source investigation and migration evidence`,
    '',
    '- Domain target: [design.md](design.md)',
    '- Shared composition rules: [composition-contract.md](../composition-contract.md)',
    '- Historical source baseline: [mapping.json](../../../../docs/uta-effect-runtime-mapping/mapping.json)',
    '',
    '## Entries',
    '',
  ]

  for (const id of group.expectedIds.slice().sort()) {
    const entry = group.entriesById.get(id)
    lines.push(`### ${id}`, '')
    if (id.startsWith('MAP-')) {
      const record = canonical.maps.get(id)
      lines.push(`- mapping source: [${escapeHtml(record.path)}:${record.start}-${record.end}](../../../../${record.path}#L${record.start}-L${record.end})`)
      lines.push(`- symbol: ${escapeBody(record.symbol)}`)
      lines.push(`- unique targetChapters: ${escapeBody(record.targetChapters.join(', '))}`)
      if (record.sourceTargetChapters.length !== record.targetChapters.length) {
        lines.push(`- raw sourceTargetChapters (provenance, includes duplicates): ${escapeBody(record.sourceTargetChapters.join(', '))}`)
      }
    } else {
      const note = canonical.notes.get(id)
      lines.push(`- chapter: ${note.chapter}`)
      lines.push(`- note source (historical audit input; architecture references pinned to revision ${canonical.architectureBaseline.revision}): ${escapeBody(note.source)}`)
      const paths = parseNoteSourcePaths(note.source)
      if (paths.length) lines.push(`- note source paths: ${paths.map((path) => renderNoteSourcePath(path, canonical.architectureBaseline)).join('、')}`)
      lines.push(`- obligation: ${escapeBody(note.obligation)}`)
      lines.push(`- gap: ${escapeBody(note.gap)}`)
      lines.push(`- original requiredChange (historical audit input; not current target): ${escapeBody(note.requiredChange)}`)
    }
    for (const [key, value] of Object.entries(entry)) {
      if (key === 'contractAnchors') appendContractAnchors(lines, value)
      else appendField(lines, key, value)
    }
    const review = group.reviewById.get(id)
    lines.push(review ? `- review: ${escapeBody(review.verdict)} — ${escapeBody(review.reason)}` : '- review: pending (no reviews.json)')
    lines.push('- design: [design.md](design.md)', '')
  }

  lines.push('## Cross-group contracts', '')
  for (const item of group.analyses.crossGroupContracts) lines.push(`- ${escapeItem(item)}`)
  lines.push('', '## Additional findings', '')
  for (const item of group.analyses.additionalFindings) lines.push(`- ${escapeItem(item)}`)
  lines.push(
    '',
    '## Audit appendix',
    '',
    '- [coverage.json](../coverage.json) is the machine-readable structural audit for this group.',
    `- design basis: ${escapeBody(group.designBasis)}`,
    `- expected entries: ${group.expected}`,
    `- designed (author assessment only): ${group.designed}; blocked-on-evidence (not done): ${group.blocked}`,
    `- contract disposition (not semantic acceptance): retained ${group.contractDisposition.retained}; reframed ${group.contractDisposition.reframed}`,
    `- review verdicts (exact current hashes; not semantic acceptance): accepted ${group.reviewAccepted}; pending or changes-required ${group.reviewPending}`,
    `- entries with open questions: ${group.openQuestionEntries} (total questions: ${group.openQuestionTotal})`,
    `- source files (${group.files.length}): ${group.files.length ? group.files.map(escapeHtml).join('、') : '— (target-only notes)'}`,
    '- Review verdicts are author-supplied; accepted means the review hashes match current analyses.json, design.md, and composition-contract.md.',
    '- Blocked-on-evidence remains not done, and open questions remain reported until their closure disposition is explicit.',
    '',
  )
  return lines.join('\n')
}



function renderSolutionsIndex(groups, canonical, totals) {
  const lines = [
    '<!-- Generated navigation only by scripts/uta-effect-runtime-solutions.mjs. Per-entry investigation remains in each group. -->',
    '',
    '# UTA 新旧能力逐项调查',
    '',
    '本目录保存旧实现与新 UTA 抽象之间的逐项对照，以及能力组合要求加入后的调整分析。它是完整设计书的调查输入，不是完整设计书，也不表示其中的候选解释已被维护者接受。',
    '',
    '## 调查层次',
    '',
    '| 材料 | 阅读用途 |',
    '|---|---|',
    '| [初版架构](../../uta-effect-runtime-architecture.md) · [简体中文](../../uta-effect-runtime-architecture.zh-CN.md) | 受保护的第一版目标架构；不是当前实现 |',
    '| [初步源码映射](../../uta-effect-runtime-mapping/coverage.md) · [mapping.json](../../uta-effect-runtime-mapping/mapping.json) | 源码范围、旧行为、初版架构章节和原始缺口 |',
    '| 各组 `analyses.json` / `entries.md` | 调整后的逐项对照全文：源码依据、旧行为、问题、调整理由、候选模型、纯逻辑与副作用边界、保留行为、替代步骤、验证条件和未决问题 |',
    '| 各组 `design.md` / `reviews.json` | 调查当时的分组解释及评审记录；保留其上下文和原始哈希，不等于当前设计裁决 |',
    '| [原始问题](question-inputs.json)及各组 `questions-closure.json` | 每个问题的原文及当时处置；候选设计作出的决定仍须在完整架构中复核 |',
    '| [ownership.json](ownership.json) · [coverage.json](coverage.json) | 来源归属和结构核对；数量、`designed`、`accepted`、哈希一致均不证明架构正确 |',
    '',
    '## 逐组完整对照',
    '',
    '| 调查组 | 可读对照 | 原始分析 | 当时分组解释 | 评审记录 |',
    '|---|---|---|---|---|',
  ]
  for (const group of groups) {
    lines.push(`| ${escapeHtml(group.group)} | [entries.md](${group.group}/entries.md) | [analyses.json](${group.group}/analyses.json) | [design.md](${group.group}/design.md) | [reviews.json](${group.group}/reviews.json) |`)
  }
  lines.push(
    '',
    '## 补充调查与分析依据',
    '',
    '- [Candle、Instrument、News、NewsGroup 调查](data-investigation.md)',
    '- [Provider 与跨进程边界调查](provider-investigation.md)',
    '- [外部触发与返回 Agent 调查](trigger-investigation.md)',
    '- [旧实现故障实验](source-experiments.md)',
    '- 调整分析使用的候选约束：[组合约束](composition-contract.md)、[集成决定](integration-decisions.md)、[数据契约](../data-contract.md)、[Provider 契约](../provider-contract.md)、[触发契约](../trigger-contract.md)、[交易契约](../transaction-contract.md)。保留这些文件是为了理解调查为何作出相应判断，不把它们重新提升为已接受的总体架构。',
    '- [交叉评审记录](shared-review.md) · [当时的执行记录](verification.md)',
    '- 对照中引用的局部实验：[声明与组合](domain-contracts.md)、[声明源码](domain-contracts.ts)、[类型反例](domain-contracts.type-cases.ts)、[进程交互](composition-example.ts)、[外部进程](composition-fixture-worker.py)、[触发实验](trigger-state-example.md)。它们只支持各自实际执行的局部结论，不替代总体抽象设计或生产运行时验收。',
    '',
    '## 问题与引用边界',
    '',
    `- 原始问题记录完整保留在 question-inputs.json；${totals.questionClosure.original} 个问题及其原始处置用于核对恢复完整性，不作为设计完成度。`,
    '- 各组 entries.md 的 openQuestions、Cross-group contracts、Additional findings 必须一起阅读，不能只取 targetModel。',
    '- 原始调查记录内引用的 `docs/uta-effect-runtime-detailed-design.md`、`plans/uta-effect-runtime-design.md` 及 `D13`—`D17` 等候选章节编号属于已撤销的总设计与会话计划。它们不作为当前设计入口，也不能把这些历史引用自动绑定到将来的同名文档或编号。恢复归档保留了被引用版本；本目录的调查原文不因恢复操作被重写。',
    `- 调查对应的初版架构提交为 \`${canonical.architectureBaseline.revision}\`。原始中英正文保持不变；本索引不覆盖原设计。`,
    '- 生成器只据已有输入生成导航、可读对照和结构元数据，不生成实质解决方案。重新设计必须逐项处理已有调查，而不是用生成成功或评审标签代替判断。',
    '',
  )
  return lines.join('\n')
}



function renderCoverage(groups, canonical, totals, mappingRaw, ownershipRaw, compositionContract) {
  const groupPayload = {}
  for (const group of groups) {
    groupPayload[group.group] = {
      designBasis: group.designBasis,
      files: group.files.slice().sort(),
      fileCount: group.files.length,
      kind: group.kind,
      expected: group.expected,
      total: group.expected,
      designed: group.designed,
      blocked: group.blocked,
      blockedIds: group.blockedIds,
      contractDisposition: group.contractDisposition,
      review: {
        present: group.reviewPresent,
        accepted: group.reviewAccepted,
        pending: group.reviewPending,
        changesRequired: group.reviewChanges,
      },
      openQuestions: {
        entries: group.openQuestionEntries,
        total: group.openQuestionTotal,
        ids: group.openQuestionIds,
      },
      hashes: group.hashes,
      paths: {
        analyses: repoRelative(group.analysesPath),
        design: repoRelative(group.designPath),
        entries: repoRelative(group.entriesPath),
        reviews: repoRelative(group.reviewsPath),
      },
      crossGroupContracts: group.analyses.crossGroupContracts,
      additionalFindings: group.analyses.additionalFindings,
    }
  }
  const perChapter = {}
  for (const chapter of canonical.chapters) {
    perChapter[String(chapter)] = {
      maps: canonical.chapterMaps.get(chapter).length,
      notes: canonical.chapterNotes.get(chapter).length,
    }
  }
  const payload = {
    generator: 'scripts/uta-effect-runtime-solutions.mjs',
    designBasis,
    compositionContract: {
      path: repoRelative(compositionContract.path),
      sha256: compositionContract.hash,
      anchors: [...compositionContract.anchors].sort(),
    },
    baseline: 'docs/uta-effect-runtime-mapping/mapping.json',
    ownership: 'docs/uta-effect-runtime-design/solutions/ownership.json',
    hashes: {
      baseline: sha256Hex(mappingRaw),
      ownership: sha256Hex(ownershipRaw),
      compositionContract: compositionContract.hash,
    },
    counts: {
      groups: totals.groups,
      uniqueMaps: totals.uniqueMaps,
      notes: totals.notes,
      totalEntries: totals.uniqueMaps + totals.notes,
      occurrencesUnique: totals.uniqueOccurrences,
      rawOccurrences: totals.rawOccurrences,
      repeatedMemberships: totals.repeatedMemberships,
      designed: totals.designed,
      blocked: totals.blocked,
      contractDisposition: totals.contractDisposition,
      reviewAccepted: totals.reviewAccepted,
      reviewPending: totals.reviewPending,
      openQuestionEntries: totals.openQuestionEntries,
      openQuestionsTotal: totals.openQuestionsTotal,
      chapters: canonical.chapters.length,
    },
    questionClosure: totals.questionClosure,
    countSemantics: {
      uniqueMaps: 'distinct MAP identities derived from mapping.json file entries',
      notes: 'distinct NOTE identities derived from mapping.json chapterNotes order',
      occurrencesUnique: 'MAP-to-chapter memberships after per-entry targetChapters deduplication',
      rawOccurrences: 'raw targetChapters array memberships, including duplicates',
      repeatedMemberships: 'rawOccurrences minus occurrencesUnique',
      designed: 'authored entries whose assessment is designed; this author assessment is not semantic acceptance',
      blocked: 'authored entries whose assessment is blocked-on-evidence; not done',
      contractDisposition: 'authored retained/reframed classification against the current composition contract; not semantic acceptance',
      reviewAccepted: 'entries with an author-supplied accepted review bound to exact current analyses.json, design.md, and composition-contract.md hashes; this verdict and count are not semantic acceptance',
      reviewPending: 'entries without that accepted review, including absent and changes-required reviews',
    },
    perChapter,
    groups: groupPayload,
    blockedIds: totals.blockedList,
    openQuestionIds: totals.openQuestionList,
    missingReviews: totals.missingReviews,
    missingReviewGroups: groups.filter((group) => group.reviewPending > 0).map((group) => group.group),
    note: 'Structural completeness only; hashes and counts do not prove semantic quality. Contract disposition and review verdict counts are not semantic acceptance. Blocked-on-evidence is not done, and an exact-current-hash accepted review is the only reviewed state.',
  }
  return `${JSON.stringify(payload, null, 2)}\n`
}


async function writeOrCheck(path, content, stale) {
  if (checkOnly) {
    let current
    try {
      current = await readFile(path, 'utf8')
    } catch (error) {
      if (error?.code === 'ENOENT') {
        stale.push(repoRelative(path))
        return
      }
      throw error
    }
    if (current !== content) stale.push(repoRelative(path))
    return
  }
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content, 'utf8')
}

async function main() {
  const ownershipRaw = await readRequired(ownershipPath, 'ownership.json')
  const mappingRaw = await readRequired(mappingPath, 'mapping.json')
  const compositionContractRaw = await readRequired(compositionContractPath, 'composition-contract.md')
  const compositionContract = {
    path: compositionContractPath,
    hash: sha256Hex(compositionContractRaw),
    anchors: parseCompositionContractAnchors(compositionContractRaw),
  }
  const ownership = parseJson(ownershipRaw, 'solutions/ownership.json')
  const manifest = parseJson(mappingRaw, 'docs/uta-effect-runtime-mapping/mapping.json')
  const canonicalInput = buildCanonical(manifest)
  const canonical = {
    ...canonicalInput,
    architectureBaseline: await loadArchitectureBaseline(canonicalInput.architectureBaseline),
  }
  const groups = validateOwnership(ownership, canonical)
  const groupInfos = []
  for (const group of groups) groupInfos.push(await loadGroup(group, canonical, compositionContract))
  const totals = summarize(groupInfos, canonical)
  totals.questionClosure = await verifyQuestionClosures(groupInfos)

  if (reviewedOnly && totals.missingReviews.length > 0) {
    const missing = totals.missingReviews.map((item) => `${item.group}/${item.id}`).join(', ')
    const blocked = totals.blockedList.map((item) => `${item.group}/${item.id}`).join(', ') || 'none'
    fail(`--reviewed requires accepted reviews for every exact-current analyses/design/composition-contract hash; pending or changes-required (${totals.missingReviews.length}): ${missing}; blocked-on-evidence (not done): ${blocked}`)
  }

  for (const group of groupInfos) group.entriesContent = renderGroupEntries(group, canonical)
  const indexContent = renderSolutionsIndex(groupInfos, canonical, totals)
  const coverageContent = renderCoverage(groupInfos, canonical, totals, mappingRaw, ownershipRaw, compositionContract)
  const stale = []
  for (const group of groupInfos) await writeOrCheck(group.entriesPath, group.entriesContent, stale)
  await writeOrCheck(indexPath, indexContent, stale)
  await writeOrCheck(coveragePath, coverageContent, stale)
  if (stale.length) fail(`generated files are stale or missing: ${stale.sort().join(', ')}`)

  const outputs = [...groupInfos.map((group) => repoRelative(group.entriesPath)), repoRelative(indexPath), repoRelative(coveragePath)].sort()
  console.log(JSON.stringify({
    mode: checkOnly ? 'check' : 'write',
    reviewed: reviewedOnly,
    designBasis,
    contractDisposition: totals.contractDisposition,
    outputs,
    groups: totals.groups,
    uniqueMaps: totals.uniqueMaps,
    notes: totals.notes,
    uniqueOccurrences: totals.uniqueOccurrences,
    rawOccurrences: totals.rawOccurrences,
    repeatedMemberships: totals.repeatedMemberships,
    designed: totals.designed,
    blocked: totals.blocked,
    reviewAccepted: totals.reviewAccepted,
    reviewPending: totals.reviewPending,
    openQuestionEntries: totals.openQuestionEntries,
    openQuestionsTotal: totals.openQuestionsTotal,
    questionClosure: {
      original: totals.questionClosure.original,
      resolved: totals.questionClosure.resolved,
      retained: totals.questionClosure.retained,
      dispositions: totals.questionClosure.dispositions,
    },
  }, null, 2))
}

await main()
