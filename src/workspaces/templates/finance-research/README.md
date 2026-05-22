---
version: 1.1.0
---

# Finance Research

A research-focused coworker bundled with two [@himself65](https://github.com/himself65) skill libraries — [finance-skills](https://github.com/himself65/finance-skills) (equity fundamentals via yfinance, valuation models, earnings analysis, social-feed readers, sentiment scoring) and [trade-skills](https://github.com/himself65/trade-skills) (multi-leg options structuring with IV-aware, probability-weighted scenarios).

## What this workspace does

Spawns a workspace with both skill libraries pre-installed into:
- `.claude/skills/` for Claude Code's auto-discovery
- `.agents/skills/` for Codex's auto-discovery

Both layers load the same SKILL.md trees (finance-skills: market-analysis, social-readers, data-providers · trade-skills: trade) without needing any package install or marketplace registration. The agent has Alice's persona on top of OpenAlice's MCP surface, so it can pivot between research, options structuring, and trading inside one thread.

## When to spawn this

- You're researching a specific company or sector and want yfinance + valuation tooling ready to go.
- You're combining fundamental analysis with social-feed scraping (Reddit, Twitter, etc. via the bundled readers).
- You want a session that can answer "is this overvalued vs comparables" without you assembling the data path yourself.
- You want to sketch multi-leg options structures with IV/Greeks and dealer-flow context (requires a Funda AI subscription — see workspace `CLAUDE.md`).

## What you'll see in Inbox

- Research notes the agent writes up for your review.
- Valuation summaries with the data points she pulled to back them.
- Sentiment shifts she flags from the social readers.
- Options-structure proposals with strikes, probability-weighted P/L, and the pitfalls she checked them against.

## Parameters

- **Tag** — short identifier for this workspace.
- **Agents** — default Claude + Codex (both discover the same skill trees).

Both repos are cloned fresh on every spawn — no shared cache. Keeps upstream traffic visible to their maintainer, who's part of the ecosystem we want to grow.
