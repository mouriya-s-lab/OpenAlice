/**
 * Launcher-owned context injection, run after a template's bootstrap.sh and
 * before the initial commit. Replaces what the per-template bootstrap scripts
 * used to do via `_common.sh` helpers (`write_mcp_config`,
 * `compose_persona_claude_md`) plus the chat skill-copy stopgap — so the
 * launcher, not each script, owns *what* gets injected. Gated per template by
 * the manifest flags (`injectMcp` / `injectPersona` / `bundledSkills`).
 *
 * Reproduces the old bash output byte-for-byte (the workspace-creation golden
 * spec asserts this) — the only behavioral change is that the launcher now
 * owns the files, not bash.
 */

import { existsSync } from 'node:fs';
import { cp, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { dataPath, defaultPath } from '@/core/paths.js';

import { writeWorkspaceFile } from './file-service.js';
import type { TemplateMeta } from './template-registry.js';

/**
 * Standard OpenAlice `.mcp.json`. The `${OPENALICE_MCP_URL:-...}` placeholder
 * is intentionally left literal — the agent CLI evaluates it at spawn against
 * the env the launcher injects (`service.ts` sets OPENALICE_MCP_URL to the
 * backend's live port). `__WS_ID__` is substituted with the workspace UUID.
 */
const MCP_JSON = `{
  "mcpServers": {
    "openalice": {
      "type": "streamable-http",
      "url": "\${OPENALICE_MCP_URL:-http://127.0.0.1:47332/mcp}"
    },
    "openalice-workspace": {
      "type": "streamable-http",
      "url": "\${OPENALICE_MCP_URL:-http://127.0.0.1:47332/mcp}/__WS_ID__"
    }
  }
}
`;

export async function injectWorkspaceContext(opts: {
  readonly template: TemplateMeta;
  readonly wsId: string;
  readonly dir: string;
}): Promise<void> {
  const { template, wsId, dir } = opts;

  if (template.injectMcp) {
    await writeWorkspaceFile(dir, '.mcp.json', MCP_JSON.replaceAll('__WS_ID__', wsId));
  }

  if (template.injectPersona) {
    // Compose `persona + "\n\n---\n\n" + <template>/CLAUDE.md`, byte-identical
    // to the old `compose_persona_claude_md`. A template that asks for persona
    // injection but ships no CLAUDE.md is a misconfiguration — let the readFile
    // throw so the create fails loudly (matches the old `exit 4`).
    const persona = await resolvePersona();
    const templateMd = await readFile(join(template.filesDir, 'CLAUDE.md'), 'utf8');
    const composed = persona !== null ? `${persona}\n\n---\n\n${templateMd}` : templateMd;
    await writeWorkspaceFile(dir, 'CLAUDE.md', composed);
    await writeWorkspaceFile(dir, 'AGENTS.md', composed);
  }

  if (template.bundledSkills.length > 0) {
    await mkdir(join(dir, '.claude/skills'), { recursive: true });
    await mkdir(join(dir, '.agents/skills'), { recursive: true });
    for (const name of template.bundledSkills) {
      const src = defaultPath('skills', name);
      await cp(src, join(dir, '.claude/skills', name), { recursive: true });
      await cp(src, join(dir, '.agents/skills', name), { recursive: true });
    }
  }
}

/**
 * Live persona override (`data/brain/persona.md`) wins; else the shipped
 * default (`default/persona.default.md`); else none. Same precedence the
 * persona route and `main.ts` use.
 */
async function resolvePersona(): Promise<string | null> {
  const live = dataPath('brain', 'persona.md');
  if (existsSync(live)) return readFile(live, 'utf8');
  const fallback = defaultPath('persona.default.md');
  if (existsSync(fallback)) return readFile(fallback, 'utf8');
  return null;
}
