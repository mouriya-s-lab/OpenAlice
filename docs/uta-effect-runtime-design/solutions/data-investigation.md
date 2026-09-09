# Data capability investigation: Candle, Instrument, News, and NewsGroup

Status: source-backed investigation input for the UTA effect-runtime design. This document separates observed current behavior, absent current surfaces, and native-provider behavior that is not yet proven through the UTA boundary. It is not a production implementation plan and does not replace the shared composition contract in [composition-contract.md](composition-contract.md).

## Reading rules and scope

- **Observed** means the cited source currently implements or transports the behavior.
- **Absent** means no current type, route, registration, or adapter path was found for the named capability. It is not a claim that a provider can never implement it.
- **Unverified** means a lower-level package contains a relevant primitive, but the UTA/Alice product path does not expose enough evidence to claim an end-to-end guarantee.
- The Alice/UTA process boundary is real: `docs/project-structure.md:64-102` assigns `src/domain/market-data`, `src/domain/news`, and `src/tool` to Alice, while `services/uta` owns broker connections and `packages/uta-protocol` is the shared protocol package. The market-data guide distinguishes TraderHub/reference data, the bar service, and the retained OpenBB compatibility package (`docs/market-data-architecture.md:11-23`).
- The target consequences below follow K01-K12, especially [K02](composition-contract.md), [K03](composition-contract.md), [K04](composition-contract.md), [K05](composition-contract.md), [K06](composition-contract.md), and [K07](composition-contract.md): capability leaves are provider-declared; schemas are the declaration source; `Candle`, `Instrument`, `News`, and `NewsGroup` are semantic units; pull/push data are not trading transactions; and a native capability is not an end-to-end guarantee.

## Executive matrix

| Semantic unit | Current owner and read path | Current push path | Current loss or ambiguity | Target consequence |
|---|---|---|---|---|
| Candle / historical bar | Alice `BarService` (`src/domain/market-data/bars/types.ts:54-109`; `bar-service.ts:193-274`) and UTA `getHistorical` (`services/uta/src/domain/trading/UnifiedTradingAccount.ts:1132-1151`) | **Absent** at the Alice/UTA contract. IBKR has native requests, but the adapter does not expose them (`services/uta/src/domain/trading/brokers/ibkr/README.md:30-46`) | Alice normalizes to a number-valued OHLCV object with an open index signature; UTA protocol normalizes to string OHLCV. Finality, page coverage, cursor, correction identity, and source sequence are absent. | Define a common Candle base plus a precisely declared extension schema. Every pull leaf declares bounded result/coverage/freshness; every push leaf declares frame/control lifecycle, finality, gap/replay, and cancellation. Do not imply that a received frame is a closed candle. |
| Instrument / reference identity | UTA native `Contract`/`ContractDetails`, contract search/details/expand routes, and Alice bar IDs. Alice reference boards are separate low-frequency board contracts (`src/domain/market-data/reference/types.ts:26-43`, `107-133`). | **Absent** catalog/subscription stream. `refreshCatalog?()` is an optional pull refresh (`packages/uta-protocol/src/types/broker.ts:513-522`). | Search hits carry a raw account string and native SDK contract; cross-account failures and empty groups are dropped (`services/uta/src/domain/trading/contract-search.ts:27-64`; `uta-manager.ts:272-305`). Asset-class heuristic and venue fact are conflated in some fallbacks. | Separate native identity from resolved descriptor/facts, bind to explicit scope/catalog revision, retain completeness and provenance per search group, and preserve provider-rich fields under typed extension schemas. Unknown multiplier/currency/asset class remains unknown. |
| News | RSS polling, JSONL persistence, archive tools, and `/api/news` (`src/domain/news/collector/rss.ts:21-139`; `store.ts:43-255`; `webui/routes/news.ts:9-61`) | Collector has an internal timer and `onIngested` callback, but no consumer-facing News stream/subscription contract (`src/domain/news/collector/rss.ts:21-75`; `main.ts:410-438`). | Feed identity, GUID/link dedup, publish/ingest times, and source are retained, but body/parser fields and metadata remain open records. Per-feed failures are logged and disappear from query completeness. Corrections/retractions and source coverage are not modeled. | Define News provenance, published/observed times, correction/retraction links, source coverage, and typed provider extensions. Pull and push declarations must carry completeness/freshness/replay semantics; empty subscribed-feed results are not global absence. |
| NewsGroup | **Absent** as a domain type, route, provider method, or CLI capability. Feed `categories` are only tags (`src/domain/news/types.ts:23-37`) and the CLI `rss` group is a command namespace (`src/server/cli-commands.ts:49-71`). | **Absent** | No group identity, membership revision, selection rule, or snapshot completeness exists. | A NewsGroup is a derived/read semantic unit with stable identity, explicit member references or selection rule, revision/as-of, and Complete/Partial/Unavailable coverage. It is never an order transaction or proof that members are synchronized. |

## 1. Current agent, CLI, HTTP, and provider paths

