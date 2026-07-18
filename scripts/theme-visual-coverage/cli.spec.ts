import { describe, expect, it } from 'vitest'
import { buildVisualCandidates } from './cli.js'

describe('theme visual candidate inventory', () => {
  it('classifies every component and page source exactly once', async () => {
    const candidates = await buildVisualCandidates()
    expect(candidates).toHaveLength(160)
    expect(new Set(candidates.map((item) => item.source)).size).toBe(candidates.length)
    expect(candidates.every((item) => item.classification === 'visual' || item.exclusionReason === 'composition-only-no-owned-pixels' || item.exclusionReason === 'test-only')).toBe(true)
  })

  it('keeps representative pixel owners in the visual denominator', async () => {
    const candidates = await buildVisualCandidates()
    expect(candidates.find((item) => item.source === 'ui/src/components/FirstRunGuide.tsx')?.classification).toBe('visual')
    expect(candidates.find((item) => item.source === 'ui/src/pages/SettingsPage.tsx')?.classification).toBe('visual')
  })
})
