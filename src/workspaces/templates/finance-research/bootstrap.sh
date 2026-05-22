#!/usr/bin/env bash
# Bootstrap a finance-research workspace: same skeleton as `chat`
# (OpenAlice MCP wiring + Alice persona) plus fresh clones of two
# himself65/* SKILL.md collections, with their trees copied into both
# Claude Code's and Codex's project-local discovery paths.
#
# Contract:
#   argv:  $1 = tag, $2 = outDir
#   env:   AQ_TEMPLATE_FILES_DIR  — abs path to this template's files/
#          AQ_LAUNCHER_REPO_ROOT  — abs path to the OpenAlice repo root
# exit:  0 ok, non-zero on any failure
#
# Design notes (do not "optimize" without re-reading):
#   - Skill is a DISCOVERY structure, not a registration structure.
#     `.claude/skills/<name>/SKILL.md` is auto-discovered by Claude Code
#     when launched in this dir; `.agents/skills/<name>/SKILL.md` is
#     auto-discovered by Codex (per developers.openai.com/codex/skills,
#     verified 2026-05-15). So bootstrap is just: clone + cp. No
#     `claude plugin install`, no `npx skills add`, no marketplace
#     registration, no `~/.claude/plugins/` writes.
#   - We git clone the upstream repos FRESH on every workspace creation,
#     intentionally NOT mirror-cached like Auto-Quant. Upstream
#     clone-traffic is co-promotion of an open-source author who's part
#     of the ecosystem we want to grow.
#   - finance-skills plugin selection skips finance-startup-tools (not
#     trading-related), finance-ui-tools (generative UI, off-scope), and
#     finance-skill-creator (developer meta tool). trade-skills only
#     ships one plugin (trade) today; we install it whole. Anyone wanting
#     a different selection edits these arrays — there's no need for a
#     config layer until that becomes a real ask.
#   - The trade skill is hard-wired to Funda AI (api.funda.ai/v1) via the
#     funda-data skill bundled in finance-skills' data-providers plugin.
#     Without a FUNDA_API_KEY in the workspace .env it'll refuse to run —
#     that's documented in the template's CLAUDE.md, not enforced here.

set -euo pipefail

TAG="${1:?tag required}"
OUT_DIR="${2:?outDir required}"
: "${AQ_TEMPLATE_FILES_DIR:?AQ_TEMPLATE_FILES_DIR must be set by the launcher}"

source "$(dirname "${BASH_SOURCE[0]}")/../_common.sh"

FINANCE_SKILLS_REPO="https://github.com/himself65/finance-skills.git"
FINANCE_SKILLS_DIR=".finance-skills"
FINANCE_PLUGINS=(market-analysis social-readers data-providers)

TRADE_SKILLS_REPO="https://github.com/himself65/trade-skills.git"
TRADE_SKILLS_DIR=".trade-skills"
TRADE_PLUGINS=(trade)

init_workspace_dir "$OUT_DIR"
WS_ID="$(extract_ws_id "$OUT_DIR")"

write_mcp_config "$WS_ID" "$AQ_TEMPLATE_FILES_DIR"
compose_persona_claude_md "$AQ_TEMPLATE_FILES_DIR"
copy_readme

git init -q
# Upstream clones are best-effort scaffolding; users shouldn't bake them
# into their own commits. Per-skill excludes (added by the installer
# below) keep user-authored skills in .claude/skills/<custom>/ trackable
# while keeping the bundled upstream ones invisible to git status.
setup_git_excludes \
  "$FINANCE_SKILLS_DIR/" \
  "$TRADE_SKILLS_DIR/" \
  ".openalice-finance-info"

mkdir -p .claude/skills .agents/skills

# Globals collected by install_skills_from across both repos.
SKILLS_INSTALLED=()
SKILLS_FAILED=()

