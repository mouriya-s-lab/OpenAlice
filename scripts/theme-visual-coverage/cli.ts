import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'
import type { Page } from '@playwright/test'
import { buildBindings } from '../theme-color-audit/runtime-binding-cli.js'
import { themeVisualScenarios } from '../theme-color-audit/scenarios.js'

const root = resolve(import.meta.dirname, '../..')
const sourceRoots = ['ui/src/components', 'ui/src/pages'] as const
const outputRoot = resolve(root, '.artifacts/theme-visual-coverage')
const manifestPath = resolve(outputRoot, 'manifest.json')
const sourceCommit = (): string => execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
const repoPath = (path: string): string => relative(root, path).split(sep).join('/')
const hash = (value: Buffer): string => createHash('sha256').update(value).digest('hex')
const safe = (value: string): string => value.replace(/[^a-z0-9.-]/gi, '-')

type Candidate = { source: string; exports: string[]; classification: 'visual' | 'excluded'; exclusionReason?: 'composition-only-no-owned-pixels' | 'test-only' }
type Shot = { source: string; visualUnitId: string; scenarioId: string; state: string; fixture: string; actions: readonly unknown[]; theme: 'light' | 'dark'; viewport: { width: number; height: number }; surface: string; selector: string; bounds: { x: number; y: number; width: number; height: number }; path: string; sha256: string; pixelWidth: number; pixelHeight: number }
type Manifest = { schemaVersion: 1; sourceCommit: string; candidates: Candidate[]; screenshots: Shot[]; summary: { total: number; covered: number; uncovered: number; excluded: number } }

async function walk(path: string): Promise<string[]> {
  const entries = await readdir(path, { withFileTypes: true })
  return (await Promise.all(entries.map((entry) => entry.isDirectory() ? walk(resolve(path, entry.name)) : entry.name.endsWith('.tsx') ? [resolve(path, entry.name)] : []))).flat()
}

export async function buildVisualCandidates(): Promise<Candidate[]> {
  const paths = (await Promise.all(sourceRoots.map((path) => walk(resolve(root, path))))).flat().sort()
  return Promise.all(paths.map(async (path) => {
    const code = await readFile(path, 'utf8'); const file = ts.createSourceFile(path, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const names = new Set<string>(); let intrinsic = false
    const visit = (node: ts.Node): void => {
      if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && /^[a-z]/.test(node.tagName.getText(file))) intrinsic = true
      if (ts.isFunctionDeclaration(node) && node.modifiers?.some((item) => item.kind === ts.SyntaxKind.ExportKeyword) && node.name) names.add(node.name.text)
      if (ts.isVariableStatement(node) && node.modifiers?.some((item) => item.kind === ts.SyntaxKind.ExportKeyword)) for (const declaration of node.declarationList.declarations) if (ts.isIdentifier(declaration.name)) names.add(declaration.name.text)
      if (ts.isExportAssignment(node)) names.add('default')
      ts.forEachChild(node, visit)
    }
    visit(file)
    if (path.endsWith('.spec.tsx')) return { source: repoPath(path), exports: [...names].sort(), classification: 'excluded' as const, exclusionReason: 'test-only' as const }
    return intrinsic
      ? { source: repoPath(path), exports: [...names].sort(), classification: 'visual' as const }
      : { source: repoPath(path), exports: [...names].sort(), classification: 'excluded' as const, exclusionReason: 'composition-only-no-owned-pixels' as const }
  }))
}

async function visibleOwners(page: Page): Promise<Array<{ source: string; selector: string; bounds: { x: number; y: number; width: number; height: number } }>> {
  return page.evaluate(() => {
    const grouped = new Map<string, Element[]>()
    for (const element of document.querySelectorAll('[data-openalice-visual-source]')) {
      const source = element.getAttribute('data-openalice-visual-source'); if (!source) continue
      const rect = element.getBoundingClientRect(); const style = getComputedStyle(element)
      if (rect.width <= 0 || rect.height <= 0 || style.visibility === 'hidden' || style.display === 'none') continue
      grouped.set(source, [...(grouped.get(source) ?? []), element])
    }
    return [...grouped].map(([source, elements]) => {
      const element = elements.sort((a, b) => { const x = a.getBoundingClientRect(); const y = b.getBoundingClientRect(); return y.width * y.height - x.width * x.height })[0]!
      const rect = element.getBoundingClientRect()
      return { source, selector: `[data-openalice-visual-source="${CSS.escape(source)}"]`, bounds: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } }
    })
  })
}