### 1.1 Candle paths

The market-data guide says the bar service is the canonical price-history layer and that a source is selected explicitly by `barId` (`docs/market-data-architecture.md:79-101`). The current composition root creates one bar service (`src/main.ts:214-228`) and registers quant, snapshot, and simulation tools over it (`src/main.ts:260-268`).

Agent-facing paths are concrete and source-aware:

- `createQuantTools` exposes `searchBars` and `calculateQuant`; the former returns explicit `barId` candidates and the latter fetches bars by `barId`, interval, range, and optional as-of (`src/tool/quant.ts:15-109`). The tool text warns that source freshness differs, but the returned series is still only the normalized columns described at `src/tool/quant.ts:61-70`.
- The data CLI maps `alice analysis search-bars`, `quant`, `snapshot`, and `simulate` to those tools (`src/server/cli-commands.ts:49-91`). This is a current hand-maintained projection, not yet the target capability-tree interpreter.
- The HTTP route has a finite search response and a finite bars response. It accepts `barId` or `symbol + assetClass`, `interval`, `count`, `start`, and `end`, then returns `{ results: bars, meta }` (`src/webui/routes/bars.ts:17-59`). No push/stream route exists there.
- Broker-backed bars are selected only when UTA capability discovery advertises historical support; missing capability is skipped from source discovery (`src/domain/market-data/bars/bar-service.ts:277-351`). That behavior is useful for an unsupported-capability absence, but it currently hides unavailable scopes rather than returning a typed availability state.

### 1.2 Instrument and reference paths

There are two current meanings that must not be conflated:

1. **Tradeable instrument identity** is UTA-side contract search/details/expansion. The `aliceId` is the operational identity used by downstream quote/bar/order APIs (`services/uta/src/domain/trading/contract-search.ts:9-13`). `alice-uta contract` currently exposes search, details, quote, and expand, but not historical bars (`src/server/cli-commands.ts:241-295`).
2. **Low-frequency research/reference data** is the Alice reference service. The reference service exposes boards such as movers, calendar, macro, term structure, valuation, global macro, shipping, and Fed (`src/domain/market-data/reference/types.ts:105-133`). The AI board tool and `/api/reference/*` routes are thin pull adapters (`src/tool/reference-board.ts:17-51`; `src/webui/routes/reference.ts:14-91`), and `traderhub board` is the current CLI projection (`src/server/cli-commands.ts:93-164`).

The reference service does have useful freshness and source evidence: `ReferenceMeta` carries provider, assembled `asOf`, optional cache time, origin, and stale-while-error state (`src/domain/market-data/reference/types.ts:26-43`). Calendar also annotates per-list failures (`service.ts:101-127`), whereas movers converts failed list calls to empty arrays without an error marker (`service.ts:58-83`). Hub transport failure falls through to local; a valid hub response is stamped with `origin: 'hub'` (`src/domain/market-data/reference/hub.ts:33-76`). These are current pull/cache behaviors, not a stream protocol or a complete snapshot guarantee.

### 1.3 News paths

News is an Alice product, not a UTA broker capability:

- Main initializes the JSONL store before provider clients (`src/main.ts:158-165`), registers archive tools as the `rss` tool family (`src/main.ts:260-262`), places the store in `EngineContext` (`src/main.ts:390-403`), and starts the RSS collector only when configured feeds are enabled (`src/main.ts:410-438`).
- The data CLI intentionally calls the namespace `rss`, not `news`, because its coverage is exactly the user's subscribed feeds (`src/server/cli-commands.ts:49-71`).
- Archive tools expose glob, grep, date-window, and read operations. Their descriptions explicitly warn that empty results mean “not in the subscribed feeds”, not “nothing happened” (`src/domain/news/query/archive.ts:192-209`, `253-312`).
- The web route is a finite lookback query with an optional source filter and returns source/link/categories (`src/webui/routes/news.ts:9-61`).

None of these paths is a transaction effect. The optional `news.ingested` activity record is an attributable product fact emitted after durable store ingestion (`src/main.ts:410-433`); it is not an order journal, approval, reservation, or dispatch.

### 1.4 UTA read routes and protocol surface

UTA currently has direct read endpoints for quote and historical bars:

- `GET/POST /uta/:id/quote` constructs or receives a native `Contract` and calls `account.getQuote` (`services/uta/src/http/routes-trading.ts:302-328`).
- `POST /uta/:id/historical` revives ISO dates into `BarParams`, calls `account.getHistorical`, and returns `{ bars }` (`services/uta/src/http/routes-trading.ts:343-360`).
- Alice's `UTAAccountSDK` forwards those calls over a generic HTTP client. The SDK comments explicitly say the historical route was a follow-up/Phase 1 boundary and that `Date` values cross as ISO strings (`src/services/uta-client/UTAAccountSDK.ts:155-195`). The generic client itself returns an unchecked `T` after parsing JSON (`packages/uta-protocol/src/client/UTAClient.ts:22-35`, `63-98`), so this is not yet a schema-first wire boundary.
- The current UTA protocol `IBroker` mixes market queries with account/order methods. `getQuote`, `getMarketClock`, and optional `getHistorical` are direct calls over native `Contract`; historical absence is represented by an omitted method and a loud `CONFIG` error (`packages/uta-protocol/src/types/broker.ts:553-605`; `services/uta/src/domain/trading/UnifiedTradingAccount.ts:1132-1151`).
- `Quote` and `Bar` are trading-side wire types. Quote has string numerics and a timestamp; Bar has timestamp and string OHLCV (`packages/uta-protocol/src/types/broker.ts:296-364`). They have no source sequence, freshness/finality, correction identity, or coverage envelope.

