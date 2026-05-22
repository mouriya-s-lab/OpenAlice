# Finance Research workspace

This workspace bundles two community SKILL.md collections by [@himself65](https://github.com/himself65) (面包):

- **[himself65/finance-skills](https://github.com/himself65/finance-skills)** — market data, valuation, earnings analysis, options payoff, social/research feeds.
- **[himself65/trade-skills](https://github.com/himself65/trade-skills)** — a multi-leg options trading assistant (concrete strikes, IV-aware structures, probability-weighted scenarios) backed by a curated library of pitfalls + case studies (INTC, Mag-7, APP). Hard-wired to Funda AI for market data — see *Two data layers* below.

## How it's wired

Bootstrap clones both upstream repos (latest `main`) into `./.finance-skills/` and `./.trade-skills/` respectively, and copies each SKILL.md tree into:

- `.claude/skills/<name>/` — discovered automatically by **Claude Code** when launched here
- `.agents/skills/<name>/` — discovered automatically by **Codex** (per [developers.openai.com/codex/skills](https://developers.openai.com/codex/skills))

No global install, no marketplace registration, no `~/.claude/plugins/` writes. SKILL.md is a discovery format — files in well-known directories Just Work for both agents.

## What's installed

From finance-skills, three of the upstream plugin packs (skipping the ones off-scope for trading):

- **finance-market-analysis** → `yfinance-data`, `company-valuation`, `earnings-preview`, `earnings-recap`, `estimate-analysis`, `etf-premium`, `options-payoff`, `saas-valuation-compression`, `sepa-strategy`, `stock-correlation`, `stock-liquidity`
- **finance-social-readers** → `discord-reader`, `linkedin-reader`, `opencli-reader`, `telegram-reader`, `twitter-reader`, `yc-reader`
- **finance-data-providers** → `finance-sentiment`, `funda-data`, `hormuz-strait`, `tradingview-reader`

From trade-skills, the single shipped plugin:

- **trade** → `trade` (multi-leg options structuring; calls `funda-data` for chains, IV/Greeks, GEX, flow)

See `.openalice-finance-info` for the exact upstream commits and the actual list of skills installed for this workspace.

## Two data layers — when to use which

This workspace gives you **two market-data surfaces** that overlap. Use them deliberately:

1. **OpenAlice's own MCP tools** (`/mcp` → `openalice`) — quotes, fundamentals, indicators, news. These are the **Alice canonical layer** wired to FMP / typebb / OpenBB. **Use these when a number will inform a trading decision** (UTA, position sizing, order routing) so the data口径 stays consistent with what Alice's trading engine sees.
2. **finance-skills + trade-skills** — yfinance, Funda AI, opencli, social readers, options structuring. **Use these to cover angles Alice doesn't ship** (Yahoo Finance historical depth, SaaS valuation compression, social sentiment, peer-screened correlation studies, multi-leg options scenarios).

Don't cross the streams: don't quote yfinance to make a UTA order routing call. Don't quote Alice's MCP to do a Twitter sentiment scan.

### Funda AI key (required for `trade` skill)

The `trade` skill calls `funda-data` for options chains, IV/Greeks, dealer GEX, flow, max pain — and explicitly refuses to fall back to yfinance / web search / estimates. To use it you need an **active [Funda AI](https://funda.ai) subscription** and a `FUNDA_API_KEY` in a root `.env` file (the skill resolves the key from env vars, local `.env`, or the git repo root `.env`).

Without the key the `trade` skill will refuse to run; the rest of the workspace (Alice's MCP tools + the other finance-skills) is unaffected.

## MCP wiring

`.mcp.json` points at OpenAlice's MCP server (`http://127.0.0.1:3001/mcp` by default, or `$OPENALICE_MCP_URL`). The full OpenAlice tool surface — trading, market data, news, brain, indicators — is available alongside the bundled skills.

To verify on first attach:

1. Approve the MCP server when Claude Code / Codex prompts for trust
2. Run `/mcp` — you should see `openalice · ✓ connected`
3. Run `/skills` — you should see the bundled finance skills alongside any built-in ones

## Upstream relationship

Both `himself65/finance-skills` and `himself65/trade-skills` are independent open-source projects. We clone fresh from upstream on each new workspace creation — that gives the author visible GitHub traffic and ensures you always get the latest. We do not fork, mirror, or modify upstream. If a skill behaves unexpectedly, file the issue at the relevant upstream repo, not OpenAlice.

## Recovery (if bootstrap missed any skills)

If `.openalice-finance-info` shows `skillsFailed: ...` (e.g. a clone failed), re-run the copy manually:

```bash
cd <this workspace>
git clone --depth=1 https://github.com/himself65/finance-skills.git .finance-skills
git clone --depth=1 https://github.com/himself65/trade-skills.git .trade-skills
mkdir -p .claude/skills .agents/skills
install_from() {
  local repo_dir="$1"; shift
  for plugin in "$@"; do
    for skill in "$repo_dir/plugins/$plugin/skills"/*/; do
      name=$(basename "$skill")
      cp -R "$skill" ".claude/skills/$name"
      cp -R "$skill" ".agents/skills/$name"
    done
  done
}
install_from .finance-skills market-analysis social-readers data-providers
install_from .trade-skills trade
```

Then your next `claude` / `codex` session in this dir picks them up — no restart of OpenAlice needed.
