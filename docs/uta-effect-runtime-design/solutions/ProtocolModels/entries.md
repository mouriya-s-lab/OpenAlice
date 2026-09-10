
# ProtocolModels — source investigation and migration evidence


## Entries

### MAP-011C785E0E

- mapping source: [packages/uta-protocol/src/types/git.ts:296-306](../../../../packages/uta-protocol/src/types/git.ts#L296-L306)
- symbol: StageClosePositionParams
- id: MAP-011C785E0E
- sourceEvidence:
  - packages/uta-protocol/src/types/git.ts:296-306: StageClosePositionParams carries aliceId/symbol, optional positive qty, optional subAccountId; empty qty means full close.
  - services/uta/src/domain/trading/UnifiedTradingAccount.ts:742-766: stageClose resolves Contract, parses positive Decimal qty when present, validates scope, and emits closePosition with Decimal quantity but no scope.
- currentBehavior: Close resolves a native contract and supports partial/full close; invalid quantity throws a generic Error and wallet scope is only transient.
- problem: A bare instrument/optional quantity cannot bind the exposure snapshot, account scope, multiplier, or current position version; full close is encoded as absence and generic errors lose typed reason.
- preservedBehavior:
  - Preserve full-close default and positive partial quantity.
  - Correct absence-as-meaning, generic Error, and message-only subaccount.
  - Preserve partial close against latest position only with versioned scoped exposure evidence.
- openQuestions: —

### MAP-02219D5749

- mapping source: [packages/uta-protocol/src/types/manager.ts:21-37](../../../../packages/uta-protocol/src/types/manager.ts#L21-L37)
- symbol: AggregatedEquity
- id: MAP-02219D5749
- sourceEvidence:
  - packages/uta-protocol/src/types/manager.ts:21-37: AggregatedEquity sums total equity/cash/PnL as strings, optional fxWarnings, and account rows with raw id/currency/health; no scope/freshness/status variant.
  - services/uta/src/domain/trading/uta-manager.ts:205-268: manager skips keyless accounts, defaults missing baseCurrency to USD and missing info to zero values, converts non-USD through optional FxService, and collects warning strings.
- currentBehavior: Manager concurrently reads healthy UTAs, excludes keyless accounts, converts non-USD values when FxService exists, and emits zero/USD rows for unavailable account info.
- problem: Default USD/zero values look like real balances, FX warnings are free text, and totals can mix stale/unknown/missing currencies. Per-account scope, valuation source/asOf, and confidence are absent.
- preservedBehavior:
  - Preserve keyless exclusion, Decimal precision, FX conversion and warning visibility.
  - Correct USD/zero fallback and free-text warning by explicit valuation/completeness ADT.
- openQuestions: —

### MAP-0422181E7C

- mapping source: [packages/uta-protocol/src/types/broker.ts:248-262](../../../../packages/uta-protocol/src/types/broker.ts#L248-L262)
- symbol: AccountInfo
- id: MAP-0422181E7C
- sourceEvidence:
  - packages/uta-protocol/src/types/broker.ts:248-262: AccountInfo stores baseCurrency and monetary fields as raw strings, optional margin/PnL fields, and numeric dayTradesRemaining without AccountScope.
  - services/uta/src/domain/trading/UnifiedTradingAccount.ts:1005-1023: getAccount mutates broker AccountInfo.unrealizedPnL after summing same-currency positions.
- currentBehavior: Account reads are mutable broker-shaped values; optional fields and base currency are interpreted by UTA aggregation, which can fall back to the broker number when currencies differ.
- problem: Raw strings do not establish currency/unit validity, and optional absent values have no reason/provenance. Mutation after the broker call hides whether PnL is broker-reported or locally derived; no sequence/freshness/scoped account identity is present.
- preservedBehavior:
  - Preserve decimal precision and derived same-currency PnL invariant.
  - Correct in-place mutation and silent broker fallback by encoding valuationSource and uncertainty.
- openQuestions: —

### MAP-0647BF0194

- mapping source: [packages/uta-protocol/src/types/broker.ts:452-466](../../../../packages/uta-protocol/src/types/broker.ts#L452-L466)
- symbol: BrokerConfigField
- id: MAP-0647BF0194
- sourceEvidence:
  - packages/uta-protocol/src/types/broker.ts:452-466: BrokerConfigField uses primitive type labels, optional unknown default, string option tuples, description, and sensitive flag.
- currentBehavior: Frontend renders dynamic broker forms from an unvalidated descriptor; `default?: unknown` can contain arbitrary values and sensitive only describes masking.
- problem: The descriptor is a public config/schema boundary with no parser, constraints, secret reference semantics, or distinction between UI default and actual persisted secret. An unknown default can leak or produce invalid config.
- preservedBehavior:
  - Preserve dynamic form generation, option labels, and sensitive masking intent.
  - Correct unknown defaults and accidental secret flow by typed variants and CredentialRef.
- openQuestions: —

### MAP-0CEEC81F23

- mapping source: [packages/uta-protocol/src/types/git.ts:225-246](../../../../packages/uta-protocol/src/types/git.ts#L225-L246)
- symbol: SimulatePriceChangeResult
- id: MAP-0CEEC81F23
- sourceEvidence:
  - packages/uta-protocol/src/types/git.ts:225-246: SimulatePriceChangeResult has success boolean/error string, nested current/simulated states, and summary strings including worstCase.
  - services/uta/src/domain/trading/git/TradingGit.ts:753-897: simulator returns success=false with empty position arrays on parse error, success=true for no positions, computes equity/PnL deltas, and appends an explanatory derivative exclusion note to worstCase.
- currentBehavior: Success/error bag mixes failure and report; parse errors discard current positions, no-position case is success with zeros, and worstCase is a free-form string combining risk outcome and exclusions.
- problem: Callers cannot distinguish invalid input, stale valuation, no positions, excluded derivatives, or valid zero-impact simulation. Empty arrays on failure can be mistaken for no exposures; string summary cannot be machine-checked.
- preservedBehavior:
  - Preserve no-position successful report and derivative warning semantics.
  - Correct boolean/error bag, failure empty arrays, and free-form worstCase by explicit variants.
  - Retain exact equity/PnL deltas and multiplier math.
- openQuestions: —

### MAP-18E2D21F66

- mapping source: [packages/uta-protocol/src/types/git.ts:160-167](../../../../packages/uta-protocol/src/types/git.ts#L160-L167)
- symbol: CommitLogEntry
- id: MAP-18E2D21F66
- sourceEvidence:
  - packages/uta-protocol/src/types/git.ts:160-167: CommitLogEntry has hash/parent/message/timestamp/round and OperationSummary[] only.
  - services/uta/src/domain/trading/git/TradingGit.ts:393-413: log reverses in-memory commits, filters by getOperationSymbol, slices a limit, and maps summaries.
- currentBehavior: Log is newest-first, optionally symbol-filtered, and limited by array position; it exposes no explicit cursor, total/sequence, transaction state, or projection freshness.
- problem: Array slicing can omit audit events without a continuation boundary, symbol filtering uses display strings, and commit hash/round do not identify journal causation or recovery state.
- preservedBehavior:
  - Preserve newest-first log, round/message, and symbol-oriented human filter as a translated display filter.
  - Correct unbounded array/short hash authority with cursor and event sequence.
- openQuestions: —

### MAP-19CA6A1780

- mapping source: [packages/uta-protocol/src/types/git.ts:194-201](../../../../packages/uta-protocol/src/types/git.ts#L194-L201)
- symbol: PriceChangeInput
- id: MAP-19CA6A1780
- sourceEvidence:
  - packages/uta-protocol/src/types/git.ts:194-201: PriceChangeInput accepts a free-form symbol or aliceId including literal all and absolute/relative change string.
  - services/uta/src/domain/trading/git/TradingGit.ts:778-817: simulation matches positions by contract.symbol/aliceId, treats all specially, and excludes derivative secTypes for symbol-level changes.
- currentBehavior: Simulation accepts strings such as @88000/+10%/-5%; parsing uses parseFloat and symbols are ambiguous between underlying and derivative rows, so derivatives are excluded only after a symbol match.
- problem: Free-form selector and number parsing can target the wrong scope/instrument, permit precision loss, and cannot express explicit derivative identity or quote units. Invalid/unknown symbols are not a typed domain failure.
- preservedBehavior:
  - Preserve `all`, absolute/relative modes, multiplier-aware math, and loud derivative exclusion for underlying selectors.
  - Correct symbol/aliceId ambiguity and floating parse with scoped InstrumentId/DecimalString.
  - Keep simulation read-only.
- openQuestions: —

### MAP-1A43E0FCC4

- mapping source: [packages/uta-protocol/src/types/broker.spec.ts:21-28](../../../../packages/uta-protocol/src/types/broker.spec.ts#L21-L28)
- symbol: unknown BrokerError code fallback test
- id: MAP-1A43E0FCC4
- sourceEvidence:
  - packages/uta-protocol/src/types/broker.spec.ts:21-28: an unknown code NOT_A_REAL_CODE is passed as a BrokerError-like object and BrokerError.from silently returns code UNKNOWN.
- currentBehavior: The legacy parser accepts only its closed set and silently degrades an unrecognized structured code to UNKNOWN, losing the original code while retaining the Error message.
- problem: Silently replacing an adapter or venue code hides whether a new protocol version, capability rejection, or transport corruption caused the event. UNKNOWN also has no association or recovery rule, so a scheduler could retry unsafely.
- preservedBehavior:
  - Keep the fact that unrecognized native codes cannot be trusted as a known code.
  - Intentionally change silent fallback to UNKNOWN into explicit unknown evidence, preventing false retry/terminal claims.
- openQuestions: —

### MAP-25118F5AFA

- mapping source: [packages/uta-protocol/src/types/broker.ts:475-498](../../../../packages/uta-protocol/src/types/broker.ts#L475-L498)
- symbol: IBroker lifecycle methods
- id: MAP-25118F5AFA
- sourceEvidence:
  - packages/uta-protocol/src/types/broker.ts:475-498: IBroker exposes id/label/brokerEngine/meta, Promise init/close, and optional callback listener for BrokerConnectionStateEvent.
- currentBehavior: Concrete broker objects combine identity, arbitrary metadata, connection lifecycle, and callback mutation in one generic interface; implementation loading is hidden behind class methods.
- problem: The interface gives no scoped identity, Effect resource lifetime, protocol/version manifest, or distinction between connection readiness and transaction recovery. Generic meta can leak SDK/config objects and callbacks are not durable.
- preservedBehavior:
  - Preserve lifecycle start/close and connection signal behavior.
  - Correct broad IBroker/God object by separating resource, query, capability, and action boundaries.
- openQuestions: —

### MAP-255335BC1C

- mapping source: [packages/uta-protocol/src/types/broker.ts:524-529](../../../../packages/uta-protocol/src/types/broker.ts#L524-L529)
- symbol: IBroker trading mutation methods
- id: MAP-255335BC1C
- sourceEvidence:
  - packages/uta-protocol/src/types/broker.ts:524-529: IBroker placeOrder/modifyOrder/cancelOrder/closePosition directly mutate Promise state, use native Contract/Order/OrderCancel/Decimal, and all return PlaceOrderResult.
  - services/uta/src/domain/trading/UnifiedTradingAccount.ts:603-637,703-715: stage validation distinguishes Market units/cash notional, requires typed price/trigger/trailing relations, and defaults omitted tif to DAY while forwarding goodTillDate/outsideRth.
  - services/uta/src/domain/trading/brokers/ibkr/IbkrBroker.ts:874-878: IBKR advertises MKT, LMT, STP, STP LMT, TRAIL, MOC, LOC, and REL order types.
  - packages/ibkr/src/order.ts:48-75: native Order has orderType/tif/outsideRth/goodAfterTime/goodTillDate; percentOffset is explicitly REL-only and trailingPercent is TRAILLIMIT-only.
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:54-74,265-284: Alpaca details advertise only MKT/LMT/STP/STP LMT/TRAIL, while its adapter maps OPG to opg and falls through unknown order types.
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:73-120,278-301: Longbridge maps the ordinary IBKR order family, rejects unknown kinds, and explicitly rejects OPG TIF.
  - services/uta/src/domain/trading/brokers/ccxt/CcxtBroker.ts:147-153,576-611,664-679 and overrides.ts:185-196: CCXT maps only MKT/LMT directly, refuses unverified trails, passes edit TIF params, but the place path does not add order.tif to params before createOrder.
  - packages/ibkr/src/client/orders.ts:348-385,430-465: client serialization sends orderType, tif, outsideRth, goodAfter/goodTill, and percentOffset to the native request.
  - packages/ibkr/ref/samples/Python/Testbed/OrderSamples.py:95-126,211-235,436-470: native samples define MOC, MOO (MKT+OPG), REL (offset+optional lmt cap), LOC, and LOO (LMT+OPG+lmt price).
- currentBehavior: The old write path accepts rich SDK objects and Partial&lt;Order&gt;, sends each operation directly, and exposes a shared success bag; TradingGit executes operations sequentially and catches each exception as rejected. The source order vocabulary is broader than the prior model: IBKR advertises MOC/LOC/REL, native Order carries REL-only percentOffset and OPG-capable tif fields, Alpaca maps OPG but does not advertise MOC/LOC/REL, Longbridge rejects OPG, and CCXT only directly maps MKT/LMT while the place path omits order.tif.
- problem: There is no prepared action, AccountScope, before-image/version, DispatchStarted write-ahead, idempotency identity, typed acknowledgement/observation, or explicit FailurePolicy. Partial order patches defer validation to SDK, MOC/LOC/REL and opening-auction intent are absent from the canonical union, and adapter-specific TIF/order-type behavior can silently fall through or drop fields.
- preservedBehavior:
  - Preserve all current order terms and sequential per-operation execution for legacy independent batches, but make continuation explicit in FailurePolicy.
  - Correct direct Promise mutation, bool result, and Partial&lt;Order&gt; boundary.
  - Preserve accepted-but-working orders as non-filled.
  - Preserve IBKR MOC/LOC/REL and opening-auction requestability as exact provider-leaf evidence; adapters without that leaf or evidence return structural absence/Unavailable/Unknown rather than downgrading them.
- openQuestions: —

### MAP-298D6BB247

- mapping source: [packages/uta-protocol/src/types/git.ts:18-54](../../../../packages/uta-protocol/src/types/git.ts#L18-L54)
- symbol: Operation discriminated union
- id: MAP-298D6BB247
- sourceEvidence:
  - packages/uta-protocol/src/types/git.ts:18-54: Operation union includes place/modify/close/cancel/sync, observeExternalOrder, and reconcileBalance; place/observe carry native Contract/Order, modify carries Partial&lt;Order&gt;, close carries Decimal, reconcile uses aliceId/quantityDelta/markPrice strings.
  - services/uta/src/domain/trading/git/TradingGit.ts:137-155: executePush iterates operations sequentially, executes each, and catches any exception as rejected.
- currentBehavior: The union tags actions but leaves scope implicit, uses SDK instances/partial patches, and treats sync/external/reconcile observations as the same operation stream. Reconcile stores a virtual fill at mark price; external orders are squashed into an observed commit.
- problem: A tag alone does not associate before-image, acknowledgement, observation, failure, policy, or durable identity. Partial&lt;Order&gt; defers required relation validation; Operation cannot carry all required sizing/trailing/session/protection fields safely.
- preservedBehavior:
  - Preserve all seven source operation behaviors by translating syncOrders into observation work, external orders into ExternalOrderFact, and reconcileBalance into BalanceReconciliationFact; sequential executable operations retain their stable order.
  - Correct executable/observation mixing, missing scope, Partial&lt;Order&gt;, and implicit continuation.
- openQuestions: —

### MAP-29B08BE41B

- mapping source: [packages/uta-protocol/src/types/history.ts:15-30](../../../../packages/uta-protocol/src/types/history.ts#L15-L30)
- symbol: HistoryContract
- id: MAP-29B08BE41B
- sourceEvidence:
  - packages/uta-protocol/src/types/history.ts:15-30: HistoryContract is an IBKR-superset compact object with optional aliceId/symbol/localSymbol/secType/currency/exchange/expiry/strike/right/multiplier.
  - services/uta/src/domain/trading/order-history.ts:24-43: toHistoryContract returns {} for absent Contract, copies optional fields, normalizes right, and stringifies strike/multiplier.
- currentBehavior: History projection intentionally supports options/futures and returns compact rows; absent native contract becomes an empty object and all identity/market fields remain optional.
- problem: An empty/partial contract cannot establish InstrumentId, AccountScope, venue, currency, derivative kind, or multiplier validity. History rows can be displayed but cannot safely link to orders/fills or recompute values.
- preservedBehavior:
  - Preserve derivative fields and normalized option right/Decimal strings for trader display.
  - Correct optional IBKR superset/empty object by explicit variants and legacy evidence.
- openQuestions: —

### MAP-2DA6BBE2CF

- mapping source: [packages/uta-protocol/src/types/git.ts:141-158](../../../../packages/uta-protocol/src/types/git.ts#L141-L158)
- symbol: OperationSummary
- id: MAP-2DA6BBE2CF
- sourceEvidence:
  - packages/uta-protocol/src/types/git.ts:141-158: OperationSummary includes symbol, OperationAction, textual change, flat status, and optional string order terms.
  - services/uta/src/domain/trading/git/TradingGit.ts:416-449: summaries expand sync results, derive symbol from op/result, format strings, and include structured terms only for placeOrder.
- currentBehavior: Review surfaces receive a text change plus partial place-order terms; modify/cancel/sync/external/reconcile lack consistent scope/identity and native-safe structured fields.
- problem: Free-form `change` is presentation, not auditable semantics; symbol is not InstrumentId and terms are incomplete (no notional/trailing/GTD/session/relations/TPSL). Sync summary uses undefined operation fallback for many results.
- preservedBehavior:
  - Preserve useful human change strings and exact place-order review terms.
  - Correct partial structured fields and symbol-based attribution with full normalized intent.
- openQuestions: —

### MAP-33B2356199

- mapping source: [packages/uta-protocol/src/types/index.ts:1-22](../../../../packages/uta-protocol/src/types/index.ts#L1-L22)
- symbol: wire types barrel and contract augmentation side effect
- id: MAP-33B2356199
- sourceEvidence:
  - packages/uta-protocol/src/types/index.ts:1-22: barrel claims narrow wire types but re-exports broker/Git/manager/history modules with native SDK/Decimal/Partial&lt;Order&gt; shapes and imports contract-ext for global augmentation.
- currentBehavior: Importing the barrel exposes all legacy protocol and executes contract-ext side-effect registration; consumers can reach native execution types through a package advertised as wire-only.
- problem: A single barrel hides dependency direction and makes a harmless type import mutate the runtime module graph. It also makes it impossible to guarantee that public exports are serializable or that Git/history are read-only projections.
- preservedBehavior:
  - Preserve one shared package for Alice and UTA type agreement.
  - Preserve history/capability query capabilities through normalized sub-barrels.
  - Correct broad/native barrel and augmentation side effect.
- openQuestions: —

### MAP-36EE24CDBE

- mapping source: [packages/uta-protocol/src/types/git.ts:284-294](../../../../packages/uta-protocol/src/types/git.ts#L284-L294)
- symbol: StageModifyOrderParams
- id: MAP-36EE24CDBE
- sourceEvidence:
  - packages/uta-protocol/src/types/git.ts:284-294: StageModifyOrderParams is a flat bag keyed by string orderId with optional quantity/prices/orderType/tif/GTD fields.
  - services/uta/src/domain/trading/UnifiedTradingAccount.ts:727-740: stageModify creates Partial&lt;Order&gt; Decimal/string changes without loading an order before-image.
  - services/uta/src/domain/trading/UnifiedTradingAccount.ts:727-740: stageModify accepts free orderType/tif/GTD fields as Partial&lt;Order&gt; without a before-image.
  - packages/ibkr/src/order.ts:48-75 and packages/ibkr/ref/samples/Python/Testbed/OrderSamples.py:95-126,211-235,436-470: modified order semantics include MOC/LOC/REL and OPG-composed opening variants with typed price/offset relations.
- currentBehavior: Modify accepts any subset and defers legality/identity to broker; it can modify quantity/prices/order type without scope, version, current fills, or full relation semantics.
- problem: Partial patch cannot express field clearing versus omission, preserve parent/OCA/protection/trailing relations, or prevent stale-order races. A bare ID may target wrong account.
- preservedBehavior:
  - Preserve old modify fields (quantity/prices/type/tif/GTD) while adding explicit semantics.
  - Correct Partial&lt;Order&gt; and bare ID/stale race.
  - Do not call cancel+replace Exact compensation.
- openQuestions: —

### MAP-3AB8DE4D1E

- mapping source: [packages/uta-protocol/src/types/broker.ts:531-551](../../../../packages/uta-protocol/src/types/broker.ts#L531-L551)
- symbol: IBroker sub-account methods
- id: MAP-3AB8DE4D1E
- sourceEvidence:
  - packages/uta-protocol/src/types/broker.ts:531-551: IBroker listSubAccounts is optional and subAccountForContract is optional; comments define ignored selectors for single wallets and instrument-derived wallet routing for CCXT.
  - packages/uta-protocol/src/types/git.ts:256-305: StagePlace/Close document multi-wallet requirements but do not persist subAccountId in Operation.
- currentBehavior: Sub-account listing and instrument routing are optional methods; UTA special-cases absent methods as implicit default and validates requested IDs only for discovered multi-wallet accounts.
- problem: Optional methods make discovery not-ready look like a single default. Scope is omitted from durable operations, so a restarted process cannot prove which wallet was targeted; conflict keys cannot prevent cross-wallet races.
- preservedBehavior:
  - Preserve convenience for single-wallet brokers by explicit default construction.
  - Preserve CCXT spot/derivatives routing validation.
  - Correct message-only subaccount stamping and optional method semantics.
- openQuestions: —

### MAP-3EEBF25E8D

- mapping source: [packages/uta-protocol/src/types/broker.ts:366-413](../../../../packages/uta-protocol/src/types/broker.ts#L366-L413)
- symbol: BrokerHealth, UTAReach, UTATier, and BrokerHealthInfo
- id: MAP-3EEBF25E8D
- sourceEvidence:
  - packages/uta-protocol/src/types/broker.ts:366-413: BrokerHealthInfo combines status/reach/tier, counters/timestamps, recovering/connecting, disabled; comments define down/connected/readable and optimistic healthy while initial connect runs.
  - services/uta/src/domain/trading/UnifiedTradingAccount.ts:99-113: UTA owns consecutive failure thresholds and CONNECT_GRACE_MS for initial connect.
- currentBehavior: Health is a mutable summary assembled from transport reach and recovery counters; connecting accounts can report healthy while reads return a CONNECTING marker.
- problem: The interface combines health, readiness, static account purpose, and recovery control into optional Dates/booleans; it omits AccountScope, connection generation, evidence sequence, and the distinction between local journal readiness and broker reach.
- preservedBehavior:
  - Preserve data-only connected vs funded-readable distinction and initial-connect no-failure semantics.
  - Preserve explicit shutdown/recovery visibility, but replace independent phase/flags with closed RuntimeHealth variants.
  - Correct any interpretation of health summary as transaction authority.
- openQuestions: —

### MAP-403375E19B

- mapping source: [packages/uta-protocol/src/types/broker.ts:204-211](../../../../packages/uta-protocol/src/types/broker.ts#L204-L211)
- symbol: OptionGridEntry
- id: MAP-403375E19B
- sourceEvidence:
  - packages/uta-protocol/src/types/broker.ts:204-211: OptionGridEntry contains exchange/tradingClass/multiplier strings, expiration strings, and numeric strike arrays.
- currentBehavior: Option-chain parameter grids are returned as venue rows, with strike precision represented as JavaScript numbers and no instrument identity or scope.
- problem: A grid entry cannot state the underlying or derivative family, and number strikes can round high-precision contracts. The row does not tell consumers which fields are authoritative versus display labels.
- preservedBehavior:
  - Preserve option-grid workflow and multiplier needed for valuation.
  - Correct number-based strikes and omission of right/underlying by making the row self-describing.
- openQuestions: —

### MAP-40929B6DB6

- mapping source: [packages/uta-protocol/src/types/broker.ts:611-620](../../../../packages/uta-protocol/src/types/broker.ts#L611-L620)
- symbol: IBroker native identity methods
- id: MAP-40929B6DB6
- sourceEvidence:
  - packages/uta-protocol/src/types/broker.ts:611-620: IBroker.getNativeKey extracts a string from native Contract and resolveNativeKey reconstructs a native Contract; comments prescribe broker-specific identity primitives.
  - packages/uta-protocol/src/types/contract-ext.ts:4-22: aliceId is formed as `{utaId}|{nativeKey}` and native-key uniqueness is broker-defined.
- currentBehavior: Identity is represented as an optional native Contract.aliceId string; adapters provide getNativeKey/resolveNativeKey functions and callers persist lookup symbols/IDs.
- problem: A concatenated string does not distinguish account scope from instrument namespace, optional aliceId is easy to omit, and resolveNativeKey has no typed failure or catalog revision. String keys can collide across connections/scopes and native reconstructions may be stale.
- preservedBehavior:
  - Preserve per-broker uniqueness primitives such as IBKR conId, CCXT unified symbol, Alpaca ticker only when evidence declares them.
  - Correct concatenated aliceId/global optional field and untyped reconstruction.
- openQuestions: —

### MAP-430A3CCB4D

- mapping source: [packages/uta-protocol/src/types/errors.ts:1-19](../../../../packages/uta-protocol/src/types/errors.ts#L1-L19)
- symbol: WireBrokerError
- id: MAP-430A3CCB4D
- sourceEvidence:
  - packages/uta-protocol/src/types/errors.ts:1-19: WireBrokerError is a universal `{code:string,message:string,transient:boolean,hint?:string}` shape documented as lossless translation of BrokerError.
  - packages/uta-protocol/src/client/UTAClient.ts:75-84: non-2xx bodies are read as unknown and converted to UTAHttpError using a generic `error` property/message.
- currentBehavior: Every endpoint is expected to return one loose error bag, while the client turns any body into a generic Error-like UTAHttpError; route/action context is not preserved.
- problem: The bag collapses TransactionFailure, QueryFailure, DispatchFailure, BrokerRejection, ProtocolViolation, authentication, and storage faults. `transient` is not enough to decide retry versus observation; `message` becomes the effective protocol and can leak secrets.
- preservedBehavior:
  - Preserve human-readable hint/message as redacted presentation text.
  - Correct universal wire shape and generic client exception by route-specific exhaustive codecs.
- openQuestions: —

### MAP-46669371C2

- mapping source: [packages/uta-protocol/src/types/broker.ts:445-450](../../../../packages/uta-protocol/src/types/broker.ts#L445-L450)
- symbol: AccountCapabilities
- id: MAP-46669371C2
- sourceEvidence:
  - packages/uta-protocol/src/types/broker.ts:445-450: AccountCapabilities exposes supportedSecTypes and supportedOrderTypes as string arrays and optional HistoricalBarsCapability.
  - services/uta/src/domain/trading/brokers/ibkr/IbkrBroker.ts:874-878: source capability includes MOC/LOC/REL, which must be represented as typed order-kind metadata.
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:54-74 and LongbridgeBroker.ts:103-120: order-kind/TIF conversions include an OPG mapping for Alpaca but an explicit OPG refusal for Longbridge.
  - services/uta/src/domain/trading/brokers/ccxt/CcxtBroker.ts:576-611,664-679: CCXT refuses unverified order semantics and handles TIF differently for edit versus place.
  - packages/ibkr/src/client/orders.ts:348-385,430-465 and packages/ibkr/ref/samples/Python/Testbed/OrderSamples.py:95-126,211-235,436-470: capability metadata must distinguish native order kinds from the OPG opening execution window and REL offset/cap fields.
- currentBehavior: AccountCapabilities exposes supportedSecTypes and supportedOrderTypes as unvalidated string arrays and optional historical bars; the source set includes IBKR MOC/LOC/REL, while adapter details and OPG handling are not normalized into capability decisions.
- problem: String labels do not say whether a named order kind/TIF is supported, rejected, or unknown for this scope and adapter, and cannot distinguish a static advertisement from executable native mapping.
- preservedBehavior:
  - Preserve secType/order labels for UI/catalog where evidence supports them.
  - Correct string-array static/synchronous API with action-specific, versioned availability.
- openQuestions: —

### MAP-4B40267FF6

- mapping source: [packages/uta-protocol/src/types/git.ts:56-58](../../../../packages/uta-protocol/src/types/git.ts#L56-L58)
- symbol: OperationStatus
- id: MAP-4B40267FF6
- sourceEvidence:
  - packages/uta-protocol/src/types/git.ts:56-58: OperationStatus is flat submitted/filled/rejected/cancelled/user-rejected union.
  - services/uta/src/domain/trading/git/TradingGit.ts:969-976: mapOrderStatus converts native states to filled/cancelled/rejected/default submitted.
- currentBehavior: One status union is reused for placement, sync, cancel, external observation, and user rejection; unknown native state defaults to submitted.
- problem: The flat status cannot distinguish acknowledgement, working, partial fills, unknown outcome, recovery, or action-specific legal transitions. Mapping unknown native state to submitted can falsely claim a working order.
- preservedBehavior:
  - Preserve filled/cancelled/rejected status presentation where confirmed.
  - Correct default-submitted mapping and status reuse by preserving unknown/partial/recovery distinctions.
- openQuestions: —

### MAP-56C6192DB1

- mapping source: [packages/uta-protocol/src/types/history.ts:61-76](../../../../packages/uta-protocol/src/types/history.ts#L61-L76)
- symbol: TradeHistorySource and TradeHistoryEntry
- id: MAP-56C6192DB1
- sourceEvidence:
  - packages/uta-protocol/src/types/history.ts:61-76: TradeHistoryEntry stores optional orderId, HistoryContract, side, decimal-string quantity/price/value, source order/external/reconcile, and commitHash.
  - services/uta/src/domain/trading/order-history.ts:133-250: trade projection derives value as qty*price*multiplier, records real fills and reconcileBalance virtual fills, deduplicates by orderId, and labels source via originating operation.
- currentBehavior: Trade history includes real and reconciled fills, derives value with Decimal/multiplier, and deduplicates origin versus sync by orderId; reconcile rows use only aliceId identity and virtual observed prices.
- problem: A fill row lacks AccountScope/fill identity/currency/unit, cannot distinguish cumulative corrections, and commitHash/source operation are insufficient provenance. Virtual reconciliation can be mistaken for a real trade if source semantics are only strings.
- preservedBehavior:
  - Preserve quantity*price*multiplier Decimal arithmetic and external/reconcile visibility.
  - Correct order-only dedup and string source/commit semantics with fill identity/provenance ADTs.
- openQuestions: —

### MAP-601583B467

- mapping source: [packages/uta-protocol/src/types/git.ts:169-174](../../../../packages/uta-protocol/src/types/git.ts#L169-L174)
- symbol: GitExportState
- id: MAP-601583B467
- sourceEvidence:
  - packages/uta-protocol/src/types/git.ts:169-174: GitExportState exports all GitCommit values and a Git head hash.
  - services/uta/src/domain/trading/git/TradingGit.ts:565-577: exportState projects commits, restore rehydrates them and restores head without durable journal validation.
- currentBehavior: Export/import is a full mutable snapshot used to recreate TradingGit; native/Decimal rehydration and missing fields are handled by ad hoc functions.
- problem: An export is mistaken for authoritative execution state, has no schema/source sequence/hash check, and may restore commands without dispatch identities or AccountScope. Import can create false facts by defaulting fields.
- preservedBehavior:
  - Preserve portable audit export and head navigation.
  - Correct restore-as-execution behavior and implicit rehydration defaults.
- openQuestions: —

### MAP-609FF636E8

- mapping source: [packages/uta-protocol/src/types/broker.ts:428-443](../../../../packages/uta-protocol/src/types/broker.ts#L428-L443)
- symbol: HistoricalBarsCapability
- id: MAP-609FF636E8
- sourceEvidence:
  - packages/uta-protocol/src/types/broker.ts:428-443: HistoricalBarsCapability has supported boolean, optional quality realtime/iex/delayed/subscription, and optional supportedBarSizes.
- currentBehavior: A missing historicalBars means no support; supported=true with absent quality or sizes is accepted, and quality names mix entitlement with data quality.
- problem: The boolean/optional bag cannot explain unsupported versus unknown versus subscription requirement, does not include price streams/range limits, and can advertise support without action-specific account/session facts.
- preservedBehavior:
  - Preserve realtime/IEX/delayed/subscription quality information.
  - Correct supported boolean and optional fields by exposing explicit availability and request dimensions.
- openQuestions: —

### MAP-634E72490E

- mapping source: [packages/uta-protocol/src/types/broker.ts:108-155](../../../../packages/uta-protocol/src/types/broker.ts#L108-L155)
- symbol: Position
- id: MAP-634E72490E
- sourceEvidence:
  - packages/uta-protocol/src/types/broker.ts:108-155: Position embeds native Contract, runtime Decimal quantity, raw currency, side, string monetary fields, required multiplier, optional avgCostSource and PositionRisk.
  - services/uta/src/domain/trading/UnifiedTradingAccount.ts:1005-1023: account PnL is recomputed from positions only when currencies match account.baseCurrency.
- currentBehavior: Position is used both as broker return value and persisted GitState item; quantity is rehydrated as Decimal and multiplier defaults to 1 for old commits.
- problem: Native Contract and Decimal cannot be serialized safely, currency and instrument relations are only strings, and account/sub-account scope is absent. The current account PnL guard can retain broker totals for mixed currencies but has no explicit uncertainty type.
- preservedBehavior:
  - Preserve multiplier-aware PnL and wallet cost-basis reconstruction semantics.
  - Preserve the same-currency PnL guard but make its fallback visible as ValuationEvidence.Uncertain instead of silently trusting a broker total.
  - Remove Decimal/native Contract from public and durable shapes.
- openQuestions: —

### MAP-654966E128

- mapping source: [packages/uta-protocol/src/types/broker.spec.ts:1-3](../../../../packages/uta-protocol/src/types/broker.spec.ts#L1-L3)
- symbol: BrokerError test import
- id: MAP-654966E128
- sourceEvidence:
  - packages/uta-protocol/src/types/broker.spec.ts:1-3: fixture imports BrokerError directly from ./broker.js rather than a wire decoder or failure schema.
- currentBehavior: The test suite exercises a class exported by the legacy broker module, so the test itself establishes package coupling to the class constructor.
- problem: A test that imports a runtime error class cannot prove that an HTTP or plugin boundary decodes the same failure; it also keeps a native exception API in the shared protocol package.
- preservedBehavior:
  - Keep coverage that a failure encoded by an independently loaded broker pack can be consumed by the UTA protocol.
  - Intentionally remove the assertion that a value is instanceof BrokerError; package identity must not be part of the contract.
- openQuestions: —

### MAP-6BAF8CB0BF

- mapping source: [packages/uta-protocol/src/types/manager.ts:44-58](../../../../packages/uta-protocol/src/types/manager.ts#L44-L58)
- symbol: ContractSearchHit
- id: MAP-6BAF8CB0BF
- sourceEvidence:
  - packages/uta-protocol/src/types/manager.ts:44-58: ContractSearchHit uses raw source string, native `ContractDescription["contract"]`, derivativeSecTypes string[], and optional venue-decided assetClass union.
  - services/uta/src/domain/trading/contract-search.ts:44-64: searchTradeableContracts builds hits from native descriptions, carries UTA id as source, copies derivativeSecTypes, and prefers broker.assetClassFor with secType fallback downstream.
- currentBehavior: Search hits are flattened for HTTP/UI; the venue’s optional assetClassFor is authoritative when present, but native contract and source string carry identity.
- problem: The hit lacks AccountScope/InstrumentId/catalog revision/freshness and treats derivative types as strings. Missing asset-class evidence silently leaves consumers to a broker-blind heuristic; hits from different scopes can collide by symbol.
- preservedBehavior:
  - Preserve venue-decided asset class precedence and derivative family labels.
  - Correct source string/native Contract and heuristic ambiguity with scoped branded identity/provenance.
- openQuestions: —

### MAP-6C0ADD0EA4

- mapping source: [packages/uta-protocol/src/types/broker.ts:14-20](../../../../packages/uta-protocol/src/types/broker.ts#L14-L20)
- symbol: BrokerErrorCode and code registry
- id: MAP-6C0ADD0EA4
- sourceEvidence:
  - packages/uta-protocol/src/types/broker.ts:14-20: BrokerErrorCode is a seven-member string union and BROKER_ERROR_CODES is a ReadonlySet used by runtime validation.
- currentBehavior: Runtime validation accepts only CONFIG, AUTH, NETWORK, EXCHANGE, MARKET_CLOSED, CONNECTING, and UNKNOWN; all other text is handled as a fallback path.
- problem: A closed code list is not an exhaustive failure model: code membership omits action identity, scope, retry horizon, evidence, capability versus authorization, and unknown protocol versions. A Set cannot enforce payload invariants.
- preservedBehavior:
  - Preserve stable labels for existing user-facing CONFIG/AUTH/NETWORK cases via an explicit presentation mapping.
  - Correct reliance on a universal UNKNOWN code by retaining unknown native values and requiring recovery classification.
- openQuestions: —

### MAP-6EAA6A8F74

- mapping source: [packages/uta-protocol/src/types/manager.ts:39-42](../../../../packages/uta-protocol/src/types/manager.ts#L39-L42)
- symbol: ContractSearchResult
- id: MAP-6EAA6A8F74
- sourceEvidence:
  - packages/uta-protocol/src/types/manager.ts:39-42: ContractSearchResult groups native ContractDescription[] under raw string accountId.
  - services/uta/src/domain/trading/uta-manager.ts:272-295: searchContracts targets account IDs or asVendor UTAs, returns native descriptions, and drops accounts whose result array is empty.
- currentBehavior: Cross-account search fans out, ignores unhealthy accounts/failed calls, and filters out empty descriptions; account ID is the only source attribution.
- problem: Dropping failures and empty/unavailable accounts hides coverage; native descriptions and raw account IDs lack scope, catalog revision, completeness, and typed per-account failure.
- preservedBehavior:
  - Preserve cross-account search and independent failure isolation.
  - Correct dropping failed/empty groups and native descriptions via C07 completeness.
- openQuestions: —

### MAP-6ED1656D7F

- mapping source: [packages/uta-protocol/src/types/broker.ts:44-61](../../../../packages/uta-protocol/src/types/broker.ts#L44-L61)
- symbol: BrokerError.from cross-package wrapper
- id: MAP-6ED1656D7F
- sourceEvidence:
  - packages/uta-protocol/src/types/broker.ts:44-61: BrokerError.from accepts unknown, recognizes structural name/code only for codes in BROKER_ERROR_CODES, otherwise classifies message/fallback, and copies Error as cause.
  - packages/uta-protocol/src/types/broker.spec.ts:5-28: tests exercise cross-package structural recognition and unknown-code fallback.
- currentBehavior: The wrapper is deliberately constructor-identity independent but still reduces unknown inputs to a class and message, with an optional cause object.
- problem: Unknown input parsing, classification, and policy are mixed. A native object can smuggle arbitrary fields, a cause is not serializable, and the fallback code loses evidence needed for unknown dispatch recovery.
- preservedBehavior:
  - Preserve cross-package code recognition for known variants.
  - Intentionally stop constructing a new Error for every unknown source; callers receive typed failures and diagnostics remain local.
- openQuestions: —

### MAP-7056B295D1

- mapping source: [packages/uta-protocol/src/types/broker.ts:585-605](../../../../packages/uta-protocol/src/types/broker.ts#L585-L605)
- symbol: IBroker market-data and historical methods
- id: MAP-7056B295D1
- sourceEvidence:
  - packages/uta-protocol/src/types/broker.ts:585-605: IBroker getQuote/getMarketClock/getHistorical?/assetClassFor? are direct Promise calls with native Contract and Date/string unions; comments say unsupported historical method is loud-refused and asset class may heuristic-fallback.
  - services/uta/src/domain/trading/UnifiedTradingAccount.ts:1132-1155: UTA delegates market queries through broker methods.
- currentBehavior: Market data and session queries share the broker object with trading mutations; historical support is optional and asset class can fall back to secType heuristics.
- problem: Query availability, venue/session evidence, and read freshness are implicit. Unsupported methods/asset-class heuristics can return wrong data while action/kernel sees no typed capability failure.
- preservedBehavior:
  - Preserve read-only/keyless market-data capability.
  - Preserve venue-decided asset class preference; correct unmarked secType heuristic use.
  - Correct optional direct Promise API and Date/native contracts.
- openQuestions: —

### MAP-710D1204ED

- mapping source: [packages/uta-protocol/src/types/broker.ts:22-42](../../../../packages/uta-protocol/src/types/broker.ts#L22-L42)
- symbol: BrokerError constructor and permanence flag
- id: MAP-710D1204ED
- sourceEvidence:
  - packages/uta-protocol/src/types/broker.ts:22-42: BrokerError extends Error, stores code/message, and computes permanent=true only for CONFIG or AUTH; comments classify CONNECTING as transient readiness marker.
- currentBehavior: Callers can throw/catch BrokerError and branch on code/permanent; CONNECTING is represented as an exception despite being a readiness state.
- problem: Error inheritance and a boolean permanence flag lose whether a failure disables an account, blocks one action, is safe to retry after observation, or represents a particular dispatch attempt. Throwing CONNECTING through query paths also encourages generic catch handling.
- preservedBehavior:
  - Keep legacy AUTH/CONFIG non-retryable behavior as adapter evidence only; provider mappings and account impact remain explicit policy, not a universal code rule.
  - Preserve CONNECTING non-failure behavior but move it out of Error and health failure counters.
- openQuestions: —

### MAP-732B845474

- mapping source: [packages/uta-protocol/src/types/history.ts:36-59](../../../../packages/uta-protocol/src/types/history.ts#L36-L59)
- symbol: OrderHistoryEntry
- id: MAP-732B845474
- sourceEvidence:
  - packages/uta-protocol/src/types/history.ts:36-59: OrderHistoryEntry collapses lifecycle into one row with optional orderId/order terms/fills, flat status/source, commitHash/message, and optional string error.
  - services/uta/src/domain/trading/order-history.ts:70-130: one row is created for place/external/close, indexed by orderId, cancel/sync mutate the existing row, and rejected-before-submit rows go to an anonymous list.
- currentBehavior: Projection joins operation/result arrays into one newest-first order row; rejected-before-submit entries have no orderId and cancel of unknown order is omitted from the row.
- problem: Single-row collapse loses event chronology, action/attempt identity, scope and typed failures; anonymous rows cannot be linked later, and `commitHash` is a Git pointer rather than a durable journal range.
- preservedBehavior:
  - Preserve one-row-per-order trader view, newest-first ordering, rejected-before-submit visibility, and cancel/sync updates.
  - Correct event loss, anonymous unlinked errors, flat strings, and Git-only pointer.
  - Keep raw audit timeline separately.
- openQuestions: —

### MAP-75E0ED8B2B

- mapping source: [packages/uta-protocol/src/types/manager.ts:12-19](../../../../packages/uta-protocol/src/types/manager.ts#L12-L19)
- symbol: UTASummary
- id: MAP-75E0ED8B2B
- sourceEvidence:
  - packages/uta-protocol/src/types/manager.ts:12-19: UTASummary has id/label, asVendor boolean, AccountCapabilities, and BrokerHealthInfo.
  - services/uta/src/domain/trading/uta-manager.ts:161-168: listUTAs maps UTA id/label/asVendor/getCapabilities/getHealthInfo into this summary.
- currentBehavior: Summary exposes whether a UTA participates in discovery and combines capabilities/health into one read row.
- problem: Raw string id/boolean mode and legacy capability/health types lack AccountScope, persistent account identity, runtime phase/boot identity, revision/freshness, and clear read-only/keyless versus trading authority.
- preservedBehavior:
  - Preserve asVendor discovery filtering and labels.
  - Preserve distinction of data-only versus funded account, but replace boolean/capability bag with explicit mode/ADTs.
  - Correct any interpretation of summary health as transaction authority.
- openQuestions: —

### MAP-77D0297A77

- mapping source: [packages/uta-protocol/src/types/broker.ts:159-168](../../../../packages/uta-protocol/src/types/broker.ts#L159-L168)
- symbol: PlaceOrderLeg
- id: MAP-77D0297A77
- sourceEvidence:
  - packages/uta-protocol/src/types/broker.ts:159-168: PlaceOrderLeg carries only a string orderId and takeProfit/stopLoss kind.
- currentBehavior: A placement result can list protective child IDs, allowing the Git scanner to treat legs as submitted and later synchronize them.
- problem: The leg ID has no AccountScope, parent relationship, native-id provenance, or child order terms; a bare string can collide across accounts and cannot prove which action created it.
- preservedBehavior:
  - Preserve tracking of bracket legs from birth and inclusion in pending-order scans.
  - Correct cross-account string collisions and false assumption that every venue creates a linked atomic group.
- openQuestions: —

### MAP-781BB54D06

- mapping source: [packages/uta-protocol/src/types/broker.ts:500-522](../../../../packages/uta-protocol/src/types/broker.ts#L500-L522)
- symbol: IBroker contract search and catalog methods
- id: MAP-781BB54D06
- sourceEvidence:
  - packages/uta-protocol/src/types/broker.ts:500-522: IBroker contract search methods return ContractDescription[]/native ContractDetails, optional expandContract returns ContractExpansion, and optional refreshCatalog Promise&lt;void&gt;.
- currentBehavior: Search/details/expansion and refresh are mixed in the broker object; optional methods signal unsupported behavior with undefined while refresh errors propagate and search returns native descriptions.
- problem: Undefined method and empty arrays conflate unsupported, unavailable, and no matches. Native ContractDescription crosses the catalog/query boundary; no catalog revision or freshness is carried.
- preservedBehavior:
  - Preserve hub/leaf expansion and keep cache on refresh failure.
  - Correct optional method/empty fallback and native descriptions by explicit capability/result variants.
- openQuestions: —

### MAP-7E5E549A48

- mapping source: [packages/uta-protocol/src/types/broker.ts:298-313](../../../../packages/uta-protocol/src/types/broker.ts#L298-L313)
- symbol: Quote
- id: MAP-7E5E549A48
- sourceEvidence:
  - packages/uta-protocol/src/types/broker.ts:298-313: Quote embeds native Contract, string last/bid/ask/volume/high/low, and JavaScript Date timestamp.
- currentBehavior: Quote values are returned directly from broker adapters and are separate from read-only numeric analysis types; instrument identity is inferred from Contract fields.
- problem: The quote can be detached from canonical InstrumentId, account/venue scope, units, and observation provenance. Date and raw strings need schema validation; bid/ask consistency and stale quotes are not represented.
- preservedBehavior:
  - Preserve decimal-string precision and quote fields supported by each broker.
  - Correct native Contract/Date leak and identity inference by requiring normalized instrument and freshness.
- openQuestions: —

### MAP-864224E5A6

- mapping source: [packages/uta-protocol/src/types/manager.ts:1-10](../../../../packages/uta-protocol/src/types/manager.ts#L1-L10)
- symbol: manager native imports
- id: MAP-864224E5A6
- sourceEvidence:
  - packages/uta-protocol/src/types/manager.ts:1-10: manager imports AccountCapabilities/BrokerHealth/BrokerHealthInfo from broker.ts and native ContractDescription from @traderalice/ibkr.
  - services/uta/src/domain/trading/uta-manager.ts:8-27: UTAManager imports native Contract/Description/Details and protocol manager types, then re-exports them through a service compatibility surface.
- currentBehavior: Manager summaries and search results are built from native broker capabilities/descriptions; service manager re-exports protocol shapes for callers.
- problem: The manager public layer leaks SDK ContractDescription and legacy capability arrays, and aggregation cannot distinguish account identity/scope/reach/capability evidence from broker objects.
- preservedBehavior:
  - Preserve listUTAs, cross-account equity, and contract-search surfaces.
  - Correct direct native imports and capability re-export coupling.
- openQuestions: —

### MAP-89DA5A834C

- mapping source: [packages/uta-protocol/src/types/broker.ts:213-223](../../../../packages/uta-protocol/src/types/broker.ts#L213-L223)
- symbol: ContractExpansion
- id: MAP-89DA5A834C
- sourceEvidence:
  - packages/uta-protocol/src/types/broker.ts:213-223: ContractExpansion uses kind contracts|optionGrid but makes contracts,total,grid,hint independently optional and contracts are native Contract[].
- currentBehavior: Consumers must inspect kind and then defensively discover which optional fields happen to be present; a malformed object can have both/no payloads.
- problem: The string kind is not connected to required payloads, and native Contract[] leaks SDK identity/metadata. `total` and `hint` are optional even when pagination/guidance is needed.
- preservedBehavior:
  - Preserve leaves vs hub workflow, total count, and agent guidance.
  - Correct optional-field soup and native Contract[] exposure with exhaustive serializable variants.
- openQuestions: —

### MAP-89E53C0637

- mapping source: [packages/uta-protocol/src/types/git.ts:13-16](../../../../packages/uta-protocol/src/types/git.ts#L13-L16)
- symbol: CommitHash
- id: MAP-89E53C0637
- sourceEvidence:
  - packages/uta-protocol/src/types/git.ts:13-16: CommitHash is an unconstrained string documented as an eight-character short SHA-256 hash.
  - services/uta/src/domain/trading/git/TradingGit.ts:38-43: generateCommitHash JSON.stringifies an object, computes SHA-256, and truncates to eight hex characters.
- currentBehavior: Hashes are generated from JSON.stringify field order and represented by plain strings; collision, canonical encoding, hash algorithm, and full journal sequence are not encoded.
- problem: A short unconstrained string cannot distinguish Git audit commit IDs from transaction IDs or prove content integrity after schema evolution. JSON.stringify ordering is not a durable canonical encoding.
- preservedBehavior:
  - Preserve human-facing short hash display and parent-chain navigation when evidence supports it.
  - Correct plain string/short SHA assumption for authority and deduplication.
- openQuestions: —

### MAP-8AD42F6839

- mapping source: [packages/uta-protocol/src/types/git.ts:203-211](../../../../packages/uta-protocol/src/types/git.ts#L203-L211)
- symbol: SimulationPositionCurrent
- id: MAP-8AD42F6839
- sourceEvidence:
  - packages/uta-protocol/src/types/git.ts:203-211: SimulationPositionCurrent stores symbol, side, decimal-string qty/avgCost/marketPrice/unrealizedPnL/marketValue.
  - services/uta/src/domain/trading/git/TradingGit.ts:818-827: current rows derive symbol from contract.symbol/aliceId and quantity Decimal.toString().
- currentBehavior: Current simulation rows are display snapshots detached from AccountScope, InstrumentId, multiplier, currency, source sequence, and valuation evidence.
- problem: The same display symbol can represent several derivatives/scopes; values lack units and freshness, so a report cannot be safely compared to account projection or replayed.
- preservedBehavior:
  - Preserve pre-change quantities and accounting values.
  - Correct display-only symbol and missing units/scope by sharing PositionObservation contract.
- openQuestions: —

### MAP-8C2153421E

- mapping source: [packages/uta-protocol/src/types/broker.ts:315-320](../../../../packages/uta-protocol/src/types/broker.ts#L315-L320)
- symbol: MarketClock
- id: MAP-8C2153421E
- sourceEvidence:
  - packages/uta-protocol/src/types/broker.ts:315-320: MarketClock is an account-independent isOpen boolean with optional nextOpen/nextClose/timestamp Date fields.
- currentBehavior: A broker returns a single boolean clock and optional JavaScript dates; UTA callers use it for market-open checks without instrument/jurisdiction/session-kind context.
- problem: One account-wide boolean cannot represent venue calendars, crypto continuous sessions, instrument holidays, or time-zone/regular versus extended sessions. Optional dates make stale/unknown indistinguishable from no session.
- preservedBehavior:
  - Preserve support for market-open gating and next transition hints.
  - Correct account-wide boolean and Date leakage with venue/instrument/session-specific evidence.
- openQuestions: —

### MAP-8C79F4D559

- mapping source: [packages/uta-protocol/src/types/broker.ts:349-364](../../../../packages/uta-protocol/src/types/broker.ts#L349-L364)
- symbol: Bar
- id: MAP-8C79F4D559
- sourceEvidence:
  - packages/uta-protocol/src/types/broker.ts:349-364: Bar has Date timestamp and string OHLCV fields but no instrument, interval, quote currency, or stream identity.
- currentBehavior: The instrument and request context live outside each Bar; consumers assume all rows correspond to the requested contract and that strings are valid decimals.
- problem: A detached bar can be attributed to the wrong instrument/interval, volume unit is unknown, and malformed/high&lt;low values pass through. Date/native serialization is not canonical.
- preservedBehavior:
  - Preserve OHLCV Decimal precision and UTC intent.
  - Correct context-free rows and JS Date by attaching identity/interval/stream and canonical Instants.
- openQuestions: —

### MAP-8CE1592385

- mapping source: [packages/uta-protocol/src/types/history.ts:32-34](../../../../packages/uta-protocol/src/types/history.ts#L32-L34)
- symbol: OrderHistoryStatus and OrderHistorySource
- id: MAP-8CE1592385
- sourceEvidence:
  - packages/uta-protocol/src/types/history.ts:32-34: OrderHistoryStatus is submitted/filled/cancelled/rejected/user-rejected and OrderHistorySource is alice/external.
  - services/uta/src/domain/trading/order-history.ts:88-95,120-123: projection casts result.status to OrderHistoryStatus and labels operations as alice/external.
- currentBehavior: History flattens order lifecycle and provenance into two string unions; sync/status casts allow runtime values outside the declared union.
- problem: It omits working/partial/expired/unknown/reconciling states and cannot distinguish Alice intent, external observation, reconciliation, or adapter evidence. Casting can turn unknown status into a false terminal state.
- preservedBehavior:
  - Preserve Alice/external attribution and terminal labels where confirmed.
  - Correct flat status/source and unchecked casts with lifecycle/provenance ADTs.
- openQuestions: —

### MAP-98D887D066

- mapping source: [packages/uta-protocol/src/types/broker.ts:415-426](../../../../packages/uta-protocol/src/types/broker.ts#L415-L426)
- symbol: BrokerConnectionStateEvent
- id: MAP-98D887D066
- sourceEvidence:
  - packages/uta-protocol/src/types/broker.ts:415-426: BrokerConnectionStateEvent has alive/dead/restored state and optional string error; comments say dead is authoritative, restored is only a retry hint.
- currentBehavior: Adapters can push a small event to UTA; restored does not prove private account reads and alive is emitted only after adapter readiness handshake.
- problem: A string state plus error lacks connection generation, AccountScope, source sequence, and evidence type; consumers can mistake restored for transaction recovery or overwrite a newer generation.
- preservedBehavior:
  - Preserve authoritative dead behavior and restored-as-hint semantics.
  - Correct string error and connection/transaction coupling by adding subject/generation evidence.
- openQuestions: —

### MAP-9F0ED3057E

- mapping source: [packages/uta-protocol/src/types/broker.ts:63-79](../../../../packages/uta-protocol/src/types/broker.ts#L63-L79)
- symbol: BrokerError.classifyMessage
- id: MAP-9F0ED3057E
- sourceEvidence:
  - packages/uta-protocol/src/types/broker.ts:63-79: classifyMessage lowercases arbitrary text and checks regexes in precedence order for market closed, network, rate limits, HTTP 5xx, auth, forbidden, funds, and margin.
- currentBehavior: `classifyMessage` lowercases arbitrary text and applies the observed precedence (market-closed, network/timeouts/rate limits/5xx, AUTH, forbidden/funds/margin), then returns a legacy code or null; no native provider error schema or idempotency evidence is present in this shared module.
- problem: The regex table is lossy and language/provider dependent. It can misclassify a new broker code, expose sensitive text, or label a post-dispatch timeout as retryable NETWORK. Neither this helper nor the cited source proves native error precedence, idempotency, absence, or safe redispatch for any provider.
- preservedBehavior:
  - Preserve the observed regex precedence and redacted lexical evidence as adapter-local diagnostics during migration; it is not a native guarantee.
  - Correct regex-driven status claims by retaining UnclassifiedNativeFailure/Unknown and requiring observation after a possible remote side effect.
- openQuestions:
  - Native SDK/provider error fields, stable code precedence, and idempotency/absence guarantees are unavailable in this shared source; each adapter must supply evidence before classifying a native failure as safe retry or terminal rejection.

### MAP-A27D9FADF9

- mapping source: [packages/uta-protocol/src/types/contract-ext.ts:1-31](../../../../packages/uta-protocol/src/types/contract-ext.ts#L1-L31)
- symbol: IBKR Contract aliceId declaration augmentation
- id: MAP-A27D9FADF9
- sourceEvidence:
  - packages/uta-protocol/src/types/contract-ext.ts:1-31: module augmentation adds optional `aliceId?: string` to @traderalice/ibkr Contract and documents `{utaId}|{nativeKey}` construction via stampAliceId.
  - services/uta/src/domain/trading/UnifiedTradingAccount.ts:1026-1029: getPositions stamps aliceId on returned native contracts; :973-977 stamps observed external-order contracts before journaling.
- currentBehavior: The global side effect makes every imported Contract appear to carry Alice identity, and UTA mutates broker-returned contracts before persistence/projection.
- problem: Optional declaration merge does not establish runtime identity, scope, catalog revision, or construction validity. Import order controls whether consumers see the field, and native SDK objects become the identity transport.
- preservedBehavior:
  - Preserve each broker’s documented native uniqueness primitive and downstream resolution behavior when proven.
  - Correct optional global field, string concatenation, and mutation by explicit construction/codec.
  - Do not infer identity from display symbol/localSymbol.
- openQuestions: —

### MAP-A774AC84F2

- mapping source: [packages/uta-protocol/src/types/git.ts:308-322](../../../../packages/uta-protocol/src/types/git.ts#L308-L322)
- symbol: getOperationSymbol
- id: MAP-A774AC84F2
- sourceEvidence:
  - packages/uta-protocol/src/types/git.ts:308-322: getOperationSymbol returns contract.symbol/aliceId for place/close/external, aliceId for reconcile, and literal unknown for modify/cancel/sync.
  - services/uta/src/domain/trading/git/TradingGit.ts:393-413: log filters commits by this helper, and :714-728 uses its result for pending order symbol/localSymbol lookup.
- currentBehavior: Display attribution is derived from optional native Contract fields; modify/cancel/sync cannot identify an instrument and fall back to unknown, while reconcile returns a raw aliceId.
- problem: Using display symbol as filter/lookup conflates instrument identity and can cause sync results to use the first operation’s context; unknown is a lossy string rather than an explicit unresolved relation.
- preservedBehavior:
  - Preserve symbol-oriented human display and reconcile attribution.
  - Correct literal unknown/fallback and symbol-as-identity assumptions.
- openQuestions: —

### MAP-A9AE528869

- mapping source: [packages/uta-protocol/src/types/git.ts:188-192](../../../../packages/uta-protocol/src/types/git.ts#L188-L192)
- symbol: SyncResult
- id: MAP-A9AE528869
- sourceEvidence:
  - packages/uta-protocol/src/types/git.ts:188-192: SyncResult returns a Git hash, updatedCount, and OrderStatusUpdate array.
  - services/uta/src/domain/trading/UnifiedTradingAccount.ts:909-915: sync returns hash=""/updatedCount=0 for no updates, otherwise calls git.sync and returns its synthetic commit.
- currentBehavior: No-update is represented by an empty hash; update batches become a Git commit regardless of durable observation identity or whether all remote outcomes are conclusive.
- problem: A hash/count result cannot report partial/unknown listing, observation cursor, per-order terminality, or journal sequence. Empty hash is ambiguous with a missing commit.
- preservedBehavior:
  - Preserve status sync and updated count as derived presentation.
  - Correct empty hash and synthetic commit with typed no-new-evidence/observation receipt.
- openQuestions: —

### MAP-ACEFB58A14

- mapping source: [packages/uta-protocol/src/types/broker.spec.ts:5-19](../../../../packages/uta-protocol/src/types/broker.spec.ts#L5-L19)
- symbol: structured BrokerError preservation test
- id: MAP-ACEFB58A14
- sourceEvidence:
  - packages/uta-protocol/src/types/broker.spec.ts:5-19: Object.assign creates Error("credentials were rejected") with name BrokerError, code AUTH, permanent true; BrokerError.from returns an instance preserving code, permanence, and cause identity.
- currentBehavior: The cross-package wrapper intentionally recognizes a structural name/code pair, creates a new BrokerError, and keeps the original Error as cause; permanence is derived from AUTH in the class but the test also accepts an explicit property.
- problem: The observed behavior conflates source classification, retry policy, and diagnostic cause. A wire consumer cannot safely serialize cause identity, and a boolean permanent flag cannot tell whether the failure is authentication, capability, transaction, or a particular dispatch attempt.
- preservedBehavior:
  - Preserve the test guarantee that recognized AUTH evidence survives a package boundary.
  - Correct the guarantee that `cause` is part of the public result: keep it only in redacted logs and retain structured failure data for callers.
- openQuestions: —

### MAP-AE61B1C6B0

- mapping source: [packages/uta-protocol/src/types/broker.ts:468-473](../../../../packages/uta-protocol/src/types/broker.ts#L468-L473)
- symbol: TpSlParams
- id: MAP-AE61B1C6B0
- sourceEvidence:
  - packages/uta-protocol/src/types/broker.ts:468-473: TpSlParams has independently optional takeProfit price and stopLoss price/optional limitPrice objects.
- currentBehavior: Callers can send one or both protections; no relation to entry side, trigger type, parent/OCA, execution mechanism, or account scope is represented.
- problem: Optional nested objects permit invalid stop/limit relations and cannot distinguish venue-native bracket/OTO/OCO from runtime-managed children. A stop-limit input can be silently treated as stop-only by an adapter.
- preservedBehavior:
  - Preserve TP, SL, and stop-limit prices where supported.
  - Correct optional bag and Longbridge-like ignored `_tpsl` behavior by refusing or explicitly managing children.
  - Do not silently downgrade native bracket to sequential orders.
- openQuestions: —

### MAP-B2851598C6

- mapping source: [packages/uta-protocol/src/types/git.ts:248-282](../../../../packages/uta-protocol/src/types/git.ts#L248-L282)
- symbol: StagePlaceOrderParams
- id: MAP-B2851598C6
- sourceEvidence:
  - packages/uta-protocol/src/types/git.ts:248-282: StagePlaceOrderParams carries aliceId/symbol, optional subAccountId, action/orderType, string sizes/prices, trailing fields, tif/GTD/outsideRth/parent/OCA, and optional TP/SL; comments say subAccountId validated but not persisted.
  - services/uta/src/domain/trading/UnifiedTradingAccount.ts:693-725: stagePlace resolves aliceId to native Contract, mutates symbol, resolves scope, converts strings to Decimal/Order fields, and appends subaccount only later in commit message.
  - services/uta/src/domain/trading/brokers/ibkr/IbkrBroker.ts:874-878 and packages/ibkr/src/order.ts:48-75: the stage command must preserve IBKR MOC/LOC/REL kinds, REL-only percentOffset, and opening-capable tif rather than treating orderType/tif as free strings.
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:54-74,265-284; services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:103-120; services/uta/src/domain/trading/brokers/ccxt/CcxtBroker.ts:576-611: adapter mappings/refusals differ, so capability evidence must decide every named variant.
  - packages/ibkr/src/client/orders.ts:348-385,430-465 and packages/ibkr/ref/samples/Python/Testbed/OrderSamples.py:95-126,211-235,436-470: MOO/LOO are Market/Limit requests with OPG, while REL includes offset and optional cap; the command codec must preserve these relations.
- currentBehavior: Staging resolves identity and validates wallet at runtime, builds an IBKR Order, and supports notional cashQty, trailing values, goodTillDate, outsideRth, parentId, OCA, and TP/SL. Scope is transient/message-only; order kind/TIF remains a free string even though IBKR advertises MOC/LOC/REL and adapters differ on OPG support.
- problem: The input is a flat optional bag with free strings, no AccountScope guarantee, no mutually exclusive sizing/order-type relation, and no typed trailing/session/protection mechanism. Parent/OCA/TP/SL can be dropped or misinterpreted by adapters; MOC/LOC/REL and opening-auction TIF have no named representation, and CCXT place can omit TIF.
- preservedBehavior:
  - Preserve all fields present in old input and decimal string precision.
  - Preserve single-wallet default only via explicit scope resolver.
  - Correct no-persistence subAccount, optional-field soup, and adapter silent drop risk.
  - Preserve an omitted TIF only when the selected provider declaration supplies a default; preserve MOC/LOC/REL and OPG intent as exact extension data or typed refusal evidence.
- openQuestions: —

### MAP-B611B25F33

- mapping source: [packages/uta-protocol/src/types/git.ts:112-117](../../../../packages/uta-protocol/src/types/git.ts#L112-L117)
- symbol: CommitPrepareResult
- id: MAP-B611B25F33
- sourceEvidence:
  - packages/uta-protocol/src/types/git.ts:112-117: CommitPrepareResult reports prepared=true, hash/message, and operationCount.
  - services/uta/src/domain/trading/git/TradingGit.ts:94-117: commit hashes in-memory staging and marks pending message/hash without reading broker facts or storing a plan.
- currentBehavior: Commit preparation is a hash/pending flag, not a prepare protocol: no before-images, capability snapshot, preconditions, locks, compensation assessment, criterion, expiry, or policy digest.
- problem: A hash and count cannot authorize safe execution or survive restart; changing broker facts after commit is invisible, and old missing order fields can be interpreted by SDK at push time.
- preservedBehavior:
  - Preserve user-visible prepared hash/message/count as derived display fields.
  - Correct hash-only preparation by requiring facts, selected leaf schema/fingerprint, scope, policy, and durability.
- openQuestions: —

### MAP-BAD8B38E04

- mapping source: [packages/uta-protocol/src/types/broker.ts:184-202](../../../../packages/uta-protocol/src/types/broker.ts#L184-L202)
- symbol: ExpandContractFilters
- id: MAP-BAD8B38E04
- sourceEvidence:
  - packages/uta-protocol/src/types/broker.ts:184-202: ExpandContractFilters has optional expiry/right/secType, numeric strikeMin/strikeMax, and numeric limit with documented default 60 and cap 200.
- currentBehavior: The caller may pass partial filters; optional broker behavior chooses defaults, numeric strikes can lose decimal precision, and no account/source scope is carried.
- problem: Partial fields allow invalid combinations (right without OPT, strike range reversed, bad expiry/limit) to reach native APIs. Numeric strike/limit fields are not unit/refined values and the documented cap is not a type invariant.
- preservedBehavior:
  - Preserve hub-to-leaf and derivative-family expansion, total match count, and explicit guidance.
  - Correct numeric strike and undocumented optional combinations by rejecting invalid queries before SDK calls.
- openQuestions: —

### MAP-BAFF102815

- mapping source: [packages/uta-protocol/src/types/broker.ts:553-584](../../../../packages/uta-protocol/src/types/broker.ts#L553-L584)
- symbol: IBroker account/order query methods
- id: MAP-BAFF102815
- sourceEvidence:
  - packages/uta-protocol/src/types/broker.ts:553-584: IBroker account/positions/orders queries are Promise methods with optional subAccountId; getOrder accepts symbolHint; getOpenOrders optional and may return empty when venue cannot enumerate.
  - services/uta/src/domain/trading/UnifiedTradingAccount.ts:917-919: pending order IDs include symbol/localSymbol/aliceId lookup hints; :953-980 records unknown open orders.
- currentBehavior: Queries may aggregate all subaccounts when selector omitted; symbolHint survives restart for symbol-scoped lookup; unsupported open-order enumeration is represented by omitted method or empty array.
- problem: Optional/empty semantics collapse ListingComplete, Partial, Unavailable, and NoMatches. Native order/position values leak, symbol hints are not typed lookup descriptors, and AccountScope is absent from order refs/observations.
- preservedBehavior:
  - Preserve symbol-scoped lookup hints and external-order recording, but bind each hint to a scoped order ref.
  - Preserve pending-order scans through PendingOrdersProjection while separating them from explicit-ID lookup and open-order enumeration.
  - Correct empty/optional method fallbacks with C07 ListingResult only for EnumerateOpen.
- openQuestions: —

### MAP-BC6607AA1D

- mapping source: [packages/uta-protocol/src/types/broker.ts:607-610](../../../../packages/uta-protocol/src/types/broker.ts#L607-L610)
- symbol: IBroker getCapabilities
- id: MAP-BC6607AA1D
- sourceEvidence:
  - packages/uta-protocol/src/types/broker.ts:607-610: IBroker.getCapabilities returns AccountCapabilities synchronously with string arrays and no failure/result wrapper.
  - services/uta/src/domain/trading/brokers/ibkr/IbkrBroker.ts:874-878: IBKR capability output includes MOC, LOC, and REL in addition to ordinary order types.
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:265-284 and LongbridgeBroker.ts:103-120: adapter capability/mapping evidence differs for order types and OPG, so a generic string-array capability cannot be trusted as a complete semantic contract.
  - packages/ibkr/src/client/orders.ts:348-385,430-465 and packages/ibkr/ref/samples/Python/Testbed/OrderSamples.py:95-126,211-235,436-470: native wire fields and MOC/MOO/REL/LOC/LOO sample relations are observable source evidence for capability decisions.
- currentBehavior: Capability lookup returns synchronous AccountCapabilities string arrays, so the IBKR MOC/LOC/REL advertisement and adapter-specific OPG/order-type refusals are not represented as scoped, versioned decisions.
- problem: The capability shape cannot distinguish supported, unsupported, and unknown for each typed order kind or TIF, cannot pin the evidence used by prepare, and invites raw string labels to be interpreted as executable semantics.
- preservedBehavior:
  - Preserve fast reads through a projection/cache where fresh.
  - Correct no-failure synchronous string-array contract.
  - Do not conflate capability with authorization or policy.
- openQuestions: —

### MAP-BDE3556BBA

- mapping source: [packages/uta-protocol/src/types/git.ts:91-102](../../../../packages/uta-protocol/src/types/git.ts#L91-L102)
- symbol: GitCommit
- id: MAP-BDE3556BBA
- sourceEvidence:
  - packages/uta-protocol/src/types/git.ts:91-102: GitCommit stores hash/parent/message, Operation[]/OperationResult[], stateAfter, timestamp, and optional round.
  - services/uta/src/domain/trading/git/TradingGit.ts:160-184: executePush constructs commit after all operations/state snapshot, persists via onCommit, then clears staging.
- currentBehavior: A commit is formed after remote execution and snapshot, serving as both audit entry and apparent transaction result; failures are included as rejected rows before persistence.
- problem: It does not distinguish journal event sequence from audit hash, command receipt/transaction revision, durable dispatch attempts, or projection checkpoint. Execution-before-snapshot/persist creates ambiguous remote side effects on failure.
- preservedBehavior:
  - Preserve human audit commit message/parent/round where useful.
  - Correct post-remote mutable commit construction by write-ahead journal and separate projection.
- openQuestions: —

### MAP-BFD66E07FA

- mapping source: [packages/uta-protocol/src/types/broker.ts:336-347](../../../../packages/uta-protocol/src/types/broker.ts#L336-L347)
- symbol: BarParams
- id: MAP-BFD66E07FA
- sourceEvidence:
  - packages/uta-protocol/src/types/broker.ts:336-347: BarParams uses interval, optional Date start/end, optional numeric limit, and optional whatToShow; comments allow broker-derived window/default and truncation.
- currentBehavior: Adapters derive a time window when start is absent, default end to now, and truncate most-recent-first according to a numeric limit; relation and freshness are implicit.
- problem: Date/nonnegative-limit constraints are unchecked, start&gt;end can reach a broker, and defaulting now inside an Effect makes replay/non-deterministic requests. Truncation can be mistaken for complete history.
- preservedBehavior:
  - Preserve derived-window and most-recent-first behavior when a caller explicitly supplies Lookback and limit.
  - Correct hidden defaults/truncation by making window, limit, requestTime, and page completeness explicit.
- openQuestions: —

### MAP-C39C98EBC8

- mapping source: [packages/uta-protocol/src/types/git.ts:119-125](../../../../packages/uta-protocol/src/types/git.ts#L119-L125)
- symbol: PushResult
- id: MAP-C39C98EBC8
- sourceEvidence:
  - packages/uta-protocol/src/types/git.ts:119-125: PushResult returns hash/message/count plus submitted and rejected OperationResult arrays.
  - services/uta/src/domain/trading/git/TradingGit.ts:141-184: push executes each operation sequentially, catches errors as rejected, persists one commit, then splits results by success.
- currentBehavior: Push reports a whole batch as submitted/rejected after remote calls; unknown timeouts become rejected and continuation is implicit in the loop.
- problem: The split arrays discard order/step association for policy, cannot represent Unknown/StillWorking/partial fills, and a post-remote persistence failure leaves side effects without durable authority.
- preservedBehavior:
  - Preserve sequential per-operation submission and per-step rejected rows under legacy translation.
  - Correct array split/implicit continuation and unknown-as-rejected.
  - Preserve successful accepted orders as working when not filled.
- openQuestions: —

### MAP-C6BE0A6EA7

- mapping source: [packages/uta-protocol/src/types/broker.ts:225-246](../../../../packages/uta-protocol/src/types/broker.ts#L225-L246)
- symbol: OpenOrder
- id: MAP-C6BE0A6EA7
- sourceEvidence:
  - packages/uta-protocol/src/types/broker.ts:225-246: OpenOrder is a native Contract/Order/OrderState triplet with optional string orderId, avgFillPrice, and TP/SL params; comments note 19-digit IDs and listing use.
  - services/uta/src/domain/trading/UnifiedTradingAccount.ts:953-979: external-order observation diffs broker open orders by orderId and records unknown ones in one observed commit.
- currentBehavior: Open-order listing supports external observation, uses string order IDs to avoid numeric precision loss, and carries bracket params as a nested optional bag.
- problem: The triplet is not serializable/domain-safe, has no AccountScope or observation provenance, and cannot distinguish local intent versus external order, complete versus partial fills, or listing absence evidence.
- preservedBehavior:
  - Preserve external order squashing and 19-digit ID precision.
  - Correct native triplet and listing absence assumptions with explicit provenance/completeness.
- openQuestions: —

### MAP-C959380106

- mapping source: [packages/uta-protocol/src/types/broker.ts:264-294](../../../../packages/uta-protocol/src/types/broker.ts#L264-L294)
- symbol: SubAccountRef
- id: MAP-C959380106
- sourceEvidence:
  - packages/uta-protocol/src/types/broker.ts:264-294: SubAccountRef has string id/label, spot|derivatives|unified kind, and comments state omitted list means implicit default and selectors are ignored for most brokers.
  - services/uta/src/domain/trading/UnifiedTradingAccount.ts:665-688: write resolver rejects missing selector on multi-sub-account brokers and checks instrument expected sub-account.
- currentBehavior: Single-wallet brokers currently accept omitted/ignored selectors, while multi-wallet writes require a requested ID and validate instrument routing; stage commit later records IDs only in a message tag.
- problem: Discovery absence and a real single default are indistinguishable. A free string ID is not bound to parent account or instrument, and the durable Operation omits the validated sub-account.
- preservedBehavior:
  - Preserve single-wallet convenience at the caller by constructing explicit `default` scope internally.
  - Preserve multi-wallet instrument routing refusal; remove message-only persistence.
- openQuestions: —

### MAP-CAFDD48B6D

- mapping source: [packages/uta-protocol/src/types/git.ts:213-223](../../../../packages/uta-protocol/src/types/git.ts#L213-L223)
- symbol: SimulationPositionAfter
- id: MAP-CAFDD48B6D
- sourceEvidence:
  - packages/uta-protocol/src/types/git.ts:213-223: SimulationPositionAfter includes symbol/side/qty/avgCost/simulatedPrice/unrealizedPnL/marketValue/pnlChange/priceChangePercent as strings.
  - services/uta/src/domain/trading/git/TradingGit.ts:829-860: simulated PnL uses side, Decimal prices, quantity, and multiplier; percentage is formatted with a sign and two decimals.
- currentBehavior: After rows calculate long/short PnL and market value with multiplier, but expose all values as strings and retain display symbol; percentage formatting is presentation mixed into result data.
- problem: No explicit currency/instrument/unit or distinction between computed exact Decimal and rounded display percentage; derivative exclusions/unchanged prices are not structurally represented per row.
- preservedBehavior:
  - Preserve multiplier-aware long/short math and signed percentage presentation.
  - Correct strings-as-everything by separating exact ratio from display text and explicit exclusion.
- openQuestions: —

### MAP-D32AED6801

- mapping source: [packages/uta-protocol/src/types/git.ts:1-11](../../../../packages/uta-protocol/src/types/git.ts#L1-L11)
- symbol: Trading-as-Git native imports
- id: MAP-D32AED6801
- sourceEvidence:
  - packages/uta-protocol/src/types/git.ts:1-11: public Git types import IBKR Contract/Order/Cancel/Execution/OrderState, Decimal, broker types, and contract-ext; these imports feed Operation/GitState/Result shapes.
  - services/uta/src/domain/trading/git/TradingGit.ts:8-31: the implementation imports native Contract/Order/Decimal and consumes the protocol re-exports.
- currentBehavior: Trading-as-Git protocol records currently use SDK instances and runtime Decimal as their staged and persisted operation representation; TradingGit later projects some Order fields but retains native types in the declared model.
- problem: Git is presented as an audit/projection boundary but still carries execution-native mutable objects and a global Contract augmentation. JSON rehydration must guess which fields are Decimal/Order and cannot prove exact schema or scope.
- preservedBehavior:
  - Preserve audit narrative, Decimal precision, external-order and reconcile facts.
  - Correct native imports and the claim that Git objects are safe execution records.
- openQuestions: —

### MAP-D4DBF6173C

- mapping source: [packages/uta-protocol/src/types/broker.ts:1-12](../../../../packages/uta-protocol/src/types/broker.ts#L1-L12)
- symbol: broker module native imports
- id: MAP-D4DBF6173C
- sourceEvidence:
  - packages/uta-protocol/src/types/broker.ts:1-12: the public broker module imports Contract, Order, OrderState, Execution, OrderCancel, ContractDescription/Details from @traderalice/ibkr, Decimal from decimal.js, and side-effect imports contract-ext.
  - services/uta/src/domain/trading/brokers/types.ts:1-7: the service compatibility module re-exports the entire public protocol barrel into broker implementations.
- currentBehavior: The shared package is the source of both native SDK object types and Decimal-bearing values consumed by UTA and broker packs.
- problem: A package advertised as wire protocol can receive mutable SDK class instances, runtime Decimal objects, declaration augmentations, and broker-specific optional fields. This violates the public/kernel dependency direction and makes JSON/replay semantics depend on SDK constructors.
- preservedBehavior:
  - Preserve Decimal precision by encoding decimal strings and preserve native fields only as adapter metadata when evidence requires it.
  - Intentionally remove SDK objects from every public protocol type, including read projections.
- openQuestions: —

### MAP-DC3A63D407

- mapping source: [packages/uta-protocol/src/types/git.ts:104-110](../../../../packages/uta-protocol/src/types/git.ts#L104-L110)
- symbol: AddResult
- id: MAP-DC3A63D407
- sourceEvidence:
  - packages/uta-protocol/src/types/git.ts:104-110: AddResult is `{staged:true,index:number,operation:Operation}`.
  - services/uta/src/domain/trading/git/TradingGit.ts:77-91: add rejects in-flight/pending writes, pushes operation into in-memory staging, and returns index/operation.
- currentBehavior: Staging is process-memory state with array index; an operation is returned immediately before any durable command receipt or schema validation beyond caller construction.
- problem: Index is unstable across restart/concurrency and operation payload may be native/partial. No command ID, revision, digest, scope confirmation, or durable draft exists.
- preservedBehavior:
  - Preserve user staging workflow and index-like ordering only as presentation ordinal.
  - Correct volatile array and native operation return with durable revision/receipt.
- openQuestions: —

### MAP-DC943FF022

- mapping source: [packages/uta-protocol/src/types/git.ts:133-139](../../../../packages/uta-protocol/src/types/git.ts#L133-L139)
- symbol: GitStatus
- id: MAP-DC943FF022
- sourceEvidence:
  - packages/uta-protocol/src/types/git.ts:133-139: GitStatus returns staged Operation[], pending message/hash, head hash, and commit count.
  - services/uta/src/domain/trading/git/TradingGit.ts:536-543: status exposes in-memory staging/pending/head/commitCount directly.
- currentBehavior: Status is a volatile Git working-tree view; staged operations and pending hashes come from process memory and head/commit count do not include journal sequence or transaction state.
- problem: It exposes executable/native payloads, gives no AccountScope/revision/lock/lease/unknown information, and a missing in-memory status after restart can appear empty despite durable work.
- preservedBehavior:
  - Preserve staged/pending/head/commit count as derived read information.
  - Correct volatile direct exposure with durable transaction/projection status.
- openQuestions: —

### MAP-DE16B51F52

- mapping source: [packages/uta-protocol/src/types/git.ts:60-77](../../../../packages/uta-protocol/src/types/git.ts#L60-L77)
- symbol: OperationResult
- id: MAP-DE16B51F52
- sourceEvidence:
  - packages/uta-protocol/src/types/git.ts:60-77: OperationResult combines action, success boolean, optional orderId/status/native Execution/OrderState/error, legs, symbol, and raw unknown.
  - services/uta/src/domain/trading/git/TradingGit.ts:929-966: parseOperationResult casts raw response to Record, treats success false as rejected, maps native status, and stores raw payload.
- currentBehavior: Raw responses are structurally cast, unknown fields are retained in `raw`, and every failed response becomes rejected regardless of whether send/ack status is unknown.
- problem: The result can mismatch action, expose native payload/secrets, and claim rejected after timeout. `success` and flat status cannot represent Ack vs fill, partial result, or per-step FailurePolicy.
- preservedBehavior:
  - Preserve per-order result rows, bracket-leg identity, symbol attribution where normalized.
  - Correct success/rejected collapse and raw unknown persistence.
  - Keep known broker rejection continuation under explicit FailurePolicy.
- openQuestions: —

### MAP-ED7DB561BF

- mapping source: [packages/uta-protocol/src/types/git.ts:176-186](../../../../packages/uta-protocol/src/types/git.ts#L176-L186)
- symbol: OrderStatusUpdate
- id: MAP-ED7DB561BF
- sourceEvidence:
  - packages/uta-protocol/src/types/git.ts:176-186: OrderStatusUpdate carries orderId/symbol, previous/current flat OperationStatus, and optional filledPrice/filledQty strings.
  - services/uta/src/domain/trading/UnifiedTradingAccount.ts:844-915: sync polls pending IDs, skips Submitted/PreSubmitted, builds updates, and writes a synthetic sync commit only when updates exist.
- currentBehavior: Polling emits updates keyed by bare orderId/symbol and assumes current native status; updates only include terminal/non-submitted rows and can omit unknown/partial evidence.
- problem: Order IDs collide across scopes, symbol is not canonical instrument identity, previous status is assumed submitted, and cumulative versus delta fills/observation provenance are absent. Synthetic commit is not durable remote observation.
- preservedBehavior:
  - Preserve polling backoff and sync fill/status updates.
  - Correct bare IDs/assumed submitted/flat status and synthetic commit authority.
  - Preserve no-op result when no new evidence as a projection read, not a fake commit.
- openQuestions: —

### MAP-F59E470DFF

- mapping source: [packages/uta-protocol/src/types/broker.ts:83-106](../../../../packages/uta-protocol/src/types/broker.ts#L83-L106)
- symbol: PositionRisk
- id: MAP-F59E470DFF
- sourceEvidence:
  - packages/uta-protocol/src/types/broker.ts:83-106: PositionRisk exposes optional string leverage/liquidationPrice, optional cross/isolated marginMode, and comments that risk is absent for spot/equity.
- currentBehavior: Risk data is an optional bag with strings and an unbranded margin union; liquidation price is only described as denominated in Position.currency.
- problem: The bag does not bind risk to AccountScope/InstrumentId or distinguish venue estimate versus authoritative value. Optional leverage/price can be combined inconsistently, and string currency equality is not runtime proof.
- preservedBehavior:
  - Preserve absence of risk for spot and venues without per-position leverage.
  - Preserve independently available leverage/liquidation/margin facts through `Present|Unavailable` fields while requiring scope, instrument, provenance, and asOf.
- openQuestions: —

### MAP-FC2ABFBF22

- mapping source: [packages/uta-protocol/src/types/broker.ts:322-334](../../../../packages/uta-protocol/src/types/broker.ts#L322-L334)
- symbol: BarInterval and BarWhatToShow
- id: MAP-FC2ABFBF22
- sourceEvidence:
  - packages/uta-protocol/src/types/broker.ts:322-334: BarInterval is an eight-member string union and BarWhatToShow is TRADES/MIDPOINT/BID/ASK; comments say non-IBKR brokers ignore non-TRADES.
- currentBehavior: Alice-facing interval and stream names are normalized, but unsupported stream values are silently ignored by adapters that do not implement IBKR whatToShow.
- problem: Ignoring a requested price source changes the meaning of returned bars without telling callers; the small union has no capability/rejection association.
- preservedBehavior:
  - Preserve an omitted-stream default only when that provider leaf declares TRADES (or another exact default); otherwise retain explicit absence.
  - Correct silent ignore behavior by surfacing explicit unsupported capability.
- openQuestions: —

### MAP-FC6B6B08DC

- mapping source: [packages/uta-protocol/src/types/git.ts:127-131](../../../../packages/uta-protocol/src/types/git.ts#L127-L131)
- symbol: RejectResult
- id: MAP-FC6B6B08DC
- sourceEvidence:
  - packages/uta-protocol/src/types/git.ts:127-131: RejectResult returns hash/message/count after rejecting a pending Git commit.
  - services/uta/src/domain/trading/git/TradingGit.ts:187-238: reject writes user-rejected results/commit, snapshots state, persists, clears staging, and returns result.
- currentBehavior: Reject is a user action represented as a synthetic commit; it always carries old hash/count and writes a state snapshot even though no broker mutation occurred.
- problem: The result does not identify transaction/revision/actor/expected version, distinguish no-effects retirement from an already-dispatched plan, or retain typed rejection reason.
- preservedBehavior:
  - Preserve user rejection audit message and staging cleanup semantics at projection level.
  - Correct synthetic Git commit and free-form reason by explicit no-effects transaction event.
- openQuestions: —

### MAP-FE024081BB

- mapping source: [packages/uta-protocol/src/types/broker.ts:170-180](../../../../packages/uta-protocol/src/types/broker.ts#L170-L180)
- symbol: PlaceOrderResult
- id: MAP-FE024081BB
- sourceEvidence:
  - packages/uta-protocol/src/types/broker.ts:170-180: PlaceOrderResult combines success boolean, optional orderId/error/message, native Execution/OrderState, and optional bracket legs for place/modify/close.
- currentBehavior: All three mutations return the same bag; callers infer action outcome from success and optional fields and often catch Error separately.
- problem: The bag permits contradictory states (success without identity, error with execution, close result shaped like place), loses acknowledgement versus observation, and cannot model unknown post-send outcomes or FailurePolicy.
- preservedBehavior:
  - Preserve immediate fill details where native evidence exists, but represent them as observation facts rather than success semantics.
  - Correct unified result contract so modify/cancel/close cannot accidentally be interpreted as place.
- openQuestions: —

### MAP-FEF9B7F5AE

- mapping source: [packages/uta-protocol/src/types/git.ts:79-89](../../../../packages/uta-protocol/src/types/git.ts#L79-L89)
- symbol: GitState
- id: MAP-FEF9B7F5AE
- sourceEvidence:
  - packages/uta-protocol/src/types/git.ts:79-89: GitState stores string account totals plus arrays of Position and OpenOrder.
  - services/uta/src/domain/trading/git/TradingGit.ts:632-645: rehydrateGitState wraps quantities in Decimal and fills missing multiplier with 1 for older commits.
- currentBehavior: A post-commit snapshot is persisted inside each GitCommit, with mutable/native broker-shaped positions/orders; rehydration applies ad hoc Decimal/default logic.
- problem: The snapshot mixes execution audit and read projection, lacks scope/sequence/freshness/valuation uncertainty, and a missing multiplier default may conceal legacy evidence. Rebuilds depend on broker protocol types.
- preservedBehavior:
  - Preserve account totals, positions, pending orders as a trader-facing view.
  - Preserve multiplier-aware arithmetic but make legacy fallback evidence explicit.
  - Correct embedding native values in Git commit.
- openQuestions: —
