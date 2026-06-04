/**
 * English catalog — the SOURCE OF TRUTH for message keys. `zh`/`ja` are typed
 * against `Resources` (this shape with widened string leaves), so a missing or
 * extra key in a translation is a compile error. i18next key autocompletion is
 * driven off `typeof en` via CustomTypeOptions (see ../i18n.d.ts).
 *
 * Scope reminder: this catalog covers UI chrome ONLY. Never add agent-facing
 * copy here (skills / persona / templates / tool descriptions live in src/ and
 * are read by the model — translating them degrades behavior). The catalog
 * physically cannot import from src/, which keeps the boundary structural.
 */

export const en = {
  settings: {
    title: 'Settings',
    tab: {
      settings: 'Settings',
      tools: 'Tools',
    },
    language: {
      title: 'Language',
      description: 'Interface language. Takes effect immediately.',
    },
  },
} as const

/** The `en` shape with every string leaf widened to `string` — the contract
 *  each translation catalog must satisfy. */
type Stringify<T> = { [K in keyof T]: T[K] extends string ? string : Stringify<T[K]> }
export type Resources = Stringify<typeof en>
