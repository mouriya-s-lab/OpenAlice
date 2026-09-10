
# Identity — source investigation and migration evidence


## Entries

### MAP-0093FE974C

- mapping source: [services/uta/src/domain/trading/contract-discipline.ts:30-36](../../../../services/uta/src/domain/trading/contract-discipline.ts#L30-L36)
- symbol: SEC_TYPES
- id: MAP-0093FE974C
- sourceEvidence:
  - services/uta/src/domain/trading/contract-discipline.ts:30-36: SEC_TYPES is an IBKR SecType array with the OpenAlice CRYPTO_PERP extension
  - packages/ibkr/src/contract.ts:75-116: SEC_TYPE_VALUES and SecType currently contain 16 closed values
- currentBehavior: The array is a runtime allowlist and compile-time native type assertion for the current 16 values. It treats CRYPTO_PERP as the only intentional deviation and the current coercer drops any unknown raw string.
- problem: A global allowlist cannot represent venue-specific instrument context or capability. Keeping it in domain invites non-IBKR adapters to treat native labels as canonical and invites lossy unknown handling.
- preservedBehavior:
  - Keep all 16 listed native kinds, CRYPTO_PERP mapping, and unknown rejection
  - Preserve BAG legs and NEWS/non-tradable query semantics rather than collapsing them into a generic symbol
- openQuestions: —

### MAP-1D24B84F9B

- mapping source: [services/uta/src/domain/trading/brokers/fuzzy-rank.ts:20-29](../../../../services/uta/src/domain/trading/brokers/fuzzy-rank.ts#L20-L29)
- symbol: FuzzyRankInput
- id: MAP-1D24B84F9B
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/fuzzy-rank.ts:20-29: FuzzyRankInput is Pick&lt;Contract&gt; plus optional base/quote/name strings, and missing fields are intentionally tolerated
- currentBehavior: The ranker derives symbol/local/description from a partial SDK Contract and optional broker hints. No field carries canonical identity, source, venue, asset kind, or jurisdiction.
- problem: A partial Pick is not a safe catalog record: missing fields are silently interpreted as empty strings, and a symbol can be returned without enough information to resolve an order. Native metadata and domain identity are conflated.
- preservedBehavior:
  - Keep optional base/quote/name signals for CCXT and Alpaca ranking
  - Keep graceful omission of display fields, but not omission of executable identity
- openQuestions: —

### MAP-2044134F6B

- mapping source: [services/uta/src/domain/trading/contract-discipline.spec.ts:110-120](../../../../services/uta/src/domain/trading/contract-discipline.spec.ts#L110-L120)
- symbol: FUT validation test cluster
- id: MAP-2044134F6B
- sourceEvidence:
  - services/uta/src/domain/trading/contract-discipline.spec.ts:110-120: FUT tests require expiry and multiplier but not strike/right
- currentBehavior: The native validation accepts complete futures with YYYYMM expiry and multiplier while rejecting missing expiry/multiplier; strike/right are not required.
- problem: The test proves only a static IBKR field rule and leaves expiry format, multiplier units, canonical identity, and venue calendar semantics implicit.
- preservedBehavior:
  - Retain no strike/right requirement for futures
  - Retain required expiry/multiplier and multiplier-aware valuation
- openQuestions: —

### MAP-30D95BD47F

- mapping source: [services/uta/src/domain/trading/contract-search.spec.ts:9-14](../../../../services/uta/src/domain/trading/contract-search.spec.ts#L9-L14)
- symbol: makeDesc search fixture
- id: MAP-30D95BD47F
- sourceEvidence:
  - services/uta/src/domain/trading/contract-search.spec.ts:9-14: makeDesc creates ContractDescription, fills native Contract via makeContract, attaches aliceId/symbol, and initializes derivativeSecTypes
- currentBehavior: The fixture models a search hit as an SDK ContractDescription whose Contract carries augmented aliceId and display symbol; derivativeSecTypes is a raw string array.
- problem: The fixture bakes the prohibited identity augmentation and native object into the public search result. It cannot test canonical InstrumentId versus display symbol or typed derivative metadata.
- preservedBehavior:
  - Keep source and derivative information visible to callers
  - Keep makeDesc-like deterministic test data, but in a broker-neutral shape
- openQuestions: —

### MAP-3562FB9C00

- mapping source: [services/uta/src/domain/trading/contract-discipline.spec.ts:78-108](../../../../services/uta/src/domain/trading/contract-discipline.spec.ts#L78-L108)
- symbol: OPT/FOP validation test cluster
- id: MAP-3562FB9C00
- sourceEvidence:
  - services/uta/src/domain/trading/contract-discipline.spec.ts:78-108: OPT/FOP tests require expiry, strike, right, multiplier, accept a complete option, and reject right X
- currentBehavior: The tests exercise per-SecType required fields and assert invalid right through message regex. They use the IBKR Contract object as both input and expected valid output.
- problem: Requirements are represented as a runtime field bag and test assertions do not capture refined expiry/strike/right/multiplier units or account/venue capability. A valid native shape may still be untradeable in a given context.
- preservedBehavior:
  - Keep all four structural requirements and accept C/P/CALL/PUT native forms
  - Keep refusal of invalid right values, now as a typed issue
- openQuestions: —

### MAP-36F0A228A0

- mapping source: [services/uta/src/domain/trading/contract-discipline.spec.ts:46-76](../../../../services/uta/src/domain/trading/contract-discipline.spec.ts#L46-L76)
- symbol: universal contract validation test cluster
- id: MAP-36F0A228A0
- sourceEvidence:
  - services/uta/src/domain/trading/contract-discipline.spec.ts:46-76: tests valid STK, empty symbol/exchange, unknown BANANA via forced cast, and runtime legacy JSON leakage
- currentBehavior: The suite constructs mutable Contracts and checks `validateContract` returns false with string messages for missing universal fields or an unknown SecType. The forced cast explicitly simulates old JSON loading.
- problem: String search assertions and forced casts prove only message text, not a safe boundary decoder. The validator does not check canonical identity, jurisdiction, account scope, or whether a decoded field belongs to the selected instrument variant.
- preservedBehavior:
  - Continue rejecting missing symbol/secType/exchange/currency and unknown native kinds
  - Retain regression coverage for malformed legacy persisted data, but assert structured issues
- openQuestions: —

### MAP-3D1C0DC287

- mapping source: [services/uta/src/domain/trading/order-entry.spec.ts:1-23](../../../../services/uta/src/domain/trading/order-entry.spec.ts#L1-L23)
- symbol: makeFakeUta test double
- id: MAP-3D1C0DC287
- sourceEvidence:
  - services/uta/src/domain/trading/order-entry.spec.ts:1-23: makeFakeUta structurally casts commit/push/reject spies through unknown and fabricates a PushResult
- currentBehavior: The test double supplies only the methods executeOneShotOrder touches and bypasses UnifiedTradingAccount's actual state, journal, scheduler, and broker contracts using a cast.
- problem: A structural fake can make the one-shot helper look correct while hiding missing durability, approval, dispatch identity, and unknown-outcome behavior. It tests method calls rather than observable transaction state.
- preservedBehavior:
  - Retain a fast deterministic test double where testing a pure helper is appropriate
  - Replace this particular double because the helper itself is being removed
- openQuestions: —

### MAP-41607450D3

- mapping source: [services/uta/src/domain/trading/brokers/fuzzy-rank.ts:75-99](../../../../services/uta/src/domain/trading/brokers/fuzzy-rank.ts#L75-L99)
- symbol: fuzzyRankContracts
- id: MAP-41607450D3
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/fuzzy-rank.ts:75-99: fuzzyRankContracts trims/query-filters, stable-sorts, slices to limit/default 50, then allocates ContractDescription and Object.assign(new Contract(), input)
- currentBehavior: The function returns only top ContractDescription objects, silently drops zero-score and over-limit entries, and clones arbitrary Contract fields. It has no source failure, duplicate, canonical identity, or truncation metadata.
- problem: It combines pure ranking, pagination, and vendor object allocation. Shallow cloning lets SDK fields cross the shared boundary and silent slicing hides incomplete search results.
- preservedBehavior:
  - Preserve trim, zero-score filtering, descending score and source-order tie behavior through explicit source ordinal
  - Preserve bounded UI results with explicit metadata instead of silent slice
- openQuestions: —

### MAP-41CDC6BAAB

- mapping source: [services/uta/src/domain/trading/contract-discipline.ts:38-42](../../../../services/uta/src/domain/trading/contract-discipline.ts#L38-L42)
- symbol: SEC_TYPE_SET; isSecType
- id: MAP-41CDC6BAAB
- sourceEvidence:
  - services/uta/src/domain/trading/contract-discipline.ts:38-42: SEC_TYPE_SET and isSecType perform case-sensitive string membership against SEC_TYPES
- currentBehavior: isSecType narrows unknown values only by exact string membership. It is a runtime boundary predicate but accepts no context or normalized identity.
- problem: A boolean type guard erases why a value failed and is too weak as a persistence/transport decoder. Using it throughout domain code duplicates permissive unknown-string handling and bypasses typed issue payloads.
- preservedBehavior:
  - Keep case-sensitive native acceptance
  - Keep null/empty/unknown rejection, now carrying a structured reason
- openQuestions: —

### MAP-45D5DE1B9D

- mapping source: [services/uta/src/domain/trading/contract-search.spec.ts:17-30](../../../../services/uta/src/domain/trading/contract-search.spec.ts#L17-L30)
- symbol: default aggregate search vendor-participation test
- id: MAP-45D5DE1B9D
- sourceEvidence:
  - services/uta/src/domain/trading/contract-search.spec.ts:17-30: default aggregate includes enabled UTA, skips asVendor:false UTA, and never calls the excluded broker
- currentBehavior: Default search resolves all manager UTAs then filters by a legacy boolean `asVendor !== false`; failures and result ordering are tested only by source inclusion.
- problem: Participation is not a typed capability/authorization decision and no account scope, market context, identity deduplication, ranking, limit, or degraded-source failure is observable. A boolean flag can hide a configured but unavailable source.
- preservedBehavior:
  - Default search still excludes accounts explicitly marked non-participating for vendor search
  - Retain concurrent fan-out and avoid invoking excluded sources
- openQuestions: —

### MAP-4C9A6FE792

- mapping source: [services/uta/src/domain/trading/brokers/fuzzy-rank.ts:36-73](../../../../services/uta/src/domain/trading/brokers/fuzzy-rank.ts#L36-L73)
- symbol: score
- id: MAP-4C9A6FE792
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/fuzzy-rank.ts:36-73: score lowercases query/fields, assigns 100/80/70/50/30/20/0 tiers, and escapes regex metacharacters
- currentBehavior: score uses symbol, localSymbol, base, quote, and name/description; exact matches win, then prefixes and word-aware name matches, then substrings, with quote equality as the weakest signal. It returns a bare number.
- problem: The deterministic policy is useful but hidden behind SDK field extraction and a bare number. Case/trim policy, tie semantics, and quote fallback are not part of a named result contract, so different callers may diverge.
- preservedBehavior:
  - Retain all current tier ordering and escaped literal semantics
  - Retain source-order tie breaking in the enclosing ranking function
- openQuestions: —

### MAP-4D036C0223

- mapping source: [services/uta/src/domain/trading/brokers/contract-builder.ts:78-100](../../../../services/uta/src/domain/trading/brokers/contract-builder.ts#L78-L100)
- symbol: BuildPositionInput
- id: MAP-4D036C0223
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/contract-builder.ts:78-100: BuildPositionInput contains a Contract, Decimal quantity, raw monetary strings, optional multiplier, optional valuation pair, avgCostSource, and PositionRisk
- currentBehavior: The input accepts a mutable SDK Contract plus unparsed currency and valuation strings. `marketValue` and `unrealizedPnL` are optional independently, and risk metadata is passed through without a provenance or account scope.
- problem: The shape cannot tell whether a value came from the broker or local math, whether the currency matches the instrument/account, or whether an optional field is absent versus a native sentinel already decoded incorrectly.
- preservedBehavior:
  - Retain broker/wallet avg cost distinction and leveraged risk metadata
  - Retain Decimal precision and multiplier as an explicit output field and preserve partial scope/instrument/quantity facts
- openQuestions: —

### MAP-4D916C23A7

- mapping source: [services/uta/src/domain/trading/contract-discipline.ts:1-19](../../../../services/uta/src/domain/trading/contract-discipline.ts#L1-L19)
- symbol: module contract-discipline documentation
- id: MAP-4D916C23A7
- sourceEvidence:
  - services/uta/src/domain/trading/contract-discipline.ts:1-19: comments describe a canonical SecType taxonomy, per-kind requirements, and a phased broker-output enforcement plan
  - packages/ibkr/src/contract.ts:56-78,98-116: the current closed 16-value semantic set and no-new-SecType sign-off rule are the native source of truth
- currentBehavior: This range is documentation only. It claims IBKR taxonomy is canonical and says Phase 1 merely exposes machinery while Phase 2 wires throwing validation into builders; those phase claims can diverge from executable ownership.
- problem: Comments establish the wrong authority boundary: native IBKR taxonomy is described as domain canonical, and migration status is encoded in prose rather than one source of truth. Future readers may keep adding fields here instead of adapter codecs or inventing a new native kind.
- preservedBehavior:
  - Retain the useful explanation of why permissive native defaults need validation
  - Remove obsolete phase-status claims rather than appending contradictory notes
- openQuestions: —

### MAP-4FA5723DDD

- mapping source: [services/uta/src/domain/trading/brokers/contract-builder.spec.ts:5-58](../../../../services/uta/src/domain/trading/brokers/contract-builder.spec.ts#L5-L58)
- symbol: buildContract validation behavior tests
- id: MAP-4FA5723DDD
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/contract-builder.spec.ts:5-58: tests assert localSymbol defaults to symbol, OPT/FUT structural fields, unknown BANANA rejection, and minimal CRYPTO/CRYPTO_PERP acceptance
- currentBehavior: Tests observe IBKR Contract fields and generic thrown Error text. buildContract defaults localSymbol to symbol, leaves multiplier empty for STK, requires derivative fields, rejects an unknown SecType, and accepts crypto variants with universal fields.
- problem: The expected behavior is valuable but coupled to an SDK object and regex matching of error messages. Native SecType taxonomy is being asserted as if it were the domain instrument model, and no account/venue/jurisdiction identity is tested.
- preservedBehavior:
  - Keep localSymbol=symbol as an IBKR native default when no native local symbol exists
  - Keep strict derivative field requirements and CRYPTO_PERP support, but intentionally move their enforcement to the adapter/domain boundary
- openQuestions: —

### MAP-54ECEAEE5E

- mapping source: [services/uta/src/domain/trading/contract-discipline.ts:46-51](../../../../services/uta/src/domain/trading/contract-discipline.ts#L46-L51)
- symbol: ContractRequirements
- id: MAP-54ECEAEE5E
- sourceEvidence:
  - services/uta/src/domain/trading/contract-discipline.ts:46-51: ContractRequirements universal keys are SDK Contract keys and bySecType is a partial map of SDK keys
- currentBehavior: The requirement bag lists symbol/secType/exchange/currency universally and allows optional per-SecType arrays of keyof Contract. It has no identity, venue, market, account, or jurisdiction relation.
- problem: `keyof Contract` makes SDK field names the validation model and permits missing entries for kinds that may have context-specific requirements. It cannot express units, canonical identity, or capability conditions.
- preservedBehavior:
  - Keep universal symbol/exchange/currency checks where they map to a broker-neutral descriptor
  - Keep derivative-specific structural checks, but do not use the generic requirement bag as domain authority
- openQuestions: —

### MAP-5A77E2D561

- mapping source: [services/uta/src/domain/trading/brokers/fuzzy-rank.spec.ts:1-17](../../../../services/uta/src/domain/trading/brokers/fuzzy-rank.spec.ts#L1-L17)
- symbol: ranking test fixture helper
- id: MAP-5A77E2D561
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/fuzzy-rank.spec.ts:1-17: fixture helper constructs Contract, sets symbol/localSymbol/description/secType, and derives symbols from ContractDescription.contract
- currentBehavior: Every ranking fixture creates an IBKR Contract and expects fuzzyRankContracts to return ContractDescription objects. Optional base/quote/name hints are attached outside the contract.
- problem: The ranking policy is tested through SDK objects, so a shared catalog API can accidentally keep leaking vendor classes. Fixtures also have no canonical instrument identity or venue context, making cross-source result handling untestable.
- preservedBehavior:
  - Keep symbol/local/name/base/quote signals available to ranking
  - Keep tests for missing optional display fields, but express absence in the catalog schema
- openQuestions: —

### MAP-5BDBD294C0

- mapping source: [services/uta/src/domain/trading/brokers/contract-builder.ts:102-161](../../../../services/uta/src/domain/trading/brokers/contract-builder.ts#L102-L161)
- symbol: buildPosition
- id: MAP-5BDBD294C0
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/contract-builder.ts:102-161: multiplier selection, OPT/FOP guard, paired pass-through/partial derivation, and returned Position all use the SDK Contract
- currentBehavior: The function selects explicit multiplier, then Contract multiplier, then '1'; rejects OPT/FOP 1/empty; trusts both upstream valuation fields when present; otherwise derives missing fields; and returns Position with the Contract embedded.
- problem: A single function both interprets native identity and performs pure arithmetic. A partially supplied upstream valuation is mixed with derived output, and the multiplier guard is a generic Error rather than a typed observation failure.
- preservedBehavior:
  - Preserve arithmetic outcomes and explicit multiplier override for valid inputs
  - Preserve the final defense against 100x option undercount and retain partial position facts, with typed failures instead of throw
- openQuestions: —

### MAP-60408331F8

- mapping source: [services/uta/src/domain/trading/OrderHelper.ts:1-44](../../../../services/uta/src/domain/trading/OrderHelper.ts#L1-L44)
- symbol: SENTINEL_DECIMAL_FIELDS
- id: MAP-60408331F8
- sourceEvidence:
  - services/uta/src/domain/trading/OrderHelper.ts:1-44: the module imports IBKR Order and UNSET_DECIMAL and maintains a seven-name SENTINEL_DECIMAL_FIELDS list (totalQuantity through filledQuantity)
  - packages/ibkr/src/order.ts:47-75,195-209: Order has seven Decimal fields initialized to UNSET_DECIMAL
  - packages/ibkr/src/order.ts:71-72,95-110,120-135,180-185,218-225: Order also has UNSET_INTEGER and UNSET_DOUBLE fields outside that seven-name list
- currentBehavior: The list is the only declared inventory of Decimal-valued Order fields stripped before wire output; toWire leaves the SDK's UNSET_DOUBLE and UNSET_INTEGER fields enumerable. Its authority is placed in domain/trading even though all three sentinel classes are IBKR binary-protocol conventions.
- problem: A closed Decimal-only list in a shared domain module can silently miss a newly added SDK field, and the generic spread path can serialize UNSET_DOUBLE/UNSET_INTEGER as prices, quantities, offsets, or durations. The domain import makes broker-native representation part of every consumer's type graph.
- preservedBehavior:
  - Continue removing all seven known IBKR sentinel Decimal values before any UI, MCP, Git, or JSON boundary
  - Also remove every declared UNSET_DOUBLE/UNSET_INTEGER field at the native boundary, while keeping field-specific defaults inside broker adapters
- openQuestions: —

### MAP-684E054D47

- mapping source: [services/uta/src/domain/trading/order-entry.ts:35-73](../../../../services/uta/src/domain/trading/order-entry.ts#L35-L73)
- symbol: executeOneShotOrder
- id: MAP-684E054D47
- sourceEvidence:
  - services/uta/src/domain/trading/order-entry.ts:35-73: executeOneShotOrder invokes caller stage, synchronous uta.commit, then uta.push(preparedHash), catching each phase separately
- currentBehavior: A form callback stages an action, commit publishes a pending hash, and push executes it. Comments explicitly treat user-supplied form intent as manual approval and bypass the normal approval gate; commit failure returns without calling reject.
- problem: This function couples staging/Git mutation/broker mutation, has no write-ahead durable effect intent, bypasses approval/revision/digest checks, and cannot distinguish broker rejection from unknown remote outcome. A synchronous commit exception also does not prove remote non-execution in all future implementations.
- preservedBehavior:
  - Keep the four currently exposed form intentions as distinct user choices where the selected provider declares them; do not require every provider to implement all four
  - Keep rejection from inventing an unauthenticated rollback token when preparation failed
  - Intentionally remove the implicit form-is-approval bypass
- openQuestions: —

### MAP-68DA0FDCA7

- mapping source: [services/uta/src/domain/trading/contract-search.ts:27-42](../../../../services/uta/src/domain/trading/contract-search.ts#L27-L42)
- symbol: searchTradeableContracts normalization and source selection
- id: MAP-68DA0FDCA7
- sourceEvidence:
  - services/uta/src/domain/trading/contract-search.ts:27-43: searchTradeableContracts accepts raw pattern/source and AssetClassHint, normalizes, resolves one/all UTAs, and filters default targets by asVendor
- currentBehavior: The function trims through the normalization helper, returns [] for empty, resolves a raw source or all manager UTAs, and uses a boolean participation flag for default fan-out. It performs manager/account IO from domain code.
- problem: Raw strings are used as source identity, AssetClassHint is not a resolved market context, and domain code owns asynchronous account resolution. An empty array conflates no match, unavailable source, no configured targets, and invalid request.
- preservedBehavior:
  - Retain source override and default participation policy after authorization
  - Retain normalization behavior and no broker call for empty pattern
- openQuestions: —

### MAP-6C47FFB1F4

- mapping source: [services/uta/src/domain/trading/contract-search.spec.ts:32-42](../../../../services/uta/src/domain/trading/contract-search.spec.ts#L32-L42)
- symbol: explicit source override test
- id: MAP-6C47FFB1F4
- sourceEvidence:
  - services/uta/src/domain/trading/contract-search.spec.ts:32-42: explicit raw source `disabled` bypasses asVendor filtering and invokes that broker
- currentBehavior: Supplying a raw source string causes manager.resolve(source) to target that account even when its legacy asVendor flag is false. The source id is unbranded and no authorization is tested.
- problem: A caller can bypass default participation with an arbitrary string and potentially access a source without account-level read authorization. Read override must not imply transaction authority.
- preservedBehavior:
  - Explicit source search can intentionally query a non-default source
  - The source is invoked exactly once when authorized
- openQuestions: —

### MAP-6CEBFDFFDD

- mapping source: [services/uta/src/domain/trading/contract-search-rules.spec.ts:66-74](../../../../services/uta/src/domain/trading/contract-search-rules.spec.ts#L66-L74)
- symbol: normalization edge-case tests
- id: MAP-6CEBFDFFDD
- sourceEvidence:
  - services/uta/src/domain/trading/contract-search-rules.spec.ts:66-74: empty input remains empty and surrounding whitespace is trimmed before crypto normalization
- currentBehavior: An empty string returns empty; surrounding whitespace is removed before suffix handling. searchTradeableContracts then maps an empty normalized pattern to an empty result.
- problem: At the pure helper level empty is harmless, but a protocol/application endpoint needs to distinguish an intentional empty query from a broad sweep and report it as a typed query outcome rather than silently hiding a request error.
- preservedBehavior:
  - Keep trimming and empty output semantics for pure helper compatibility
  - Prevent empty pattern from invoking any broker search
- openQuestions: —

### MAP-73CA066D9E

- mapping source: [services/uta/src/domain/trading/contract-discipline.spec.ts:138-147](../../../../services/uta/src/domain/trading/contract-discipline.spec.ts#L138-L147)
- symbol: assertContract test cluster
- id: MAP-73CA066D9E
- sourceEvidence:
  - services/uta/src/domain/trading/contract-discipline.spec.ts:138-147: assertContract tests expect a joined Error for invalid OPT and no throw for valid STK
- currentBehavior: The test treats a concatenated Error message as the public validation contract. A valid Contract returns silently; invalid output throws synchronously.
- problem: Message matching loses issue structure and conflates expected malformed input with programmer defects. It also makes HTTP, journal, and broker callers parse text to decide recovery.
- preservedBehavior:
  - Invalid options still fail before they can reach execution
  - Valid instruments still produce a successful result rather than an exception
- openQuestions: —

### MAP-7476DDDBBC

- mapping source: [services/uta/src/domain/trading/OrderHelper.ts:72-103](../../../../services/uta/src/domain/trading/OrderHelper.ts#L72-L103)
- symbol: OrderHelper.read and OrderHelper.toWire
- id: MAP-7476DDDBBC
- sourceEvidence:
  - services/uta/src/domain/trading/OrderHelper.ts:72-103: toWire shallow-copies Order or Partial&lt;Order&gt;, iterates the seven-name Decimal sentinel list, and returns Record&lt;string, unknown&gt;
  - packages/ibkr/src/order.ts:47-75,89-135,180-185,195-225: Order contains Decimal, UNSET_DOUBLE, and UNSET_INTEGER fields beyond the helper's allowlist
- currentBehavior: toWire accepts a complete or partial SDK Order, spreads every enumerable property, and deletes only recognized sentinel Decimal properties. It is used by TradingGit to project place/observe orders and modify changes before external observation, so unrecognized numeric sentinels and arbitrary enumerable fields can cross the boundary.
- problem: Record&lt;string, unknown&gt; and object spread preserve arbitrary SDK fields, functions, secrets, or unknown future properties; a cast back to Order only hides the loss of schema proof. A partial patch has no typed relationship to its target order and can leak UNSET_DOUBLE/UNSET_INTEGER.
- preservedBehavior:
  - TradingGit status/log/show/export must remain free of Decimal, double, and integer sentinel literals
  - Partial modify requests continue to omit untouched fields rather than overwriting them
- openQuestions: —

### MAP-75A64813DC

- mapping source: [services/uta/src/domain/trading/contract-search.ts:16-25](../../../../services/uta/src/domain/trading/contract-search.ts#L16-L25)
- symbol: search manager/protocol dependencies
- id: MAP-75A64813DC
- sourceEvidence:
  - services/uta/src/domain/trading/contract-search.ts:16-25: module imports UTAManager, legacy AssetClassHint, and re-exports protocol ContractSearchHit whose contract field is an IBKR ContractDescription contract
- currentBehavior: Domain code depends on UTAManager and a shared protocol hit type that embeds a concrete IBKR SDK contract. This couples orchestration, protocol shape, and legacy manager in one module.
- problem: The target dependency direction forbids domain-&gt;manager/protocol SDK leakage. The shared type is not serializable/broker-neutral, and callers cannot distinguish query data from executable native request data.
- preservedBehavior:
  - Search remains available to all current surfaces
  - Asset class remains a caller hint, not a forced identity classification
- openQuestions: —

### MAP-7B846115CB

- mapping source: [services/uta/src/domain/trading/contract-discipline.ts:102-112](../../../../services/uta/src/domain/trading/contract-discipline.ts#L102-L112)
- symbol: assertContract
- id: MAP-7B846115CB
- sourceEvidence:
  - services/uta/src/domain/trading/contract-discipline.ts:102-112: assertContract calls validateContract and throws `new Error` with joined errors
- currentBehavior: All validation failures are converted to a synchronous generic exception with human-readable text. This API is wired into buildContract and indirectly into adapter search/position paths.
- problem: Expected malformed native input becomes an untyped exception; callers cannot decide retry, source degradation, user correction, or recovery by variant. Joined text is not a durable protocol.
- preservedBehavior:
  - Stop invalid contracts before dispatch
  - Continue aggregating all ordinary validation issues
- openQuestions: —

### MAP-82BEA44FEB

- mapping source: [services/uta/src/domain/trading/order-entry.ts:1-33](../../../../services/uta/src/domain/trading/order-entry.ts#L1-L33)
- symbol: OrderEntryPhase and OrderEntryResult
- id: MAP-82BEA44FEB
- sourceEvidence:
  - services/uta/src/domain/trading/order-entry.ts:26-33: OrderEntryPhase is stage/commit/push and OrderEntryResult returns PushResult or string error
- currentBehavior: The public union exposes Git pipeline phases and a raw PushResult. It provides no transaction id, revision, actor, action tag, approval state, durable job, or typed failure payload.
- problem: The result shape makes a Git push look like the trading outcome and cannot represent Prepared/AwaitingApproval/Queued/Unknown/reconciliation states. String errors force transport callers to infer semantics.
- preservedBehavior:
  - Callers still receive an immediate success/failure response for accepted commands
  - The Git audit can still expose human-readable commit history as a projection
- openQuestions: —

### MAP-880959554F

- mapping source: [services/uta/src/domain/trading/contract-discipline.ts:66-66](../../../../services/uta/src/domain/trading/contract-discipline.ts#L66-L66)
- symbol: ValidationResult
- id: MAP-880959554F
- sourceEvidence:
  - services/uta/src/domain/trading/contract-discipline.ts:64-66: ValidationResult failure is `errors: string[]`
- currentBehavior: Validation can aggregate multiple issues, but each issue is an unstructured string. Callers must inspect or concatenate messages to distinguish missing fields, unknown kinds, and invalid values.
- problem: String arrays cannot carry field type, observed value, instrument context, or stable protocol codes. They also make expected failure indistinguishable from a defect when passed through generic Error.
- preservedBehavior:
  - Aggregate multiple errors so callers can repair a malformed record in one response
  - Keep field-specific information currently embedded in messages
- openQuestions: —

### MAP-8AF74BCDDF

- mapping source: [services/uta/src/domain/trading/contract-discipline.ts:21-28](../../../../services/uta/src/domain/trading/contract-discipline.ts#L21-L28)
- symbol: IBKR Contract import and SecType re-export
- id: MAP-8AF74BCDDF
- sourceEvidence:
  - services/uta/src/domain/trading/contract-discipline.ts:21-28: imports Contract, UNSET_DOUBLE, and SecType from @traderalice/ibkr and re-exports SecType
  - packages/ibkr/src/contract.ts:81-95: coerceSecType logs and drops unknown raw values to empty SecType
- currentBehavior: Domain/trading directly imports the IBKR SDK and makes its SecType union available to internal callers. The native UNSET_DOUBLE sentinel is part of the shared validator's implementation, and unknown raw SecType input is erased by the SDK coercion path.
- problem: The import establishes a prohibited dependency from domain to broker SDK and makes adapters depend on a shared vendor vocabulary. Re-exporting SecType prevents a clean cross-broker SPI; coercion also loses evidence needed to classify an unsupported native kind.
- preservedBehavior:
  - Keep exact case-sensitive allowlist enforcement for all 16 current SecType values in the IBKR adapter
  - Keep CRYPTO_PERP support through a domain variant and never silently turn unknown native input into an empty identity
- openQuestions: —

### MAP-8BBBB36AD2

- mapping source: [services/uta/src/domain/trading/order-entry.spec.ts:25-38](../../../../services/uta/src/domain/trading/order-entry.spec.ts#L25-L38)
- symbol: one-shot happy-path test
- id: MAP-8BBBB36AD2
- sourceEvidence:
  - services/uta/src/domain/trading/order-entry.spec.ts:25-38: happy-path test expects stage, commit(message), push(pending-hash), PushResult abc, and no reject
- currentBehavior: The helper executes callback staging, synchronous TradingGit commit, then push with the returned pending hash; success returns the raw PushResult and the test asserts call order indirectly.
- problem: A successful Git push is not a durable transaction approval or broker acknowledgement. The test never proves write-ahead job identity, approval binding, state replay, or projection result.
- preservedBehavior:
  - A complete user form can still provide all order intent
  - Successful execution still yields a queryable result, but no longer through PushResult as the mutation contract
- openQuestions: —

### MAP-933E16B57D

- mapping source: [services/uta/src/domain/trading/contract-discipline.ts:68-100](../../../../services/uta/src/domain/trading/contract-discipline.ts#L68-L100)
- symbol: validateContract
- id: MAP-933E16B57D
- sourceEvidence:
  - services/uta/src/domain/trading/contract-discipline.ts:68-100: validateContract mutates no state, checks truthy universal fields, SecType membership, static fields, and option rights
- currentBehavior: validateContract accepts a mutable IBKR Contract, checks required field presence via hasContractField, and returns either ok or string errors. It does not validate canonical identity, venue/jurisdiction, market session, account scope, or capability.
- problem: The API is tied to a concrete SDK and static field truthiness. It can declare a syntactically complete native contract valid even when it has no stable identity or cannot be used in the requested account/session.
- preservedBehavior:
  - Keep no mutation and all current structural checks
  - Intentionally add identity/context checks at the correct boundary rather than treating field presence as executability
- openQuestions: —

### MAP-97CB3270A6

- mapping source: [services/uta/src/domain/trading/contract-search.ts:1-14](../../../../services/uta/src/domain/trading/contract-search.ts#L1-L14)
- symbol: contract-search module identity documentation
- id: MAP-97CB3270A6
- sourceEvidence:
  - services/uta/src/domain/trading/contract-search.ts:1-14: comments claim shared AI/HTTP shape and say contract.aliceId is canonical while callers have separate fan-out implementations
- currentBehavior: The comments describe a single trading identity layer, but they are not enforcement: protocol output still carries an SDK Contract and AI has separate search behavior. aliceId augmentation is treated as the downstream key.
- problem: Documentation promises a shared boundary that the implementation does not provide, and it names an SDK-attached field as canonical identity. This permits symbol/native ID confusion across surfaces.
- preservedBehavior:
  - AI and HTTP should continue showing the same logical search results
  - Preserve separation between data-vendor search hints and trading identities
- openQuestions: —

### MAP-9890D2522D

- mapping source: [services/uta/src/domain/trading/contract-search-rules.ts:1-7](../../../../services/uta/src/domain/trading/contract-search-rules.ts#L1-L7)
- symbol: normalizeBrokerSearchPattern compatibility barrel
- id: MAP-9890D2522D
- sourceEvidence:
  - services/uta/src/domain/trading/contract-search-rules.ts:1-7: file is only an export* compatibility shim to @traderalice/uta-protocol
- currentBehavior: The file defines no search logic; it preserves relative imports under domain/trading by re-exporting every symbol from the protocol package.
- problem: The barrel obscures ownership and encourages business normalization to live in the shared protocol package. It also makes a future domain/protocol dependency cycle likely.
- preservedBehavior:
  - Relative callers continue to receive the same deterministic normalization while migration is in progress
  - No new normalization heuristics are introduced by deleting the shim
- openQuestions: —

### MAP-99C18EAB60

- mapping source: [services/uta/src/domain/trading/contract-discipline.spec.ts:24-44](../../../../services/uta/src/domain/trading/contract-discipline.spec.ts#L24-L44)
- symbol: SecType taxonomy test cluster
- id: MAP-99C18EAB60
- sourceEvidence:
  - services/uta/src/domain/trading/contract-discipline.spec.ts:24-44: tests assert the exact 16-value IBKR SecType list and case-sensitive isSecType narrowing
  - packages/ibkr/src/contract.ts:75-116: current closed SecType union contains STK, OPT, FUT, FOP, IND, CASH, BOND, CMDTY, WAR, IOPT, FUND, BAG, NEWS, CFD, CRYPTO, and CRYPTO_PERP
- currentBehavior: SEC_TYPES mirrors the current 16-value IBKR/OpenAlice taxonomy; isSecType accepts only exact case-sensitive strings and rejects crypto/FUTURES/empty/null. `coerceSecType` warns and drops an unknown raw wire value to `''`.
- problem: The test treats a venue's native taxonomy as a global instrument taxonomy, while the current coercion can erase an unknown raw value before a typed failure records it. It does not test canonical identity, listing jurisdiction, account scope, or capability context that determines whether a recognized kind is usable.
- preservedBehavior:
  - Keep exact case-sensitive acceptance of all 16 current wire values in the adapter
  - Keep CRYPTO_PERP support while mapping it to a domain crypto-perpetual variant and preserve BAG legs/NEWS query-only semantics
- openQuestions: —

### MAP-9D7DDC4081

- mapping source: [services/uta/src/domain/trading/order-entry.spec.ts:40-95](../../../../services/uta/src/domain/trading/order-entry.spec.ts#L40-L95)
- symbol: one-shot phase-error tests
- id: MAP-9D7DDC4081
- sourceEvidence:
  - services/uta/src/domain/trading/order-entry.spec.ts:40-95: tests stage/commit/push errors separately, ensure reject is not attempted on commit failure, and stringify non-Error throws
- currentBehavior: The suite asserts string phase errors, skips later phases after an earlier failure, and treats any non-Error throwable as a string. It does not model remote accepted-but-unobserved outcomes or durable recovery.
- problem: Phase strings flatten validation, storage, capability, broker rejection, and unknown remote states. The test's lack of a durable state means it cannot catch the dangerous distinction between commit failure, dispatch failure, and an accepted remote order with lost acknowledgement.
- preservedBehavior:
  - Stage-equivalent validation still prevents commit/dispatch when input is invalid
  - A failed operation is never masked by an unrelated reject error
- openQuestions: —

### MAP-A4E9FFB7DA

- mapping source: [services/uta/src/domain/trading/brokers/fuzzy-rank.ts:31-34](../../../../services/uta/src/domain/trading/brokers/fuzzy-rank.ts#L31-L34)
- symbol: FuzzyRankOptions
- id: MAP-A4E9FFB7DA
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/fuzzy-rank.ts:31-34: FuzzyRankOptions has only optional numeric limit with documented default 50 and no cursor/total/truncation
- currentBehavior: Callers can provide limit, otherwise 50 is silently selected; no validation prevents negative/non-integer limits and no result metadata explains discarded matches.
- problem: A silent cap can make a search look complete while hiding matches, and an invalid numeric limit has language-level slice semantics rather than a domain decision. The return type cannot support deterministic pagination.
- preservedBehavior:
  - Keep a default UI page size only as an explicit protocol default
  - Keep caller-requested bounding, now with visible truncation
- openQuestions: —

### MAP-A999864CD2

- mapping source: [services/uta/src/domain/trading/contract-search.ts:44-65](../../../../services/uta/src/domain/trading/contract-search.ts#L44-L65)
- symbol: searchTradeableContracts fan-out and hit projection
- id: MAP-A999864CD2
- sourceEvidence:
  - services/uta/src/domain/trading/contract-search.ts:44-65: Promise.allSettled fans out searches, silently drops rejected sources, flattens native descriptions, copies derivativeSecTypes, and optionally calls assetClassFor without rank/dedup/limit
- currentBehavior: Concurrent source failures are discarded; fulfilled ContractDescriptions become hits carrying raw Contract, source id, raw derivative strings, and optional broker asset class. `Promise.allSettled` iterates results in the original target order returned by `manager.resolve`, followed by each broker's result order; no deterministic cross-source score/dedup/page metadata exists.
- problem: Silently dropping failures makes an incomplete catalog look authoritative. Native SDK objects and heuristic asset class leak out, duplicate instruments are possible, and result limits/ranking are undefined.
- preservedBehavior:
  - One broker failure does not abort valid source results
  - Broker-provided asset classification remains available only as decoded/contextual metadata, not an identity guess
- openQuestions: —

### MAP-ACEFA5D60A

- mapping source: [services/uta/src/domain/trading/brokers/contract-builder.spec.ts:1-3](../../../../services/uta/src/domain/trading/brokers/contract-builder.spec.ts#L1-L3)
- symbol: test imports and SDK fixture dependency
- id: MAP-ACEFA5D60A
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/contract-builder.spec.ts:1-3: the entire suite imports the shared builders and Decimal while no broker-neutral fixtures are present
- currentBehavior: The test module's imports make every test depend on the shared IBKR-shaped builder boundary; it does not separate native contract codec behavior from pure position arithmetic.
- problem: A test suite organized around one SDK-shaped helper encourages the shared domain module to remain the authority and makes it impossible to prove that the kernel can consume SDK-free observations.
- preservedBehavior:
  - Keep the existing distinction between contract validation and multiplier-aware position math
  - Retain regression coverage for OPT/FUT requirements and Decimal arithmetic
- openQuestions: —

### MAP-AE40B3965B

- mapping source: [services/uta/src/domain/trading/OrderHelper.ts:46-70](../../../../services/uta/src/domain/trading/OrderHelper.ts#L46-L70)
- symbol: OrderView and unsetToUndef
- id: MAP-AE40B3965B
- sourceEvidence:
  - services/uta/src/domain/trading/OrderHelper.ts:46-70: OrderView exposes nullable action/order fields and unsetToUndef converts only Decimal sentinels
  - services/uta/src/domain/trading/OrderHelper.ts:74-90: read uses `|| undefined` for tif, outsideRth, parentId, and ocaGroup
  - packages/ibkr/src/order.ts:53-65,67-75: runtime Order defaults tif/ocaGroup/goodTillDate to empty and outsideRth to false/parentId to 0 without presence bits
- currentBehavior: read projects a selected IBKR Order subset to OrderView. Decimal sentinels become undefined, but false outsideRth and numeric parentId 0 are erased by truthiness; a runtime Order instance alone also cannot distinguish an omitted field from its default false/0/empty value. The view has no instrument, account scope, order identity, version, or provenance.
- problem: The partial nullable view permits combinations that do not describe a valid action and loses meaningful explicit values. Claiming that a class instance proves explicit false/0 would invent presence evidence; downstream code must decode presence-aware wire data or mark default-origin ambiguous.
- preservedBehavior:
  - Continue hiding all IBKR sentinels from callers
  - Preserve explicit false/zero when wire presence is known, and intentionally refuse to infer presence from the current SDK class defaults
- openQuestions: —

### MAP-B7395F4C42

- mapping source: [services/uta/src/domain/trading/contract-discipline.spec.ts:10-22](../../../../services/uta/src/domain/trading/contract-discipline.spec.ts#L10-L22)
- symbol: makeContract test fixture
- id: MAP-B7395F4C42
- sourceEvidence:
  - services/uta/src/domain/trading/contract-discipline.spec.ts:10-22: makeContract creates a mutable Contract with universal defaults and copies optional native derivative/display fields
- currentBehavior: The fixture uses Partial&lt;Contract&gt;, fills AAPL/STK/NASDAQ/USD by default, and conditionally assigns expiry/strike/right/multiplier/localSymbol. It is shared evidence for SDK optional-field assumptions.
- problem: Partial&lt;Contract&gt; lets tests bypass the same refined construction rules production should enforce and makes default fields indistinguishable from absent native values.
- preservedBehavior:
  - Retain native defaults only inside the relevant provider codec where the declaration proves them valid; do not carry SDK defaults into domain fixtures
  - Retain explicit optional derivative coverage through variant constructors
- openQuestions: —

### MAP-B82909F33A

- mapping source: [services/uta/src/domain/trading/contract-discipline.spec.ts:122-136](../../../../services/uta/src/domain/trading/contract-discipline.spec.ts#L122-L136)
- symbol: STK/CRYPTO/CRYPTO_PERP validation test cluster
- id: MAP-B82909F33A
- sourceEvidence:
  - services/uta/src/domain/trading/contract-discipline.spec.ts:122-135: STK, CRYPTO, and CRYPTO_PERP pass with universal fields, including BYBIT/USDT examples
- currentBehavior: The validator treats STK/CRYPTO/CRYPTO_PERP as requiring only symbol, secType, exchange, and currency. Crypto classification is carried by native SecType and no context is required.
- problem: A native kind alone cannot distinguish a synthetic venue instrument, spot versus perpetual, listing jurisdiction, settlement currency, account/sub-account, or whether keyless/read-only credentials can trade. Universal fields are insufficient for executable authority.
- preservedBehavior:
  - Retain acceptance of minimal crypto native rows for catalog/read paths
  - Intentionally require context for execution and preserve keyless/read-only query capability
- openQuestions: —

### MAP-BA4B6EEB3B

- mapping source: [services/uta/src/domain/trading/contract-discipline.ts:114-124](../../../../services/uta/src/domain/trading/contract-discipline.ts#L114-L124)
- symbol: hasContractField
- id: MAP-BA4B6EEB3B
- sourceEvidence:
  - services/uta/src/domain/trading/contract-discipline.ts:114-124: hasContractField treats empty strings, UNSET_DOUBLE, and nullish values as absent for a dynamic keyof Contract
  - packages/ibkr/src/contract.ts:81-95: coerceSecType logs an unknown raw SecType and returns empty string, so raw evidence must be captured before coercion
- currentBehavior: The helper uses SDK sentinel semantics to decide field presence. It dynamically indexes any Contract key and returns a boolean with no field-specific error or context.
- problem: Sentinel interpretation is only valid where the exact native SDK contract is known; exporting it from domain encourages other brokers to copy IBKR assumptions. A boolean loses whether a field was absent, malformed, or intentionally zero.
- preservedBehavior:
  - Treat IBKR empty string and UNSET_DOUBLE as absent for required native fields
  - Do not classify a legitimate zero as absent when the domain field permits zero
- openQuestions: —

### MAP-BD0C97191F

- mapping source: [services/uta/src/domain/trading/brokers/contract-builder.ts:49-74](../../../../services/uta/src/domain/trading/brokers/contract-builder.ts#L49-L74)
- symbol: buildContract
- id: MAP-BD0C97191F
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/contract-builder.ts:49-74: buildContract allocates an IBKR Contract, copies fields with truthiness checks, defaults localSymbol, then calls assertContract
- currentBehavior: The function sets symbol/secType/exchange/currency, defaults localSymbol to symbol, copies optional fields, and synchronously throws via assertContract. It returns a mutable SDK instance to every caller.
- problem: Construction, validation, and SDK allocation are inseparable; ordinary malformed broker data becomes a thrown Error. Truthiness checks also make field presence semantics depend on JavaScript coercion, while no canonical InstrumentId is created.
- preservedBehavior:
  - Keep localSymbol fallback and derivative fields that existing IBKR callers rely on
  - Replace synchronous generic throw with a typed Result at the boundary
- openQuestions: —

### MAP-BD469BCA6D

- mapping source: [services/uta/src/domain/trading/brokers/fuzzy-rank.spec.ts:71-101](../../../../services/uta/src/domain/trading/brokers/fuzzy-rank.spec.ts#L71-L101)
- symbol: limit, stability, quote fallback, and missing-field tests
- id: MAP-BD469BCA6D
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/fuzzy-rank.spec.ts:71-101: tests limit 5/default 50, stable ties, quote-only fallback, and missing Contract fields
- currentBehavior: The test expects a hard length cap of 5 or silently defaulted 50, relies on source order for ties, treats quote-only matches as weakest, and accepts a Contract with only symbol set.
- problem: A length-only assertion hides dropped matches and gives no continuation/truncation signal. Missing SDK fields are tolerated without deciding whether the result is safe to display or resolve to identity.
- preservedBehavior:
  - Keep stable ties and quote-only low priority
  - Keep a UI-friendly bounded page, but intentionally expose that it is bounded instead of pretending the result set is complete
- openQuestions: —

### MAP-BE2FC8EECC

- mapping source: [services/uta/src/domain/trading/contract-discipline.ts:53-62](../../../../services/uta/src/domain/trading/contract-discipline.ts#L53-L62)
- symbol: SECTYPE_REQUIREMENTS
- id: MAP-BE2FC8EECC
- sourceEvidence:
  - services/uta/src/domain/trading/contract-discipline.ts:53-62: SECTYPE_REQUIREMENTS requires universal fields for every kind, OPT/FOP four derivative fields, FUT expiry/multiplier, and defaults other kinds to multiplier 1 downstream
- currentBehavior: Validation applies static structural rules keyed by native SecType. Non-derivatives are accepted with only universal fields and later get multiplier '1'. No venue/account/session facts are consulted.
- problem: Static structure is necessary but not sufficient for action availability. A multiplier default can be correct for STK and catastrophically wrong for a misdecoded derivative; no typed distinction exists.
- preservedBehavior:
  - Keep OPT/FOP/FUT structural requirements
  - Keep unit multiplier default only for non-derivative kinds that explicitly permit it
- openQuestions: —

### MAP-C0F9438F7F

- mapping source: [services/uta/src/domain/trading/brokers/fuzzy-rank.spec.ts:19-69](../../../../services/uta/src/domain/trading/brokers/fuzzy-rank.spec.ts#L19-L69)
- symbol: exact/prefix/name/regex ranking tests
- id: MAP-C0F9438F7F
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/fuzzy-rank.spec.ts:19-69: tests cover empty/zero filtering, exact symbol/base/name, prefix tiers, name word boundaries, and escaped regex metacharacters
- currentBehavior: The suite verifies deterministic tier precedence and that a query such as B.B is escaped before regex matching. It observes only output symbol order, not score metadata or identity.
- problem: Symbol-only assertions cannot detect duplicate identity, wrong venue, score ties, or a ranker that returns an SDK object while preserving visible symbols. The policy is implicit in test ordering rather than a named result contract.
- preservedBehavior:
  - Keep exact and prefix precedence, word-boundary behavior, and literal metacharacter escaping
  - Keep empty queries from producing broad catalog sweeps
- openQuestions: —

### MAP-C3F4ACD09F

- mapping source: [services/uta/src/domain/trading/brokers/contract-builder.spec.ts:60-205](../../../../services/uta/src/domain/trading/brokers/contract-builder.spec.ts#L60-L205)
- symbol: buildPosition pass-through, derivation, multiplier, and risk behavior tests
- id: MAP-C3F4ACD09F
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/contract-builder.spec.ts:60-145: tests cover derived/pass-through values, multiplier inheritance/override, avgCostSource and risk
  - services/uta/src/domain/trading/brokers/contract-builder.spec.ts:147-205: raw OPT/FOP contracts without multipliers throw while STK multiplier=1 is allowed
- currentBehavior: buildPosition derives both marketValue and unrealizedPnL when both upstream values are absent, trusts a paired upstream set verbatim, chooses explicit multiplier over Contract multiplier over '1', preserves avgCostSource/risk, and throws for OPT/FOP multiplier 1 or empty.
- problem: The suite treats arbitrary upstream strings as trustworthy and verifies a generic throw. It does not distinguish broker-reported valuation from local derivation, account/instrument units, or the case where only one of the two upstream values is present (the implementation mixes sources).
- preservedBehavior:
  - Preserve Decimal arithmetic, explicit multiplier override, avgCostSource, risk metadata, and STK multiplier 1
  - Preserve partial broker position scope/instrument/quantity and known component instead of discarding it; remove only the old mixed-provenance completion
- openQuestions: —

### MAP-C6D66D3913

- mapping source: [services/uta/src/domain/trading/contract-ext.ts:1-7](../../../../services/uta/src/domain/trading/contract-ext.ts#L1-L7)
- symbol: Contract.aliceId compatibility barrel
- id: MAP-C6D66D3913
- sourceEvidence:
  - services/uta/src/domain/trading/contract-ext.ts:1-7: file only side-effect imports @traderalice/uta-protocol to augment IBKR Contract with optional aliceId
- currentBehavior: Importing this shim activates a declaration merge; no runtime identity construction or validation occurs. Multiple adapter modules import it solely to make `contract.aliceId` type-check.
- problem: Attaching a fork identity to a mutable SDK object conflates display/native symbol with canonical identity and relies on ambient side effects. The optional field can be absent, stale, or copied across venues without proof.
- preservedBehavior:
  - Search results still provide a stable downstream identifier
  - Native Contract fields remain available inside adapter implementation until each caller migrates
- openQuestions: —

### MAP-CF1FF8D3C3

- mapping source: [services/uta/src/domain/trading/contract-search-rules.spec.ts:4-39](../../../../services/uta/src/domain/trading/contract-search-rules.spec.ts#L4-L39)
- symbol: crypto/currency quote-suffix normalization tests
- id: MAP-CF1FF8D3C3
- sourceEvidence:
  - services/uta/src/domain/trading/contract-search-rules.spec.ts:4-39: crypto/currency tests trim/case-normalize, prefer USDT/USDC before USD, preserve unknown BTC quote, enforce two-character base floor, and leave bare bases unchanged
- currentBehavior: The tests specify the heuristic bridge from concatenated vendor symbols to broker patterns: BTCUSD→BTC, SOLUSDT→SOL, unknown ETHBTC unchanged, and LUSD protected from stripping. Longer suffixes must win.
- problem: The heuristic is useful but can be mistaken for identity resolution. A pure string result has no context saying it is only a search hint, and suffix tables can create false positives if expanded without observed evidence.
- preservedBehavior:
  - Retain longest suffix matching, uppercase result, unknown quote pass-through, and two-character floor
  - Retain the rule that data-vendor symbol and trading identity are different namespaces
- openQuestions: —

### MAP-D0EA3C0CF2

- mapping source: [services/uta/src/domain/trading/brokers/contract-builder.ts:1-23](../../../../services/uta/src/domain/trading/brokers/contract-builder.ts#L1-L23)
- symbol: module boundary, imports, and IBKR-as-truth contract/position funnel
- id: MAP-D0EA3C0CF2
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/contract-builder.ts:1-23: module documentation promises every broker funnels through buildContract/buildPosition and imports Contract, Decimal, Position, assertContract, and position math
- currentBehavior: A shared module presents IBKR Contract as the cross-broker output funnel. All adapters are expected to construct the same mutable SDK object before positions enter the legacy Position type.
- problem: The funnel makes the most specific broker SDK the de facto domain contract and forces heterogeneous venues to fake IBKR fields. It also combines native validation, domain math, and output shaping, so a kernel consumer cannot prove it is SDK-free.
- preservedBehavior:
  - Retain a single multiplier-aware arithmetic policy and immediate rejection of structurally unsafe derivatives
  - Preserve broker-specific risk/provenance data through typed fields rather than dropping it
- openQuestions: —

### MAP-D69EDB1AEE

- mapping source: [services/uta/src/domain/trading/order-entry.ts:75-77](../../../../services/uta/src/domain/trading/order-entry.ts#L75-L77)
- symbol: errorMessage
- id: MAP-D69EDB1AEE
- sourceEvidence:
  - services/uta/src/domain/trading/order-entry.ts:75-77: errorMessage returns Error.message or String(err) for every caught value
- currentBehavior: All stage/commit/push thrown values are flattened to strings before returning to the route. The conversion loses failure type, transaction/dispatch identity, precondition data, and whether the throwable was expected or a defect.
- problem: String coercion prevents exhaustive transport mapping and can leak native/provider details. It also encourages callers to treat a broker timeout and validation rejection as the same phase error.
- preservedBehavior:
  - Human-readable messages may remain as presentation fields derived from typed variants
  - Non-Error defects remain observable rather than silently disappearing
- openQuestions: —

### MAP-D9BFDA8A15

- mapping source: [services/uta/src/domain/trading/contract-search-rules.spec.ts:56-64](../../../../services/uta/src/domain/trading/contract-search-rules.spec.ts#L56-L64)
- symbol: unknown/default normalization tests
- id: MAP-D9BFDA8A15
- sourceEvidence:
  - services/uta/src/domain/trading/contract-search-rules.spec.ts:56-64: omitted or unknown asset-class hints pass BTCUSD through without stripping
- currentBehavior: When the caller does not know the asset class, the normalizer conservatively returns the input rather than guessing crypto/currency. The test uses the same pass-through for an explicit unknown value.
- problem: The string result does not communicate that asset-class context remains unresolved. Downstream callers could accidentally execute against a first match or silently treat no match as a broker failure.
- preservedBehavior:
  - Keep conservative BTCUSD pass-through for unknown/omitted hints
  - Do not add speculative suffix stripping
- openQuestions: —

### MAP-E748A339C5

- mapping source: [services/uta/src/domain/trading/brokers/contract-builder.ts:27-47](../../../../services/uta/src/domain/trading/brokers/contract-builder.ts#L27-L47)
- symbol: BuildContractInput
- id: MAP-E748A339C5
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/contract-builder.ts:27-47: BuildContractInput mixes raw symbol/exchange/currency with optional derivative fields and IBKR conId/tradingClass/description
- currentBehavior: One record accepts all instrument types and optional fields. SecType is the only discriminant; option/future requirements are enforced later by assertContract rather than represented in the input type.
- problem: Optional-field soup permits invalid combinations (for example a future without expiry or an option with a nonsensical right) and exposes IBKR identity fields to non-IBKR callers. Raw strings do not prove canonical identity or unit relationships.
- preservedBehavior:
  - Preserve support for localSymbol, expiry, strike, right, multiplier, primary exchange, descriptive display data, and combo legs where the target variant needs them
  - Keep native conId/tradingClass available for IBKR but isolate them from broker-neutral identity
- openQuestions: —

### MAP-F61189D796

- mapping source: [services/uta/src/domain/trading/contract-search-rules.spec.ts:41-54](../../../../services/uta/src/domain/trading/contract-search-rules.spec.ts#L41-L54)
- symbol: equity/commodity identity normalization tests
- id: MAP-F61189D796
- sourceEvidence:
  - services/uta/src/domain/trading/contract-search-rules.spec.ts:41-54: equity and commodity inputs pass through unchanged, including equity-looking EURUSD
- currentBehavior: The normalizer does no crypto suffix stripping for equity/commodity hints; it preserves case/content according to the implementation's trim/normalization policy, and the test protects EURUSD as a ticker.
- problem: Pass-through is correct as a heuristic but does not imply that a vendor ticker equals a listing identity. The current test does not require the resolved hit to carry venue/listing jurisdiction.
- preservedBehavior:
  - Keep AAPL and commodity gold query strings unchanged
  - Keep EURUSD equity behavior and do not add speculative FX stripping
- openQuestions: —

### MAP-FBB735D928

- mapping source: [services/uta/src/domain/trading/brokers/fuzzy-rank.ts:1-18](../../../../services/uta/src/domain/trading/brokers/fuzzy-rank.ts#L1-L18)
- symbol: catalog-ranking module boundary and SDK imports
- id: MAP-FBB735D928
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/fuzzy-rank.ts:1-18: shared ranker is documented for Alpaca/CCXT/Mock but imports ContractDescription and Contract from IBKR; IBKR bypasses it
- currentBehavior: Enumerating brokers share this ranker, while IBKR uses a server-side endpoint. Despite the split, the shared utility's input/output classes are IBKR SDK classes.
- problem: The utility's claimed cross-broker scope is undermined by a vendor-shaped boundary. A future adapter must either fabricate IBKR Contracts or bypass the policy, creating inconsistent search behavior.
- preservedBehavior:
  - Keep full-catalog ranking for Alpaca, CCXT, and Mock
  - Keep IBKR's venue-side ranking path, but normalize its results into the same broker-neutral result type
- openQuestions: —