# install_skills_from <local_dir> <plugin_a> [<plugin_b> ...]
# For each plugin, copy every skill under $local_dir/plugins/$plugin/skills/
# into .claude/skills/<name>/ and .agents/skills/<name>/, and record an
# exclude line per name. Collisions are warned and skipped, never
# silently overwritten.
install_skills_from() {
  local local_dir="$1"
  shift
  local plugins=("$@")
  local plugin src skill_dir name
  for plugin in "${plugins[@]}"; do
    src="$local_dir/plugins/$plugin/skills"
    if [[ ! -d "$src" ]]; then
      echo "[finance-research] WARN: missing $src in $local_dir" >&2
      SKILLS_FAILED+=("$plugin/* (not in $local_dir)")
      continue
    fi
    for skill_dir in "$src"/*/; do
      [[ -d "$skill_dir" ]] || continue
      name="$(basename "$skill_dir")"
      if [[ -e ".claude/skills/$name" ]] || [[ -e ".agents/skills/$name" ]]; then
        echo "[finance-research] WARN: skill name collision '$name'; skipping" >&2
        SKILLS_FAILED+=("$name (collision)")
        continue
      fi
      cp -R "$skill_dir" ".claude/skills/$name"
      cp -R "$skill_dir" ".agents/skills/$name"
      echo ".claude/skills/$name" >> .git/info/exclude
      echo ".agents/skills/$name" >> .git/info/exclude
      SKILLS_INSTALLED+=("$name")
    done
  done
}

# clone_upstream <repo_url> <local_dir> <ok_var> <commit_var>
# Shallow clone <repo_url> into <local_dir>. Writes 'true'/'false' to
# <ok_var> and the cloned HEAD (or empty) to <commit_var>. Never aborts
# the bootstrap — a workspace without one upstream repo is still usable.
clone_upstream() {
  local repo_url="$1"
  local local_dir="$2"
  local ok_var="$3"
  local commit_var="$4"
  echo "[finance-research] cloning $repo_url (shallow) ..." >&2
  if git clone --depth=1 --quiet "$repo_url" "$local_dir" >&2; then
    local commit
    commit="$(git -C "$local_dir" rev-parse HEAD 2>/dev/null || echo unknown)"
    printf -v "$ok_var" '%s' 'true'
    printf -v "$commit_var" '%s' "$commit"
    echo "[finance-research] cloned $local_dir at $commit" >&2
  else
    echo "[finance-research] WARN: git clone $repo_url failed; workspace usable without it" >&2
    printf -v "$ok_var" '%s' 'false'
    printf -v "$commit_var" '%s' ''
  fi
}

# ── Clone + install finance-skills ──────────────────────────────────────
FINANCE_OK=false
FINANCE_COMMIT=""
clone_upstream "$FINANCE_SKILLS_REPO" "$FINANCE_SKILLS_DIR" FINANCE_OK FINANCE_COMMIT
if [[ "$FINANCE_OK" == "true" ]]; then
  install_skills_from "$FINANCE_SKILLS_DIR" "${FINANCE_PLUGINS[@]}"
fi

# ── Clone + install trade-skills ────────────────────────────────────────
TRADE_OK=false
TRADE_COMMIT=""
clone_upstream "$TRADE_SKILLS_REPO" "$TRADE_SKILLS_DIR" TRADE_OK TRADE_COMMIT
if [[ "$TRADE_OK" == "true" ]]; then
  install_skills_from "$TRADE_SKILLS_DIR" "${TRADE_PLUGINS[@]}"
fi

# ── Debug breadcrumb ────────────────────────────────────────────────────
{
  echo "# OpenAlice finance-research workspace"
  echo "createdAt: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "tag: $TAG"
  echo "wsId: $WS_ID"
  echo "financeSkillsRepo: $FINANCE_SKILLS_REPO"
  echo "financeSkillsCloned: $FINANCE_OK"
  echo "financeSkillsCommit: ${FINANCE_COMMIT:-n/a}"
  echo "tradeSkillsRepo: $TRADE_SKILLS_REPO"
  echo "tradeSkillsCloned: $TRADE_OK"
  echo "tradeSkillsCommit: ${TRADE_COMMIT:-n/a}"
  echo "skillsInstalled: ${SKILLS_INSTALLED[*]:-none}"
  echo "skillsFailed: ${SKILLS_FAILED[*]:-none}"
  echo "discoveryPaths:"
  echo "  - .claude/skills/   (Claude Code)"
  echo "  - .agents/skills/   (Codex)"
} > .openalice-finance-info

commit_initial "$TAG" finance-research

if [[ ${#SKILLS_FAILED[@]} -gt 0 ]]; then
  echo "[finance-research] bootstrapped with WARN: ${SKILLS_FAILED[*]}" >&2
fi

echo "bootstrapped finance-research workspace '$TAG' at $OUT_DIR with ${#SKILLS_INSTALLED[@]} skills"
