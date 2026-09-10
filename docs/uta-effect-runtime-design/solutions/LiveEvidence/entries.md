
# LiveEvidence — source investigation and migration evidence


## Entries

### MAP-04EB2CF21F

- mapping source: [services/uta/src/domain/trading/__test__/e2e/uta-lifecycle.e2e.spec.ts:171-204](../../../../services/uta/src/domain/trading/__test__/e2e/uta-lifecycle.e2e.spec.ts#L171-L204)
- symbol: describe UTA — TPSL end-to-end
- id: MAP-04EB2CF21F
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/uta-lifecycle.e2e.spec.ts:171-204
- currentBehavior: Spies verify TPSL object reaches MockBroker placeOrder, and absent TPSL reaches undefined.
- problem: Forwarding/call-count assertions are implementation-level and do not specify capability, unit, persistence, or actual attached-leg semantics.
- preservedBehavior:
  - Preserve TPSL values and absence semantics.
  - Preserve MockBroker coverage as simulator behavioral test, not call-count proof.
- openQuestions: —

### MAP-0A7103653D

- mapping source: [services/uta/src/domain/trading/__test__/e2e/ccxt-okx.e2e.spec.ts:197-230](../../../../services/uta/src/domain/trading/__test__/e2e/ccxt-okx.e2e.spec.ts#L197-L230)
- symbol: OKX derivative buy/position/close
- id: MAP-0A7103653D
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/ccxt-okx.e2e.spec.ts:197-230
- currentBehavior: ETH perp buy/position/close skips on Cash mode, mode error, or absent position; close recognizes code 51205/reduce-only unavailable.
- problem: Multiple unrelated error strings are treated as test skips, hiding unknown failures and not preserving mode/position state.
- preservedBehavior:
  - Preserve the explicit Cash-mode and genuinely contextual no-exposure handling; a missing ETH perp in tryPerpBuy remains a typed NotFound/precondition failure, not a blanket skip.
  - Preserve reduceOnly close requirement and never auto-switch account mode.
- openQuestions: —

### MAP-0FB902DDBC

- mapping source: [services/uta/src/domain/trading/__test__/e2e/alpaca-paper.e2e.spec.ts:198-221](../../../../services/uta/src/domain/trading/__test__/e2e/alpaca-paper.e2e.spec.ts#L198-L221)
- symbol: Alpaca getOrders by known ID
- id: MAP-0FB902DDBC
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/alpaca-paper.e2e.spec.ts:198-221
- currentBehavior: A further market buy waits, queries getOrders([id]), and closes the position; the suite uses IDs and status but no durable receipt.
- problem: Batch query is not scope-bound and cleanup after an ambiguous result can be duplicated or target the wrong order.
- preservedBehavior:
  - Preserve batch order lookup and bounded final close as an explicit operation whose Unknown outcome is surfaced for recovery.
  - Preserve remote IDs without assuming they imply filled state.
- openQuestions: —

### MAP-14606B82FF

- mapping source: [services/uta/src/domain/trading/__test__/e2e/ccxt-hyperliquid-markets.e2e.spec.ts:18-38](../../../../services/uta/src/domain/trading/__test__/e2e/ccxt-hyperliquid-markets.e2e.spec.ts#L18-L38)
- symbol: dummy credentials and public Hyperliquid init
- id: MAP-14606B82FF
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/ccxt-hyperliquid-markets.e2e.spec.ts:18-38
- currentBehavior: The test embeds dummy wallet/private-key strings, constructs CcxtBroker directly in sandbox mode, and catches init errors.
- problem: Credential-shaped literals and direct concrete provider-handle construction make private environment selection unsafe and bypass account discovery; the public catalog branch should not require fabricated account credentials.
- preservedBehavior:
  - Preserve sandbox-only market catalog intent and init error handling.
  - Preserve public-only possibility without inventing trading credentials.
- openQuestions: —

### MAP-147173C2A5

- mapping source: [services/uta/src/domain/trading/__test__/e2e/uta-ibkr.e2e.spec.ts:173-247](../../../../services/uta/src/domain/trading/__test__/e2e/uta-ibkr.e2e.spec.ts#L173-L247)
- symbol: IBKR legacy fill flow
- id: MAP-147173C2A5
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/uta-ibkr.e2e.spec.ts:173-247
- currentBehavior: Market flow stages/commits/pushes AAPL buy, conditionally syncs, verifies +1, closes one, conditionally syncs, checks baseline quantity, and requires two logs.
- problem: Baseline and sync are process-local; canonical contract identity and compensation not durable.
- preservedBehavior:
  - Preserve market-hours gate, sync branch, +1 expectation, close, baseline restoration, and logs.
  - Preserve conId-based identity.
- openQuestions: —

### MAP-14999AF99F

- mapping source: [services/uta/src/domain/trading/__test__/e2e/uta-lifecycle.e2e.spec.ts:208-282](../../../../services/uta/src/domain/trading/__test__/e2e/uta-lifecycle.e2e.spec.ts#L208-L282)
- symbol: describe UTA — precision end-to-end
- id: MAP-14999AF99F
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/uta-lifecycle.e2e.spec.ts:208-282
- currentBehavior: Precision scenarios exercise fractional quantities, exact partial subtraction, precise limit fields, JSON string serialization, and clean decimal values through stage→push→broker.
- problem: Decimal correctness is spread across implementation assertions; sentinel/default and unit metadata are not centralized wire invariants.
- preservedBehavior:
  - Preserve all fractional/limit precision examples and string JSON values.
  - Preserve exact 1.0−0.3=0.7 and clean 0.3 behavior.
- openQuestions: —

### MAP-23AEA53AD6

- mapping source: [services/uta/src/domain/trading/__test__/e2e/setup.ts:141-144](../../../../services/uta/src/domain/trading/__test__/e2e/setup.ts#L141-L144)
- symbol: filterByProvider
- id: MAP-23AEA53AD6
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/setup.ts:141-144
- currentBehavior: filterByProvider filters TestAccount by provider engine equality.
- problem: Engine equality alone cannot distinguish venue/preset/environment or capabilities; it can select wrong account among same-engine venues.
- preservedBehavior:
  - Preserve provider-engine filtering as one query dimension.
  - Preserve easy test selection for a unique configured engine.
- openQuestions: —

### MAP-25C7BC81F2

- mapping source: [services/uta/src/domain/trading/__test__/e2e/ibkr-paper.e2e.spec.ts:32-40](../../../../services/uta/src/domain/trading/__test__/e2e/ibkr-paper.e2e.spec.ts#L32-L40)
- symbol: beforeAll IBKR paper setup
- id: MAP-25C7BC81F2
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/ibkr-paper.e2e.spec.ts:32-40
- currentBehavior: Setup picks the first IBKR account, initializes broker, reads market clock, and stores marketOpen.
- problem: First-match account selection and cached session state are not explicit scope/readiness evidence.
- preservedBehavior:
  - Preserve paper TWS/Gateway and market-hours split.
  - Preserve provider adapter isolation.
- openQuestions: —

### MAP-2B14BC2DD9

- mapping source: [services/uta/src/domain/trading/__test__/e2e/ibkr-paper.e2e.spec.ts:128-217](../../../../services/uta/src/domain/trading/__test__/e2e/ibkr-paper.e2e.spec.ts#L128-L217)
- symbol: IbkrBroker canonical conId routing
- id: MAP-2B14BC2DD9
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/ibkr-paper.e2e.spec.ts:128-217
- currentBehavior: Canonical USD.CHF conId is resolved, baseline positions/open-order IDs captured, polluted fields are sent only as what-if, and finally extra orders are cancelled and baseline arrays compared; evidence is appended.
- problem: Identity/routing safety and baseline cleanup are implemented by ad-hoc finally logic; what-if result, no-state-delta, and evidence have no durable transaction relation.
- preservedBehavior:
  - Preserve polluted-field regression and what-if non-mutation check.
  - Preserve exact baseline order IDs/position comparison and cleanup of only introduced orders.
- openQuestions: —

### MAP-301A0F7EF8

- mapping source: [services/uta/src/domain/trading/__test__/e2e/ccxt-hyperliquid-markets.e2e.spec.ts:64-79](../../../../services/uta/src/domain/trading/__test__/e2e/ccxt-hyperliquid-markets.e2e.spec.ts#L64-L79)
- symbol: Hyperliquid BTC perpetual search
- id: MAP-301A0F7EF8
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/ccxt-hyperliquid-markets.e2e.spec.ts:64-79
- currentBehavior: Searches BTC and accepts a result when symbol is BTC or localSymbol starts with BTC.
- problem: String-prefix heuristics can select spot, perp, or an unrelated contract and do not prove the canonical product; the public catalog scope is not the missing account identity.
- preservedBehavior:
  - Preserve BTC discovery and local-symbol display for humans.
  - Preserve ability to search broad pattern while refusing ambiguous mutation.
- openQuestions: —

### MAP-32BC46FDBD

- mapping source: [services/uta/src/domain/trading/__test__/e2e/ccxt-bybit.e2e.spec.ts:111-138](../../../../services/uta/src/domain/trading/__test__/e2e/ccxt-bybit.e2e.spec.ts#L111-L138)
- symbol: Bybit order query by ID
- id: MAP-32BC46FDBD
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/ccxt-bybit.e2e.spec.ts:111-138
- currentBehavior: Generic market buy returns success/orderId, waits five seconds, getOrder expects Filled, then closes.
- problem: `success` is an acknowledgement, while Filled is a later observation; fixed sleep is not restartable or evidence-backed.
- preservedBehavior:
  - Preserve order query and eventual Filled assertion as a scenario requirement.
  - Preserve close cleanup after confirmed or known fill.
- openQuestions: —

### MAP-34BF36C838

- mapping source: [services/uta/src/domain/trading/__test__/e2e/uta-ibkr.e2e.spec.ts:142-169](../../../../services/uta/src/domain/trading/__test__/e2e/uta-ibkr.e2e.spec.ts#L142-L169)
- symbol: IBKR TPSL pass-through
- id: MAP-34BF36C838
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/uta-ibkr.e2e.spec.ts:142-169
- currentBehavior: Stages IBKR limit with TP/SL, comments that IBKR ignores TPSL, pushes successfully, then cancels.
- problem: Ignoring fields silently violates preservation; the target must state unsupported native capability and maintain user intent/audit.
- preservedBehavior:
  - Preserve current successful limit placement/cancel when policy allows intentionally ignored TPSL.
  - Preserve TP/SL values in audit even when not sent.
- openQuestions: —

### MAP-3BF311EBD5

- mapping source: [services/uta/src/domain/trading/__test__/e2e/setup.ts:18-23](../../../../services/uta/src/domain/trading/__test__/e2e/setup.ts#L18-L23)
- symbol: TestAccount
- id: MAP-3BF311EBD5
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/setup.ts:18-23
- currentBehavior: TestAccount is a record of id, label, provider engine, and generic IBroker.
- problem: It lacks explicit account/subaccount scope, environment/provenance, readiness, and capabilities; label/id can be mistaken for identity.
- preservedBehavior:
  - Preserve id/label/provider for operator display and filtering.
  - Preserve a capability-handle reference at the adapter edge.
- openQuestions: —

### MAP-3D797361F3

- mapping source: [services/uta/src/domain/trading/__test__/e2e/setup.ts:86-95](../../../../services/uta/src/domain/trading/__test__/e2e/setup.ts#L86-L95)
- symbol: cached/getTestAccounts
- id: MAP-3D797361F3
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/setup.ts:86-95
- currentBehavior: A module-global cached Promise initializes all accounts once; every caller receives the same broker instances.
- problem: Global cache makes freshness, failure replay, and account scope implicit; it is safe only for serial tests, not durable runtime composition.
- preservedBehavior:
  - Preserve serial test reuse where explicitly scoped.
  - Preserve single init per test run as an optimization only.
- openQuestions: —

### MAP-3EEA8F2FEB

- mapping source: [services/uta/src/domain/trading/__test__/e2e/uta-lifecycle.e2e.spec.ts:153-167](../../../../services/uta/src/domain/trading/__test__/e2e/uta-lifecycle.e2e.spec.ts#L153-L167)
- symbol: legacy commit-history lifecycle test
- id: MAP-3EEA8F2FEB
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/uta-lifecycle.e2e.spec.ts:153-167
- currentBehavior: History records buy and close commits in reverse chronological order.
- problem: In-memory reverse order is a projection detail; durable event sequence/commit time and replay semantics are absent.
- preservedBehavior:
  - Preserve newest-first history and two commit messages.
  - Preserve immutable historical entries.
- openQuestions: —

### MAP-3FD0A99D87

- mapping source: [services/uta/src/domain/trading/__test__/e2e/uta-ccxt-bybit.e2e.spec.ts:100-134](../../../../services/uta/src/domain/trading/__test__/e2e/uta-ccxt-bybit.e2e.spec.ts#L100-L134)
- symbol: TPSL round-trip
- id: MAP-3FD0A99D87
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/uta-ccxt-bybit.e2e.spec.ts:100-134
- currentBehavior: Legacy TPSL stages rounded prices, pushes, waits, fetches order, optionally validates legs, then closes.
- problem: Legacy projection cannot prove bracket placement or identify parent/leg state; fixed sleep and JS rounding remain.
- preservedBehavior:
  - Preserve optional-leg note and close intent.
  - Preserve demo order size.
- openQuestions: —

### MAP-415093F05F

- mapping source: [services/uta/src/domain/trading/__test__/e2e/alpaca-paper.e2e.spec.ts:113-130](../../../../services/uta/src/domain/trading/__test__/e2e/alpaca-paper.e2e.spec.ts#L113-L130)
- symbol: Alpaca quote observation
- id: MAP-415093F05F
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/alpaca-paper.e2e.spec.ts:113-130
- currentBehavior: During an open session the test obtains an AAPL quote and requires positive last, bid, ask, and volume.
- problem: A quote is treated as ordinary numbers with no timestamp/session or stale-data semantics; the source does not state whether this market-data leaf is public or account-scoped, and zero or missing fields have no typed outcome.
- preservedBehavior:
  - Preserve positive price/volume assertions when market is open.
  - Keep quote data read-only and separate from order dispatch.
- openQuestions: —

### MAP-42049295D7

- mapping source: [services/uta/src/domain/trading/__test__/e2e/uta-bybit.e2e.spec.ts:24-47](../../../../services/uta/src/domain/trading/__test__/e2e/uta-bybit.e2e.spec.ts#L24-L47)
- symbol: beforeAll Bybit UTA setup
- id: MAP-42049295D7
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/uta-bybit.e2e.spec.ts:24-47
- currentBehavior: Setup selects Bybit CCXT account, searches ETH CRYPTO_PERP, composes aliceId from account id and localSymbol, creates UTA, waits for connect.
- problem: Concatenated account/localSymbol and first matching account are not explicit scope/canonical identity; connect state is process-local.
- preservedBehavior:
  - Preserve ETH perp discovery and account-qualified aliceId display.
  - Preserve waitForConnect.
- openQuestions: —

### MAP-424F0FB69C

- mapping source: [services/uta/src/domain/trading/__test__/e2e/live-paper-evidence.ts:6-38](../../../../services/uta/src/domain/trading/__test__/e2e/live-paper-evidence.ts#L6-L38)
- symbol: ContractEvidence and LivePaperEvidence schemas
- id: MAP-424F0FB69C
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/live-paper-evidence.ts:6-38
- currentBehavior: ContractEvidence and LivePaperEvidence are compact TypeScript interfaces with optional request/result, baseline counts, cleanup counts/match, and free-form scenario/phase/note.
- problem: Optional fields and free strings cannot distinguish missing evidence from negative evidence, bind records to account scope, or prevent accidental private payloads.
- preservedBehavior:
  - Preserve scenario/phase, canonical contract details, result status/error, baseline and cleanup match concepts.
  - Preserve small non-account payload and prohibition on credentials/balances.
- openQuestions: —

### MAP-444A62C6D5

- mapping source: [services/uta/src/domain/trading/__test__/e2e/ccxt-hyperliquid-markets.e2e.spec.ts:40-62](../../../../services/uta/src/domain/trading/__test__/e2e/ccxt-hyperliquid-markets.e2e.spec.ts#L40-L62)
- symbol: Hyperliquid market loading assertions
- id: MAP-444A62C6D5
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/ccxt-hyperliquid-markets.e2e.spec.ts:40-62
- currentBehavior: After init, the test accesses internal exchange markets, requires &gt;100 markets, and verifies both spot and swap entries through the exchange map.
- problem: Internal CCXT maps are not a stable catalog contract; a count threshold is neither canonical identity nor a versioned completeness proof, and the source does not prove that all namespaces were covered.
- preservedBehavior:
  - Preserve spot and swap coverage as explicit product capabilities.
  - Do not preserve arbitrary `&gt;100` as a domain invariant.
- openQuestions: —

### MAP-47B29B6218

- mapping source: [services/uta/src/domain/trading/__test__/e2e/uta-ccxt-bybit.e2e.spec.ts:182-216](../../../../services/uta/src/domain/trading/__test__/e2e/uta-ccxt-bybit.e2e.spec.ts#L182-L216)
- symbol: sentinel status/show/export boundary
- id: MAP-47B29B6218
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/uta-ccxt-bybit.e2e.spec.ts:182-216
- currentBehavior: Checks an enormous Decimal sentinel is absent from status/show/exportState/log before and after push, then closes the position.
- problem: Wire-boundary sanitization is tested indirectly; sentinel leakage can corrupt public approval, persistence, and audit representations.
- preservedBehavior:
  - Preserve clean decimal strings through status/show/export/log and provider round trip.
  - Preserve cleanup close.
- openQuestions: —

### MAP-47ED37A445

- mapping source: [services/uta/src/domain/trading/__test__/e2e/ccxt-raw-diagnostic.e2e.spec.ts:56-90](../../../../services/uta/src/domain/trading/__test__/e2e/ccxt-raw-diagnostic.e2e.spec.ts#L56-L90)
- symbol: raw closed/open order diagnostics
- id: MAP-47ED37A445
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/ccxt-raw-diagnostic.e2e.spec.ts:56-90
- currentBehavior: Diagnostic fetches closed/open raw orders and logs id/status/symbol/amount without substantive assertions.
- problem: Unscoped raw order reads cannot distinguish account scope or pagination completeness and are not useful durable evidence.
- preservedBehavior:
  - Preserve diagnostic visibility of IDs/status/symbol/amount.
  - Do not turn logs into success assertions.
- openQuestions: —

### MAP-4A1400D914

- mapping source: [services/uta/src/domain/trading/__test__/e2e/uta-bybit.e2e.spec.ts:203-236](../../../../services/uta/src/domain/trading/__test__/e2e/uta-bybit.e2e.spec.ts#L203-L236)
- symbol: buy with TPSL and fetched order
- id: MAP-4A1400D914
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/uta-bybit.e2e.spec.ts:203-236
- currentBehavior: Stage/pushes Bybit TPSL using rounded quote prices, fetches order after a wait, optionally checks legs, then closes.
- problem: Same rounding/optional-leg and fixed-delay issues as native CCXT path, now hidden behind UTA push and no durable parent/leg graph.
- preservedBehavior:
  - Preserve TP/SL intent and optional fetch behavior.
  - Preserve close cleanup.
- openQuestions: —

### MAP-4B824156CE

- mapping source: [services/uta/src/domain/trading/__test__/e2e/ccxt-okx.e2e.spec.ts:86-102](../../../../services/uta/src/domain/trading/__test__/e2e/ccxt-okx.e2e.spec.ts#L86-L102)
- symbol: OKX market search
- id: MAP-4B824156CE
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/ccxt-okx.e2e.spec.ts:86-102
- currentBehavior: BTC search requires exact spot and perp local symbols; ETH search requires exact perp symbol.
- problem: Exact local-symbol strings are venue-specific and bypass canonical product identity/catalog version; this public instrument search must not fabricate an account scope.
- preservedBehavior:
  - Preserve BTC spot+perp and ETH perp coverage.
  - Preserve human-readable local symbols in evidence.
- openQuestions: —

### MAP-4D4A864108

- mapping source: [services/uta/src/domain/trading/__test__/e2e/ccxt-bybit.e2e.spec.ts:140-184](../../../../services/uta/src/domain/trading/__test__/e2e/ccxt-bybit.e2e.spec.ts#L140-L184)
- symbol: Bybit TPSL and fetched order
- id: MAP-4D4A864108
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/ccxt-bybit.e2e.spec.ts:140-184
- currentBehavior: TPSL prices are derived with JS Number/Math.round, passed as optional takeProfit/stopLoss, then order is optionally fetched and closed.
- problem: Rounding can change decimal price units; optional fetched TPSL is not a capability result, and attached exits lack explicit parent/child identity.
- preservedBehavior:
  - Preserve TP/SL values and cleanup close.
  - Preserve optional note when venue does not return legs, but represent it as Unknown evidence.
- openQuestions:
  - The source does not prove whether the Bybit adapter returns parent-linked TP/SL legs for this request; acceptance must obtain a venue capability/observation fixture before claiming bracket confirmation.

### MAP-50F731ABB9

- mapping source: [services/uta/src/domain/trading/__test__/e2e/ccxt-hyperliquid.e2e.spec.ts:35-50](../../../../services/uta/src/domain/trading/__test__/e2e/ccxt-hyperliquid.e2e.spec.ts#L35-L50)
- symbol: beforeAll Hyperliquid setup
- id: MAP-50F731ABB9
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/ccxt-hyperliquid.e2e.spec.ts:35-50
- currentBehavior: Setup chooses the first CCXT account whose id contains hyperliquid, logs connected, and skips all tests if absent.
- problem: ID substring and first match are not environment/account proof.
- preservedBehavior:
  - Preserve Hyperliquid testnet-only safety gate.
  - Preserve provider adapter isolation at the capability boundary.
- openQuestions: —

### MAP-5460468AB4

- mapping source: [services/uta/src/domain/trading/__test__/e2e/ccxt-hyperliquid.e2e.spec.ts:78-93](../../../../services/uta/src/domain/trading/__test__/e2e/ccxt-hyperliquid.e2e.spec.ts#L78-L93)
- symbol: Hyperliquid BTC/ETH market search
- id: MAP-5460468AB4
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/ccxt-hyperliquid.e2e.spec.ts:78-93
- currentBehavior: Searches BTC and ETH and requires a CRYPTO_PERP result.
- problem: Result selection does not bind venue/settlement/catalog revision and can return an ambiguous product; a public instrument query must not invent an account or subaccount.
- preservedBehavior:
  - Preserve BTC and ETH perp discovery.
  - Preserve CRYPTO_PERP semantic requirement.
- openQuestions: —

### MAP-55F8053385

- mapping source: [services/uta/src/domain/trading/__test__/e2e/uta-lifecycle.e2e.spec.ts:21-26](../../../../services/uta/src/domain/trading/__test__/e2e/uta-lifecycle.e2e.spec.ts#L21-L26)
- symbol: beforeEach MockBroker setup
- id: MAP-55F8053385
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/uta-lifecycle.e2e.spec.ts:21-26
- currentBehavior: beforeEach creates fresh MockBroker with cash 100000, AAPL/ETH quotes, and a UnifiedTradingAccount.
- problem: The deterministic simulator is useful but can be mistaken for live evidence; freshness/scope and isolation are implicit mutable globals.
- preservedBehavior:
  - Preserve fresh cash/quote seed and isolated lifecycle tests.
  - Preserve MockBroker as real behavior simulator, not a stub.
- openQuestions: —

### MAP-585A2F9006

- mapping source: [services/uta/src/domain/trading/__test__/e2e/ccxt-bybit.e2e.spec.ts:93-109](../../../../services/uta/src/domain/trading/__test__/e2e/ccxt-bybit.e2e.spec.ts#L93-L109)
- symbol: Bybit position and reduceOnly close
- id: MAP-585A2F9006
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/ccxt-bybit.e2e.spec.ts:93-109
- currentBehavior: After the prior buy, the test reads ETH position and closes 0.01 through generic closePosition.
- problem: The quantity and prior-buy ownership are implicit; close can over-close unrelated exposure and observation is not tied to a transaction.
- preservedBehavior:
  - Preserve 0.01 close behavior when the test-created position exists.
  - Preserve reduce-only semantics for the perp.
- openQuestions: —

### MAP-58AE86AEDD

- mapping source: [services/uta/src/domain/trading/__test__/e2e/ccxt-raw-diagnostic.e2e.spec.ts:29-54](../../../../services/uta/src/domain/trading/__test__/e2e/ccxt-raw-diagnostic.e2e.spec.ts#L29-L54)
- symbol: raw createOrder response diagnostic
- id: MAP-58AE86AEDD
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/ccxt-raw-diagnostic.e2e.spec.ts:29-54
- currentBehavior: Raw createOrder logs many normalized fields plus `info`, then best-effort reduce-only close catches and discards errors.
- problem: Raw createOrder logs selected fields plus info, then a reduce-only cleanup failure is swallowed; this loses cleanup Unknown and, unless explicitly marked as S7 external stimulus, bypasses transaction authority and redaction.
- preservedBehavior:
  - Preserve selected diagnostic fields (id/status/symbol/fill/cost) only in safe redacted form.
  - Preserve the deliberately excluded external-stimulus probe and cleanup intent, but surface failure and route takeover/cancel through Alice.
- openQuestions: —

### MAP-58F0FF7798

- mapping source: [services/uta/src/domain/trading/__test__/e2e/uta-alpaca.e2e.spec.ts:37-78](../../../../services/uta/src/domain/trading/__test__/e2e/uta-alpaca.e2e.spec.ts#L37-L78)
- symbol: describe UTA — Alpaca order lifecycle
- id: MAP-58F0FF7798
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/uta-alpaca.e2e.spec.ts:37-78
- currentBehavior: The suite derives a native key from a partial `{symbol: AAPL}` object via an `as any` cast, stages a $1 AAPL GTC limit, commits, pushes, stages/pushes cancel, and checks submitted results plus at least two legacy log entries.
- problem: Trading-as-Git commit/log and live mutation are mixed, and deriving identity from a cast partial contract can bypass canonical InstrumentId resolution; submitted does not prove fill/cancel observation.
- preservedBehavior:
  - Preserve staged/commit/push/cancel flow and two visible history entries.
  - Preserve safe GTC non-fill.
- openQuestions: —

### MAP-5A0732EC10

- mapping source: [services/uta/src/domain/trading/__test__/e2e/alpaca-paper.e2e.spec.ts:22-30](../../../../services/uta/src/domain/trading/__test__/e2e/alpaca-paper.e2e.spec.ts#L22-L30)
- symbol: beforeAll Alpaca broker setup
- id: MAP-5A0732EC10
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/alpaca-paper.e2e.spec.ts:22-30
- currentBehavior: beforeAll selects the first configured Alpaca account, stores a generic IBroker, waits for getMarketClock, and caches only a marketOpen boolean.
- problem: Array-order selection and a boolean clock do not prove the selected account is the intended paper scope, and a stale boolean cannot classify a later session change.
- preservedBehavior:
  - Preserve paper-only selection and market-hours gating; an unavailable precondition is a recorded Blocked disposition, not a passing skip.
  - Replace first-account and cached bool with explicit verified scope/session evidence.
- openQuestions: —

### MAP-5C9F33F93C

- mapping source: [services/uta/src/domain/trading/__test__/e2e/uta-ibkr.e2e.spec.ts:36-89](../../../../services/uta/src/domain/trading/__test__/e2e/uta-ibkr.e2e.spec.ts#L36-L89)
- symbol: FX identity staging
- id: MAP-5C9F33F93C
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/uta-ibkr.e2e.spec.ts:36-89
- currentBehavior: Searches USD.CHF CASH, builds conId-based aliceId/display USDCHF, stages LMT, asserts conId with blank exchange/currency, commits without push, records evidence, then rejects/clears staging.
- problem: The staged contract intentionally carries identity plus display-only fields, but raw shape and evidence/rejection are not typed or durable.
- preservedBehavior:
  - Preserve conId routing, USDCHF display, blank routing fields at UTA staging, no push, and cleanup.
  - Preserve live evidence note concept.
- openQuestions: —

### MAP-5F648FC9E1

- mapping source: [services/uta/src/domain/trading/__test__/e2e/uta-lifecycle.e2e.spec.ts:125-137](../../../../services/uta/src/domain/trading/__test__/e2e/uta-lifecycle.e2e.spec.ts#L125-L137)
- symbol: full-close lifecycle test
- id: MAP-5F648FC9E1
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/uta-lifecycle.e2e.spec.ts:125-137
- currentBehavior: Full close removes position and restores cash to 100000.
- problem: All-exposure close and cash projection assume immediate simulator settlement; live venues may leave unknown residuals/fees.
- preservedBehavior:
  - Preserve immediate Mock full-close and cash restoration.
  - Preserve all-exposure API as explicit policy.
- openQuestions: —

### MAP-60855A8312

- mapping source: [services/uta/src/domain/trading/__test__/e2e/alpaca-paper.e2e.spec.ts:34-68](../../../../services/uta/src/domain/trading/__test__/e2e/alpaca-paper.e2e.spec.ts#L34-L68)
- symbol: Alpaca connectivity
- id: MAP-60855A8312
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/alpaca-paper.e2e.spec.ts:34-68
- currentBehavior: Connectivity reads getAccount equity/cash, market clock, AAPL search, and positions; the test asserts numeric positivity for equity/cash and Decimal/string representations for position fields.
- problem: The positive equity/cash assertions would misclassify a legitimate signed loss or zero balance, while native account, position, and instrument values lack explicit scope, currency, and canonical identity.
- preservedBehavior:
  - Preserve Decimal quantity and string decimal serialization.
  - Preserve AAPL search and position/equity checks; bind account/position facts to AccountScope, while the catalog search uses Public or its provider-declared scope.
- openQuestions: —

### MAP-6119E3BEEE

- mapping source: [services/uta/src/domain/trading/__test__/e2e/uta-lifecycle.e2e.spec.ts:66-108](../../../../services/uta/src/domain/trading/__test__/e2e/uta-lifecycle.e2e.spec.ts#L66-L108)
- symbol: account state and limit-order reconciliation tests
- id: MAP-6119E3BEEE
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/uta-lifecycle.e2e.spec.ts:66-108
- currentBehavior: Limit buy is submitted, sync first sees no change, MockBroker externally fills pending order, sync then records filled and position quantity/avgCost.
- problem: External fill injection is not modeled as a durable observation source; sync may duplicate or miss transitions after crash.
- preservedBehavior:
  - Preserve submitted→external fill→sync behavior and avgCost 144.
  - Preserve no-op sync before fill.
- openQuestions: —

### MAP-61B4CADFAF

- mapping source: [services/uta/src/domain/trading/__test__/e2e/uta-ibkr.e2e.spec.ts:22-32](../../../../services/uta/src/domain/trading/__test__/e2e/uta-ibkr.e2e.spec.ts#L22-L32)
- symbol: beforeAll IBKR UTA setup
- id: MAP-61B4CADFAF
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/uta-ibkr.e2e.spec.ts:22-32
- currentBehavior: Setup selects first IBKR account, creates UTA, waits for connect, reads market clock, and caches marketOpen.
- problem: Implicit account and session state are unsafe for FX identity and market order dispatch.
- preservedBehavior:
  - Preserve UTA IBKR paper and market-hours split.
  - Preserve waitForConnect semantics as readiness step.
- openQuestions: —

### MAP-628E0887B1

- mapping source: [services/uta/src/domain/trading/__test__/e2e/uta-alpaca.e2e.spec.ts:176-246](../../../../services/uta/src/domain/trading/__test__/e2e/uta-alpaca.e2e.spec.ts#L176-L246)
- symbol: describe UTA — Alpaca fill flow (AAPL)
- id: MAP-628E0887B1
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/uta-alpaca.e2e.spec.ts:176-246
- currentBehavior: Market buy records initial quantity, stages/commits/pushes, optionally syncs submitted order, checks +1, stages/pushes close, optionally syncs, checks baseline quantity and &gt;=2 logs.
- problem: Baseline and sync are imperative and rely on immediate test process; ACK/filled and final baseline lack durable evidence.
- preservedBehavior:
  - Preserve +1 fill, sync branch for submitted, close, baseline restoration, and log entries.
  - Preserve market-hours gate.
- openQuestions: —

### MAP-68FD1B154A

- mapping source: [services/uta/src/domain/trading/__test__/e2e/ccxt-bybit.e2e.spec.ts:58-91](../../../../services/uta/src/domain/trading/__test__/e2e/ccxt-bybit.e2e.spec.ts#L58-L91)
- symbol: Bybit raw diagnostic plus generic placeOrder
- id: MAP-68FD1B154A
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/ccxt-bybit.e2e.spec.ts:58-91
- currentBehavior: The test reaches (broker as any).exchange, sends a raw ETH/USDT:USDT market buy, logs selected raw response fields, closes that diagnostic order, then exercises generic placeOrder and logs its result.
- problem: The raw Exchange mutation and selected response fields bypass the prepared/journaled UTA path; without a redacted, provenance-tagged boundary, diagnostic data can leak SDK details and an external order can be mistaken for UTA execution.
- preservedBehavior:
  - Preserve generic ETH perp order capability and cleanup intent.
  - Retain direct raw probing only as an explicitly labeled S7 external-stimulus diagnostic, excluded from UTA execution evidence; ordinary UTA mutation must not use the Exchange escape hatch.
- openQuestions: —

### MAP-7076DD2230

- mapping source: [services/uta/src/domain/trading/__test__/e2e/uta-lifecycle.e2e.spec.ts:110-123](../../../../services/uta/src/domain/trading/__test__/e2e/uta-lifecycle.e2e.spec.ts#L110-L123)
- symbol: partial-close lifecycle test
- id: MAP-7076DD2230
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/uta-lifecycle.e2e.spec.ts:110-123
- currentBehavior: Buys 10 AAPL, closes qty 3, then asserts position qty 7.
- problem: Close quantity arithmetic is not unit-qualified and no baseline/exposure policy prevents over-close in more complex states.
- preservedBehavior:
  - Preserve exact partial close 10→7.
  - Preserve generic close action.
- openQuestions: —

### MAP-73F753A129

- mapping source: [services/uta/src/domain/trading/__test__/e2e/setup.ts:62-84](../../../../services/uta/src/domain/trading/__test__/e2e/setup.ts#L62-L84)
- symbol: BROKER_INIT_TIMEOUT_MS and initWithTimeout
- id: MAP-73F753A129
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/setup.ts:62-84
- currentBehavior: initWithTimeout races broker.init against a 30-second timer and ignores late resolution after timeout.
- problem: A timed-out init may continue side effects; generic Error text loses account/attempt identity and cancellation capability.
- preservedBehavior:
  - Preserve 30s bound and late-settlement guard.
  - Preserve per-provider isolation.
- openQuestions: —

### MAP-7DAC2704FB

- mapping source: [services/uta/src/domain/trading/__test__/e2e/ccxt-okx.e2e.spec.ts:173-195](../../../../services/uta/src/domain/trading/__test__/e2e/ccxt-okx.e2e.spec.ts#L173-L195)
- symbol: isCashModeError and tryPerpBuy
- id: MAP-7DAC2704FB
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/ccxt-okx.e2e.spec.ts:173-195
- currentBehavior: Perp helper detects OKX code 51010/current-account-mode by regex and returns `{orderId,cashMode}` for callers.
- problem: Regex over error strings is unstable and a boolean helper conflates capability refusal with transport/domain failure.
- preservedBehavior:
  - Preserve cash-mode non-trading behavior and code 51010 handling.
  - Preserve orderId when a perp order succeeds.
- openQuestions:
  - The adapter must empirically map OKX account-mode error codes beyond the observed 51010 text before classifying additional variants as non-fatal capability refusal.

### MAP-7E7AB00B65

- mapping source: [services/uta/src/domain/trading/__test__/e2e/alpaca-paper.e2e.spec.ts:72-109](../../../../services/uta/src/domain/trading/__test__/e2e/alpaca-paper.e2e.spec.ts#L72-L109)
- symbol: Alpaca direct limit order lifecycle
- id: MAP-7E7AB00B65
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/alpaca-paper.e2e.spec.ts:72-109
- currentBehavior: The suite constructs native Contract/Order objects for a $1 GTC limit buy, calls placeOrder, then getOrder/getOrders and cancelOrder directly.
- problem: SDK objects cross the test boundary, the order has no serializable prepared identity, and query/cancel are not linked to a durable dispatch attempt.
- preservedBehavior:
  - Preserve a safe non-filling $1 GTC limit and post-place query/batch query/cancel workflow.
  - Preserve order ID linkage across cancel, but make missing IDs explicit failures.
- openQuestions: —

### MAP-813BFD59A1

- mapping source: [services/uta/src/domain/trading/__test__/e2e/ibkr-paper.e2e.spec.ts:44-92](../../../../services/uta/src/domain/trading/__test__/e2e/ibkr-paper.e2e.spec.ts#L44-L92)
- symbol: IbkrBroker connectivity
- id: MAP-813BFD59A1
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/ibkr-paper.e2e.spec.ts:44-92
- currentBehavior: Connectivity reads account/cash/clock, searches AAPL, gets Contract details, and checks Decimal quantity/string position fields.
- problem: Native Contract details and account/position values are not normalized into canonical identity, scope, and unit-qualified fields.
- preservedBehavior:
  - Preserve AAPL search/conId and Decimal/string invariants.
  - Preserve account/position observations without treating the source positive-equity assertion as a universal validity rule; signed zero/negative equity remains queryable while risk admission rejects nonpositive denominators.
- openQuestions: —

### MAP-81E8AC49C4

- mapping source: [services/uta/src/domain/trading/__test__/e2e/uta-lifecycle.e2e.spec.ts:30-64](../../../../services/uta/src/domain/trading/__test__/e2e/uta-lifecycle.e2e.spec.ts#L30-L64)
- symbol: market-buy dispatch and immediate-fill lifecycle tests
- id: MAP-81E8AC49C4
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/uta-lifecycle.e2e.spec.ts:30-64
- currentBehavior: Mock market push returns submitted while mutating position/cash; another test reports filled at push and sync updatedCount=0.
- problem: This deliberate behavior demonstrates Ack/fill timing variation, but current UTA tests can encode provider-specific immediate mutation as universal.
- preservedBehavior:
  - Preserve immediate MockBroker position/cash mutation and sync no-op where model says filled.
  - Preserve submitted status contract where model returns submitted.
- openQuestions: —

### MAP-85AF389920

- mapping source: [services/uta/src/domain/trading/__test__/e2e/setup.ts:50-58](../../../../services/uta/src/domain/trading/__test__/e2e/setup.ts#L50-L58)
- symbol: isTcpReachable
- id: MAP-85AF389920
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/setup.ts:50-58
- currentBehavior: TCP probe connects host/port with a two-second timeout and resolves true/false; socket errors resolve false.
- problem: Boolean reachability cannot distinguish refused, timeout, wrong service, or environment mismatch; a false result has no remediation/evidence.
- preservedBehavior:
  - Preserve bounded probe and no connection attempt when TWS unavailable.
  - Preserve false-safe behavior.
- openQuestions: —

### MAP-8800585703

- mapping source: [services/uta/src/domain/trading/__test__/e2e/live-paper-evidence.ts:40-52](../../../../services/uta/src/domain/trading/__test__/e2e/live-paper-evidence.ts#L40-L52)
- symbol: runStamp/runId/currentCommit/gitCommit
- id: MAP-8800585703
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/live-paper-evidence.ts:40-52
- currentBehavior: runStamp uses wall-clock ISO formatting; runId comes from env or stamp+pid; gitCommit comes from GITHUB_SHA/git rev-parse, falling back to unknown.
- problem: PID/time fallback is not a durable identity, wall-clock data is uncontrolled input, and unknown commit freshness can be mistaken for current code.
- preservedBehavior:
  - Preserve supplied OPENALICE_UTA_LIVE_RUN_ID and GITHUB_SHA precedence.
  - Preserve unknown fallback as explicit unknown, not a guessed hash.
- openQuestions: —

### MAP-8CB6B26E83

- mapping source: [services/uta/src/domain/trading/__test__/e2e/uta-alpaca.e2e.spec.ts:133-172](../../../../services/uta/src/domain/trading/__test__/e2e/uta-alpaca.e2e.spec.ts#L133-L172)
- symbol: describe UTA — Alpaca TPSL bracket
- id: MAP-8CB6B26E83
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/uta-alpaca.e2e.spec.ts:133-172
- currentBehavior: Stages market AAPL with TP/SL, pushes, fetches optional bracket legs, logs missing legs, then stages/pushes close.
- problem: Bracket support is optional and untyped; close may race attached legs and no parent/leg lifecycle is durable.
- preservedBehavior:
  - Preserve TP/SL prices and the source's missing-leg note as explicit NotReturned evidence.
  - Preserve eventual position close.
- openQuestions: —

### MAP-8D31A540CC

- mapping source: [services/uta/src/domain/trading/__test__/e2e/ccxt-hyperliquid.e2e.spec.ts:54-74](../../../../services/uta/src/domain/trading/__test__/e2e/ccxt-hyperliquid.e2e.spec.ts#L54-L74)
- symbol: Hyperliquid account and position observations
- id: MAP-8D31A540CC
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/ccxt-hyperliquid.e2e.spec.ts:54-74
- currentBehavior: Account info accepts base currency and equity &gt;= 0; positions require currency, positive marketPrice, and marketValue≈quantity×price, while the comment notes markPrice recovery from notional/contracts.
- problem: Approximate JS numeric comparison hides unit/rounding and recovery provenance; missing mark price can be silently synthesized without evidence.
- preservedBehavior:
  - Preserve mark-price recovery behavior when notional/contracts prove it.
  - Preserve marketValue equality as an invariant with qualified units; retain zero/negative account equity as signed observation rather than treating it as valuation failure.
- openQuestions: —

### MAP-8D95A00EF9

- mapping source: [services/uta/src/domain/trading/__test__/e2e/ccxt-raw-diagnostic.e2e.spec.ts:115-124](../../../../services/uta/src/domain/trading/__test__/e2e/ccxt-raw-diagnostic.e2e.spec.ts#L115-L124)
- symbol: market.id versus market.symbol diagnostic
- id: MAP-8D95A00EF9
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/ccxt-raw-diagnostic.e2e.spec.ts:115-124
- currentBehavior: Logs market.id, symbol, type, and settle for ETH/USDT candidates.
- problem: Native IDs and symbols are logged without canonical identity or catalog version, encouraging symbol-based routing; the public catalog evidence must not be mistaken for an account fact.
- preservedBehavior:
  - Preserve visibility of native market id/symbol/type/settle.
  - Preserve distinction between spot and perpetual.
- openQuestions: —

### MAP-914C5731FE

- mapping source: [services/uta/src/domain/trading/__test__/e2e/ccxt-hyperliquid.e2e.spec.ts:131-166](../../../../services/uta/src/domain/trading/__test__/e2e/ccxt-hyperliquid.e2e.spec.ts#L131-L166)
- symbol: Hyperliquid close and order query
- id: MAP-914C5731FE
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/ccxt-hyperliquid.e2e.spec.ts:131-166
- currentBehavior: The source first runs a standalone reduce-only BTC close, then in a separate test buys, waits three seconds, queries Filled, and closes again.
- problem: Reduce-only and cleanup are not represented as typed intent; fixed waits and sequential test state make duplicate/over-close possible, and the standalone close has no operation-owned baseline.
- preservedBehavior:
  - Preserve reduceOnly standalone cleanup and Filled query expectation.
  - Preserve cleanup after the second buy only when its owned delta is observed and authorized.
- openQuestions: —

### MAP-96BCC45A7C

- mapping source: [services/uta/src/domain/trading/__test__/e2e/uta-ccxt-bybit.e2e.spec.ts:45-98](../../../../services/uta/src/domain/trading/__test__/e2e/uta-ccxt-bybit.e2e.spec.ts#L45-L98)
- symbol: full lifecycle buy/sync/close
- id: MAP-96BCC45A7C
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/uta-ccxt-bybit.e2e.spec.ts:45-98
- currentBehavior: Stages/commits/pushes 0.01 buy, optionally syncs, compares final quantity to baseline tolerance, and requires two legacy commits.
- problem: Legacy commit history is treated as evidence of execution, and the secType-only lookup plus unqualified `&lt;0.02` final tolerance can hide another instrument or residual exposure; no durable Ack/observation or baseline ownership exists.
- preservedBehavior:
  - Preserve lifecycle and two visible commits as projection.
  - Preserve explicit sync branch, but do not preserve an unqualified 0.02 residual as acceptance.
- openQuestions: —

### MAP-9762F1BB09

- mapping source: [services/uta/src/domain/trading/__test__/e2e/ibkr-paper.e2e.spec.ts:25-30](../../../../services/uta/src/domain/trading/__test__/e2e/ibkr-paper.e2e.spec.ts#L25-L30)
- symbol: requiredOrderId
- id: MAP-9762F1BB09
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/ibkr-paper.e2e.spec.ts:25-30
- currentBehavior: requiredOrderId throws when an open order has no orderId, explicitly preventing unsafe cleanup.
- problem: Throwing generic Error loses a domain distinction: missing remote identity means cleanup cannot prove which order to cancel.
- preservedBehavior:
  - Preserve refusal to continue unsafe cleanup.
  - Preserve remote ID when present.
- openQuestions: —

### MAP-A60C86B58F

- mapping source: [services/uta/src/domain/trading/__test__/e2e/ccxt-hyperliquid.e2e.spec.ts:97-129](../../../../services/uta/src/domain/trading/__test__/e2e/ccxt-hyperliquid.e2e.spec.ts#L97-L129)
- symbol: Hyperliquid BTC buy and position
- id: MAP-A60C86B58F
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/ccxt-hyperliquid.e2e.spec.ts:97-129
- currentBehavior: Places a 0.001 BTC perp market buy, expects success/orderId, optionally validates execution, then reads BTC position and USD normalization.
- problem: Success and optional execution do not distinguish Ack from fill; the source comment about a $10 minimum is not runtime proof, and the later position read can race while USDC-to-USD normalization lacks an explicit policy.
- preservedBehavior:
  - Preserve the 0.001 BTC test quantity only when the declared venue minimum-notional/lot capability accepts it; do not treat the source comment as a universal guarantee.
  - Preserve optional execution logging without requiring it when the venue omits it.
- openQuestions:
  - The source does not prove Hyperliquid execution/fill latency or stablecoin normalization across all account modes; live acceptance must supply observed execution and currency-policy evidence.

### MAP-A9C599CFB8

- mapping source: [services/uta/src/domain/trading/__test__/e2e/ccxt-bybit.e2e.spec.ts:19-34](../../../../services/uta/src/domain/trading/__test__/e2e/ccxt-bybit.e2e.spec.ts#L19-L34)
- symbol: beforeAll Bybit broker setup
- id: MAP-A9C599CFB8
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/ccxt-bybit.e2e.spec.ts:19-34
- currentBehavior: Setup finds the first CCXT account whose id contains bybit, logs a skip if absent, and exposes a generic IBroker.
- problem: String matching and first-match selection do not establish Bybit demo environment or account scope.
- preservedBehavior:
  - Preserve Bybit demo-only gate and a recorded blocked disposition when unavailable.
  - Keep provider adapter isolation above the CCXT-specific leaf.
- openQuestions: —

### MAP-B164304E0C

- mapping source: [services/uta/src/domain/trading/__test__/e2e/uta-alpaca.e2e.spec.ts:87-129](../../../../services/uta/src/domain/trading/__test__/e2e/uta-alpaca.e2e.spec.ts#L87-L129)
- symbol: describe UTA — Alpaca AI tool aliceId resolution
- id: MAP-B164304E0C
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/uta-alpaca.e2e.spec.ts:87-129
- currentBehavior: AI tools are invoked by casting execute to Function and records to Record; search result aliceId is passed to getQuote/getContractDetails and source is checked.
- problem: Untyped tool calls and string aliceId obscure route/account scope and can stamp raw IDs onto contracts; errors become shape assumptions.
- preservedBehavior:
  - Preserve search→quote and details round-trip with a real account reference.
  - Preserve source/account display fields.
- openQuestions: —

### MAP-B41A0A0990

- mapping source: [services/uta/src/domain/trading/__test__/e2e/ibkr-paper.e2e.spec.ts:221-268](../../../../services/uta/src/domain/trading/__test__/e2e/ibkr-paper.e2e.spec.ts#L221-L268)
- symbol: IbkrBroker order lifecycle
- id: MAP-B41A0A0990
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/ibkr-paper.e2e.spec.ts:221-268
- currentBehavior: The suite searches AAPL, places $1 GTC limit, queries single and batch order, cancels, and finally checks any remaining open order.
- problem: Direct native order lifecycle lacks durable Ack/observation and a scoped cleanup lease.
- preservedBehavior:
  - Preserve safe non-filling price, single+batch queries, cancellation, and finally cleanup.
  - Preserve GTC semantics.
- openQuestions: —

### MAP-B4CCE8940E

- mapping source: [services/uta/src/domain/trading/__test__/e2e/setup.ts:97-139](../../../../services/uta/src/domain/trading/__test__/e2e/setup.ts#L97-L139)
- symbol: initAll
- id: MAP-B4CCE8940E
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/setup.ts:97-139
- currentBehavior: initAll reads config, filters paper/credentials/disabled, probes IBKR TCP, constructs brokers, times out broker.init, logs and skips init failures, and returns surviving accounts; because createBroker is outside the try block, a construction exception can abort discovery instead of producing a typed per-account skip.
- problem: Partial discovery is represented as an untyped list, skipped reasons and verified environment are lost, and a broker-construction exception escapes the per-account isolation boundary.
- preservedBehavior:
  - Preserve paper-only/disabled filtering, IBKR probe, 30s timeout, and surviving accounts.
  - Preserve one account failure not blocking unrelated accounts when policy allows, including construction failures represented as typed skips.
- openQuestions: —

### MAP-B5990574ED

- mapping source: [services/uta/src/domain/trading/__test__/e2e/ccxt-raw-diagnostic.e2e.spec.ts:92-113](../../../../services/uta/src/domain/trading/__test__/e2e/ccxt-raw-diagnostic.e2e.spec.ts#L92-L113)
- symbol: spot versus perpetual orderId diagnostic
- id: MAP-B5990574ED
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/ccxt-raw-diagnostic.e2e.spec.ts:92-113
- currentBehavior: Diagnostic checks spot/perp market presence, creates raw perp/optional spot orders, prints IDs/errors, and best-effort closes.
- problem: Optional spot mutation and raw presence checks mix catalog diagnosis with account mutation; raw errors are strings and the source is an external probe, not a UTA dispatch.
- preservedBehavior:
  - Preserve spot/perp comparison and optional spot diagnosis as a separately labeled external probe.
  - Preserve IDs/errors as safe summaries and surface unknown cleanup.
- openQuestions:
  - The diagnostic source does not establish complete spot/perp namespace coverage; catalog probe must report Partial/Unavailable until adapter pagination evidence exists.

### MAP-B65B828516

- mapping source: [services/uta/src/domain/trading/__test__/e2e/ccxt-bybit.e2e.spec.ts:36-56](../../../../services/uta/src/domain/trading/__test__/e2e/ccxt-bybit.e2e.spec.ts#L36-L56)
- symbol: Bybit account/position/contract reads
- id: MAP-B65B828516
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/ccxt-bybit.e2e.spec.ts:36-56
- currentBehavior: The suite reads account info, positions, and searches ETH CRYPTO_PERP; it asserts positive account equity, only checks that positions are an array, and logs values.
- problem: The positive-equity assertion would reject a legitimate zero/negative signed account observation, while exchange symbols and unqualified position fields can merge products or lose settlement/currency and scope.
- preservedBehavior:
  - Preserve ETH CRYPTO_PERP discovery and account/position reads.
  - Preserve Decimal arithmetic while retaining zero/negative signed equity as queryable facts and serializing qualified values as strings.
- openQuestions: —

### MAP-BA81ADF360

- mapping source: [services/uta/src/domain/trading/__test__/e2e/uta-ccxt-bybit.e2e.spec.ts:21-43](../../../../services/uta/src/domain/trading/__test__/e2e/uta-ccxt-bybit.e2e.spec.ts#L21-L43)
- symbol: beforeAll Bybit legacy UTA setup
- id: MAP-BA81ADF360
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/uta-ccxt-bybit.e2e.spec.ts:21-43
- currentBehavior: Legacy UTA setup chooses Bybit by ID substring, searches ETH perp, builds accountId|localSymbol aliceId, creates UTA, and waits for connect.
- problem: Same implicit environment/scope/identity issues remain in the legacy suite and must not be preserved as runtime authority.
- preservedBehavior:
  - Preserve legacy scenario coverage and display format during migration.
  - Preserve Bybit demo gate.
- openQuestions: —

### MAP-C2F022975E

- mapping source: [services/uta/src/domain/trading/__test__/e2e/live-paper-evidence.ts:68-87](../../../../services/uta/src/domain/trading/__test__/e2e/live-paper-evidence.ts#L68-L87)
- symbol: recordLivePaperEvidence
- raw sourceTargetChapters (provenance, includes duplicates): 7, 11, 13, 18, 18, 19
- id: MAP-C2F022975E
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/live-paper-evidence.ts:68-87
- currentBehavior: recordLivePaperEvidence creates ignored data/uta-live-paper-runs, appends one JSON line with schemaVersion/time/git/paper/broker/evidence, and returns path.
- problem: The append file is not atomic with transaction state, path is caller-controlled, and `paper:true`/broker string are trust claims; concurrent writes/imports lack sequence.
- preservedBehavior:
  - Preserve ignored JSONL convenience and small redacted records.
  - Preserve returned path for operator evidence.
- openQuestions:
  - The source does not prove concurrent JSONL append/import ordering; evidence sink acceptance must establish sequence/conflict handling under concurrent writers.

### MAP-C34FFFADB8

- mapping source: [services/uta/src/domain/trading/__test__/e2e/setup.ts:27-48](../../../../services/uta/src/domain/trading/__test__/e2e/setup.ts#L27-L48)
- symbol: isPaper and hasCredentials
- id: MAP-C34FFFADB8
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/setup.ts:27-48
- currentBehavior: isPaper delegates to preset, hasCredentials checks engine-specific fields, and IBKR is always considered credentialed because TWS/Gateway login supplies auth.
- problem: isPaper and credential presence are only config hints; they do not prove endpoint/environment or authenticated scope, and `Record&lt;string,unknown&gt;` loses schema.
- preservedBehavior:
  - Preserve engine-specific credential schemes (Alpaca key, CCXT wallet/key, IBKR TWS).
  - Preserve paper/sandbox/demo filtering as a safety hint.
- openQuestions: —

### MAP-C63562DE19

- mapping source: [services/uta/src/domain/trading/__test__/e2e/uta-lifecycle.e2e.spec.ts:139-151](../../../../services/uta/src/domain/trading/__test__/e2e/uta-lifecycle.e2e.spec.ts#L139-L151)
- symbol: cancel-order lifecycle test
- id: MAP-C63562DE19
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/uta-lifecycle.e2e.spec.ts:139-151
- currentBehavior: Pending limit is placed, cancel command is pushed, and getOrder reports Cancelled.
- problem: Cancel acknowledgement and terminal cancellation observation are conflated; duplicate cancel semantics are not specified.
- preservedBehavior:
  - Preserve pending limit cancellation and Cancelled status.
  - Preserve order ID linkage.
- openQuestions: —

### MAP-C7223C2B36

- mapping source: [services/uta/src/domain/trading/__test__/e2e/ccxt-okx.e2e.spec.ts:234-254](../../../../services/uta/src/domain/trading/__test__/e2e/ccxt-okx.e2e.spec.ts#L234-L254)
- symbol: OKX order query after place
- id: MAP-C7223C2B36
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/ccxt-okx.e2e.spec.ts:234-254
- currentBehavior: Derivative helper buys ETH perp, waits three seconds, getOrder expects Filled, then searches and closes 0.01.
- problem: Fixed delay and helper-derived identity lack durable observation, baseline, and idempotent cleanup.
- preservedBehavior:
  - Preserve order query Filled assertion when returned by venue.
  - Preserve final reduce-only cleanup.
- openQuestions: —

### MAP-CAA43D746F

- mapping source: [services/uta/src/domain/trading/__test__/e2e/uta-ccxt-bybit.e2e.spec.ts:136-180](../../../../services/uta/src/domain/trading/__test__/e2e/uta-ccxt-bybit.e2e.spec.ts#L136-L180)
- symbol: reject approval behavior
- id: MAP-CAA43D746F
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/uta-ccxt-bybit.e2e.spec.ts:136-180
- currentBehavior: Stages/commits a buy and calls reject with and without reason; staging is cleared and logs/show report user-rejected status/error.
- problem: Rejection is a Git/UTA side effect with no typed ApprovalRejected event or durable command receipt, and reason formatting is coupled to string output.
- preservedBehavior:
  - Preserve reasoned and reasonless rejection, `[rejected]` projection, and `Rejected by user` default; optional reason is stored as data, not validated by an invented string policy.
  - Preserve no remote dispatch for rejected plan.
- openQuestions: —

### MAP-CC43DAFDFD

- mapping source: [services/uta/src/domain/trading/__test__/e2e/ccxt-okx.e2e.spec.ts:62-82](../../../../services/uta/src/domain/trading/__test__/e2e/ccxt-okx.e2e.spec.ts#L62-L82)
- symbol: OKX connectivity and position observations
- id: MAP-CC43DAFDFD
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/ccxt-okx.e2e.spec.ts:62-82
- currentBehavior: Account requires USD base currency and positive equity; positions combine derivative positions and synthesized spot holdings, requiring currency/positive market price/value≈quantity×price.
- problem: Spot holdings and derivative exposure have different identities and valuation provenance, while the source also asserts positive equity even though zero or negative signed equity is a valid account observation; one loose Position shape hides both distinctions.
- preservedBehavior:
  - Preserve derivative + spot synthesis and the value invariant.
  - Preserve USD normalization only when adapter policy proves it; retain zero or negative reported equity/cash as signed facts for risk policy rather than rejecting the account.
- openQuestions: —

### MAP-CCFD876360

- mapping source: [services/uta/src/domain/trading/__test__/e2e/ccxt-okx.e2e.spec.ts:43-58](../../../../services/uta/src/domain/trading/__test__/e2e/ccxt-okx.e2e.spec.ts#L43-L58)
- symbol: beforeAll OKX setup and broker narrowing
- id: MAP-CCFD876360
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/ccxt-okx.e2e.spec.ts:43-58
- currentBehavior: Setup chooses the first CCXT account whose id contains okx and exposes generic broker; prose requires demo preset but code does not verify it.
- problem: Code can accidentally run against live OKX despite documentation, and ID matching is ambiguous.
- preservedBehavior:
  - Preserve demo-only intent and the provider capability adapter.
  - Preserve an explicit NotReady/Blocked disposition when no OKX account is available; it is not a passing live mutation result.
- openQuestions: —

### MAP-D16449202E

- mapping source: [services/uta/src/domain/trading/__test__/e2e/ccxt-raw-diagnostic.e2e.spec.ts:15-27](../../../../services/uta/src/domain/trading/__test__/e2e/ccxt-raw-diagnostic.e2e.spec.ts#L15-L27)
- symbol: beforeAll raw exchange setup
- id: MAP-D16449202E
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/ccxt-raw-diagnostic.e2e.spec.ts:15-27
- currentBehavior: Diagnostic setup selects a Bybit account, exposes `(broker as any).exchange`, and skips if absent.
- problem: A private Exchange instance and any-cast are used as a separate mutation-capable authority.
- preservedBehavior:
  - Preserve the deliberately excluded Bybit diagnostic as a typed NotReady/Blocked disposition when no account is available.
  - Preserve the S7 direct-probe exception only as external stimulus with separate evidence; it cannot bypass Alice/UTA for takeover or be counted as UTA execution.
- openQuestions: —

### MAP-D684830A67

- mapping source: [services/uta/src/domain/trading/__test__/e2e/alpaca-paper.e2e.spec.ts:178-196](../../../../services/uta/src/domain/trading/__test__/e2e/alpaca-paper.e2e.spec.ts#L178-L196)
- symbol: Alpaca position and close
- id: MAP-D684830A67
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/alpaca-paper.e2e.spec.ts:178-196
- currentBehavior: The test reads the AAPL position left by the previous market-buy test and calls generic closePosition without an explicit quantity.
- problem: Cross-test state is an implicit dependency; close-all semantics can consume unrelated pre-existing exposure and cannot be compensated precisely.
- preservedBehavior:
  - Preserve generic close API support where it means AllExposure.
  - Stop treating a prior test as the owner of current exposure.
- openQuestions: —

### MAP-DA8940C7D3

- mapping source: [services/uta/src/domain/trading/__test__/e2e/alpaca-paper.e2e.spec.ts:132-176](../../../../services/uta/src/domain/trading/__test__/e2e/alpaca-paper.e2e.spec.ts#L132-L176)
- symbol: Alpaca market buy and order query
- id: MAP-DA8940C7D3
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/alpaca-paper.e2e.spec.ts:132-176
- currentBehavior: A market AAPL buy requires placeOrder success and an orderId longer than ten characters; a later test places another buy, waits two seconds, getOrder expects Filled, and position state is read in the following test.
- problem: Immediate place success and a later Filled observation are conflated; the second buy depends on test ordering and has no baseline or per-operation scope.
- preservedBehavior:
  - Preserve returned order-ID logging and fill-polling intent; the later position read remains an observation, not a fill or cleanup receipt.
  - Do not infer cleanup from this source slice; the adjacent position-close scenario owns any later cleanup as a separate operation.
- openQuestions: —

### MAP-DC819A17DE

- mapping source: [services/uta/src/domain/trading/__test__/e2e/uta-ibkr.e2e.spec.ts:93-138](../../../../services/uta/src/domain/trading/__test__/e2e/uta-ibkr.e2e.spec.ts#L93-L138)
- symbol: IBKR legacy limit order lifecycle
- id: MAP-DC819A17DE
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/uta-ibkr.e2e.spec.ts:93-138
- currentBehavior: UTA stages/pushes AAPL GTC limit, stages/pushes cancel, checks submission and &gt;=2 log entries.
- problem: Same Git/dispatch mixing as Alpaca; remote ack/status and cancellation are not durable observations.
- preservedBehavior:
  - Preserve AAPL limit lifecycle, GTC, cancel, and two visible log commits.
  - Preserve no market-hour requirement.
- openQuestions: —

### MAP-E136AE0A4B

- mapping source: [services/uta/src/domain/trading/__test__/e2e/uta-bybit.e2e.spec.ts:133-199](../../../../services/uta/src/domain/trading/__test__/e2e/uta-bybit.e2e.spec.ts#L133-L199)
- symbol: AI tool aliceId resolution clusters
- id: MAP-E136AE0A4B
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/uta-bybit.e2e.spec.ts:133-199
- currentBehavior: Tool tests use Function/Record casts for generic search/quote and CCXT orderbook/funding/details calls, passing raw aliceId.
- problem: Public route lacks typed input/output and can bypass canonical native-key resolution; tool errors are only checked as absent fields.
- preservedBehavior:
  - Preserve all four AI read paths and their real aliceId semantics.
  - Preserve orderbook bids/asks and funding numeric result where available.
- openQuestions: —

### MAP-E4B0D38A44

- mapping source: [services/uta/src/domain/trading/__test__/e2e/ccxt-raw-diagnostic.e2e.spec.ts:126-158](../../../../services/uta/src/domain/trading/__test__/e2e/ccxt-raw-diagnostic.e2e.spec.ts#L126-L158)
- symbol: closed orders since-filter diagnostic
- id: MAP-E4B0D38A44
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/ccxt-raw-diagnostic.e2e.spec.ts:126-158
- currentBehavior: Compares unbounded and since-filtered closed orders, places an order, checks whether it appears within ten seconds, and best-effort closes.
- problem: Temporal query completeness and not-found semantics are unknown; absence after an external probe is not rejection, and the swallowed reduce-only cleanup error hides residual risk.
- preservedBehavior:
  - Preserve comparison of all vs recent history and the excluded external placement visibility probe.
  - Preserve cleanup intent only with surfaced Confirmed|StillWorking|Unknown|Rejected outcome; unknown requires recovery.
- openQuestions: —

### MAP-E5356E684D

- mapping source: [services/uta/src/domain/trading/__test__/e2e/ccxt-bybit.e2e.spec.ts:186-234](../../../../services/uta/src/domain/trading/__test__/e2e/ccxt-bybit.e2e.spec.ts#L186-L234)
- symbol: Bybit conditional/trigger order diagnostic
- id: MAP-E5356E684D
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/ccxt-bybit.e2e.spec.ts:186-234
- currentBehavior: A generic buy is followed by raw conditional sell trigger creation, internal `orderSymbolCache` mutation, getOrder/cancel, then close.
- problem: The trigger order is created through raw Exchange and the test mutates internal orderSymbolCache, bypassing ordinary transaction authority; trigger semantics and symbol resolution are untyped, while the direct probe must be distinguished as an S7 external stimulus if retained.
- preservedBehavior:
  - Preserve conditional trigger use as a capability-specific feature when supported, including the S7 external-stimulus diagnostic boundary.
  - Preserve reduceOnly close, but not internal cache mutation or untracked cleanup.
- openQuestions:
  - The source does not establish whether the venue trigger query exposes a stable native identity after cache invalidation; adapter observation coverage is required.

### MAP-E9EB273A72

- mapping source: [services/uta/src/domain/trading/__test__/e2e/uta-bybit.e2e.spec.ts:49-122](../../../../services/uta/src/domain/trading/__test__/e2e/uta-bybit.e2e.spec.ts#L49-L122)
- symbol: buy/sync/verify/close lifecycle
- id: MAP-E9EB273A72
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/uta-bybit.e2e.spec.ts:49-122
- currentBehavior: Captures initial perp quantity, stages/commits/pushes buy, optionally syncs, checks no pending orders, closes 0.01, syncs, compares final quantity within 0.02, and checks &gt;=2 logs.
- problem: Tolerance and initial-state lookup by secType are too broad; source accepts any final difference below 0.02 without a venue/lot policy, while transaction state/logging is not durable and external exposure changes can be hidden.
- preservedBehavior:
  - Preserve stage→commit→push→sync and cleanup; preserve a final tolerance only when it is an explicit venue/lot policy with evidence.
  - Preserve no pending orders after confirmation.
- openQuestions: —

### MAP-EE69E2CB46

- mapping source: [services/uta/src/domain/trading/__test__/e2e/ibkr-paper.e2e.spec.ts:96-124](../../../../services/uta/src/domain/trading/__test__/e2e/ibkr-paper.e2e.spec.ts#L96-L124)
- symbol: IbkrBroker currency tracking
- id: MAP-EE69E2CB46
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/ibkr-paper.e2e.spec.ts:96-124
- currentBehavior: Account baseCurrency must be a nonempty string; each position currency must exist and match contract.currency when present.
- problem: String checks do not encode currency units or missing/ambiguous contract currency.
- preservedBehavior:
  - Preserve currency field and contract equality requirement.
  - Preserve no-position early return.
- openQuestions: —

### MAP-F9A4323AA5

- mapping source: [services/uta/src/domain/trading/__test__/e2e/ibkr-paper.e2e.spec.ts:301-367](../../../../services/uta/src/domain/trading/__test__/e2e/ibkr-paper.e2e.spec.ts#L301-L367)
- symbol: IbkrBroker fill and exact baseline cleanup
- id: MAP-F9A4323AA5
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/ibkr-paper.e2e.spec.ts:301-367
- currentBehavior: The fill scenario captures AAPL baseline quantity/open IDs, buys one market share, polls until baseline+1, queries order, cancels introduced orders, closes only positive delta, polls back baseline, and requires exact IDs/quantity.
- problem: This is valuable compensation logic but lives in imperative finally; crash boundaries and journal ownership are absent, and quantity-only matching can miss account/instrument identity.
- preservedBehavior:
  - Preserve operation-owned delta cleanup, 15-poll bounded wait intent, and exact baseline checks.
  - Preserve refusal when quantity falls below baseline.
- openQuestions: —

### MAP-FA821E371F

- mapping source: [services/uta/src/domain/trading/__test__/e2e/live-paper-evidence.ts:54-65](../../../../services/uta/src/domain/trading/__test__/e2e/live-paper-evidence.ts#L54-L65)
- symbol: contractEvidence
- id: MAP-FA821E371F
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/live-paper-evidence.ts:54-65
- currentBehavior: contractEvidence copies native IBKR Contract conId, symbol/localSymbol, type/exchanges, currency, tradingClass, multiplier into a record.
- problem: A native Contract projection is not a canonical InstrumentId; empty/contradictory fields and unqualified multiplier can be persisted as if executable identity.
- preservedBehavior:
  - Preserve all currently captured native fields for audit.
  - Preserve conId routing evidence.
- openQuestions: —

### MAP-FACA90D0FC

- mapping source: [services/uta/src/domain/trading/__test__/e2e/uta-alpaca.e2e.spec.ts:23-33](../../../../services/uta/src/domain/trading/__test__/e2e/uta-alpaca.e2e.spec.ts#L23-L33)
- symbol: beforeAll Alpaca UTA setup
- id: MAP-FACA90D0FC
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/uta-alpaca.e2e.spec.ts:23-33
- currentBehavior: UTA setup selects first Alpaca account, creates UnifiedTradingAccount, waits for connect, and caches market clock bool.
- problem: UTA actor is not bound to AccountScope/runtime epoch and connection state is not durable; first account and stale clock are unsafe.
- preservedBehavior:
  - Preserve waitForConnect and market-hours gating.
  - Preserve the existing UnifiedTradingAccount compatibility facade during cutover, without making it the provider contract.
- openQuestions: —

### MAP-FBF3A41608

- mapping source: [services/uta/src/domain/trading/__test__/e2e/ccxt-okx.e2e.spec.ts:106-161](../../../../services/uta/src/domain/trading/__test__/e2e/ccxt-okx.e2e.spec.ts#L106-L161)
- symbol: OKX spot synthesis buy/sell
- id: MAP-FBF3A41608
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/ccxt-okx.e2e.spec.ts:106-161
- currentBehavior: Spot buy uses cashQty=$50, waits for balance, expects synthesized long with positive value and zero PnL; a separate sell-back test sells the entire observed BTC spot quantity and permits dust below 10%.
- problem: Notional sizing, balance propagation, synthetic avg cost, dust threshold, and cleanup are implicit; sell can touch pre-existing BTC.
- preservedBehavior:
  - Preserve the $50 spot buy and an explicitly authorized sell-back with a declared dust policy.
  - Preserve zero unrealized PnL for synthetic cost basis, but label it Unknown rather than economic truth.
- openQuestions:
  - The exact OKX dust/minimum-balance threshold is venue/account dependent; retain policy configuration and observe residual rather than hard-code a universal threshold.

### MAP-FFA9030D49

- mapping source: [services/uta/src/domain/trading/__test__/e2e/ibkr-paper.e2e.spec.ts:272-299](../../../../services/uta/src/domain/trading/__test__/e2e/ibkr-paper.e2e.spec.ts#L272-L299)
- symbol: IbkrBroker AAPL quote
- id: MAP-FFA9030D49
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/ibkr-paper.e2e.spec.ts:272-299
- currentBehavior: AAPL snapshot quote requires positive last/bid/ask; a known TWS snapshot timeout is logged and skipped, other errors rethrow.
- problem: Timeout handling is string/code-specific and a skip is not represented as market-data availability state.
- preservedBehavior:
  - Preserve known snapshot-timeout tolerance as a typed nonfatal precondition block, not a passing live-trading acceptance.
  - Preserve rethrow/stop for unknown errors.
- openQuestions:
  - The source observes a TWS snapshot timeout pattern but does not prove quote request behavior for every TWS/Gateway version; acceptance must preserve an explicit unavailable branch.