This is a real conflict with K02 and the source-backed prior finding MAP-7056B295D1: the current facade is an implementation convenience, not the target public capability model. The target must expose separate, provider-declared read leaves without forcing every provider to implement a closed market/trading interface.

## 2. Candle / historical-bar investigation

### 2.1 Current Alice and UTA shapes

Alice's canonical bar shape is an operational projection, not a lossless provider record:

- `OhlcvBar` contains `date`, numeric open/high/low/close, nullable numeric volume, and an open `[key: string]: unknown` index signature (`src/domain/market-data/bars/types.ts:54-65`).
- `BarMeta` adds source/sourceId/barId/provider, a mixed `barCapability` label, request `asOf`, `isLatestActual`, and `staleTradingDays` (`src/domain/market-data/bars/types.ts:67-92`).
- Vendor rows enter as `Array<Record<string, unknown>>`; the service checks only that the four prices exist, casts, and emits only the six normalized fields (`src/domain/market-data/bars/bar-service.ts:111-148`, `195-233`). The source's other fields are not preserved by this path.
- UTA rows use `Bar` with string numerics and are converted to the Alice number-valued projection by `barToOhlcv` (`src/domain/market-data/bars/bar-service.ts:117-138`, `237-274`). This conversion also drops any provider fields that are not part of `Bar`.
- The vendor path sorts, applies a hard `MAX_BARS=5000`, and tail-truncates to `count` (`src/domain/market-data/bars/bar-service.ts:181-190`). The UTA path sends `limit` and tail-truncates after mapping. The result is finite but does not state whether the requested source window was fully covered.

The open index signature and `Record<string, unknown>` inputs are a direct conflict with K03/K04's precise extension requirement. They allow consumers to believe an arbitrary extra key is meaningful without a declared schema, and they do not provide a stable schema fingerprint for a provider extension.

### 2.2 Historical support by current provider

| Provider/adapter | Current observed behavior | Availability classification for target |
|---|---|---|
| Alpaca | `getHistorical` drains Alpaca's async `getBarsV2`, maps `Timestamp/Open/High/Low/Close/Volume`, asks for `adjustment: 'all'`, attempts SIP then falls back to IEX when recent SIP is denied, and advertises `quality: 'iex'` (`services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:531-600`). | Historical pull is **observed**. The IEX/SIP fallback is a provider-specific quality/entitlement fact, not proof of full tape coverage. The current result does not encode the fallback or partial-tape status beyond a coarse capability label. |
| CCXT | `getHistorical` maps the normalized interval to `fetchOHLCV`, checks the exchange's timeframes, computes a trailing `since`, requests one extra row for in-progress-candle differences, filters the range, and maps six OHLCV values (`services/uta/src/domain/trading/brokers/ccxt/CcxtBroker.ts:1234-1279`). It advertises realtime quality (`:1290-1295`). | Historical pull is **observed**. The extra-row logic proves that a returned last row can be in progress; it does not prove that the row is closed or final. Interval support is per exchange and should remain a capability leaf, not a global enum assumption. |
| Mock | Returns deterministic synthetic bars anchored to a mark price and advertises historical bars as realtime (`services/uta/src/domain/trading/brokers/mock/MockBroker.ts:479-520`; default capability near `:100-108`). | **Observed only for simulator/test behavior**. It is not native market-data evidence. |
| IBKR UTA adapter | The adapter implements one-time `getQuote` using snapshot `reqMktData` and advertises supported security/order types, but does not implement `getHistorical` and does not advertise `historicalBars` (`services/uta/src/domain/trading/brokers/ibkr/IbkrBroker.ts:800-879`). | UTA historical bars are **absent**. The lower package has native historical requests, so future support is **unverified at the product boundary**, not currently available. |
| Longbridge | The adapter implements quote/depth and market clock, but its capabilities contain no historical-bars declaration (`services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:631-681`). | Historical bars are **absent** from the adapter. Do not create a leaf from the existence of quotes. |
| LeverUp/Pyth | The adapter fetches one Pyth mark for `getQuote`; its capabilities list only `CRYPTO_PERP` and `MKT`, with no historical-bars field (`services/uta/src/domain/trading/brokers/others/leverup/LeverupBroker.ts:494-527`). | Historical bars are **absent**. The protocol itself names LeverUp/Pyth as an example of a broker without time-series data (`packages/uta-protocol/src/types/broker.ts:589-593`). |

