
# Alpaca — source investigation and migration evidence


## Entries

### MAP-053E34F691

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:486-556](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts#L486-L556)
- symbol: closePosition tests
- id: MAP-053E34F691
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:486-556: full close calls native closePosition; partial close reads a long position then submits a reverse market order; unresolved contract fails
  - services/uta/src/domain/trading/UnifiedTradingAccount.ts:188-190: partial close preflights requested quantity against the current position before broker quantity mutation
- currentBehavior: A full close returns the native closePosition response as a successful PlaceOrderResult. A partial close performs a fresh position read, selects SELL for long (BUY otherwise), sets MKT/DAY and requested quantity, then re-enters placeOrder.
- problem: The partial read and reverse order race with external fills and does not prove reduce-only behavior; an oversized quantity could cross flat into a new exposure. Full close has no exposure before-image or target criterion. Re-entering placeOrder loses the close action's identity and compensation semantics.
- preservedBehavior:
  - Preserve native full-close and reverse-market partial-close intent for Alpaca equities
  - Preserve long-to-SELL and short-to-BUY direction when observations are valid
  - Intentionally add an exposure precondition and stop treating returned order acceptance as exposure closure
- openQuestions:
  - The SDK's closePosition DELETE request does not expose a documented client identity or reduce-only guarantee; full-close idempotency and residual behavior need broker evidence.

### MAP-0A1AF127FE

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:593-601](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts#L593-L601)
- symbol: getCapabilities
- id: MAP-0A1AF127FE
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:593-601: getCapabilities returns STK, five order type strings, and historical quality iex unconditionally
- currentBehavior: The method is synchronous and static: no connection state, account mode, catalog, instrument, session, permission, idempotency, compensation, or actual feed is consulted.
- problem: Static capability claims can authorize unsupported variants, conflate read and write quality, and survive connection degradation. There is no reason/evidence for unavailable capabilities or plan invalidation.
- preservedBehavior:
  - Keep STK and known basic order variants as candidate capabilities
  - Keep historical query availability separate from order availability
  - Intentionally replace unconditional object with contextual ADT
- openQuestions:
  - No local source proves Alpaca capabilities beyond current examples; each extension remains unavailable until native evidence exists.

### MAP-0ABCB3F3AD

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:151-203](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts#L151-L203)
- symbol: init
- id: MAP-0ABCB3F3AD
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:151-203: init checks raw keys, constructs SDK, retries getAccount five times, classifies auth by message regex after two attempts, and launches refreshCatalog without awaiting it
- currentBehavior: init validates strings, creates a client, probes getAccount, logs parseFloat equity, retries with 1/2/4/8-second delays, throws AUTH after message-matched retries, and returns while catalog refresh runs detached. All lifecycle state is promise/class local.
- problem: Detached catalog work has no durable job or supervision; auth classification is brittle and equity logging is an unnecessary floating conversion. Reconnect, health stream, shutdown, and startup recovery are absent; a returned init promise does not mean catalog or transaction admission is safe.
- preservedBehavior:
  - Preserve getAccount as initial reachability probe and bounded exponential retry intent
  - Preserve nonfatal catalog refresh for read connectivity, but expose its stale status
  - Intentionally eliminate detached unawaited promise and message-only auth
- openQuestions:
  - Concrete Alpaca reconnect semantics and API rate limits are unavailable locally; schedule/backoff must be conservative and capability must degrade when probe is inconclusive.

### MAP-0E85D36517

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/alpaca-types.ts:68-79](../../../../services/uta/src/domain/trading/brokers/alpaca/alpaca-types.ts#L68-L79)
- symbol: AlpacaFillActivityRaw
- id: MAP-0E85D36517
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/alpaca-types.ts:68-79: AlpacaFillActivityRaw defines FILL fields but no assigned adapter code consumes the interface
- currentBehavior: A provider activity shape exists for fills, including symbol/side/qty/price/cumulative/leaves/time/order ID/type, but no decoder, ingestion, deduplication, projection, or reconciliation path uses it.
- problem: Order progress/accounting relies on sparse order snapshots and cannot ingest a durable fill stream. Duplicate/out-of-order activities could double-count quantity or cost basis, and unknown activity is invisible during recovery.
- preservedBehavior:
  - Preserve exact quantity/price and cumulative/leaves semantics where valid
  - Intentionally add actual fill ingestion rather than treating order status as fill
  - Preserve provider execution identity when present and retain unattributed activity as explicit reconciliation evidence
  - Do not fabricate execution identity or silently deduplicate when provider omits it
- openQuestions:
  - The installed SDK exposes getAccountActivities but local response declarations are any and no stable execution ID field is documented; exact activity pagination/identity needs provider evidence.

### MAP-0F3A295D51

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:66-76](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts#L66-L76)
- symbol: ibkrTifToAlpaca
- id: MAP-0F3A295D51
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:66-76: known DAY/GTC/IOC/FOK/OPG values map and empty/unknown TIF defaults to day
- currentBehavior: The mapper lowercases known TIF codes and turns empty or unknown strings into day. Thus a missing staging TIF can silently become a Day request.
- problem: Defaulting changes caller intent and erases whether a TIF was omitted, unsupported, or intentionally Day. OPG may be incompatible with action/session context, and the mapper has no capability/error channel.
- preservedBehavior:
  - Preserve explicit known mappings where supported
  - Intentionally remove empty/unknown-to-Day fallback
  - Keep Day available as an explicit caller choice
- openQuestions:
  - The local adapter does not establish Alpaca support for every legacy TIF in every order class; capability evidence must remain variant-specific.

### MAP-13D1329A19

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/alpaca-types.ts:59-66](../../../../services/uta/src/domain/trading/brokers/alpaca/alpaca-types.ts#L59-L66)
- symbol: AlpacaBarRaw
- id: MAP-13D1329A19
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/alpaca-types.ts:59-66: bar raw shape contains numeric OHLCV and string Timestamp with no feed/interval metadata
- currentBehavior: The type is compile-time-only and accepts any numeric values/timestamps. getHistorical String-converts them into legacy bars and discards source/quality.
- problem: Malformed/out-of-order bars and feed changes cannot be represented; a bar response is not tied to the requested instrument, interval, venue, bounds or actual feed.
- preservedBehavior:
  - Preserve numeric-to-string compatibility values and interval mappings
  - Preserve bounded tail semantics
  - Intentionally add runtime validation/source quality
- openQuestions: —

### MAP-168095825B

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/alpaca-contracts.ts:1-11](../../../../services/uta/src/domain/trading/brokers/alpaca/alpaca-contracts.ts#L1-L11)
- symbol: legacy contract helper imports
- id: MAP-168095825B
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/alpaca-contracts.ts:1-11: helper claims purity but imports mutable IBKR Contract/OrderState, contract-ext side effect, contract builder, and BarInterval type
- currentBehavior: The contract helper module is coupled to compatibility classes and declaration merging despite comments calling it pure. Its outputs are mutable Contract/OrderState objects used by the AlpacaBroker.
- problem: Target domain functions cannot import this helper without pulling legacy SDK/side effects. Identity, status and native codecs become entangled, and an apparently pure module can mutate compatibility objects.
- preservedBehavior:
  - Preserve deterministic timeframe/status mapping at adapter boundary
  - Preserve compatibility helper only where caller requires it
  - Intentionally remove contract-ext/IBKR dependencies from target path
- openQuestions: —

### MAP-186E3AA482

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:329-357](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts#L329-L357)
- symbol: getContractDetails tests
- id: MAP-186E3AA482
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:329-357: valid AAPL details assert hardcoded exchange/order-type/COMMON fields; empty symbol expects null
- currentBehavior: getContractDetails returns a mutable legacy object for every symbol that passes resolveSymbol, with validExchanges SMART/NYSE/NASDAQ/ARCA and five order types, regardless of catalog or account state. An unresolved symbol returns null.
- problem: Static details claim capabilities that may not apply to the account, session, instrument, or current connection. Null erases whether resolution, permission, or transport failed; hardcoded order types cannot express notional, attached exits, expiry, or degraded feed quality.
- preservedBehavior:
  - Keep an explicit read projection for UI consumers that still request ContractDetails
  - Keep the empty/unresolved query distinction at that boundary
  - Intentionally stop advertising every static order type as executable
- openQuestions:
  - Alpaca account permissions and instrument-specific order limits are not represented in the local adapter; capability inputs must be sourced from an explicit broker probe or conservatively marked unavailable.

### MAP-1D39C444E7

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:511-529](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts#L511-L529)
- symbol: getQuote
- id: MAP-1D39C444E7
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:511-529: getQuote resolves ticker, casts getSnapshot, String-converts fields, and returns legacy Quote
- currentBehavior: A snapshot request uses a symbol string and maps numeric LatestTrade/LatestQuote/DailyBar values to strings, with a Contract made by hardcoded makeContract and only trade timestamp retained.
- problem: Unchecked snapshot values can be malformed; Contract identity is guessed, feed/venue/source/quality and quote timestamp are dropped, and BrokerError cannot represent stale/unavailable/permission conditions.
- preservedBehavior:
  - Preserve numeric-to-decimal-string compatibility fields
  - Preserve direct ticker request and unresolved-symbol failure
  - Intentionally retain more native fields and provenance
- openQuestions: —

### MAP-1F8F896823

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:44-52](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts#L44-L52)
- symbol: AlpacaAssetRaw
- id: MAP-1F8F896823
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:44-52: local AlpacaAssetRaw interface has symbol and optional name/class/exchange/tradable/status
- currentBehavior: The interface is erased at runtime and is used after an unknown cast from getAssets. Optional provider fields are copied into an in-memory catalog and a symbol map; only tradable=false is filtered.
- problem: Malformed symbols, classes, exchanges, status values, and missing required metadata pass through. The projection cannot distinguish an empty successful catalog from unavailable/stale data or bind rows to jurisdiction/currency evidence.
- preservedBehavior:
  - Preserve filtering of explicitly non-tradable assets
  - Preserve name/exchange enrichment for read views
  - Intentionally require runtime decoding and explicit catalog state
- openQuestions: —

### MAP-20EEB58E82

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:611-639](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts#L611-L639)
- symbol: getOrders tests
- id: MAP-20EEB58E82
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:611-639: getOrders is expected to call getOrder for each ID sequentially and return mapped symbols/statuses
- currentBehavior: The current batch method loops in input order, awaits each getOrder, and pushes only non-null results. A missing result silently shortens the returned array.
- problem: Sequential querying is deterministic but null conflates provider not-found, auth failure, malformed response, timeout, and unknown remote outcome. Omission prevents a reconciliation job from accounting for every requested identity and loses input-to-result association.
- preservedBehavior:
  - Preserve input order and one native lookup per requested ID as the default bounded batch policy
  - Preserve mapped order data for successfully observed IDs
  - Intentionally replace silent omission with explicit per-ID outcome
- openQuestions: —

### MAP-21C40C002D

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:531-591](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts#L531-L591)
- symbol: getHistorical
- id: MAP-21C40C002D
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:531-591: historical path maps timeframe, drains generator, SIP-first/fallback-IEX policy, bounded tail slice, String bars, and static comments quality iex
- currentBehavior: The method uses Record&lt;string,unknown&gt; options, adds bounds/adjustment, omits limit for bounded windows and tail-slices locally, drains raw generator rows, falls back only for regex recent-SIP denial, and wraps all failures as BrokerError.
- problem: The source/feed and completeness are not returned; capability quality is hardcoded and may contradict SIP success. Runtime casts and numeric String conversion permit malformed bars. Fallback classification is coupled to rendered errors.
- preservedBehavior:
  - Preserve all-adjustment, SIP-first, narrow IEX fallback, bounded tail semantics
  - Preserve direct limit-only optimization where provider semantics are explicitly retained
  - Intentionally correct static quality/regex/casts
- openQuestions:
  - Provider pagination and feed-quality guarantees remain to be measured in Slice 4; do not call either feed atomic or complete solely from SDK methods.

### MAP-262317C16D

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:14-29](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts#L14-L29)
- symbol: Legacy IBKR facade imports
- id: MAP-262317C16D
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:14-29: class imports legacy Contract/Order/OrderState and IBroker, PlaceOrderResult, Position, Quote, AccountInfo and related types
- currentBehavior: The class implements the legacy IBroker facade and receives mutable IBKR Contract/Order objects. Its result and query methods expose legacy classes/records as the adapter's public contract.
- problem: The facade erases action/result/error association and lets mutable compatibility types cross the execution boundary. It cannot carry AccountScope, client/dispatch identity, before-images, native group evidence, or typed Unknown outcomes.
- preservedBehavior:
  - Preserve support for the four initial action intents and Alpaca query capabilities
  - Preserve a compatibility path only for existing public read consumers during migration
  - Intentionally remove legacy facade as execution authority
- openQuestions: —

### MAP-2C63E4B337

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:630-656](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts#L630-L656)
- symbol: mapOpenOrder
- id: MAP-2C63E4B337
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:630-656: mapOpenOrder maps raw row to legacy objects, conflates qty/notional, uppercases fields, sets numeric orderId 0, and copies optional fill/status fields
- currentBehavior: The mapper creates a Contract from symbol, Order from side/type/qty-or-notional/prices/TIF/extended hours, sets numeric orderId=0, copies filled qty/average price, and maps status. UUID is retained only in OpenOrder.orderId; created/filled timestamps/version are dropped.
- problem: Qty versus notional loses sizing semantics; raw strings/statuses are unchecked; UUID is intentionally discarded from the primary Order identity; timestamp/version/rejection/group state are lost. This prevents reliable before-images, fills, accounting and recovery.
- preservedBehavior:
  - Preserve side/type/TIF/price/extended-hours display mappings where semantically valid
  - Preserve UUID in compatibility outer field and exact fill values
  - Intentionally remove qty/notional conflation and numeric-zero authority
- openQuestions:
  - The installed SDK raw response does not document client_order_id/updated_at/version fields; preserve them when present and mark missing identity/version evidence explicitly.

### MAP-3059D38FCE

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:658-674](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts#L658-L674)
- symbol: extractTpSl
- id: MAP-3059D38FCE
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:658-674: extractTpSl only handles order_class bracket, infers TP/SL from limit/stop fields, and returns legacy TpSlParams without leg identity/state
- currentBehavior: For bracket orders with legs, a limit-only leg becomes takeProfit and any stop leg becomes stopLoss (including optional limitPrice). OTO and held/triggered state are ignored; group/leg IDs are not returned by this reader.
- problem: The reader cannot round-trip the one-leg OTO that placement emits, cannot preserve child status/identity/quantity, and may misclassify malformed legs based only on fields. Compensation/reconciliation cannot know whether a held stop exists or has triggered.
- preservedBehavior:
  - Preserve extraction of TP/SL prices for valid bracket compatibility reads
  - Preserve stop-limit stopLoss.limitPrice
  - Intentionally add OTO and per-leg identity/state and withhold NativeAtomicGroupConfirmed until evidence
- openQuestions:
  - No local evidence establishes Alpaca bracket/OTO atomic commit semantics, child retention, or held-leg listing/lookup guarantees; safest criterion is independent parent/leg observation.

### MAP-3372FF782B

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:96-253](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts#L96-L253)
- symbol: placeOrder tests
- id: MAP-3372FF782B
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:96-253: placement examples cover filled success, bracket child IDs, one-leg OTO, two-leg bracket, simple order, and unresolved contract
- currentBehavior: Tests call placeOrder directly with mutable IBKR Contract/Order values. They assert a successful PlaceOrderResult, infer child kinds from returned legs, and assert OTO for one exit versus bracket for two; unresolved symbol returns a string error.
- problem: Direct dispatch has no durable intent barrier, client identity, before-image, typed rejection, observation, or Unknown path. The tests call an SDK method response success even when status/fills are absent. The two-leg mapping documents request syntax but does not prove Alpaca's group atomicity, child retention, or idempotency.
- preservedBehavior:
  - Retain source-level one-leg OTO and two-leg bracket request-shape selection, simple orders without exits, precise Decimal fields, and parent/leg IDs when the venue returns them
  - Retain source-level NativeNotional request encoding and keep quote conversion as explicit provenance rather than a sizing alias
  - Intentionally stop calling a filled status an execution fact; the commit criterion is chosen during prepare and may require observation
  - Keep unresolved contracts loud-refused and do not claim native group atomicity without evidence
- openQuestions:
  - No local source proves Alpaca server-side client_order_id idempotency, retention horizon, or atomicity of bracket/OTO groups; until live/paper conformance records these, use ObserveBeforeRetry and independent parent/leg reconciliation.

### MAP-36636F09DE

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:101-125](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts#L101-L125)
- symbol: AlpacaBroker static registration and fromConfig
- id: MAP-36636F09DE
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:101-125: static Zod config schema accepts optional apiKey/apiSecret and fromConfig copies them into a class config, defaulting missing values to empty strings
- currentBehavior: The class-level schema/configFields drives UI/config parsing. fromConfig accepts a generic Record, parses it, and creates AlpacaBroker with raw key strings or empty fallback; package entry exposes this factory.
- problem: Raw secrets are materialized into an ordinary config object and empty-string defaults defer configuration failure to init. Static registration also makes a legacy class the broker-pack authority and has no typed account/mode/jurisdiction identity.
- preservedBehavior:
  - Preserve paper default only at explicit config boundary where the preset declares it
  - Preserve sensitive UI field descriptors
  - Intentionally remove empty secret fallback and class factory as execution authority
- openQuestions: —

### MAP-3C0F790B85

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:404-455](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts#L404-L455)
- symbol: modifyOrder null-check tests
- id: MAP-3C0F790B85
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:404-455: Partial&lt;Order&gt; examples assert undefined fields are absent and explicit limit/stop values are forwarded
- currentBehavior: modifyOrder checks nullable Decimal fields and emits only fields that are present and not UNSET_DECIMAL. Tests specifically protect a qty-only patch and explicit limit/aux changes.
- problem: The absence-of-undefined behavior is useful but attached to a structurally open Partial&lt;Order&gt;. It cannot distinguish an intentional field clear from omission and permits orderType/TIF combinations that Alpaca will reject late.
- preservedBehavior:
  - Retain omission of fields not selected by the intended replacement variant
  - Retain exact Decimal string conversion for explicit limit/stop values
  - Intentionally remove Partial&lt;Order&gt; from the execution contract
- openQuestions:
  - The installed Alpaca SDK does not document PATCH clear semantics in local declarations; do not add a clear variant until native API evidence is recorded.

### MAP-3C5D748AD0

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:769-805](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts#L769-L805)
- symbol: getQuote tests
- id: MAP-3C5D748AD0
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:769-805: snapshot trade/quote/volume values become legacy Quote and unresolved symbol throws
- currentBehavior: getQuote resolves a symbol, calls getSnapshot, converts numeric latest trade/quote/daily volume values to strings, and returns a legacy Quote timestamped only by the trade timestamp. Resolution or SDK failures throw BrokerError.
- problem: The snapshot cast is unchecked; source/feed, venue, quote timestamp, instrument identity, and quality are lost. A generic thrown error cannot distinguish unknown instrument, unavailable market data, stale quote, and malformed native response.
- preservedBehavior:
  - Preserve string decimal output at the compatibility read boundary
  - Preserve bid/ask/trade/volume mapping and unresolved-symbol rejection
  - Intentionally add separate timestamps/source and stop using thrown message as the only failure contract
- openQuestions: —

### MAP-3DA66A43BA

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:558-609](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts#L558-L609)
- symbol: getAccount tests
- id: MAP-3DA66A43BA
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:558-609: account assertions map equity/cash/buying power/daytrade count, sum unrealized PnL, omit realized PnL, and protect Decimal 0.1+0.2 aggregation
- currentBehavior: getAccount concurrently fetches account and positions, maps equity/cash/buying power to strings, derives unrealized PnL as a Decimal sum of position unrealized_pl, and leaves realizedPnL undefined. Day trades remaining is max(0, 3-count). Promise.all provides concurrency only; it does not establish a common remote snapshot or version.
- problem: The query reports an unbranded USD AccountInfo with no scope, observation time, source, or distinction between broker cash buckets. Decimal arithmetic is sound, but malformed data reaches Decimal constructors and realized PnL is absent rather than explicitly unavailable/fill-derived.
- preservedBehavior:
  - Preserve Decimal sum 0.1+0.2+0.3 = 0.6
  - Preserve equity/cash/buying-power values and nonnegative day-trade display where the provider supplies the bucket
  - Intentionally stop treating absent realized PnL as an implicit successful zero
- openQuestions: —

### MAP-3FA23D96E2

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:127-143](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts#L127-L143)
- symbol: AlpacaBroker instance state
- id: MAP-3FA23D96E2
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:127-143: class stores a definite-assigned mutable client and nullable catalog/catalogBySymbol, using null versus empty as readiness state
- currentBehavior: The client is assumed initialized, while catalog null means not attempted and an empty array means a successful empty result. Catalog and map are mutable fields tied to the broker object.
- problem: Resource lifetime and projection state are conflated. A restarted process loses catalog freshness/error provenance, and callers cannot tell empty-success from failed/unavailable or stale data. Transaction state/dispatch identity have no durable home if attached to this class.
- preservedBehavior:
  - Preserve atomic replacement of a successfully decoded catalog
  - Preserve old rows on refresh failure
  - Intentionally replace null/empty implicit state with explicit projection tags
- openQuestions: —

### MAP-451B66A518

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:81-94](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts#L81-L94)
- symbol: searchContracts tests
- id: MAP-451B66A518
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:81-94: empty search expects [] while an unloaded catalog echoes lowercase aapl as one uppercased STK contract
- currentBehavior: searchContracts returns [] for an empty pattern. Before catalog loading, any nonempty string is uppercased and wrapped as a fabricated STK Contract; after loading, the catalog is fuzzy-ranked.
- problem: The echo path presents an unobserved ticker as a tradeable instrument and bypasses catalog freshness, tradability, jurisdiction, and capability checks. A caller cannot distinguish no match from an unavailable catalog, so a later write may carry a guessed identity.
- preservedBehavior:
  - Retain [] for an empty pattern
  - Retain fuzzy ranking and catalog descriptions for trusted rows
  - Intentionally remove the pre-catalog uppercase echo from write preparation; a compatibility search UI may display a non-executable suggestion explicitly marked unresolved
- openQuestions: —

### MAP-49BC37B6CE

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:145-149](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts#L145-L149)
- symbol: AlpacaBroker constructor identity
- id: MAP-49BC37B6CE
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:145-149: constructor derives id/label from paper mode or caller override and stores one string identity
- currentBehavior: id defaults to alpaca-paper/alpaca-live and label defaults to display text; a caller-provided id replaces the default. No account scope, connection ID, jurisdiction, or sub-account is represented.
- problem: A display/route string is being used as if it were account and broker identity. Two connections or modes can collide in capability/conflict keys, and labels can accidentally enter authorization or durable identity.
- preservedBehavior:
  - Preserve paper/live defaults and caller-friendly labels for display
  - Preserve stable account routing ID where configured
  - Intentionally separate labels from nominal identities
- openQuestions: —

### MAP-4AF53E630B

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:641-767](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts#L641-L767)
- symbol: getOrder tests
- id: MAP-4AF53E630B
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:641-767: tests pass UUID strings directly, expect filled mapping, null any not-found error, numeric orderId 0, bracket/stop-limit TPSL extraction, and no TPSL on simple order
- currentBehavior: getOrder passes the supplied string directly to the SDK, maps a filled order, catches every exception to null, sets legacy numeric orderId to 0 for UUIDs, extracts TP/SL only from bracket legs, and omits TP/SL for a simple order.
- problem: The direct UUID call is useful evidence, but null hides transport/auth/schema/unknown outcomes and numeric zero is a lossy compatibility placeholder. Group reads lose OTO, leg status, held state, timestamps, and parent identity needed for reconciliation.
- preservedBehavior:
  - Preserve direct string UUID lookup and bracket stop-limit TP/SL price extraction where valid
  - Preserve simple orders having no attached group
  - Intentionally remove numeric-zero execution identity and catch-all null
- openQuestions:
  - The SDK response type is any and local fixtures omit timestamps/client_order_id; exact native fields for updated version and client identity require adapter conformance evidence.

### MAP-4C741F2512

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:1-24](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts#L1-L24)
- symbol: Alpaca SDK mock
- id: MAP-4C741F2512
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:1-24: the vi mock constructs this:any, installs only selected methods, and leaves getAssets/getBarsV2 absent; later tests mutate private client through any
- currentBehavior: The fixture supplies a partially shaped Alpaca object and lets individual examples replace the broker's private client. Constructor, account, order, clock, and snapshot methods are mocks, while catalog and bar-generator paths are not part of the default layer.
- problem: A private-client cast makes a test pass without proving the adapter can acquire a complete native resource or decode the methods it actually calls. It also permits a mock to return structurally impossible rows and has no typed acknowledgement, observation, or failure fixture for the recovery protocol.
- preservedBehavior:
  - Keep successful account/order/position/quote/clock scenarios as adapter evidence
  - Keep explicit bracket, OTO, precision, and feed-denial cases, but express their expectations through typed ports instead of legacy result objects
- openQuestions:
  - The installed SDK declarations type order operations as any, so the exact runtime response/error envelope and idempotency behavior still require broker conformance evidence.

### MAP-5A3A747EBA

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:301-327](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts#L301-L327)
- symbol: getPositions tests
- id: MAP-5A3A747EBA
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:301-327: a raw long AAPL row is mapped and assertions inspect Decimal quantity, string cost/price/value/PnL, and long side
- currentBehavior: The test verifies the legacy Position projection from raw strings: AAPL quantity 10, average cost 150, current price 160, market value 1600, unrealized PnL 100, and side long.
- problem: It verifies presentation fields but not account scope, instrument identity, currency, timestamp, valuation source, or the distinction between broker-reported unrealized value and fill-derived realized accounting. The raw side and decimals are not runtime validated.
- preservedBehavior:
  - Preserve Decimal arithmetic and multiplier 1 for Alpaca US equities
  - Preserve broker-provided market value and unrealized PnL as observed values, rather than re-deriving them
  - Intentionally remove the assumption that every non-long side is short and keep realized PnL separate
- openQuestions: —

### MAP-63A967FD50

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:906-946](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts#L906-L946)
- symbol: historical feed handling tests
- id: MAP-63A967FD50
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:906-946: tests request SIP first, fall back on a 403 body mentioning recent SIP data, and propagate a 500
- currentBehavior: The test injects an axios-like 403 with a message string to trigger IEX and verifies a non-SIP 500 makes only one request. Feed choice is controlled by status plus regex over rendered error text.
- problem: Message rendering is not a stable protocol discriminator; wrapped/changed provider bodies can incorrectly trigger fallback. Returned bars do not say which feed actually supplied them, and a fallback can silently lower data quality for backtests.
- preservedBehavior:
  - Preserve SIP-first ordering and the narrow recent-SIP-to-IEX fallback intent
  - Preserve propagation of unrelated 500 errors
  - Intentionally replace message-text assertions with decoded reason and quality evidence
- openQuestions:
  - The local SDK only surfaces generic Axios data; exact Alpaca denial code fields and entitlement semantics require captured provider responses before broadening the fallback predicate.

### MAP-64290341EC

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:205-207](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts#L205-L207)
- symbol: close
- id: MAP-64290341EC
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:205-207: close is an empty method because the SDK has no explicit close operation
- currentBehavior: Calling close resolves without changing health, stopping catalog work, or releasing any resource. SDK client/socket/subscription lifetime is implicit in process lifetime.
- problem: An empty finalizer violates scoped resource and orderly shutdown contracts. Workers may continue to use a closing client, and scheduler cannot observe that new dispatch should stop; absence of an SDK close method is not evidence no local cleanup is needed.
- preservedBehavior:
  - Preserve the fact that Alpaca SDK may have no explicit close call
  - Intentionally add local scope/fiber shutdown around it
  - Do not claim finalizer can undo remote orders
- openQuestions: —

### MAP-6BB04953AD

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/alpaca-contracts.ts:29-40](../../../../services/uta/src/domain/trading/brokers/alpaca/alpaca-contracts.ts#L29-L40)
- symbol: resolveSymbol
- id: MAP-6BB04953AD
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/alpaca-contracts.ts:29-40: resolveSymbol accepts any nonempty symbol, rejects only explicit non-STK secType, uppercases, and returns null when absent
- currentBehavior: A Contract with any nonempty symbol and empty/ STK secType resolves to uppercase. It does not consult the catalog, tradability, account scope, exchange, jurisdiction, or freshness.
- problem: Symbol presence is not instrument resolution and permits guessed/unlisted/inactive symbols into writes. Null cannot distinguish invalid identity, unavailable catalog, unauthorized venue, or stale metadata.
- preservedBehavior:
  - Preserve uppercase canonical display for valid symbols
  - Preserve explicit non-STK refusal
  - Intentionally replace null/string fallback with reasoned result
- openQuestions: —

### MAP-749FA0DF7B

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:11-13](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts#L11-L13)
- symbol: Alpaca SDK and Decimal imports
- id: MAP-749FA0DF7B
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:11-13: adapter imports @alpacahq/alpaca-trade-api and decimal.js directly
- currentBehavior: The Alpaca adapter imports the native SDK and Decimal at module scope. Decimal is used in request formatting and broker-to-legacy mapping, while SDK types/objects are exposed indirectly through class methods and casts.
- problem: Direct imports are appropriate at a broker boundary, but the current class lets SDK values and legacy objects become the effective SPI. Decimal's implementation type also leaks into old Order/Position contracts, making unit/schema guarantees implicit.
- preservedBehavior:
  - Retain Decimal arithmetic and exact decimal wire encoding
  - Retain native SDK dependency in the optional Alpaca pack
  - Intentionally remove SDK/legacy values from kernel-visible signatures
- openQuestions: —

### MAP-7C95D7E4A8

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:381-413](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts#L381-L413)
- symbol: closePosition
- id: MAP-7C95D7E4A8
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:381-413: partial close reads positions and reverse-submits a market order; full close calls closePosition; both return legacy results
  - services/uta/src/domain/trading/UnifiedTradingAccount.ts:188-190: partial close preflights requested quantity against the current position before broker quantity mutation
- currentBehavior: Contract resolution is symbol-only. Explicit quantity causes getPositions, chooses reverse side from current position, sets MKT/DAY, and delegates to placeOrder. Omitted quantity uses native closePosition. No target exposure, precondition, lock, identity, or compensation exists.
- problem: Read-then-write is racy and an unknown side/quantity can create exposure. Native full close and reverse order have different remote semantics but are flattened into PlaceOrderResult. There is no evidence that closePosition is idempotent or scoped to an explicit client identity.
- preservedBehavior:
  - Preserve full-close and partial reverse-market intent
  - Preserve direction for validated long/short observations
  - Intentionally require target exposure evidence and never claim native atomic closure
- openQuestions:
  - No local evidence proves Alpaca DELETE close-position reduce-only/idempotency, and the adapter lacks client identity for that path; keep native close conservative and reconciliation-first.

### MAP-894C4D8526

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:443-455](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts#L443-L455)
- symbol: contractFor
- id: MAP-894C4D8526
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:443-455: contractFor builds STK contract and optionally copies catalog name/exchange; absent metadata falls back to bare contract
- currentBehavior: Every symbol becomes a hardcoded STK/SMART/USD Contract. If the mutable symbol map contains a row, name and primaryExchange are attached; otherwise the contract remains bare.
- problem: Optional enrichment hides catalog absence/staleness and cannot represent venue/jurisdiction/freshness. A bare contract can still be used in action preparation, and Contract fields are not nominal instrument identity.
- preservedBehavior:
  - Preserve name/exchange rendering for valid catalog rows
  - Preserve STK/USD compatibility output where evidence is explicit
  - Intentionally remove bare-contract execution fallback
- openQuestions: —

### MAP-9C9DF0B00B

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:603-615](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts#L603-L615)
- symbol: getMarketClock
- id: MAP-9C9DF0B00B
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:603-615: getMarketClock calls one account-wide getClock and maps four fields to MarketClock
- currentBehavior: A single getClock response is interpreted as boolean account market status and three Date values. The method does not receive instrument/session/time query context.
- problem: Account-wide boolean is insufficient for instrument jurisdiction, regular/extended/auction session, halts, timezone/calendar version, or stale clock. It can let prepare infer market open from an unrelated context.
- preservedBehavior:
  - Preserve account clock compatibility output
  - Intentionally require context for authorization to dispatch
  - Preserve Date conversion only after runtime validation
- openQuestions: —

### MAP-9E30EAD352

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/alpaca-types.ts:53-57](../../../../services/uta/src/domain/trading/brokers/alpaca/alpaca-types.ts#L53-L57)
- symbol: AlpacaSnapshotRaw
- id: MAP-9E30EAD352
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/alpaca-types.ts:53-57: snapshot raw shape has numeric trade/quote prices, daily volume, and string timestamps only
- currentBehavior: The interface accepts the partial snapshot used by getQuote. It omits Symbol, sizes, per-source fields, and runtime checks for finite/range/timestamp values.
- problem: A malformed snapshot can be surfaced as a quote; no identity equality or source/quality/freshness evidence is possible. Numeric conversion to strings is presentation, not unit validation.
- preservedBehavior:
  - Preserve latest trade/quote/daily volume compatibility mapping
  - Preserve timestamps after validation
  - Intentionally add source/venue/identity metadata
- openQuestions: —

### MAP-A1FCB75450

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:895-904](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts#L895-L904)
- symbol: getCapabilities tests
- id: MAP-A1FCB75450
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:895-904: getCapabilities test expects flat STK and five order-type arrays
- currentBehavior: getCapabilities returns static supportedSecTypes ['STK'], order types MKT/LMT/STP/STP LMT/TRAIL, and historical quality iex. Tests only compare arrays and do not involve account/session/connection context.
- problem: Flat arrays cannot express native notional restrictions, bracket/OTO support, outside-session/expiry features, idempotency evidence, compensation class, data-feed entitlement, or degraded connection. The static IEX statement can be false for a SIP response.
- preservedBehavior:
  - Retain STK as the observed initial Alpaca asset-class scope
  - Retain the five legacy order names only in a compatibility view when evidence supports them
  - Intentionally remove static quality and array-only execution decisions
- openQuestions:
  - No source proves which Alpaca order variants, notional combinations, or account permissions are available in every mode; unavailable-by-default is required until evidence is recorded.

### MAP-A57DA48B5D

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:417-441](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts#L417-L441)
- symbol: getAccount
- id: MAP-A57DA48B5D
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:417-441: getAccount Promise.all casts account/positions, sums unrealized_pl with Decimal, hardcodes USD, and maps legacy AccountInfo
- currentBehavior: Account and position reads run concurrently. Account strings are converted to Decimal then stringified; positions' unrealized_pl is recomputed as aggregate; day trades are converted from a fixed 3-count; failures become BrokerError.from.
- problem: Casts skip response validation, USD is hardcoded without branded CurrencyCode/source, and derived aggregate lacks timestamp/version. The method conflates broker account facts with accounting projection and cannot represent unavailable realized PnL or mixed currency.
- preservedBehavior:
  - Preserve concurrent account/position fetch and Decimal arithmetic
  - Preserve broker-supplied market value/PnL as evidence
  - Intentionally move hardcoded currency/realized semantics into explicit typed decisions
- openQuestions: —

### MAP-A99C29C26A

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:457-484](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts#L457-L484)
- symbol: cancelOrder tests
- id: MAP-A99C29C26A
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:457-484: cancel success resolves void and the adapter constructs Cancelled locally; failure is stringified
- currentBehavior: The test accepts a void cancel call as a terminal Cancelled OrderState with the requested ID. A rejected promise becomes success=false and an error string.
- problem: A DELETE/void response only says the request path returned without throwing; it does not prove the order is cancelled, nor that no late fill occurred. A timeout or process restart is indistinguishable from not-found and cannot be reconciled.
- preservedBehavior:
  - Preserve cancellation request for a known order and structured provider reason
  - Intentionally remove local success construction and legacy PlaceOrderResult
  - Keep a compatibility Cancelled projection only after observation confirms it
- openQuestions:
  - Alpaca's cancellation endpoint absence semantics and eventual-consistency window are not established by the SDK; the adapter must retain Unknown until a conformance policy supplies absence evidence.

### MAP-ADF2C4D82C

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/alpaca-types.ts:1-7](../../../../services/uta/src/domain/trading/brokers/alpaca/alpaca-types.ts#L1-L7)
- symbol: AlpacaBrokerConfig
- id: MAP-ADF2C4D82C
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/alpaca-types.ts:1-7: AlpacaBrokerConfig exposes optional id/label, raw apiKey/secretKey strings, and paper boolean
- currentBehavior: Configuration type carries secret material directly and relies on callers to supply valid strings. It has no secret reference, scope, jurisdiction, or capability metadata.
- problem: Raw keys can leak into ordinary config, logs, plans or tests; internal types cannot distinguish configuration validation from credential resolution. Paper/live mode is a boolean rather than a typed account identity.
- preservedBehavior:
  - Preserve paper/live selection and UI labels
  - Preserve required credential validation at external boundary
  - Intentionally remove raw secret fields from internal durable model
- openQuestions: —

### MAP-AECC0CF17C

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:500-509](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts#L500-L509)
- symbol: getOpenOrders
- id: MAP-AECC0CF17C
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:500-509: getOpenOrders sends status=open, casts an array, maps legacy orders, and wraps failures
- currentBehavior: The optional listing method asks Alpaca for open orders, immediately maps rows to OpenOrder, and throws BrokerError.from on request failure. A successful empty array is indistinguishable from a venue list with omitted conditional/held namespaces.
- problem: The list is an unvalidated snapshot without pagination/cursor, source/sequence, or explicit completeness. UTA's listing strategy treats presence as alive and absence as requiring confirmation, but this adapter offers no evidence about held/conditional coverage.
- preservedBehavior:
  - Preserve status=open intent and open-order observation surface
  - Preserve mapped valid orders for compatibility
  - Intentionally distinguish empty from unavailable/incomplete and held/conditional visibility
- openQuestions:
  - The SDK order list declaration exposes pagination options but local adapter has no paging implementation; exact default page size and whether held/conditional orders appear require provider evidence.

### MAP-B0EB90D81C

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:871-893](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts#L871-L893)
- symbol: getMarketClock tests
- id: MAP-B0EB90D81C
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:871-893: one account-wide clock maps isOpen and three timestamp fields to Date values
- currentBehavior: getMarketClock calls getClock once and returns a legacy account-wide MarketClock with boolean isOpen and Date nextOpen/nextClose/timestamp. Tests do not identify venue timezone, instrument, session kind, or calendar version.
- problem: An account clock cannot by itself prove a particular instrument/session is executable, especially around holidays, halts, extended hours, or jurisdiction. Invalid timestamps become Invalid Date unless decoded, and provider errors are generic BrokerError.
- preservedBehavior:
  - Preserve mapping of valid next-open/next-close/timestamp values for compatibility
  - Preserve explicit boolean open display at public read edge
  - Intentionally require instrument/session context for execution decisions
- openQuestions: —

### MAP-B25118D3A4

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:259-268](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts#L259-L268)
- symbol: getContractDetails
- id: MAP-B25118D3A4
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:259-268: getContractDetails resolves a symbol then fills hardcoded exchanges/order types/COMMON, returning null on failure
- currentBehavior: Any symbol accepted by resolveSymbol receives static SMART/NYSE/NASDAQ/ARCA and MKT/LMT/STP/STP LMT/TRAIL details, with COMMON stockType. No SDK metadata query occurs.
- problem: The response claims exchange/order support without observing the asset or account. It cannot express dynamic session, permissions, feed, notional, expiry, bracket/OTO, or connection degradation, and null collapses failure reasons.
- preservedBehavior:
  - Keep a read-level details projection for existing consumers
  - Preserve canonical STK/USD metadata only when catalog evidence says so
  - Intentionally eliminate hardcoded universal support
- openQuestions:
  - The exact set of Alpaca exchanges/order capabilities per account is not in local source; static lists must not be promoted without evidence.

### MAP-B4DB89297E

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/alpaca-contracts.ts:13-17](../../../../services/uta/src/domain/trading/brokers/alpaca/alpaca-contracts.ts#L13-L17)
- symbol: ALPACA_TIMEFRAME
- id: MAP-B4DB89297E
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/alpaca-contracts.ts:13-17: ALPACA_TIMEFRAME maps each BarInterval key to unconstrained strings 1Min through 1Week
- currentBehavior: A Record keyed by the current BarInterval union returns plain strings. There is no runtime codec, feed/source, venue, or unsupported interval result.
- problem: A future key or malformed interval can yield an undefined/string request that reaches the SDK. Timeframe validity is disconnected from historical request bounds and feed capability.
- preservedBehavior:
  - Preserve existing 1m–1w mapping values
  - Preserve deterministic mapping
  - Intentionally constrain output and add feed/session context
- openQuestions: —

### MAP-B9801A7C06

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:78-99](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts#L78-L99)
- symbol: alpacaErrorMessage and isRecentSipDenied
- id: MAP-B9801A7C06
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:78-99: unknown errors are rendered via Error/string and axios-like response.data; SIP fallback checks status 403 plus regex over that text
- currentBehavior: alpacaErrorMessage concatenates a base message and JSON.stringify(response.data). isRecentSipDenied inspects response.status and a case-insensitive regex in the rendered string. All write/query catches rely on this string helper or BrokerError.from.
- problem: Error variants, provider codes, HTTP status, retryability, and redaction are lost or coupled to message formatting. A rendered message controls feed behavior, while secrets/large native payloads could enter logs and protocol errors.
- preservedBehavior:
  - Preserve useful provider response reason visibility, but via redacted structured fields
  - Preserve narrow SIP denial fallback semantics through a typed decoder
  - Intentionally remove message-string domain classification
- openQuestions:
  - Exact Alpaca error body fields and retry-after semantics are not present in local declarations; decoder must remain conservative for unknown bodies.

### MAP-BB249EB32E

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:30-42](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts#L30-L42)
- symbol: Legacy contract extension and helper imports
- id: MAP-BB249EB32E
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:30-42: side-effect imports contract-ext.js and imports makeContract, buildPosition, fuzzyRankContracts from legacy layers
- currentBehavior: The adapter activates a declaration merge for aliceId, builds compatibility contracts and positions through shared legacy helpers, and delegates fuzzy ranking to a legacy utility.
- problem: A side-effect extension and compatibility builders couple Alpaca to mutable IBKR classes. Symbol identity, position accounting, and catalog metadata are not refined at the boundary; target domain code cannot rely on branded InstrumentId or PositionObservation.
- preservedBehavior:
  - Preserve fuzzy search ordering for valid catalog rows
  - Preserve compatibility rendering metadata where consumers still need it
  - Intentionally remove side-effectful contract extension from target domain path
- openQuestions: —

### MAP-BDB66E4D30

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:28-79](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts#L28-L79)
- symbol: init test cluster
- id: MAP-BDB66E4D30
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:28-79: tests cover missing apiKey/secretKey, successful getAccount construction, and 401 retry exhaustion with synchronous setTimeout substitution
- currentBehavior: init tests instantiate the class with raw credential strings, patch the SDK constructor using any, and observe promise rejection or resolution. Retry timing is tested by replacing global setTimeout, while authentication is identified from an Error message.
- problem: The examples bind credential material, SDK construction, retry policy, and startup admission into one mutable class. A message that happens to contain 401 controls permanent-vs-transient classification, and no test proves catalog supervision, shutdown, or durable unfinished-work classification before a mutation can run.
- preservedBehavior:
  - Keep bounded exponential retry for transport failures and fast failure for absent credentials
  - Keep successful account connectivity as the readiness probe
  - Intentionally remove synchronous timer monkey-patching and message-only 401 detection because they are implementation artifacts
- openQuestions: —

### MAP-BEC8B440B3

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:482-489](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts#L482-L489)
- symbol: getOrders
- id: MAP-BEC8B440B3
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:482-489: getOrders loops IDs through getOrder and silently omits null results
- currentBehavior: The method serially queries each ID and returns only successful mappings. Any getOrder error becomes null and disappears from the batch.
- problem: Batch reconciliation cannot tell NotFound from outage/protocol failure and may falsely conclude there are no pending orders. Input IDs and durable observation checkpoints are lost.
- preservedBehavior:
  - Preserve sequential lookup semantics where rate/backpressure policy requires
  - Preserve valid mapped orders
  - Intentionally remove silent omission
- openQuestions: —

### MAP-C2CA1F9078

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:491-498](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts#L491-L498)
- symbol: getOrder
- id: MAP-C2CA1F9078
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:491-498: getOrder casts response and catches every exception to return null
- currentBehavior: Every SDK response is cast to AlpacaOrderRaw and mapped. Authentication, transport, malformed response, and possible remote-unknown failures all become null.
- problem: Catch-all null is a false NotFound fallback. It can cause UTA sync to stop tracking a live order or treat an unavailable broker as clean, losing recovery evidence and fill/accounting updates.
- preservedBehavior:
  - Preserve successful order mapping and direct UUID lookup
  - Intentionally remove null catch-all and surface typed failure/outcome
  - Keep compatibility nullable projection only for consumers explicitly requesting legacy behavior
- openQuestions: —

### MAP-CBE13E6174

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/index.ts:1-2](../../../../services/uta/src/domain/trading/brokers/alpaca/index.ts#L1-L2)
- symbol: Alpaca broker barrel
- id: MAP-CBE13E6174
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/index.ts:1-2: barrel exports only AlpacaBroker and AlpacaBrokerConfig
- currentBehavior: The optional pack's public entry exposes the legacy class and raw config type. It does not export connection Layer, typed interpreters, capability derivation, schemas, observation or recovery services.
- problem: The composition root cannot acquire target SPI services without importing a legacy IBroker class; pack API version validation sees only configSchema/createBroker, so typed native/recovery capability is hidden.
- preservedBehavior:
  - Preserve optional-pack loading and `alpaca` engine identity
  - Preserve the narrow US-equity STK/ticker native boundary
  - Preserve configSchema/UI compatibility through explicit adapter facade during cutover
  - Intentionally remove legacy barrel as execution authority
- openQuestions: —

### MAP-CDB6B2021B

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:807-869](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts#L807-L869)
- symbol: getHistorical tests
- id: MAP-CDB6B2021B
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:807-869: tests drain async bars, preserve adjusted timeframe/limit and bounded tail semantics, reject unresolved contracts, and assert legacy iex capability
- currentBehavior: getHistorical maps interval to a timeframe, drains an async generator into legacy string bars, uses adjustment all, tail-slices bounded windows, and throws on unresolved symbols. The test asserts a static `quality: iex` capability.
- problem: Async generator and bars are cast without runtime validation; static IEX quality can contradict a successful SIP request; bars omit feed/source, interval, venue, bounds, and quality. Generic errors lose whether a window was denied, unavailable, malformed, or empty.
- preservedBehavior:
  - Preserve adjustment all, async draining, bounded tail-slicing, and string decimal compatibility projection
  - Preserve unresolved contract refusal
  - Intentionally replace static IEX claim with actual source/quality evidence
- openQuestions:
  - The SDK's generator pagination/end-of-stream and feed entitlement behavior are not described by local declarations; actual feed quality and completeness need paper/data conformance evidence.

### MAP-CFEE6FFFEA

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:273-347](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts#L273-L347)
- symbol: placeOrder
- id: MAP-CFEE6FFFEA
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:273-347: placeOrder builds Record&lt;string,unknown&gt;, supports qty/notional, prices/trails/extended_hours, picks OTO/bracket, parseFloats exits, calls createOrder, and surfaces parent/leg IDs
- currentBehavior: The method resolves only a symbol, compiles mutable Order fields into an untyped record, prefers qty over notional, maps auxPrice as stop/trail, sets extended_hours, uses OTO for one exit and bracket for two, converts exit prices with parseFloat, dispatches immediately, and returns a legacy result with optional child IDs.
- problem: All target safety barriers are missing: no AccountScope/instrument catalog proof, durable plan/dispatch identity, before-image, precondition, typed acknowledgement, observation, compensation, or unknown recovery. `parseFloat` corrupts exact decimal values. Parent/child response IDs do not prove group atomicity, and held legs can disappear from open listings.
- preservedBehavior:
  - Preserve source-level notional encoding, one-leg OTO, two-leg bracket, extended-hours/trailing intents, parent and child IDs
  - Preserve simple order behavior and unresolved-symbol loud failure
  - Intentionally correct parseFloat and immediate success semantics
- openQuestions:
  - Installed SDK source proves client-ID lookup endpoint exists but not server idempotency, retention, group atomicity, or held-leg lifecycle. Slice 4 must capture these facts; conservative ObserveBeforeRetry/independent-leg policy is the design until then.

### MAP-D0F05BBCB5

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/alpaca-types.ts:81-86](../../../../services/uta/src/domain/trading/brokers/alpaca/alpaca-types.ts#L81-L86)
- symbol: AlpacaClockRaw
- id: MAP-D0F05BBCB5
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/alpaca-types.ts:81-86: clock raw shape has is_open and three timestamp strings only
- currentBehavior: The type accepts account-wide boolean/timestamps with no runtime validation, timezone, venue, instrument, session kind, jurisdiction, or calendar version.
- problem: It cannot support context-sensitive market session preconditions or distinguish invalid/unavailable/halts. A boolean can be stale yet used as authorization for mutation.
- preservedBehavior:
  - Preserve valid boolean and timestamp compatibility projection
  - Preserve account clock query for display
  - Intentionally require context and freshness for execution
- openQuestions: —

### MAP-D25F93A942

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:359-402](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts#L359-L402)
- symbol: modifyOrder tests
- id: MAP-D25F93A942
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:359-402: replaceOrder receives qty/limit/TIF and an Error becomes success=false with its message
- currentBehavior: The test builds an Order containing selected fields, invokes modifyOrder('ord-1', changes), and expects an untyped patch plus a locally mapped accepted status. Any replacement failure becomes a boolean false and string error.
- problem: Partial input hides whether omitted fields mean retain, clear, or accidental loss. The old method has no before-image/version predicate, dispatch identity, or compensation for queue priority/identity loss, and an accepted replace response is not proof of the new order state.
- preservedBehavior:
  - Preserve valid qty, limit-price, and TIF field conversion
  - Preserve successful broker status as an acknowledgement only
  - Intentionally replace PlaceOrderResult boolean with action-specific ack/observation
- openQuestions:
  - The native response does not expose a documented order version in the installed SDK types; use a broker-provided updated_at/identity only after validating it as a version, otherwise require conservative observation sequencing.

### MAP-D276945617

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:370-379](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts#L370-L379)
- symbol: cancelOrder
- id: MAP-D276945617
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:370-379: cancelOrder awaits SDK cancel, creates Cancelled OrderState locally, and stringifies all failures
- currentBehavior: A resolved promise from cancelOrder is treated as terminal Cancelled for the requested string ID. Native response body/status is discarded.
- problem: The method has no action plan, expected version/status/fill before-image, dispatch identity, observation, or recovery. It cannot distinguish a request accepted while still working from actual cancellation or late fills.
- preservedBehavior:
  - Preserve cancel request and native order identity
  - Intentionally replace locally manufactured Cancelled status with observation-confirmed state
  - Preserve structured provider reason via redacted failure
- openQuestions:
  - Provider final-state/absence semantics after DELETE remain unavailable locally.

### MAP-D34D87EEB6

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:255-299](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts#L255-L299)
- symbol: precision tests
- id: MAP-D34D87EEB6
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.spec.ts:255-299: assertions require qty '10.5', qty '0.00001234', and 0.1+0.2 limit price '0.3' at the native request boundary
- currentBehavior: The tests inspect the private mock call and verify Decimal.toFixed strings rather than JavaScript numbers for quantity and limit price. Attached exit prices are not covered by the precision assertions.
- problem: The existing assertions protect only two fields and do not prove the target's unit-qualified Money/Quantity/Price relations or response decoding. A future encoder could preserve qty while converting bracket prices through parseFloat, as the current implementation does, without these tests detecting it.
- preservedBehavior:
  - Preserve exact 10.5, 0.00001234, and 0.3 examples
  - Extend the protection to notional, stop, trail, TP, and SL prices
  - Do not change arithmetic precision merely to normalize display scale
- openQuestions:
  - The venue's permitted fractional-share and price scales are not specified by the local SDK; tick/lot limits must be supplied by catalog/capability evidence rather than inferred from Decimal acceptance.

### MAP-D50CF7C166

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/alpaca-types.ts:32-51](../../../../services/uta/src/domain/trading/brokers/alpaca/alpaca-types.ts#L32-L51)
- symbol: AlpacaOrderRaw
- id: MAP-D50CF7C166
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/alpaca-types.ts:32-51: AlpacaOrderRaw has nullable qty/notional/prices/fills, open status/order_class/recursive legs, and unconstrained IDs/timestamps
- currentBehavior: The interface describes a convenient subset of order rows but does not validate any string, status, time, identity, version, group, or leg semantics. Mapper later collapses nullable sizing and status.
- problem: Raw nullable fields allow qty/notional ambiguity; open status strings and recursive legs cannot prove order group or held-leg behavior. Missing client ID/version/timestamps blocks dispatch recovery and before-image correctness.
- preservedBehavior:
  - Preserve native UUID, status, quantity/price/fill/leg information in typed form
  - Preserve compatibility projection for existing callers
  - Intentionally distinguish qty and notional and retain unknown evidence
- openQuestions:
  - SDK d.ts and local interface omit client_order_id/updated_at/version and do not define complete status/group values; native response capture is required for a safe schema.

### MAP-D988AF12EE

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:618-625](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts#L618-L625)
- symbol: getNativeKey and resolveNativeKey
- id: MAP-D988AF12EE
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:618-625: getNativeKey returns raw contract.symbol and resolveNativeKey reconstructs a hardcoded contract from unbranded input
- currentBehavior: Alpaca identity is a bare ticker. UTA embeds it after `|` in aliceId; reverse resolution turns any string into STK/SMART/USD Contract without catalog or account validation.
- problem: Ticker identity is useful for the flat equity universe but a raw string does not prove AccountScope, venue/jurisdiction, instrument status, or client/order identity. Reverse synthesis can resurrect an unknown/inactive symbol and cannot observe orders.
- preservedBehavior:
  - Preserve ticker as Alpaca's provider lookup key for validated US equities
  - Preserve aliceId route compatibility during migration
  - Intentionally stop synthesizing executable contracts for arbitrary strings
- openQuestions: —

### MAP-DEA87BE3CD

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:211-233](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts#L211-L233)
- symbol: refreshCatalog
- id: MAP-DEA87BE3CD
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:211-233: refreshCatalog casts getAssets, filters tradable=false, replaces array/map, logs success, and rethrows while retaining old fields on failure
- currentBehavior: refreshCatalog fetches active assets through an unknown cast, filters only explicit false, replaces both catalog structures, logs count, and leaves previous cache untouched on error. It has no runtime schema, freshness, sequence, or typed failure state.
- problem: A malformed or semantically incomplete response can become the new catalog; an exception is merely rethrown/logged, so callers cannot distinguish stale old rows, unavailable first load, and empty success. No durable checkpoint exists for restart.
- preservedBehavior:
  - Preserve active/tradable filtering and atomic replacement on valid response
  - Preserve old catalog on refresh failure
  - Intentionally make old-cache retention explicit Stale rather than implicit
- openQuestions: —

### MAP-E1BE5EBCAD

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/alpaca-types.ts:9-18](../../../../services/uta/src/domain/trading/brokers/alpaca/alpaca-types.ts#L9-L18)
- symbol: AlpacaBrokerRaw
- id: MAP-E1BE5EBCAD
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/alpaca-types.ts:9-18: AlpacaBrokerRaw declares cash/equity/portfolio/buying-power strings and numeric daytrade fields only
- currentBehavior: The account interface is compile-time-only; response strings and counts are trusted. It omits currency, observation timestamp, account scope, response version, and explicit margin/bucket semantics.
- problem: Malformed or unexpected provider responses can enter Decimal constructors. Unqualified strings can be summed across currencies, and omitted fields cannot be distinguished from zero/unavailable. No observation provenance supports freshness-bound preconditions.
- preservedBehavior:
  - Preserve exact decimal values and named account buckets
  - Preserve daytrade display when raw count valid
  - Intentionally add runtime validation/provenance
- openQuestions: —

### MAP-E8E6E71EFB

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:349-368](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts#L349-L368)
- symbol: modifyOrder
- id: MAP-E8E6E71EFB
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:349-368: modifyOrder accepts Partial&lt;Order&gt;, builds an untyped patch, calls replaceOrder, and returns status/error strings
- currentBehavior: Only present/non-UNSET qty, limit, aux, trailingPercent, and TIF fields are copied. Native replace response becomes a success result; errors are rendered strings.
- problem: Partial patch semantics, absent before-image/version, and direct replacement mean an old worker can amend a newer order. A replacement may change broker identity/queue position, so the current path cannot prove or compensate state restoration; timeout is not represented.
- preservedBehavior:
  - Preserve mapping of supported replacement fields and decimal strings
  - Preserve provider rejection visibility
  - Intentionally stop returning success solely from response and remove Partial&lt;Order&gt; execution input
- openQuestions:
  - Native updated/version identity and replace idempotency are not proven by SDK declarations; no automatic retry claim until evidence.

### MAP-EAC4E9DC46

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/alpaca-contracts.ts:42-65](../../../../services/uta/src/domain/trading/brokers/alpaca/alpaca-contracts.ts#L42-L65)
- symbol: mapAlpacaOrderStatus
- id: MAP-EAC4E9DC46
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/alpaca-contracts.ts:42-65: status mapper collapses native values into Filled/Submitted/Cancelled/Inactive, treats partial as Submitted, and defaults unknown to Submitted
- currentBehavior: Known native statuses are collapsed to four legacy strings; partially_filled is merely Submitted; unknown status is also Submitted. Rejected/done_for_day/suspended become Inactive together.
- problem: Default-to-working can make malformed/new status look alive, while collapse loses rejection, expiry, partial quantity, held/contingent state and commit/reconciliation evidence. It prevents exhaustive protocol evolution.
- preservedBehavior:
  - Preserve Filled/working/canceled display for known parent statuses
  - Preserve partial-fill awareness as nonterminal
  - Preserve explicit parent Replaced/DoneForDay/Suspended evidence and separate held/triggered leg state
  - Intentionally remove default Submitted and parent/leg status conflation
- openQuestions:
  - The complete future Alpaca status enum is not present in local adapter; unknown values must be preserved as protocol evidence until schema version is updated.

### MAP-ECD2F82DA3

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:54-64](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts#L54-L64)
- symbol: ibkrOrderTypeToAlpaca
- id: MAP-ECD2F82DA3
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:54-64: string order types map known IBKR codes and lower-case unknown values by default
- currentBehavior: MKT/LMT/STP/STP LMT/TRAIL map to market/limit/stop/stop_limit/trailing_stop; every other string is lowercased and sent to Alpaca.
- problem: The default manufactures a native request for an unrecognized order type and hides omitted/unsupported features. It also cannot express TRAIL LIMIT, notional restrictions, or relation validation in the type system.
- preservedBehavior:
  - Preserve five explicitly mapped legacy order variants where Alpaca evidence allows
  - Preserve lower-level native strings only inside the adapter schema
  - Intentionally remove permissive fallback
- openQuestions: —

### MAP-F52A496199

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:235-257](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts#L235-L257)
- symbol: searchContracts
- id: MAP-F52A496199
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:235-257: empty pattern returns [], unloaded catalog echoes an uppercased contract, loaded rows use fuzzyRankContracts
- currentBehavior: searchContracts short-circuits empty input, fabricates one contract before catalog load, and fuzzy-ranks catalog rows after load. The fabricated contract is not checked against Alpaca assets or capability context.
- problem: A guessed symbol can reach stage/prepare and violate InstrumentId/catalog evidence. Fuzzy rank returns compatibility Contracts with optional name/exchange fields, not a typed resolution result; stale catalog state is invisible.
- preservedBehavior:
  - Preserve empty-pattern [] and fuzzy-ranked valid matches
  - Preserve name/exchange read metadata
  - Intentionally remove uppercase echo from executable path
- openQuestions: —

### MAP-FA45E0F2BB

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/alpaca-contracts.ts:19-27](../../../../services/uta/src/domain/trading/brokers/alpaca/alpaca-contracts.ts#L19-L27)
- symbol: makeContract
- id: MAP-FA45E0F2BB
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/alpaca-contracts.ts:19-27: makeContract builds STK/SMART/USD Contract from ticker via legacy builder
- currentBehavior: Any passed ticker is placed into a mutable compatibility Contract with hardcoded secType STK, exchange SMART, and currency USD.
- problem: Hardcoded metadata masks catalog/jurisdiction/venue differences and bypasses branded InstrumentId. The helper cannot represent account scope or non-STK capability and can create a tradeable-looking contract from unknown input.
- preservedBehavior:
  - Preserve STK/USD display for validated Alpaca equities
  - Preserve ticker as native request field
  - Intentionally remove universal hardcoded execution metadata
- openQuestions: —

### MAP-FBF8E94277

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:457-480](../../../../services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts#L457-L480)
- symbol: getPositions
- id: MAP-FBF8E94277
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:457-480: getPositions casts raw rows, maps long versus any-other side to short, passes Decimal values, sets realizedPnL '0' and multiplier '1'
- currentBehavior: Raw positions are mapped to legacy Position via buildPosition. `p.side === 'long'` is long and every other string is short; market value is abs(); realized PnL is literal '0', multiplier literal '1'; BrokerError.from wraps failures.
- problem: Unknown side and malformed values are accepted, sign/abs semantics are implicit, and realized PnL zero is fabricated. The mapper drops scope, observation time, broker source, and catalog freshness.
- preservedBehavior:
  - Preserve Decimal values, equity multiplier 1, and broker market value/PnL pass-through where semantics are validated
  - Intentionally remove any-other-side-to-short and fabricated realized zero
  - Preserve BrokerError conversion only as compatibility transport mapping
- openQuestions:
  - Whether Alpaca market_value is always signed or magnitude for short positions is not established in local source; retain raw sign evidence and configure conversion only with provider proof.

### MAP-FDBC88A893

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/alpaca-contracts.ts:67-73](../../../../services/uta/src/domain/trading/brokers/alpaca/alpaca-contracts.ts#L67-L73)
- symbol: makeOrderState
- id: MAP-FDBC88A893
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/alpaca-contracts.ts:67-73: makeOrderState mutates a legacy OrderState with collapsed status and optional rejection string
- currentBehavior: The helper constructs mutable OrderState, assigns mapAlpacaOrderStatus, and copies rejectReason as an unstructured string. It has no ID/version/fill/time/remote outcome.
- problem: A compatibility state cannot distinguish acknowledgement from observation or carry evidence needed for replay, accounting and recovery. Mutable object construction also leaks legacy status assumptions into domain code.
- preservedBehavior:
  - Preserve legacy status/reject text for existing UI projections
  - Preserve deterministic mapping for known statuses
  - Intentionally move mutable state construction outside execution path
- openQuestions: —

### MAP-FE06BD8DFB

- mapping source: [services/uta/src/domain/trading/brokers/alpaca/alpaca-types.ts:20-30](../../../../services/uta/src/domain/trading/brokers/alpaca/alpaca-types.ts#L20-L30)
- symbol: AlpacaPositionRaw
- id: MAP-FE06BD8DFB
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/alpaca/alpaca-types.ts:20-30: position fields are unconstrained strings with unconstrained side and no scope/currency/time
- currentBehavior: The interface trusts symbol, side, quantity, prices, market value, PnL and cost basis. It cannot reject unknown side or malformed decimal and carries no identity/provenance metadata.
- problem: An arbitrary side is later treated as short; unit and valuation relations cannot be checked; accounting cannot know when/where the snapshot was observed or deduplicate it.
- preservedBehavior:
  - Preserve valid long/short and exact numeric mappings
  - Preserve multiplier 1 for equities when explicitly evidenced
  - Intentionally remove unknown-side short fallback
- openQuestions: —
