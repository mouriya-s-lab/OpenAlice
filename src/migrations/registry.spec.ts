import { describe, expect, it } from 'vitest'

import { REGISTRY } from './registry.js'
import { runMigrations } from './runner.js'
import type { ConfigMeta, Migration, MigrationContext } from './types.js'

const PI_ID = '0024_pi_native_workspace_config'
const LEGACY_THEME_ID = '0024_theme_file_state'
const THEME_ID = '0025_theme_file_state'

describe('migration registry', () => {
  it('keeps every sequence and migration id unique', () => {
    const ids = REGISTRY.map((migration) => migration.id)
    const sequences = ids.map((id) => id.slice(0, 4))

    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(sequences).size).toBe(sequences.length)
    expect(ids.slice(-2)).toEqual([PI_ID, THEME_ID])
  })

  it.each([
    {
      name: 'Pi migration was already recorded',
      recorded: [PI_ID],
      applied: [THEME_ID],
      final: [PI_ID, THEME_ID],
    },
    {
      name: 'legacy theme migration id was already recorded',
      recorded: [LEGACY_THEME_ID],
      applied: [PI_ID, THEME_ID],
      final: [LEGACY_THEME_ID, PI_ID, THEME_ID],
    },
  ])('reconciles $name once and stays idempotent', async ({ recorded, applied, final }) => {
    const calls: string[] = []
    const registry = REGISTRY
      .filter((migration) => migration.id === PI_ID || migration.id === THEME_ID)
      .map((migration): Migration => ({ ...migration, up: async () => { calls.push(migration.id) } }))
    const { ctx, readMeta } = memoryContext(recorded)

    await runMigrations({ ctx, registry, snapshot: async () => null })
    await runMigrations({ ctx, registry, snapshot: async () => null })

    expect(calls).toEqual(applied)
    expect(readMeta().appliedMigrations.map((migration) => migration.id)).toEqual(final)
  })
})

function memoryContext(recorded: readonly string[]): {
  readonly ctx: MigrationContext
  readonly readMeta: () => ConfigMeta
} {
  let meta: ConfigMeta = {
    appVersion: '0.83.0-beta',
    appliedMigrations: recorded.map((id) => ({ id, appliedAt: '2026-07-18T00:00:00.000Z', appVersion: '0.83.0-beta' })),
  }
  return {
    ctx: {
      readJson: async <T>(filename: string): Promise<T | undefined> => filename === '_meta.json'
        ? structuredClone(meta) as T
        : undefined,
      writeJson: async (filename, data) => {
        if (filename === '_meta.json') meta = structuredClone(data) as ConfigMeta
      },
      removeJson: async () => undefined,
      configDir: () => '/virtual/config',
    },
    readMeta: () => structuredClone(meta),
  }
}
