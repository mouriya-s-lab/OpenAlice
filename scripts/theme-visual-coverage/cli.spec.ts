import { describe, expect, it } from 'vitest'
import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { buildVisualCandidates } from './cli.js'

async function enumerate(path: string): Promise<string[]> {
  const entries = await readdir(path, { withFileTypes: true })
  return (await Promise.all(entries.map((entry) => entry.isDirectory() ? enumerate(resolve(path, entry.name)) : entry.name.endsWith('.tsx') ? [resolve(path, entry.name)] : []))).flat()
}

describe('theme visual candidate inventory', () => {
  it('classifies every component and page source exactly once', async () => {
    const candidates = await buildVisualCandidates()
    const independent = (await Promise.all(['ui/src/components', 'ui/src/pages'].map((path) => enumerate(resolve(path))))).flat()
    expect(candidates.map((item) => resolve(item.source)).sort()).toEqual(independent.sort())
    expect(new Set(candidates.map((item) => item.source)).size).toBe(candidates.length)
    expect(candidates.every((item) => item.classification === 'visual' || item.exclusionReason === 'composition-only-no-owned-pixels' || item.exclusionReason === 'test-only')).toBe(true)
  })

  it('keeps representative pixel owners in the visual denominator', async () => {
    const candidates = await buildVisualCandidates()
    expect(candidates.find((item) => item.source === 'ui/src/components/FirstRunGuide.tsx')?.classification).toBe('visual')
    expect(candidates.find((item) => item.source === 'ui/src/pages/SettingsPage.tsx')?.classification).toBe('visual')
  })
})