The current `HistoricalBarsCapability` is `supported: boolean` plus optional quality and interval arrays (`packages/uta-protocol/src/types/broker.ts:428-449`). The prior investigation correctly identifies the missing distinctions in MAP-609FF636E8: unsupported versus unknown, entitlement versus data quality, interval/stream/range support, and freshness evidence. This report adds a provider-specific observation: the source has no IBKR UTA history adapter even though the native package has the protocol primitive.

### 2.3 Native IBKR evidence and what it does not prove

The lower-level IBKR package has real historical and stream primitives:

- `EClient` declares `reqHistoricalData(..., keepUpToDate, ...)` and `cancelHistoricalData` (`packages/ibkr/src/client/historical.ts:20-38`). Its implementation serializes contract, range, interval, price stream, and `keepUpToDate`, and has an explicit cancel operation (`:71-170`).
- Historical decoders emit individual bars, an end marker, and update bars (`packages/ibkr/src/decoder/historical.ts:123-183`). A decoded historical bar contains date, OHLC, volume, WAP, and bar count (`:55-65`); the UTA `Bar` protocol drops WAP and bar count (`packages/uta-protocol/src/types/broker.ts:349-364`). This is concrete evidence of provider richness that the current UTA/Alice shape loses.
- The native market-data client declares `reqMktData`/`cancelMktData`, tick-by-tick request/cancel, and market-data callbacks (`packages/ibkr/src/client/market-data.ts:17-34`, `66-138`).
- The IBKR adapter README explicitly says snapshot mode is what `getQuote` uses and continuous streaming mode is “not currently used”; continuous subscriptions require explicit cancellation and consume market-data lines (`services/uta/src/domain/trading/brokers/ibkr/README.md:30-46`).

Therefore:

- Native support is **observed** in `@traderalice/ibkr`.
- UTA `IBroker` historical/stream support is **absent** for IBKR.
- End-to-end lifecycle, replay, finality, backpressure, reconnection, and gap handling are **unverified**. No design may infer them from the existence of `reqHistoricalData` or a decoder callback.

### 2.4 Current freshness and missing completeness/finality

The bar service has a useful but narrow freshness calculation: it compares the last returned bar with the request anchor and reports a trading-day gap (`src/domain/market-data/bars/bar-service.ts:167-179`). That supports “the result does not reach the requested as-of date”; it does not answer:

- whether the source returned the complete requested range or silently truncated it;
- whether the latest bar is open/in progress or closed/final;
- whether a later correction/revision superseded a bar;
- whether the provider can replay a gap after disconnect;
- whether two sources use the same session/calendar/price stream;
- whether volume is unavailable versus zero;
- whether a partial-tape feed (for example Alpaca IEX) is being mistaken for full market coverage.

CCXT's one-extra-row comment is direct evidence that an in-progress candle is part of the current pull path (`services/uta/src/domain/trading/brokers/ccxt/CcxtBroker.ts:1252-1270`). IBKR's historical update callback is direct evidence that a bar can be updated after the initial response (`packages/ibkr/src/decoder/historical.ts:171-183`). These facts require explicit finality/correction semantics in the target contract; they prohibit “one received frame equals closed bar.”

### 2.5 Candle target consequences

These are constraints on Main's composition algebra, not a competing universal interface:

1. **Common base plus exact extension.** A Candle base should carry the minimum cross-provider facts (instrument reference, provider-declared bar specification, shared temporal projection, time boundary when exact, OHLC, volume quantity measure with basis/unit/instrument evidence, and source observation identity). The provider adapter then declares the leaf's exact extension object and schema version/fingerprint. Do not retain `[key: string]: unknown` or a universal raw-record escape hatch at the semantic boundary.
2. **Preserve known provider richness.** IBKR WAP/bar count, price stream, adjustment/feed, session, and entitlement facts can be modeled in an IBKR extension schema when the adapter declares them. A field that the adapter cannot decode into a declared schema is absent/unsupported, not silently copied as untyped JSON. The extension must not force Alpaca, CCXT, or other providers to accept IBKR fields.
3. **Pull leaf declarations.** Each historical pull capability declares its own exact input (instrument identity/scope, provider bar specification, price stream, explicit range or lookback, positive limit/cursor rules) and output (finite page, coverage/completeness, shared temporal projection when supported, continuation, as-of/freshness, finality/correction evidence). This follows [MAP-BFD66E07FA](ProtocolModels/entries.md#map-bfd66e07fa) and [MAP-8C79F4D559](ProtocolModels/entries.md#map-8c79f4d559), while retaining the current bar service's useful explicit `barId` and freshness behavior.
4. **Push leaf declarations.** A stream capability declares data-frame and control-frame schemas, creation/cancel/end/error states, source sequence/order, gap/replay support, backpressure/overflow behavior, and reconnect semantics. It must not be implemented as a generic “subscribe to anything” method. A current bar update, closed bar, correction, and retraction must remain distinguishable; unknown finality is reported as unknown.
5. **Unsupported versus unavailable.** A provider without historical support has no history capability leaf. A provider with a declared capability but a disconnected, expired, rate-limited, or unentitled runtime has a separate availability result. Do not encode either case as an empty bar array or a fake universal stub. The old `historicalBars?:` bag and `BrokerError('CONFIG')` fallback are migration evidence, not the target contract.
6. **No trading transaction wrapper.** Pulling or streaming Candle data consumes provider resources but does not enter order prepare/approve/dispatch/recovery. If an order decision uses a candle, persist the selected observation identity, as-of/freshness, source capability revision, and decision actor as evidence; do not write the whole stream into a trading WAL.

## 3. Instrument and reference-data investigation

### 3.1 Native instrument richness

The current UTA protocol imports native IBKR SDK classes directly (`packages/uta-protocol/src/types/broker.ts:1-12`). `Contract` includes native identity/routing fields such as `conId`, `symbol`, `secType`, expiry, strike/right, multiplier, exchange/primary exchange, currency, local symbol, trading class, security IDs, issuer ID, combo legs, and delta-neutral contract (`packages/ibkr/src/contract.ts:118-180`). `ContractDetails` carries market name, minimum tick, order types, valid exchanges, underlying identifiers, long name, industry/category/subcategory, timezone, trading/liquid hours, market rules, expiration, sizing precision, bond fields, fund fields, and event fields (`packages/ibkr/src/contract.ts:204-273`).

The decoder proves those fields are not merely theoretical: it maps native contract and detail fields from the wire (`packages/ibkr/src/decoder/contract.ts:116-161`, `177-276`, `283-388`). The target must therefore avoid reducing an observed native descriptor to only symbol and guessed asset class. It should expose a small common Instrument identity/descriptor and preserve declared native richness in a provider extension schema.

### 3.2 Current search and identity boundary

The current protocol shapes are still native and scope-poor:

- `ContractSearchResult` groups native descriptions under a raw `accountId`; `ContractSearchHit` flattens a raw `source` string, native `ContractDescription['contract']`, `derivativeSecTypes: string[]`, and optional asset class (`packages/uta-protocol/src/types/manager.ts:39-58`).
- `searchTradeableContracts` normalizes the input heuristically, fans out with `Promise.allSettled`, skips rejected broker calls, and emits only fulfilled descriptions. It gives venue `assetClassFor` precedence but leaves a secType heuristic for downstream fallback (`services/uta/src/domain/trading/contract-search.ts:27-64`).
- The HTTP route returns only flat `{ results, count, utasConfigured }`; an empty result or skipped failure has no completeness marker (`services/uta/src/http/routes-trading.ts:144-165`).
- `UTAManager.searchContracts` targets explicit account IDs or `asVendor` accounts, nudges unhealthy accounts, catches failures, and filters out any group whose result array is empty (`services/uta/src/domain/trading/uta-manager.ts:270-305`).
- Bar source search repeats the “skip when no historical capability” policy (`src/domain/market-data/bars/bar-service.ts:323-351`).

The prior MAPs identify the same boundary:

- [MAP-41D1B056C8](Catalog/entries.md#map-41d1b056c8): preserve a centralized search heuristic, but return a named search pattern; a normalized query is not an InstrumentId.
- [MAP-6BAF8CB0BF](ProtocolModels/entries.md#map-6baf8cb0bf): replace raw source/native-contract hits with scoped InstrumentId/descriptor, catalog revision, and venue/heuristic/unknown asset-class provenance.
- [MAP-6EAA6A8F74](ProtocolModels/entries.md#map-6eaa6a8f74): preserve each scope as Complete(empty), Partial, or Unavailable rather than dropping empty/failed groups.
- [MAP-29B08BE41B](ProtocolModels/entries.md#map-29b08be41b): history rows must retain InstrumentId/Descriptor, scope, venue, currency, and derivative variant; a legacy empty contract is read-only evidence.

### 3.3 Current pull-only reference boards and metadata

Alice's reference contract is board-shaped rather than a general Instrument catalog. `ReferenceMeta` identifies provider, as-of time, cache time, origin, and stale-while-error (`src/domain/market-data/reference/types.ts:26-43`). `ReferenceDataService` has named pull methods for boards (`:105-133`). The service uses per-board cache TTLs and hub-first/local fallback (`src/domain/market-data/reference/service.ts:41-56`, `58-164`), with no cursor, push subscription, source revision, or catalog membership state.

The target should not force these low-frequency boards into UTA tradeable-instrument identity. Instead:

- A board leaf declares its own result schema and partial/error semantics.
- A board row that represents an instrument may carry a typed reference to an Instrument identity, but the board itself is not a tradeable catalog.
- `meta.stale` and `meta.origin` are useful legacy projections; they are not a substitute for a capability availability variant or complete/partial result envelope.
- Hub and local provider failures remain separate from “unsupported board” and from “no matching rows.”

### 3.4 Instrument target consequences

1. **Identity versus facts.** Use a branded/provider-scoped InstrumentId for native identity. Keep resolved InstrumentDescriptor/facts optional and as-of/revision-bound. Never assign canonical identity from a bare symbol, normalization rule, or asset-class hint.
2. **Provider extensions.** Preserve native fields such as IBKR conId, exchange/routing, trading class, expiry/strike/right, multiplier, trading hours, market rules, contract size, and security identifiers in a precisely declared IBKR extension. Do not make those fields universal optional properties. An unknown multiplier or currency remains unavailable; it must not default to `1` or `USD`.
3. **Search completeness.** A search command's output must retain every requested scope with explicit Complete(empty), Partial, or Unavailable state, catalog revision, as-of, continuation, and a typed group failure. A healthy no-match result and an offline scope are different outputs.
4. **Asset-class provenance.** Keep venue-decided classification separate from a heuristic hint. The current `assetClassFor` precedence is useful evidence, but the fallback cannot authorize a trading action. This is also important for CCXT synthetic symbols: the venue may classify a symbol as crypto even when its text resembles an equity ticker (`services/uta/src/domain/trading/brokers/ccxt/CcxtBroker.ts:1281-1288`).
5. **Refresh is not push.** An optional catalog refresh is a pull operation. If a provider later offers live catalog changes, it needs a separate stream capability with revision, ordering, gap, and cancellation semantics. No current source proves that capability.
6. **Data is not transaction.** Search, details, expansion, reference boards, and catalog refresh do not prepare or dispatch orders. If an Instrument observation is consumed by an order decision, persist the exact identity/revision/evidence selected, not the entire catalog response as transaction state.

## 4. News investigation

### 4.1 Current RSS model and provenance

The current News domain has a durable-but-small record model:

- `NewsRecord` stores monotonic sequence, ingestion time, publication time, dedup key, title, content, and an open metadata record (`src/domain/news/types.ts:5-20`). `NewsItem` exposes stable sequence ID, publication time, title, content, and metadata (`:44-54`).
- Feed configuration has name, URL, source, optional categories/description, and enabled state (`src/domain/news/types.ts:23-37`; Zod schema `src/domain/news/config.ts:9-16`).
- The RSS/Atom parser extracts title, content/description/summary, link, guid/id, and publication/updated date, and retries one failed fetch after two seconds (`src/domain/news/collector/rss-parser.ts:9-37`, `43-72`). It does not currently parse author, native category elements, correction/retraction markers, provider revision, or source cursor.
- The collector polls configured enabled feeds on an interval, skips disabled feeds, logs per-feed fetch errors, computes dedup keys in priority order GUID then link then content hash, and emits an optional `onIngested` callback (`src/domain/news/collector/rss.ts:21-139`; `src/domain/news/store.ts:281-299`).
- The store appends JSONL, rebuilds a recent in-memory buffer, retains dedup keys beyond the retention window, and serializes ingestion to avoid duplicate writes (`src/domain/news/store.ts:43-119`, `121-187`). Queries filter by publication timestamp and take the most recent tail (`:227-255`).
- The archive tools expose only what was collected from subscribed feeds, with stable IDs and time-window alignment (`src/domain/news/query/archive.ts:192-223`, `253-312`). The web route exposes source/link/categories but not dedup key, ingest timestamp, feed URL, coverage, or correction state (`src/webui/routes/news.ts:33-59`).

The current model does preserve useful provenance, but `metadata: Record<string, string | null>` is the News equivalent of the bar open index signature: it is not a declared extension schema. The target should promote known provenance fields to typed base facts and keep provider-specific metadata in declared extensions.

### 4.2 Completeness, finality, correction, and freshness

Current RSS behavior has several explicit boundaries:

- A feed fetch failure is logged and the collector proceeds to other feeds (`src/domain/news/collector/rss.ts:77-101`). The archive query does not return per-feed failures or a coverage state. Therefore an empty result is explicitly not global news absence (`src/domain/news/query/archive.ts:195-209`).
- Dedup is durable by GUID/link/content hash, but that is not a correction model. If a publisher changes an article under the same GUID/link, the current store keeps the first record and does not emit a revision or retraction (`src/domain/news/store.ts:161-187`, `281-299`). This is observed current behavior, not a claim that the publisher guarantees immutability.
- `pubTs` and `ts` distinguish publication from ingestion, but there is no source-observed time, feed cursor, provider sequence, or freshness horizon (`src/domain/news/types.ts:5-20`).
- Categories are feed-config labels copied into a comma-delimited metadata string (`src/domain/news/collector/rss.ts:117-129`), not an authoritative grouping or membership snapshot.

The native IBKR package has a separate, currently unused news surface: requests for news providers, articles, historical news, and display-group subscriptions are declared (`packages/ibkr/src/client/historical.ts:34-42`); the decoder emits provider lists, articles, historical headlines, and a `hasMore` marker (`packages/ibkr/src/decoder/misc.ts:264-312`). There is no UTA `IBroker` news method, Alice news adapter, or product route that consumes those callbacks. This is **native capability evidence only**, not current News support; subscription lifecycle, provider entitlements, article identity, replay, and correction semantics are **unverified**.

### 4.3 News target consequences

1. **Typed base provenance.** A News base should distinguish stable source/native identity, headline/body or summary, publishedAt, observed/ingestedAt, source/provider identity, canonical URL, and source cursor/revision where available. Keep the current stable ID/dedup evidence during migration, but do not treat a hash fallback as a publisher identity.
2. **Corrections and retractions.** Model correction/retraction as explicit relationships or lifecycle facts. A later article with the same GUID/link may be a revision, not a duplicate; an adapter that cannot establish this leaves correction state unknown rather than claiming immutable content.
3. **Feed coverage.** Every pull result declares selected feeds/providers, per-source Complete/Partial/Unavailable state, cursor/continuation, and as-of/freshness. A `limit` truncation is not completeness. Empty subscribed-feed output remains Complete(empty) only for the covered feeds, never for “news at large.”
4. **Push lifecycle.** A future News stream declares create/cancel/end/error, source sequence, dedup/replay behavior, gaps, and backpressure. The current `setInterval` collector and callback are an internal polling implementation and cannot stand in for a consumer-facing stream contract.
5. **Provider richness.** Native news-provider codes, article IDs, article type, provider-specific headline fields, and `hasMore` should live in a precisely declared provider extension. They should not be flattened into open string metadata or imposed on RSS, IBKR, or other providers universally.
6. **No trading transaction.** News collection/archive/search is ordinary data IO. If an agent uses a News item as an order trigger, persist the selected News identity, source, publication/observed times, source revision, predicate evaluation, and trigger-consumer identity as evidence. Do not transactionalize the full feed or use data-cache failure as order compensation.

## 5. NewsGroup: current absence and target role

### 5.1 Current evidence

An exact repository search found no `NewsGroup`, `newsGroup`, `news_group`, `newsgroup`, or `news-group` declaration under the News/tool/server/web routes. The nearest current concepts are not the same unit:

- `RSSFeedConfig.categories?: string[]` is a user/configuration label (`src/domain/news/types.ts:23-37`).
- The collector copies those labels into `metadata.categories` as a comma-separated string (`src/domain/news/collector/rss.ts:117-129`).
- The web route accepts source filtering and returns categories (`src/webui/routes/news.ts:28-57`), but has no group identity or member-selection contract.
- The CLI `rss` group is a command namespace whose description warns about subscribed-feed coverage (`src/server/cli-commands.ts:49-71`); it is not a NewsGroup data object.
- The current product does not expose a provider news-group subscription. IBKR's lower-level display-group methods are a native API primitive, not a UTA NewsGroup implementation (`packages/ibkr/src/client/historical.ts:39-42`).

Thus NewsGroup is a **new target semantic unit**, not a rename of an existing source type. No current completeness, membership, or synchronization guarantee may be inferred from categories or CLI grouping.

### 5.2 NewsGroup target consequences

A NewsGroup capability leaf should declare its own exact schema, for example:

- stable group identity and provider/source provenance;
- either explicit member News references or a typed selection rule (not both as an unvalidated bag);
- membership revision/as-of and source coverage state (`Complete`, `Partial`, or `Unavailable`);
- cursor/continuation or replay behavior when the group is streamed;
- freshness and correction semantics for membership changes;
- provider-specific group fields in a declared extension schema.

A group is a read projection/selection, not evidence that its members are complete, synchronized, or suitable for a trading trigger. A provider with no grouping capability has no NewsGroup leaf. A provider that supports groups but is disconnected or unauthorized retains its declared leaf and reports a separate availability state. This is the same unsupported-versus-transient split required by K02 and K05.

## 6. Required composition consequences (without creating a second algebra)

Main's canonical composition algebra should apply these data-specific constraints:
Public versus account scope is explicit rather than inferred. Public Candle, News, and Instrument reads use a `PublicSource` variant and must not invent an account or subaccount. Account-scoped observations use an explicit `AccountSource(AccountScope)` only when the provider leaf requires authenticated account context. This follows the identity/source split in [K04](composition-contract.md) without forcing account scope onto public data.

| Leaf family | Input schema must declare | Output schema must declare | Structural absence, domain failures, and availability |
|---|---|---|---|
| Candle historical pull | PublicSource or AccountSource InstrumentRef as required by the leaf, provider-declared barSpec/price stream, explicit range/lookback, positive limit/cursor, requested as-of | Finite page of `Candle<DeclaredExtension>`, source/evidence, coverage, continuation, freshness, finality/correction evidence | Unsupported capability; unavailable/expired entitlement; transient transport; partial/unknown coverage; malformed provider output |
| Candle or quote push | PublicSource or AccountSource InstrumentRef as required by the leaf, provider-declared stream dimensions, requested replay/start point, resource/permission needs | Data frames plus lifecycle/control frames, source sequence, ordering/gap/replay, finality, correction, backpressure/termination | Unsupported stream; denied/expired resource; disconnect/gap; cancellation; provider protocol violation |
| Instrument search/details/expand | PublicSource or explicitly AccountSource SearchPattern/InstrumentRef, scope(s) only where the provider requires them, catalog revision or continuation, expansion filters when applicable | Scoped hits/descriptors with venue/heuristic/unknown provenance, per-group completeness, revision/as-of, continuation | No matches; partial listing; unavailable scope; catalog revision mismatch; identity ambiguity; malformed native descriptor |
| News pull/archive | Sources/feed scopes, time range, source cursor, grouping/filter rule, limit | Finite News page, provenance, per-source coverage, continuation, publication/observed freshness, correction state | Not subscribed/unsupported source; feed unavailable; partial coverage; cursor expiration; malformed article |
| News push/group | Source/group identity, replay cursor, membership rule or subscription parameters | News frames or group-membership frames plus create/cancel/end/error control, source sequence, revision, replay/gap state | Unsupported group/stream; authorization/entitlement; disconnect/gap; membership revision conflict; protocol violation |

These are **separate leaves**, not a new universal `DataProvider` or `Broker` interface. Each provider declares only the units/namespaces and exact input/output/error schemas it implements; unsupported families in the table mean absent leaves, not adapter stubs. CLI/help and AI metadata are projections of those declarations per [K06](composition-contract.md), so adding a provider extension changes its own schema/metadata/command projection without adding universal stubs.

Data pulls and pushes consume resources and may need permission/quota evidence, but they do not use transaction prepare/approve/compensate or per-frame trading WAL. [K05](composition-contract.md) specifically requires selected data evidence only when a trading decision consumes it.

## 7. Related prior MAP evidence and evidence gaps

### Related MAP IDs

- **[MAP-609FF636E8](ProtocolModels/entries.md#map-609ff636e8)** — current `HistoricalBarsCapability` optional-boolean bag and target availability distinctions.
- **[MAP-7056B295D1](ProtocolModels/entries.md#map-7056b295d1)** — current `IBroker` quote/history methods share a broker facade; target split into market-data and instrument-metadata ports.
- **[MAP-FC2ABFBF22](ProtocolModels/entries.md#map-fc2abfbf22)** and **[MAP-BFD66E07FA](ProtocolModels/entries.md#map-bfd66e07fa)** — retain interval/price-stream facts and make historical range/limit/cursor/completeness explicit.
- **[MAP-8C79F4D559](ProtocolModels/entries.md#map-8c79f4d559)** and **[MAP-7E5E549A48](ProtocolModels/entries.md#map-7e5e549a48)** — normalized bar/quote observations need source, instrument, sequence, freshness, and field availability rather than the current bare `Bar`/`Quote` shape.
- **[MAP-41D1B056C8](Catalog/entries.md#map-41d1b056c8)** — search heuristic must not become canonical Instrument identity.
- **[MAP-6BAF8CB0BF](ProtocolModels/entries.md#map-6baf8cb0bf)** — `ContractSearchHit` needs scoped InstrumentId/descriptor, catalog revision, and asset-class provenance.
- **[MAP-6EAA6A8F74](ProtocolModels/entries.md#map-6eaa6a8f74)** — preserve Complete(empty), Partial, and Unavailable per scope rather than dropping groups.
- **[MAP-29B08BE41B](ProtocolModels/entries.md#map-29b08be41b)** — history/instrument rows retain scoped identity and descriptor; legacy empty contracts are read-only evidence.

### Native/runtime facts still unverified

The following must remain explicitly unverified until an implementation boundary and runtime evidence exist:

1. IBKR historical `keepUpToDate` behavior through UTA, including cancellation, reconnect, update finality, correction, and gap replay. The native request/decoder exists; the UTA adapter currently does not expose it.
2. IBKR news provider/article/group behavior through UTA, including entitlements, article identity, historical `hasMore`, group membership revisions, and cancellation. Native methods/decoders exist; no UTA News adapter exists.
3. Any provider's guarantee that a last OHLCV row is closed/final, that a range is complete, or that a reconnect can replay all missing frames. Current Alpaca/CCXT/Mock adapter behavior does not supply those guarantees.
4. Native idempotency, replay horizon, correction semantics, or completeness for future foreign-process providers. K07 permits arbitrary languages/REST/SDK/gateways; the bridge must prove only the declared schema/lifecycle and must not infer guarantees from method names.

No current evidence conflicts with K01-K12. The concrete conflicts are in the legacy shapes and facades: open `Record`/index-signature extensions, native SDK classes in shared UTA protocol, optional boolean historical capability, dropped search groups, and direct market methods on `IBroker`. Those are source-backed migration targets, not reasons to add a larger closed interface.