async function capture(): Promise<void> {
  const resume = process.env['VISUAL_RESUME'] === '1'
  if (!resume) await rm(outputRoot, { recursive: true, force: true })
  await mkdir(resolve(outputRoot, 'images'), { recursive: true })
  const list = await buildVisualCandidates(); const screenshots: Shot[] = []; const errorByRun = new Map<string, { scenarioId: string; theme: string; error: string }>()
  const onScenario = async (page: Page, scenario: (typeof themeVisualScenarios)[number], theme: 'light' | 'dark'): Promise<void> => {
    errorByRun.delete(`${scenario.scenarioId}:${theme}`)
    for (const owner of await visibleOwners(page)) {
      const visualUnitId = `${owner.source}::${scenario.state}::${scenario.viewport.width}x${scenario.viewport.height}::${scenario.expectedSurface}`
      if (screenshots.some((item) => item.visualUnitId === visualUnitId && item.theme === theme)) continue
      const name = `${safe(owner.source)}--${safe(scenario.scenarioId)}--${theme}.png`; const path = resolve(outputRoot, 'images', name)
      const locator = page.locator(owner.selector).filter({ visible: true }).first(); const box = await locator.boundingBox()
      if (!box || box.width <= 0 || box.height <= 0) throw new Error(`zero or hidden target: ${visualUnitId}`)
      if (resume) {
        const existing = await readFile(path).catch(() => null)
        if (existing) {
          screenshots.push({ source: owner.source, visualUnitId, scenarioId: scenario.scenarioId, state: scenario.state, fixture: scenario.fixtureProfile, actions: scenario.actions, theme, viewport: scenario.viewport, surface: scenario.expectedSurface, selector: owner.selector, bounds: box, path: `images/${name}`, sha256: hash(existing), pixelWidth: Math.round(box.width), pixelHeight: Math.round(box.height) })
          continue
        }
      }
      await locator.evaluate((element, labelText) => {
        const label = document.createElement('span'); label.dataset['openaliceVisualCaptureLabel'] = '1'; label.textContent = labelText
        Object.assign(label.style, { position: 'absolute', inset: '2px auto auto 2px', zIndex: '2147483647', maxWidth: '90%', overflow: 'hidden', padding: '2px 4px', background: 'rgb(255,45,85)', color: 'white', font: 'bold 10px/12px ui-monospace, monospace', pointerEvents: 'none' })
        const html = element as HTMLElement; if (getComputedStyle(html).position === 'static') html.style.position = 'relative'; html.style.outline = '3px solid rgb(255,45,85)'; html.append(label)
      }, visualUnitId)
      const raw = await locator.screenshot({ type: 'png' })
      await locator.evaluate((element) => { element.querySelector('[data-openalice-visual-capture-label]')?.remove(); const html = element as HTMLElement; html.style.removeProperty('outline'); html.style.removeProperty('position') })
      const stamped = await page.evaluate(async ({ base64, signature }) => {
        const image = new Image(); image.src = `data:image/png;base64,${base64}`; await image.decode()
        const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight
        const context = canvas.getContext('2d'); if (!context) throw new Error('visual evidence canvas unavailable')
        context.drawImage(image, 0, 0); const size = Math.max(2, Math.min(6, Math.floor(Math.min(canvas.width, canvas.height) / 12)))
        for (let index = 0; index < 64; index += 1) { context.fillStyle = signature[index % signature.length]! < '8' ? '#ff2d55' : '#ffffff'; context.fillRect((index % 8) * size, Math.floor(index / 8) * size, size, size) }
        return canvas.toDataURL('image/png').split(',')[1]!
      }, { base64: raw.toString('base64'), signature: createHash('sha256').update(`${visualUnitId}:${theme}`).digest('hex') })
      const buffer = Buffer.from(stamped, 'base64')
      await writeFile(path, buffer)
      screenshots.push({ source: owner.source, visualUnitId, scenarioId: scenario.scenarioId, state: scenario.state, fixture: scenario.fixtureProfile, actions: scenario.actions, theme, viewport: scenario.viewport, surface: scenario.expectedSurface, selector: owner.selector, bounds: box, path: `images/${name}`, sha256: hash(buffer), pixelWidth: Math.round(box.width), pixelHeight: Math.round(box.height) })
    }
  }
  const run = async (scenarios: readonly (typeof themeVisualScenarios)[number][]): Promise<void> => buildBindings({ scenarios, skipBindingCompleteness: true,
    onScenarioError: async (scenario, theme, error) => { errorByRun.set(`${scenario.scenarioId}:${theme}`, { scenarioId: scenario.scenarioId, theme, error: error instanceof Error ? error.message : String(error) }) },
    onScenario,
  }).then(() => undefined)
  await run(themeVisualScenarios)
  const failedIds = new Set([...errorByRun.values()].map((item) => item.scenarioId))
  if (failedIds.size) await run(themeVisualScenarios.filter((scenario) => failedIds.has(scenario.scenarioId)))
  const scenarioErrors = [...errorByRun.values()]
  const visual = list.filter((item) => item.classification === 'visual'); const covered = new Set(screenshots.map((item) => item.source)); const uncovered = visual.filter((item) => !covered.has(item.source))
  const manifest: Manifest = { schemaVersion: 1, sourceCommit: sourceCommit(), candidates: list, screenshots, summary: { total: visual.length, covered: covered.size, uncovered: uncovered.length, excluded: list.length - visual.length } }
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  await writeFile(resolve(outputRoot, 'uncovered.json'), `${JSON.stringify(uncovered, null, 2)}\n`)
  await writeFile(resolve(outputRoot, 'excluded.json'), `${JSON.stringify(list.filter((item) => item.classification === 'excluded'), null, 2)}\n`)
  await writeFile(resolve(outputRoot, 'scenario-errors.json'), `${JSON.stringify(scenarioErrors, null, 2)}\n`)
  const gallery = `<!doctype html><meta charset="utf-8"><title>OpenAlice theme visual coverage</title><style>body{font:14px system-ui;background:#111;color:#eee;margin:24px}section{border-top:1px solid #555;padding:20px 0}img{max-width:720px;max-height:520px;border:1px solid #777}code{color:#ff9fbc}</style><h1>Theme visual coverage</h1><p>commit <code>${manifest.sourceCommit}</code> · total ${manifest.summary.total} · covered ${manifest.summary.covered} · uncovered ${manifest.summary.uncovered} · excluded ${manifest.summary.excluded}</p>${screenshots.map((shot) => `<section><h2>${shot.visualUnitId} · ${shot.theme}</h2><p>${shot.scenarioId} · ${shot.fixture} · <code>${shot.sha256}</code></p><img src="${shot.path}"></section>`).join('')}`
  await writeFile(resolve(outputRoot, 'gallery.html'), gallery)
  console.log(`visual coverage total=${visual.length} covered=${covered.size} uncovered=${uncovered.length} excluded=${manifest.summary.excluded} screenshots=${screenshots.length}`)
  if (uncovered.length || scenarioErrors.length) throw new Error(`visual coverage incomplete: uncovered=${uncovered.length}, scenarioErrors=${scenarioErrors.length}`)
}

