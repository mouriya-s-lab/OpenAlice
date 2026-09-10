
# Longbridge — source investigation and migration evidence


## Entries

### MAP-044F075AE6

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:340-378](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts#L340-L378)
- symbol: position flattening and zero-quantity specs
- id: MAP-044F075AE6
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:340-378: Position specs flatten HK/US channels, preserve contract/currency/quantity/marketValue, and omit zero quantity.
- currentBehavior: getPositions loops channels, drops zero rows, deduplicates symbols and returns flat Position[] without accountChannel, scope, observedAt or provenance.
- problem: Same symbol across channels can merge; zero observations proving a close disappear; compatibility output has no schema/quality evidence.
- preservedBehavior:
  - Keep valid nonzero long/short and market values.
  - Retain zero in authority while compatibility UI may omit it.
- openQuestions: —

### MAP-06A331A1E5

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/longbridge-types.ts:44-57](../../../../services/uta/src/domain/trading/brokers/longbridge/longbridge-types.ts#L44-L57)
- symbol: LongbridgeStockPositionLike and response
- id: MAP-06A331A1E5
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/longbridge-types.ts:44-57: Position shape contains symbol/name/quantity/costPrice/currency/market; response retains accountChannel only in outer channels and getPositions discards it.
- currentBehavior: Strings/numbers are unbranded and no observedAt/account identity/derivative discriminator or quantity/value validation exists.
- problem: Channel/sub-account and native market identity disappear, and malformed quantity can become a valid position.
- preservedBehavior:
  - Preserve symbol/name/quantity/cost/currency values when valid.
  - Retain channel/market and typed evidence instead of discarding.
- openQuestions: —

### MAP-06A7A665B6

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:346-362](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts#L346-L362)
- symbol: closePosition
- id: MAP-06A7A665B6
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:346-362: closePosition resolves symbol, reads positions, chooses requested/full quantity, builds reverse DAY MKT order and delegates placeOrder; missing position is string failure.
- currentBehavior: Read-then-reverse-submit races external changes and loses scope/before-image/target exposure; market order is not exact rollback.
- problem: Requested quantity may exceed updated exposure and recursive non-durable placeOrder repeats unknown/TPSL hazards.
- preservedBehavior:
  - Preserve reverse side and DAY MKT for valid close.
  - Correct stale/race/rollback assumptions and require scope.
- openQuestions: —

### MAP-10B9DD48C9

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:745-761](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts#L745-L761)
- symbol: isWithinSession
- id: MAP-10B9DD48C9
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:745-761: isWithinSession compares local hour/minute inclusive, ignores seconds/timezone/calendar and handles cross-midnight by OR.
- currentBehavior: Machine-local time and coarse minute precision drive session result without venue/instrument/session context.
- problem: Host timezone and second/holiday differences can authorize an order during a closed window.
- preservedBehavior:
  - Preserve declared ordinary intervals.
  - Remove local TZ/minute assumptions.
- openQuestions: —

### MAP-149A0DE19D

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:818-823](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts#L818-L823)
- symbol: resolveNativeKey spec
- id: MAP-149A0DE19D
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:818-823: resolveNativeKey round-trip resolves AAPL.US to symbol AAPL and exchange SMART.
- currentBehavior: Any nativeKey is passed to makeContract, which accepts bare/unknown suffix and emits STK.
- problem: Untrusted storage/query input can reconstruct wrong-market or wrong-kind contracts used for reconciliation/compensation.
- preservedBehavior:
  - Preserve AAPL.US-&gt;SMART/USD projection.
  - Stop bare/unknown STK fallback.
- openQuestions: —

### MAP-14E0507DE2

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:776-798](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts#L776-L798)
- symbol: getMarketClock closed-session spec
- id: MAP-14E0507DE2
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:776-798: Closed-session spec monkey-patches Date hours/minutes to noon, supplies 23:50-23:59 HK interval, and expects false.
- currentBehavior: isWithinSession uses machine-local minute values, ignores seconds/timezone/holiday, and tests mutate global Date methods.
- problem: Results depend on host timezone and endpoint precision; global mutation cannot represent venue calendar semantics.
- preservedBehavior:
  - Preserve ordinary intervals where calendar declares them.
  - Remove global Date/local-TZ assumption.
- openQuestions: —

### MAP-1B0A73A8CA

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/longbridge-types.ts:34-42](../../../../services/uta/src/domain/trading/brokers/longbridge/longbridge-types.ts#L34-L42)
- symbol: LongbridgeAccountBalanceLike
- id: MAP-1B0A73A8CA
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/longbridge-types.ts:34-42: Balance shape contains currency and five toString numeric-like fields: totalCash, netAssets, buyPower, initMargin, maintenanceMargin.
- currentBehavior: The getter-only interface is structural: any object with toString-like members can pass compile time, while runtime missing getters throw and omitted fields can be defaulted by fixtures; no scope/provenance/schema is attached.
- problem: Malformed numeric/currency values and lost provenance can corrupt account valuation; missing field is easily defaulted as zero.
- preservedBehavior:
  - Preserve all five numeric fields and Decimal text.
  - Add schema/provenance/scope; remove trust in structural `toString`.
- openQuestions: —

### MAP-1D6CD6D97F

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:760-774](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts#L760-L774)
- symbol: getMarketClock open-session spec
- id: MAP-1D6CD6D97F
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:760-774: Open-session spec returns isOpen=true when an all-day HK session covers now and checks Date timestamp.
- currentBehavior: getMarketClock queries every market/session and exposes one account-wide bool/timestamp.
- problem: An open unrelated market authorizes all actions; no venue/instrument/session or next boundary exists.
- preservedBehavior:
  - Preserve valid open state for requested venue.
  - Replace account-wide bool with keyed evidence.
- openQuestions: —

### MAP-1FA8030A9B

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:225-233](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts#L225-L233)
- symbol: mapLbOrderStatus specs
- id: MAP-1FA8030A9B
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:225-233: Specs map 5-&gt;Filled, 14-&gt;Inactive, 15-&gt;Cancelled, 11/7-&gt;Submitted and omit unknown numeric status.
- currentBehavior: mapLbOrderStatus collapses rejection/expiry/cancel/pending into four strings and defaults unknown values to Submitted.
- problem: Protocol drift or malformed status can appear live; rejection/expiry/partial-fill/evidence and remote unknown are lost.
- preservedBehavior:
  - Keep valid Filled/Canceled/Rejected/Expired and PartialFilled active behavior.
  - Stop unknown-&gt;Submitted and preserve raw status.
- openQuestions: —

### MAP-224C7730A0

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:683-692](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts#L683-L692)
- symbol: getNativeKey and resolveNativeKey
- id: MAP-224C7730A0
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:683-692: getNativeKey uses resolved suffix or contract.symbol; resolveNativeKey passes arbitrary key to makeContract.
- currentBehavior: Native identity is unbranded and loose suffix/currency inference can turn arbitrary strings into STK.
- problem: Reconciliation/compensation may target wrong market and dispatch identity lacks scope.
- preservedBehavior:
  - Preserve validated suffix round-trip.
  - Remove string/currency fallback authority.
- openQuestions: —

### MAP-2EDFABE32A

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:411-435](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts#L411-L435)
- symbol: foldBalancesToBase with FX
- id: MAP-2EDFABE32A
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:411-435: FX branch converts each balance to HKD, sums netLiq/cash/buyPower/margins with Decimal and hardcodes unrealizedPnL=0.
- currentBehavior: Arithmetic is deterministic but rates/source/freshness and raw buckets vanish; zero PnL is not evidence.
- problem: Stale/default/unknown rates produce exact-looking totals and PnL absence is hidden.
- preservedBehavior:
  - Preserve fresh Decimal sums.
  - Remove source-less conversion/zero PnL.
- openQuestions: —

### MAP-312213403A

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/index.ts:1-2](../../../../services/uta/src/domain/trading/brokers/longbridge/index.ts#L1-L2)
- symbol: Longbridge broker barrel
- id: MAP-312213403A
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/index.ts:1-2: The barrel exports only LongbridgeBroker and LongbridgeBrokerConfig, so pack loading reaches the generic IBroker class and direct mutation methods.
- currentBehavior: No scoped Layer, SPI interpreter, native schemas, capability derivation or recovery hook is publicly reachable from the broker directory.
- problem: The export surface makes the legacy authority easy to instantiate and hides the replacement boundary; consumers cannot compose lifecycle/codec services explicitly.
- preservedBehavior:
  - Keep legacy exports during controlled migration.
  - Add explicit replacement exports and remove legacy authority after account cutover.
- openQuestions: —

### MAP-34C03E3ABF

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/longbridge-types.ts:59-74](../../../../services/uta/src/domain/trading/brokers/longbridge/longbridge-types.ts#L59-L74)
- symbol: LongbridgeSecurityQuoteLike and LongbridgeSecurityDepthLike
- id: MAP-34C03E3ABF
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/longbridge-types.ts:59-74: Quote has last/open/high/low/volume/timestamp; depth has nullable price/volume arrays but no timestamp/market identity/feed quality.
- currentBehavior: Native shape is structural and null depth prices lack absent-liquidity versus unavailable distinction.
- problem: Unchecked values and missing provenance can produce stale/wrong instrument prices or zero-like depth.
- preservedBehavior:
  - Preserve valid quote fields and nullable native shape as evidence.
  - Add typed quality/timestamp/context.
- openQuestions: —

### MAP-39CF059275

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:230-233](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts#L230-L233)
- symbol: close
- id: MAP-39CF059275
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:230-233: close is async no-op because SDK contexts rely on GC for Rust websocket pools.
- currentBehavior: No explicit finalizer, closure state or shutdown signal exists.
- problem: GC timing leaves resources/subscriptions alive and scheduler cannot distinguish controlled shutdown from failure.
- preservedBehavior:
  - Preserve repeated close no-throw.
  - Replace GC/no-op with scoped ownership.
- openQuestions: —

### MAP-4472AC0A90

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:269-313](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts#L269-L313)
- symbol: placeOrder
- id: MAP-4472AC0A90
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:269-313: placeOrder resolves legacy contract, maps type/TIF, validates quantity, casts Decimal to SubmitOrderOptions, submits directly and returns New; exceptions become strings.
- currentBehavior: Mutation has no durable intent, scope/before-image/precondition/locks/idempotency/criterion/compensation; `_tpsl` is unused.
- problem: Post-send errors may be accepted remotely; named TP/SL input can be silently dropped and produce an unprotected order.
- preservedBehavior:
  - Preserve valid market/side/quantity/price/TIF mappings.
  - Explicitly compile or refuse TPSL/relations; never entry-only success.
- openQuestions: —

### MAP-4D504B3E91

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:203-223](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts#L203-L223)
- symbol: ibkrTifToLb specs
- id: MAP-4D504B3E91
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:203-223: Specs map DAY/empty-&gt;Day, GTC-&gt;GoodTilCanceled and IOC/FOK-&gt;null; implementation also recognizes GTD/OPG and defaults unknown to Day.
- currentBehavior: ibkrTifToLb maps DAY/empty to Day, GTC to GoodTilCanceled, GTD to GoodTilDate, IOC/FOK/OPG to null, and silently maps every other string to Day; the mapper carries no GTD expiry or timezone.
- problem: Unknown input can shorten lifetime; GTD cannot be represented safely, and IOC/FOK support/refusal has no contextual reason.
- preservedBehavior:
  - Keep valid Day/GTC mappings and the existing explicit IOC/FOK/OPG refusal; retain native GoodTilDate only when a complete expiry-bearing plan is available.
  - Remove unknown-&gt;Day authority and do not treat the existing expiry-less GTD enum mapping as a complete executable order.
- openQuestions: —

### MAP-4DE673DCFE

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:174-228](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts#L174-L228)
- symbol: init
- id: MAP-4DE673DCFE
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:174-228: init validates credentials, creates contexts, probes accountBalance, retries five times with sleeps, regexes auth after two attempts and throws raw lastErr.
- currentBehavior: Lifecycle is one-shot/private with message-regex errors and no health stream/reconnect generation/recovery gate.
- problem: Raw/non-Error failures are unclassified; successful probe does not establish quote/capability/account readiness or recovery safety.
- preservedBehavior:
  - Keep bounded retries/auth distinction.
  - Do not equate probe success to full readiness.
- openQuestions:
  - Exact SDK error code/status mapping and probe endpoint coverage require empirical conformance; until captured per endpoint, unknown native failures are UnclassifiedNativeFailure and missing coverage keeps RuntimeHealth non-Ready with admission closed.

### MAP-4E3338B271

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:277-336](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts#L277-L336)
- symbol: getAccount specs
- id: MAP-4E3338B271
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:277-336: Account specs select HKD without FX, largest netAssets without HKD, zeros for empty balances, and fold HKD+USD through stub FX.
- currentBehavior: getAccount returns one AccountInfo; no-FX discards other buckets and FX branch drops bucket/rate provenance while unrealizedPnL is always zero.
- problem: Single-bucket/largest-bucket output looks complete while hiding money; stale/default/unknown FX cannot be distinguished.
- preservedBehavior:
  - Keep Decimal arithmetic and visibility of empty response.
  - Remove one-bucket authority and zero-PnL fabrication.
- openQuestions: —

### MAP-50CE86A3DE

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:125-151](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts#L125-L151)
- symbol: LongbridgeBroker configSchema and fromConfig
- id: MAP-50CE86A3DE
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:125-151: configSchema validates appKey/appSecret/accessToken, paper default false, optional endpoint URLs; fromConfig parses generic brokerConfig and constructs class.
- currentBehavior: Shape validation feeds mutable legacy adapter; endpoint URI/environment/account scope are not refined and credentials remain object fields.
- problem: Valid config is mistaken for ready connection; paper is marker-only and generic records allow endpoint/account mismatch.
- preservedBehavior:
  - Preserve required credential and endpoint validation.
  - Make paper/live an evidence-backed ADT, not label.
- openQuestions:
  - Paper endpoint and credential semantics require pack conformance evidence linking declared paper/live intent to observed endpoint and account; until then EnvironmentUnknown blocks writes, explicit mismatch is rejected, and only CredentialRef/fingerprint is persisted.

### MAP-51D9E4799C

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:736-743](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts#L736-L743)
- symbol: lbTifToIbkr
- id: MAP-51D9E4799C
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:736-743: lbTifToIbkr maps GTC/GTD and Day or unknown numeric values to DAY.
- currentBehavior: lbTifToIbkr maps GoodTilCanceled/GoodTilDate and Day to strings, but defaults every other numeric value to DAY; LongbridgeOrderLike exposes no expiry field, so GTD cannot be reconstructed as a complete TimeInForce.
- problem: New/malformed TIF can shorten lifetime and corrupt compensation/projection.
- preservedBehavior:
  - Keep known mappings.
  - Remove unknown-&gt;DAY.
- openQuestions: —

### MAP-5350D6AC75

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:648-662](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts#L648-L662)
- symbol: placeOrder SDK-error spec
- id: MAP-5350D6AC75
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:648-662: SDK-error spec rejects submitOrder with insufficient buying power and expects the message in PlaceOrderResult.error.
- currentBehavior: Every submitOrder exception is stringified, including the fixture’s “insufficient buying power” message; no provider code, send-stage evidence, or distinction exists between a conclusive rejection and timeout after remote acceptance.
- problem: Retrying a string failure can duplicate an accepted order; raw text loses broker code and may leak details.
- preservedBehavior:
  - Preserve insufficient-buying-power reason in redacted structured form.
  - Change post-send exception from generic failure to Unknown.
- openQuestions: —

### MAP-551B60712E

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:429-475](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts#L429-L475)
- symbol: option and warrant multiplier specs
- id: MAP-551B60712E
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:429-475: Option/warrant specs apply option multiplier 100 and warrant conversionRatio 0.1 to value and unrealized PnL.
- currentBehavior: Static derivative tags select multiplier maps; missing values default to one.
- problem: Only successful metadata is safe; missing/mismatched metadata silently changes derivative economics.
- preservedBehavior:
  - Preserve 100x and 0.1x valid calculations.
  - Remove one fallback for derivatives.
- openQuestions: —

### MAP-58D7C0FC99

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:477-505](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts#L477-L505)
- symbol: mixed stock and option batch spec
- id: MAP-58D7C0FC99
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:477-505: Mixed stock/option batch spec expects separate marks/multipliers and values 2100 and 800.
- currentBehavior: getPositions shares quote/static/multiplier maps keyed by raw symbol and returns independent calculations but no metadata/provenance.
- problem: Output math can pass even if response order, venue, scope or instrument type is wrong; symbol collisions can cross-contaminate rows.
- preservedBehavior:
  - Keep independent stock/option math and batch support.
  - Preserve metadata and quality per row.
- openQuestions: —

### MAP-6B2FD586C2

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:543-557](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts#L543-L557)
- symbol: fetchQuoteMap
- id: MAP-6B2FD586C2
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:543-557: fetchQuoteMap batches quote and stores lastDone Decimal; any error logs warning and returns empty map.
- currentBehavior: Transport/schema/rate-limit failures become empty and buildPosition uses cost as current.
- problem: No response correlation/timestamp/quality; one failure erases unavailable-vs-empty distinction.
- preservedBehavior:
  - Preserve successful lastDone.
  - Remove empty-map fallback.
- openQuestions: —

### MAP-6BEB2F95EE

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/longbridge-types.ts:92-101](../../../../services/uta/src/domain/trading/brokers/longbridge/longbridge-types.ts#L92-L101)
- symbol: LongbridgeStaticInfoLike
- id: MAP-6BEB2F95EE
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/longbridge-types.ts:92-101: Static info shape contains symbol, numeric stockDerivatives and numeric lotSize; comments define Option=0/Warrant=1 and empty as equity/fund.
- currentBehavior: Numeric tags/lot have no runtime validation; the source comment says an explicit empty stockDerivatives array is plain equity/fund, but a missing field can be coerced to the same value and currency/venue/jurisdiction/entitlement are absent.
- problem: Unknown tag or invalid lot can be silently read as equity and capability decisions lack instrument evidence.
- preservedBehavior:
  - Preserve valid Option/Warrant tags and explicit empty-&gt;EquityLike evidence only; do not collapse plain equity/fund ambiguity.
  - Reject unknown/missing values and invalid lot instead of equity/one defaults.
- openQuestions: —

### MAP-6D6AB93685

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:559-575](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts#L559-L575)
- symbol: fetchStaticInfoMap
- id: MAP-6D6AB93685
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:559-575: fetchStaticInfoMap casts staticInfo and stores numeric stockDerivatives; errors return empty map and all symbols become plain equity.
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:567-573: `stockDerivatives ?? []` converts a missing runtime field into the same value as an explicit empty array, then positions are treated as plain equity.
- currentBehavior: Missing/unknown derivative metadata is absent and later interpreted as Equity; the `?? []` fallback also conflates missing stockDerivatives with an explicit empty derivative list.
- problem: Option/warrant identity and actions silently change; numeric version drift is hidden.
- preservedBehavior:
  - Preserve valid option/warrant tags and preserve explicit empty-array evidence as EquityLike (plain equity/fund ambiguity); missing metadata is not equity.
  - Remove one multiplier/equity coercion and persist missing-vs-empty evidence.
- openQuestions: —

### MAP-6E47D8CD20

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:246-267](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts#L246-L267)
- symbol: getContractDetails
- id: MAP-6E47D8CD20
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:246-267: getContractDetails resolves symbol, casts staticInfo, maps exchange/currency/lotSize, hardcodes orderTypes and COMMON, and returns null for no result/error.
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:255-262: `infos[0]` is used without symbol correlation, `lotSize || 1` turns missing/zero lot size into one, and orderTypes/stockType are hardcoded.
- currentBehavior: getContractDetails casts a response containing only exchange/currency/lotSize, uses infos[0] without correlating its symbol, substitutes lotSize 1 for falsy values, hardcodes orderTypes/COMMON and collapses empty/error into null; derivative metadata is not read on this path.
- problem: Hardcoded stock details and lotSize=1 can advertise invalid actions or quantities; an uncorrelated first response can describe another symbol; null cannot distinguish unavailable/malformed/no-match, and this method cannot prove a warrant/option kind.
- preservedBehavior:
  - Preserve valid exchange/currency/lot.
  - Remove COMMON/STK/orderTypes hardcodes and null collapse.
- openQuestions: —

### MAP-6F32F8A928

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:716-734](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts#L716-L734)
- symbol: lbOrderTypeToIbkr
- id: MAP-6F32F8A928
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:716-734: Reverse mapper handles known LO/ELO/MO/MIT/LIT and amount/percent trailing but defaults unknown numeric enum to LMT.
- currentBehavior: Unknown SDK/version data becomes a limit-order echo.
- problem: Protocol drift can corrupt projections and compensation by inventing semantics.
- preservedBehavior:
  - Preserve all known mappings.
  - Remove default LMT.
- openQuestions: —

### MAP-6FEA0D0AA9

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:812-816](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts#L812-L816)
- symbol: getNativeKey spec
- id: MAP-6FEA0D0AA9
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:812-816: getNativeKey returns exactly 700.HK for a Contract made from 700.HK.
- currentBehavior: getNativeKey falls back from resolved symbol to Contract.symbol or empty string.
- problem: Display/empty strings can become dispatch keys without brand, suffix, scope or collision protection.
- preservedBehavior:
  - Preserve 700.HK exact round trip.
  - Remove empty/display fallback.
- openQuestions: —

### MAP-724EE5B17D

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:687-706](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts#L687-L706)
- symbol: modifyOrder specs
- id: MAP-724EE5B17D
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:687-706: modify specs reject missing totalQuantity and send quantity 150 to replaceOrder for ord-1.
- currentBehavior: modifyOrder accepts Partial&lt;Order&gt;, requiring quantity by convention, then returns Replaced on any resolved SDK promise.
- problem: Partial patch semantics, before-image, order version and unknown replacement outcome are absent.
- preservedBehavior:
  - Keep quantity-only replacement as valid complete patch.
  - Require explicit unchanged fields/version and stop claiming Replaced from ack.
- openQuestions: —

### MAP-7805D80DA1

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:1-45](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts#L1-L45)
- symbol: Longbridge SDK mock
- id: MAP-7805D80DA1
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:1-45: The mock exports numeric OrderSide/OrderType/TimeInForce/Market plus Config.fromApikey, TradeContext.new, QuoteContext.new and only the adapter methods listed in the fixture.
- currentBehavior: Vitest replaces the SDK module, so tests observe promises and enum numbers without native schema decoding, account scope, connection generations, or an independent remote ledger.
- problem: A resolved mock promise looks like a remote acknowledgement and cannot model accepted-before-ack crash, unknown enum, or observation-after-restart.
- preservedBehavior:
  - Keep numeric enum fixtures for pure mapping.
  - Do not treat a resolved mock as proof of remote acknowledgement or idempotency.
- openQuestions:
  - Native response envelope/version and deterministic accepted-before-ack injection require adapter conformance evidence (capture the real SDK envelope/version and run the independent-ledger crash cut); until that evidence exists, raw responses are ProtocolViolation/RecoveryRequired and a post-DispatchStarted outcome is Unknown with ObserveRequired.

### MAP-7E1D54C751

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:235-244](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts#L235-L244)
- symbol: searchContracts
- id: MAP-7E1D54C751
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:235-244: searchContracts returns [] only for empty pattern, otherwise echoes pattern as ContractDescription and defaults bare pattern to US without query.
- currentBehavior: Guessed symbols are presented as tradeable despite staticInfo requiring exact symbols.
- problem: Bare/ambiguous result can route mutation wrong market; unsupported search is disguised as success.
- preservedBehavior:
  - Keep empty pattern empty.
  - Remove echo/US default and treat unsupported as typed unavailable.
- openQuestions: —

### MAP-7E38FF8EE5

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:710-734](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts#L710-L734)
- symbol: getQuote success spec
- id: MAP-7E38FF8EE5
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:710-734: Quote success spec combines quote/depth for 700.HK and expects last 305.5, bid 305.4, ask 305.6 and volume 1234567.
- currentBehavior: getQuote takes first quote/bid/ask and stringifies fields without schema, identity, source/session or quality validation.
- problem: Response order/identity can be wrong and the result omits freshness/feed provenance.
- preservedBehavior:
  - Preserve valid Decimal quote/depth values.
  - Add keyed scope/venue/session/time evidence.
- openQuestions: —

### MAP-7EC922FE58

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:577-593](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts#L577-L593)
- symbol: fetchOptionMultiplierMap
- id: MAP-7EC922FE58
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:577-593: fetchOptionMultiplierMap calls optionQuote, stores contractMultiplier and on error leaves map empty so multiplier defaults to 1.
- currentBehavior: No positivity/instrument/source checks make missing multiplier indistinguishable from one.
- problem: Exposure/PnL can be undercounted by 100x while appearing successful.
- preservedBehavior:
  - Preserve valid 100.
  - Remove one fallback for options.
- openQuestions: —

### MAP-8387D189AE

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:337-344](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts#L337-L344)
- symbol: cancelOrder
- id: MAP-8387D189AE
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:337-344: cancelOrder calls Longbridge cancelOrder with string id, returns synthetic Canceled on ack, and stringifies all exceptions.
- currentBehavior: Ack is treated terminal; no before-image/version/identity/unknown/reconciliation.
- problem: Cancellation can race fill/pending state and catch-all text hides not-found versus transport unknown.
- preservedBehavior:
  - Preserve native id and known rejection.
  - Replace synthetic Cancelled with observation result.
- openQuestions: —

### MAP-878575E9EE

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:600-627](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts#L600-L627)
- symbol: placeOrder TIF and quantity validation specs
- id: MAP-878575E9EE
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:600-627: Specs reject IOC and zero quantity via failed string result; unknown TIF is untested.
- currentBehavior: placeOrder rejects null TIF and UNSET/nonpositive quantity after mapping, without lot/precision/unit or durable PrepareRejected semantics.
- problem: Quantity validity is only sign/zero and IOC has no contextual capability reason; unknown TIF can still default elsewhere.
- preservedBehavior:
  - Keep IOC/FOK unsupported and zero quantity refused.
  - Add lot/unit validation and remove generic strings/defaults.
- openQuestions: —

### MAP-878E4140F3

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/longbridge-types.ts:117-125](../../../../services/uta/src/domain/trading/brokers/longbridge/longbridge-types.ts#L117-L125)
- symbol: LongbridgeMarketSessionLike
- id: MAP-878E4140F3
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/longbridge-types.ts:117-125: Market session shape has numeric market, begin/end hour-minute-second and numeric tradeSession, with no timezone/date/holiday/next-boundary fields.
- currentBehavior: Shape cannot evaluate venue-local sessions correctly and is consumed by machine-local account-wide boolean; unknown market/session is unrefined.
- problem: A native session may be mapped to wrong venue/timezone and authorize closed trading; missing calendar evidence cannot be represented.
- preservedBehavior:
  - Preserve valid begin/end/session values.
  - Add timezone/calendar/venue and reject unknown.
- openQuestions: —

### MAP-8B830F55F5

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:315-335](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts#L315-L335)
- symbol: modifyOrder
- id: MAP-8B830F55F5
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:315-335: modifyOrder requires totalQuantity, builds ReplaceOrderOptions with cast Decimal values, calls replaceOrder and returns Replaced on resolve.
- currentBehavior: Partial&lt;Order&gt; does not state unchanged fields, and no before-image/version/unknown/recovery/compensation exists.
- problem: Concurrent broker edits can be overwritten and transport error can hide accepted replacement.
- preservedBehavior:
  - Keep quantity-only valid replacement.
  - Make unchanged explicit and stop immediate Replaced.
- openQuestions: —

### MAP-8E4DBDDD86

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:674-681](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts#L674-L681)
- symbol: getCapabilities
- id: MAP-8E4DBDDD86
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:674-681: getCapabilities returns STK and five standard order strings for all account/market/instrument/session/paper states.
- currentBehavior: No account permissions, derivative, session, reach, idempotency or compensation facts influence capabilities.
- problem: Static list advertises actions that may be forbidden or unsafe and cannot distinguish auth from venue unavailability.
- preservedBehavior:
  - Preserve valid basic support when evidenced.
  - Remove global static claim and no unsupported derivative broadening.
- openQuestions: —

### MAP-9218DFF430

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:71-101](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts#L71-L101)
- symbol: ibkrOrderTypeToLb
- id: MAP-9218DFF430
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:71-101: Mapper switches raw IBKR orderType and suffix: HK MKT-&gt;ELO, other MKT-&gt;MO, LMT-&gt;LO, stops MIT/LIT, trailing percent TSMPCT/TSLPPCT.
- currentBehavior: It returns raw enum/null without instrument kind, AccountScope, permissions, trailing units, notional sizing, session or protection.
- problem: Null lacks reason; amount trailing/TrailLimit semantics, notional conversion, TPSL and relations cannot be preserved.
- preservedBehavior:
  - Preserve valid HK ELO/US MO and known mappings.
  - Do not claim amount/notional/TPSL support without evidence.
- openQuestions: —

### MAP-93839B42CF

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/longbridge-contracts.ts:146-151](../../../../services/uta/src/domain/trading/brokers/longbridge/longbridge-contracts.ts#L146-L151)
- symbol: echoContractDescription
- id: MAP-93839B42CF
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/longbridge-contracts.ts:146-151: echoContractDescription creates ContractDescription from makeContract(lbSymbol) without querying or proving symbol existence.
- currentBehavior: A search guess becomes tradeable-looking ContractDescription and inherits US/STK fallback.
- problem: No-match/unavailable/ambiguous catalog states are hidden; downstream can submit guessed contract.
- preservedBehavior:
  - Preserve description shape for verified symbols.
  - Delete echo fallback.
- openQuestions: —

### MAP-965560EC86

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:803-810](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts#L803-L810)
- symbol: capabilities spec
- id: MAP-965560EC86
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:803-810: Capabilities spec asserts static STK, MKT and LMT strings.
- currentBehavior: getCapabilities advertises STK and five order types for every scope, market, instrument, session and reach.
- problem: String list cannot express authorization/capability/session/reach/idempotency/compensation or precise unavailable reason.
- preservedBehavior:
  - Preserve valid basic stock order support.
  - Remove universal static claim and do not advertise derivatives/protection without evidence.
- openQuestions: —

### MAP-9763981047

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:511-541](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts#L511-L541)
- symbol: buildPosition
- id: MAP-9763981047
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:511-541: buildPosition always makes STK Contract, uses quote or cost, multiplier default 1, computes values/PnL from abs qty and sets realizedPnL=0.
- currentBehavior: Broker adapter performs accounting projection and lacks mark source, derivative identity, fill provenance or valuation quality.
- problem: STK/cost/zero-realized fallbacks fabricate certainty and can overwrite accounting truth.
- preservedBehavior:
  - Preserve valid sign/Decimal math.
  - Remove STK-for-all, cost mark and zero-realized authority.
- openQuestions: —

### MAP-A1AEAB7EEB

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:380-391](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts#L380-L391)
- symbol: negative quantity short-position spec
- id: MAP-A1AEAB7EEB
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:380-391: Negative quantity spec expects native -100 to become short side with absolute quantity 100.
- currentBehavior: buildPosition derives side from sign and passes abs quantity, losing signed native evidence.
- problem: Early normalization hides negative/zero invariants and weakens exposure reconciliation.
- preservedBehavior:
  - Preserve negative-&gt;short and positive-&gt;long.
  - Retain zero as Flat evidence rather than missing.
- openQuestions: —

### MAP-A6705CD1ED

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:103-121](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts#L103-L121)
- symbol: ibkrTifToLb
- id: MAP-A6705CD1ED
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:103-121: TIF mapper recognizes DAY/empty/GTC/GTD, returns null for IOC/FOK/OPG, and defaults unknown strings to Day.
- currentBehavior: Unknown TIF changes semantics to Day; GTD maps only to a native GoodTilDate tag with no expiry/time-zone payload, and IOC/FOK/OPG return null.
- problem: Typos/new native tags can shorten order lifetime; GTD/date and explicit unsupported variants lose evidence.
- preservedBehavior:
  - Preserve Day/GTC and retain a GoodTilDate tag only when an explicit expiry-bearing plan is available; keep IOC/FOK/OPG refusal.
  - Remove unknown-&gt;Day and reject expiry-less GTD at the executable boundary.
- openQuestions: —

### MAP-ABF45B8D66

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:235-275](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts#L235-L275)
- symbol: init specs
- id: MAP-ABF45B8D66
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:235-275: init specs reject empty credentials, resolve after empty accountBalance, and expect AUTH after repeated 401 Unauthorized while replacing setTimeout.
- currentBehavior: init creates contexts, probes accountBalance, retries five times with exponential sleeps, regex-classifies auth after two attempts, logs success, and rethrows raw lastErr otherwise.
- problem: A one-shot balance probe is treated as full readiness; raw/regex errors omit health stream, scope, reconnect generation, finalization and startup recovery barrier.
- preservedBehavior:
  - Keep bounded retries/auth distinction.
  - Do not equate successful probe with full write readiness or recovery completion.
- openQuestions:
  - SDK error code/status mapping and whether the init probe covers the quote endpoint require adapter conformance capture; until observed, unknown codes are UnclassifiedNativeFailure and unprobed quote reach is Unavailable, so RuntimeHealth stays non-Ready and writes are blocked.

### MAP-AE0972BE69

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:364-380](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts#L364-L380)
- symbol: getAccount
- id: MAP-AE0972BE69
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:364-380: getAccount casts accountBalance, returns foldBalancesToBase without await inside try, and wraps only get/cast failures with BrokerError.from.
- currentBehavior: Async FX/folding errors can bypass catch; account output is legacy and lacks scope/provenance/valuation ADT.
- problem: Error handling is incomplete and observation/valuation/presentation cannot be persisted/rebuilt independently.
- preservedBehavior:
  - Preserve redacted BrokerError-like compatibility failure.
  - Fix missing await and split raw/valuation.
- openQuestions: —

### MAP-AED659F1F2

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:507-522](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts#L507-L522)
- symbol: staticInfo failure position spec
- id: MAP-AED659F1F2
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:507-522: StaticInfo failure spec expects quote 7 retained, multiplier one, and option-like position valued at 7 without throw.
- currentBehavior: Empty staticInfo map means the unresolved option is treated as equity and multiplier one.
- problem: Silent derivative-to-equity coercion creates false value/capability while erasing the failed metadata evidence.
- preservedBehavior:
  - Keep live quote visibility.
  - Remove one multiplier/equity coercion.
- openQuestions: —

### MAP-B35B59A740

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:828-843](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts#L828-L843)
- symbol: dec and mockBalance helpers
- id: MAP-B35B59A740
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:828-843: dec returns a toString-only value and mockBalance defaults omitted balance fields to zero; no tests cover several recovery/query paths in this file.
- currentBehavior: Fixtures satisfy structural interfaces without runtime Decimal/currency/time/scope validation; missing is indistinguishable from real zero and accepted-before-ack/close/order enumeration remain unmodeled.
- problem: These helpers create false confidence in malformed native values and leave unknown recovery, closePosition, order-list completeness and attached protection unproved.
- preservedBehavior:
  - Keep concise Decimal helper for isolated arithmetic.
  - Replace default-zero fixtures for schema/integration and add missing-vs-zero cases.
- openQuestions:
  - Concrete SDK response envelope/version and an independent remote-ledger driver require conformance evidence; until both are supplied, malformed or missing fields remain ProtocolViolation and crash outcomes remain Unknown/ObserveRequired, with no capability increase.

### MAP-B3AFB5C72C

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:736-755](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts#L736-L755)
- symbol: getQuote depth-failure spec
- id: MAP-B3AFB5C72C
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:736-755: Depth-failure spec keeps last=150 but maps rejected depth to bid/ask numeric zero.
- currentBehavior: Depth Promise rejection becomes empty arrays and absent best prices become `0`.
- problem: Zero is a valid price and falsely represents unavailable depth/no liquidity; spread/liquidity checks can act on invented values.
- preservedBehavior:
  - Preserve last quote on depth failure.
  - Remove bid/ask zero fallback.
- openQuestions: —

### MAP-B6320BAFF1

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:381-409](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts#L381-L409)
- symbol: foldBalancesToBase without FX
- id: MAP-B6320BAFF1
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:381-409: No-FX branch returns zeros for empty, otherwise HKD bucket or largest netAssets bucket and discards other currencies.
- currentBehavior: A single bucket is reported as complete account total and base currency can become USD/CNY by magnitude.
- problem: Non-base exposure is hidden and unknown valuation becomes a plausible aggregate.
- preservedBehavior:
  - Keep native Decimal buckets.
  - Remove HKD/largest bucket authority fallback.
- openQuestions: —

### MAP-B6BFE850B2

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:613-620](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts#L613-L620)
- symbol: getOrders
- id: MAP-B6BFE850B2
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:613-620: getOrders iterates requested ids sequentially, calls getOrder and drops null results.
- currentBehavior: Returned list contains only mapped orders; not-found, transport, malformed and unknown outcomes disappear and no listing completeness is reported.
- problem: A missing result after uncertain dispatch can be misread as absent, and sequential reads lack scope/as-of/observation identity.
- preservedBehavior:
  - Preserve requested-id querying/successful projections.
  - Stop dropping null without reason and return typed completeness.
- openQuestions: —

### MAP-B7CFC53F8F

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:153-172](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts#L153-L172)
- symbol: LongbridgeBroker identity, state, and FX setter
- id: MAP-B7CFC53F8F
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:153-172: Class stores string engine/id/label/config, definite-assignment trade/quote handles, optional mutable FxService and setter.
- currentBehavior: Readiness is uninitialized fields; identity/scope/generation absent and FX can change after planning.
- problem: Calls can run pre-init or with a different FX source than prepared, and connection object has no lifecycle state.
- preservedBehavior:
  - Preserve id/label compatibility.
  - Remove uninitialized handles/setter authority.
- openQuestions: —

### MAP-BEFFDF63C5

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:572-598](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts#L572-L598)
- symbol: placeOrder validation specs
- id: MAP-BEFFDF63C5
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:572-598: Specs return string errors for unresolvable contract and unknown order type without submitOrder.
- currentBehavior: Validation/refusal occurs before SDK call but differentiates neither invalid identity nor unavailable capability and writes no durable rejection fact.
- problem: String failure loses fields/reason and tests do not prove zero EffectJob/dispatch identity or idempotent receipt.
- preservedBehavior:
  - Preserve refusal-before-submit.
  - Replace message matching with stable tags/evidence.
- openQuestions: —

### MAP-C2165A9F8E

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:622-629](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts#L622-L629)
- symbol: getOrder
- id: MAP-C2165A9F8E
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:622-629: getOrder casts orderDetail, maps it, and catches every error—including network, permission, malformed and not-found—to null.
- currentBehavior: All errors become null, with no symbolHint/dispatch identity/generation and no native id validation.
- problem: Null after submit timeout enables blind re-submit or false absence; malformed order can poison projection silently.
- preservedBehavior:
  - Preserve valid order mapping.
  - Remove catch-all null.
- openQuestions: —

### MAP-C517435305

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/longbridge-contracts.ts:45-57](../../../../services/uta/src/domain/trading/brokers/longbridge/longbridge-contracts.ts#L45-L57)
- symbol: parseLbSymbol
- id: MAP-C517435305
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/longbridge-contracts.ts:45-57: parseLbSymbol splits at last period, uppercases suffix, preserves ticker casing and treats any bare ticker as US.
- currentBehavior: Arbitrary suffix/bare input is accepted without format/venue validation.
- problem: Same ticker can exist on multiple Longbridge markets; bare fallback and arbitrary suffix undermine identity.
- preservedBehavior:
  - Preserve valid suffixed ticker round-trips.
  - Remove bare-&gt;US and arbitrary suffix acceptance.
- openQuestions: —

### MAP-C6EFEC85F5

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:631-657](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts#L631-L657)
- symbol: getQuote
- id: MAP-C6EFEC85F5
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:631-657: getQuote resolves symbol, runs quote/depth parallel, takes first values, stringifies, turns depth error into empty/zero bid-ask and wraps outer error.
- currentBehavior: Unchecked native quote/depth and zero-depth fallback prevent distinguishing no liquidity from unavailable feed.
- problem: Mismatched response/quality can authorize actions based on invented prices.
- preservedBehavior:
  - Preserve successful quote/depth values.
  - Remove zero fallback/unchecked casts.
- openQuestions: —

### MAP-C75A8AB5E2

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/longbridge-contracts.ts:138-144](../../../../services/uta/src/domain/trading/brokers/longbridge/longbridge-contracts.ts#L138-L144)
- symbol: makeOrderState
- id: MAP-C75A8AB5E2
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/longbridge-contracts.ts:138-144: makeOrderState maps coarse status and copies msg as rejectReason only when numeric status is 14 Rejected.
- currentBehavior: Free-form message/coarse state cannot distinguish known rejection, protocol defect, transport uncertainty; other statuses lose msg evidence.
- problem: A single compatibility field cannot support typed failure/recovery or safe redaction.
- preservedBehavior:
  - Preserve rejected msg as redacted evidence when status is actually Rejected.
  - Do not collapse other errors into rejectReason.
- openQuestions: —

### MAP-C9E3109EB0

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/longbridge-contracts.ts:94-107](../../../../services/uta/src/domain/trading/brokers/longbridge/longbridge-contracts.ts#L94-L107)
- symbol: marketToSuffix
- id: MAP-C9E3109EB0
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/longbridge-contracts.ts:94-107: marketToSuffix maps SDK US/HK/CN/SG numbers, collapses CN to SH, defaults unknown including Crypto to US, and is unused in this directory.
- currentBehavior: An unused helper still encodes unsafe unknown/board fallback and could be reused by future position mapping.
- problem: CN board identity is lost and future SDK values could silently route to US; unused code has no current caller to expose regressions.
- preservedBehavior:
  - Preserve known US/HK/SG mappings.
  - Preserve CN only with explicit board evidence; remove SH collapse/US default.
  - Delete unused fallback after callers migrate.
- openQuestions: —

### MAP-CAE41001D0

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:534-570](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts#L534-L570)
- symbol: placeOrder translation specs
- id: MAP-CAE41001D0
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:534-570: placeOrder specs call directly and assert HK MKT-&gt;ELO, US MKT-&gt;MO, orderId and symbol/side/type fields.
- currentBehavior: placeOrder compiles legacy fields/casts Decimal, calls submitOrder immediately and returns New on any response.
- problem: No write-ahead/identity/before-image/criterion/compensation exists; `_tpsl` is unused and a post-send failure can be unknown.
- preservedBehavior:
  - Preserve market enums/side/symbol/Decimal when valid.
  - Change direct success to durable acknowledge+observe and explicit TPSL behavior.
- openQuestions: —

### MAP-CB076F4422

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:393-427](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts#L393-L427)
- symbol: live quote and quote-failure position specs
- id: MAP-CB076F4422
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:393-427: Position specs use quote.lastDone as mark and Decimal math; quote failure falls back to costPrice with zero PnL.
- currentBehavior: fetchQuoteMap catches every error and buildPosition labels cost basis as marketPrice when live map is empty.
- problem: Unavailable/rate-limited data becomes plausible current valuation, risking false PnL and precondition approval.
- preservedBehavior:
  - Keep live 350 -&gt; 70000/10000 arithmetic.
  - Remove cost-as-live/zero-PnL fallback.
- openQuestions: —

### MAP-CB5B6AC097

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/longbridge-contracts.ts:27-43](../../../../services/uta/src/domain/trading/brokers/longbridge/longbridge-contracts.ts#L27-L43)
- symbol: makeContract
- id: MAP-CB5B6AC097
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/longbridge-contracts.ts:27-43: makeContract parses symbol, looks up suffix with unknown/bare-&gt;US, always sets secType STK and preserves input as localSymbol.
- currentBehavior: Any bare/unknown/derivative symbol can become a trade-ready STK Contract.
- problem: Wrong-market/derivative identity can pass downstream validation; localSymbol preserves an invalid key as if proven.
- preservedBehavior:
  - Preserve validated localSymbol round-trip and exchange/currency.
  - Remove forced STK and US fallback.
- openQuestions: —

### MAP-CCB1983C80

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:667-685](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts#L667-L685)
- symbol: cancelOrder specs
- id: MAP-CCB1983C80
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:667-685: cancel specs treat resolved cancelOrder as success/Cancelled and rejection as string error containing order not found.
- currentBehavior: cancelOrder sends a string id and synthesizes terminal Cancelled without before-image/version/observation.
- problem: Ack can race fill or leave pending cancel; catch-all text cannot distinguish conclusive absence from unknown transport.
- preservedBehavior:
  - Preserve native order id and known rejection.
  - Replace immediate Cancelled with observation-driven result.
- openQuestions: —

### MAP-CF32BE43EE

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/longbridge-contracts.ts:59-92](../../../../services/uta/src/domain/trading/brokers/longbridge/longbridge-contracts.ts#L59-L92)
- symbol: resolveSymbol and inferSuffixFromCurrency
- id: MAP-CF32BE43EE
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/longbridge-contracts.ts:59-92: resolveSymbol prefers localSymbol, then aliceId text after `|`, then symbol plus currency-derived suffix; CNY/CNH collapse to SH and unknown currency defaults US.
- currentBehavior: Free-form aliceId/currency inference reconstructs native symbol and loses SH/SZ; unknown currency becomes US.
- problem: A compatibility field can silently override mismatched metadata and route an order to wrong venue.
- preservedBehavior:
  - Preserve lossless validated local/alice native key.
  - Remove CNY-&gt;SH and unknown-&gt;US authority fallbacks.
- openQuestions: —

### MAP-D77E448B20

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/longbridge-contracts.ts:109-136](../../../../services/uta/src/domain/trading/brokers/longbridge/longbridge-contracts.ts#L109-L136)
- symbol: mapLbOrderStatus
- id: MAP-D77E448B20
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/longbridge-contracts.ts:109-136: mapLbOrderStatus maps known numeric statuses to Filled/Inactive/Cancelled/Submitted and defaults unknown to Submitted.
- currentBehavior: Partial/pending states are coarse and unknown protocol values look Submitted.
- problem: Rejected/expired/partial/unknown semantics cannot drive RemoteOutcome or recovery safely.
- preservedBehavior:
  - Keep known status meanings.
  - Remove default Submitted.
- openQuestions: —

### MAP-D79C2F71F2

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:629-646](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts#L629-L646)
- symbol: placeOrder limit-parameter spec
- id: MAP-D79C2F71F2
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:629-646: Limit spec checks LO, Sell and submittedPrice Decimal 305.5 for 700.HK.
- currentBehavior: placeOrder maps LMT/SELL and passes lmtPrice through an unchecked SDK cast when set.
- problem: Price is not currency/tick validated or canonically encoded; mock call inspection cannot prove plan digest or redaction.
- preservedBehavior:
  - Preserve HK LO/Sell and exact Decimal text when legal.
  - Remove unchecked casts and accidental numeric conversion.
- openQuestions: —

### MAP-DE6DDE18C3

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/longbridge-types.ts:76-90](../../../../services/uta/src/domain/trading/brokers/longbridge/longbridge-types.ts#L76-L90)
- symbol: LongbridgeOrderLike
- id: MAP-DE6DDE18C3
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/longbridge-types.ts:76-90: Order shape has string orderId, numeric status/side/orderType/TIF, quantity/executedQuantity, optional prices, currency and free-form msg.
- currentBehavior: Numeric enums and relationships are unrefined; the getter-only shape has no broker version/outcome/scope, optional prices do not encode required-by-order-type fields, and executedQuantity is not validated against quantity.
- problem: Malformed/unknown order data can enter projections and remote unknown can be mistaken for absent/terminal.
- preservedBehavior:
  - Preserve native order id, prices, fills and message evidence after redaction.
  - Add exhaustive ADTs/scope/version and reject malformed relationships.
- openQuestions: —

### MAP-E02EBB0CE2

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:18-69](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts#L18-L69)
- symbol: Longbridge SDK boundary imports and derivative tags
- id: MAP-E02EBB0CE2
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:18-69: The adapter imports IBKR Contract/Order/IBroker/PlaceOrderResult, Longbridge TradeContext/QuoteContext, Zod/Decimal, and mirrors Option=0/Warrant=1.
- currentBehavior: One class is mutable IBKR facade, SDK caller and response mapper; unchecked native values enter legacy objects before action/ack/observation relationships exist.
- problem: Kernel-facing callers inherit SDK/IBKR assumptions and numeric tags can leak across the boundary; failures and compensation are implicit.
- preservedBehavior:
  - Keep vendor imports isolated and Decimal use.
  - Remove IBKR object ownership from execution authority.
- openQuestions: —

### MAP-E0B62F1C14

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/longbridge-contracts.ts:9-25](../../../../services/uta/src/domain/trading/brokers/longbridge/longbridge-contracts.ts#L9-L25)
- symbol: SuffixInfo and SUFFIX_TABLE
- id: MAP-E0B62F1C14
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/longbridge-contracts.ts:9-25: SuffixInfo records only exchange/currency for HK/US/SH/SZ/SG in SUFFIX_TABLE.
- currentBehavior: Suffix metadata is a loose string Record with no jurisdiction, instrument kind, timezone, account entitlement or SDK version.
- problem: Callers must guess unknown suffixes and cannot use table values as validated identity/capability evidence.
- preservedBehavior:
  - Preserve HK/US/SH/SZ/SG exchange/currency facts.
  - Add explicit jurisdiction/venue/kind and reject unknown.
- openQuestions: —

### MAP-E1A5D342A5

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:170-201](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts#L170-L201)
- symbol: ibkrOrderTypeToLb specs
- id: MAP-E1A5D342A5
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:170-201: Specs assert HK MKT-&gt;ELO, US MKT-&gt;MO, LMT-&gt;LO, STP-&gt;MIT, STP LMT-&gt;LIT, TRAIL-&gt;TSMPCT and null for FOO.
- currentBehavior: ibkrOrderTypeToLb accepts arbitrary strings/suffix and returns raw enum/null without account, jurisdiction, trailing unit, idempotency or protection context.
- problem: Null loses why the type is unavailable; amount trailing and TP/SL/parent/OCA semantics are absent, and enum existence is mistaken for capability.
- preservedBehavior:
  - Preserve valid HK ELO/US MO, stop/limit and percentage trailing mappings.
  - Refuse unproven amount trailing, notional, or protection instead of broadening support.
- openQuestions: —

### MAP-E45F535798

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:437-447](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts#L437-L447)
- symbol: fxRate
- id: MAP-E45F535798
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:437-447: fxRate returns identity 1 or divides one-unit USD conversions from FxService, reading only usd.
  - services/uta/src/domain/trading/fx-service.ts:140-204: FxService returns live/cached/default rates and finally a 1:1 default for unknown currencies, with only an optional warning string; Longbridge discards that provenance.
- currentBehavior: fxRate returns identity 1 for equal currencies or divides one-unit USD conversions, while Longbridge discards FxService source/updatedAt/stale/fxWarning; FxService itself can supply dated defaults and a 1:1 unknown-currency fallback.
- problem: Missing/default 1:1 rates corrupt folded totals without evidence.
- preservedBehavior:
  - Keep equal-currency identity.
  - Remove source-less/default 1:1 executable conversion.
- openQuestions: —

### MAP-EF0A0DA76D

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:524-529](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts#L524-L529)
- symbol: stockPositions failure spec
- id: MAP-EF0A0DA76D
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:524-529: stockPositions rejection spec expects BrokerError text containing 500 Internal Server Error.
- currentBehavior: Only the primary call is caught and mapped; tests match message text without classifying transport/schema/scope or stale projection.
- problem: String evidence cannot drive safe recovery or redaction, and failed read could be mistaken for empty if callers over-handle it.
- preservedBehavior:
  - Preserve non-success on primary failure and redacted cause.
  - Replace string assertions with typed quality.
- openQuestions: —

### MAP-F105D05B4C

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:47-82](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts#L47-L82)
- symbol: attachMockContexts and makeBroker
- id: MAP-F105D05B4C
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:47-82: attachMockContexts writes tradeCtx/quoteCtx by unknown casts; makeBroker supplies literal k/s/t credentials and only paper/id overrides.
- currentBehavior: Tests bypass init and drive private methods with structurally incomplete contexts; no scope acquisition, readiness, finalizer, or credential redaction is exercised.
- problem: Private injection can hide config/lifecycle failures and treats handles/secrets as ordinary records, so passing tests cannot prove the target Layer contract.
- preservedBehavior:
  - Keep private injection only for deterministic mapper isolation.
  - Keep synthetic credentials out of durable plans.
- openQuestions: —

### MAP-F13669001D

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/longbridge-types.ts:103-115](../../../../services/uta/src/domain/trading/brokers/longbridge/longbridge-types.ts#L103-L115)
- symbol: LongbridgeOptionQuoteLike and LongbridgeWarrantQuoteLike
- id: MAP-F13669001D
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/longbridge-types.ts:103-115: OptionQuote has symbol/contractMultiplier and WarrantQuote has symbol/conversionRatio, both toString-capable and no timestamps/source/type relation.
- currentBehavior: Interfaces allow nonpositive/nonfinite values and do not tie multiplier to expected instrument observation.
- problem: Missing/invalid ratio can be defaulted to one, corrupting value and PnL.
- preservedBehavior:
  - Preserve valid economic meanings and Decimal values.
  - Make positivity/type/source relationship explicit.
- openQuestions: —

### MAP-F2F4CA1A39

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:84-168](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts#L84-L168)
- symbol: symbol parsing and contract resolution specs
- id: MAP-F2F4CA1A39
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.spec.ts:84-168: Specs accept HK/US/SH/SZ/SG, treat bare TSLA as US, build STK Contracts, round-trip localSymbol/aliceId, infer HKD-&gt;HK, and null an empty Contract.
- currentBehavior: parseLbSymbol splits on the final period; makeContract fills a loose table and always emits STK; resolveSymbol falls back localSymbol -&gt; aliceId -&gt; currency suffix.
- problem: Bare symbols and CNY are made tradeable via guessed US/SH identities; compatibility Contract fields are used as authority without listing/derivative evidence.
- preservedBehavior:
  - Preserve validated suffixed round trips.
  - Remove bare-US and CNY-&gt;SH authority fallbacks.
- openQuestions: —

### MAP-F3BCDE7625

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:659-672](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts#L659-L672)
- symbol: getMarketClock
- id: MAP-F3BCDE7625
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:659-672: getMarketClock fetches all sessions, compares local Date against all and returns one isOpen/timestamp without next boundaries.
- currentBehavior: No venue/instrument/session selector or timezone/calendar/freshness context exists.
- problem: Any open market authorizes all actions and local time may disagree with Longbridge; false cannot mean unavailable.
- preservedBehavior:
  - Preserve keyed valid open/closed.
  - Remove account-wide boolean authority.
- openQuestions: —

### MAP-F3E1B444EC

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:595-611](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts#L595-L611)
- symbol: fetchWarrantMultiplierMap
- id: MAP-F3E1B444EC
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:595-611: fetchWarrantMultiplierMap calls warrantQuote, stores conversionRatio and on error leaves map empty so multiplier defaults to 1.
- currentBehavior: Issuer-specific ratio is optional and one-to-one fallback is used on failure.
- problem: A warrant fraction/ratio can materially differ from one, so fallback misstates value/PnL.
- preservedBehavior:
  - Preserve .1 arithmetic.
  - Remove one fallback.
- openQuestions: —

### MAP-F91287463C

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:449-509](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts#L449-L509)
- symbol: getPositions
- id: MAP-F91287463C
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:449-509: getPositions reads channels, drops zero, dedups symbols, parallel fetches quote/staticInfo, classifies numeric derivatives, fetches multipliers and maps rows.
- currentBehavior: getPositions drops zero rows, deduplicates symbols, and treats missing static/quote/multiplier responses as defaults; an empty native response and an all-zero response both collapse to []/a missing row.
- problem: No typed join/partial failure model; same symbol across markets/channels can collide and projections cannot replay evidence.
- preservedBehavior:
  - Preserve multi-stage nonzero functionality.
  - Change silent defaults to typed per-row quality and preserve channels.
- openQuestions: —

### MAP-FBC40DB2EA

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:694-714](../../../../services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts#L694-L714)
- symbol: mapOpenOrder
- id: MAP-FBC40DB2EA
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:694-714: mapOpenOrder makes STK Contract/mutable Order, maps fields, sets orderId=0, copies executedPrice and ignores native id/executedQuantity/version.
- currentBehavior: mapOpenOrder makes a STK Contract/mutable Order, maps side by a Sell-only check, sets orderId=0, copies only total quantity/limit/avg fill, omits executedQuantity and version, and lets unknown type/TIF fallbacks fabricate an echo.
- problem: Order can appear new/zero-id and partial fill/compensation cannot be computed; derivatives reconstructed as STK.
- preservedBehavior:
  - Preserve valid side/quantity/price projection.
  - Keep native id/fills/kind/version and no fake zero authority.
- openQuestions: —

### MAP-FCDA99890A

- mapping source: [services/uta/src/domain/trading/brokers/longbridge/longbridge-types.ts:9-32](../../../../services/uta/src/domain/trading/brokers/longbridge/longbridge-types.ts#L9-L32)
- symbol: LongbridgeBrokerConfig
- id: MAP-FCDA99890A
- sourceEvidence:
  - services/uta/src/domain/trading/brokers/longbridge/longbridge-types.ts:9-32: LongbridgeBrokerConfig exposes optional id/label, required app credentials, paper boolean and optional HTTP/quote/trade WS URLs; comments note manual token rotation and paper label semantics.
- currentBehavior: It is a compile-time interface consumed through generic records/casts; environment/account scope/endpoint consistency are not validated.
- problem: Paper/live and endpoint values can be mismatched, and secret fields could be carried into durable objects if config is reused as a plan.
- preservedBehavior:
  - Preserve required credentials and endpoint overrides.
  - Make environment evidence-backed and keep paper/live explicit; no loose boolean authorization.
- openQuestions:
  - Actual endpoint/account evidence rules require broker-pack conformance; until observed, EnvironmentUnknown blocks writes, explicit conflicts are EnvironmentMismatch, and plans persist only CredentialRef/fingerprint.