async function check(): Promise<void> {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Manifest; const current = await buildVisualCandidates()
  if (manifest.sourceCommit !== sourceCommit()) throw new Error(`stale manifest commit: ${manifest.sourceCommit}`)
  if (JSON.stringify(manifest.candidates) !== JSON.stringify(current)) throw new Error('candidate inventory changed; regenerate visual coverage')
  const visual = current.filter((item) => item.classification === 'visual'); const bySource = new Map<string, Shot[]>()
  for (const shot of manifest.screenshots) bySource.set(shot.source, [...(bySource.get(shot.source) ?? []), shot])
  const missing = visual.filter((item) => !bySource.has(item.source)); if (missing.length) throw new Error(`uncovered visual sources: ${missing.map((item) => item.source).join(', ')}`)
  const paths = new Set<string>(); const hashes = new Map<string, string>()
  for (const shot of manifest.screenshots) {
    const bytes = await readFile(resolve(outputRoot, shot.path)); if (hash(bytes) !== shot.sha256) throw new Error(`screenshot hash mismatch: ${shot.visualUnitId}`)
    if (paths.has(shot.path)) throw new Error(`screenshot path reused by distinct units: ${shot.path}`)
    paths.add(shot.path)
    const identity = `${shot.visualUnitId}:${shot.theme}`; const prior = hashes.get(shot.sha256)
    if (prior && prior !== identity) throw new Error(`screenshot content reused by distinct units: ${prior} and ${identity}`)
    hashes.set(shot.sha256, identity)
  }
  for (const shots of bySource.values()) {
    const units = new Map<string, Set<string>>(); for (const shot of shots) units.set(shot.visualUnitId, new Set([...(units.get(shot.visualUnitId) ?? []), shot.theme]))
    for (const [id, themes] of units) if (!themes.has('light') || !themes.has('dark')) throw new Error(`missing canonical theme variant: ${id}`)
  }
  console.log(`validated total=${visual.length} covered=${bySource.size} uncovered=0 excluded=${current.length - visual.length} screenshots=${manifest.screenshots.length}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const command = process.argv[2]
  if (command === 'inventory') { const list = await buildVisualCandidates(); console.log(JSON.stringify(list, null, 2)) }
  else if (command === 'capture') await capture()
  else if (command === 'check') await check()
  else throw new Error(`unknown visual coverage command: ${command ?? '<missing>'}`)
}
