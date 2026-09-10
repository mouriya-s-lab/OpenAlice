
# AliceClients — source investigation and migration evidence


## Entries

### MAP-0022C45125

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:228-232](../../../../src/services/uta-client/UTAAccountSDK.ts#L228-L232)
- symbol: log
- id: MAP-0022C45125
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:228-232: log GETs /wallet/log with optional limit/symbol and unwraps CommitLogEntry[].
- currentBehavior: Wallet log is exposed as a read-only commit history projection.
- problem: The route can be retained for audit presentation, but Git entries must not become transaction state, approval authority, or recovery evidence; response lacks a typed projection envelope.
- preservedBehavior:
  - Retain human-readable Git audit view and filters.
  - Do not use Git history to drive execution/recovery.
- openQuestions: —

### MAP-02215F9630

- mapping source: [src/services/uta-client/index.ts:1-13](../../../../src/services/uta-client/index.ts#L1-L13)
- symbol: Alice adapter barrel contract
- id: MAP-02215F9630
- sourceEvidence:
  - src/services/uta-client/index.ts:1-13: barrel comments describe SDK classes as in-process replacements with preserved public methods, only await changes, and UTA-owned broker connections after wiring.
- currentBehavior: The barrel contract promises legacy shape preservation and treats asynchronous wrapping as the main migration.
- problem: Target migration changes authority and semantics: transaction staging/approval/execution/recovery move to UTA protocol; readOnly preview must be non-executable; native types and generic failures cannot remain public.
- preservedBehavior:
  - Retain asynchronous Alice proxy/query exports where callers still need them.
  - Remove promise-only claim that hides semantic cutover.
- openQuestions: —

### MAP-06118417F5

- mapping source: [packages/uta-protocol/src/client/UTAClient.ts:31-35](../../../../packages/uta-protocol/src/client/UTAClient.ts#L31-L35)
- symbol: RequestOpts
- id: MAP-06118417F5
- sourceEvidence:
  - packages/uta-protocol/src/client/UTAClient.ts:31-35: RequestOpts has body?: unknown, raw string/number/undefined params, and optional AbortSignal.
- currentBehavior: RequestOpts accepts arbitrary JSON and stringifies every query value; AbortSignal is the only structured control input.
- problem: Unknown body/query records allow invalid commands, unbounded parameters and accidental native objects; no typed distinction exists between query admission and command payload.
- preservedBehavior:
  - Preserve cancellation semantics and omission of optional fields, but intentionally stop accepting arbitrary query keys/bodies and do not use caller cancellation to bypass the deadline.
- openQuestions: —

### MAP-0650F50CD7

- mapping source: [src/services/uta-client/index.ts:15-16](../../../../src/services/uta-client/index.ts#L15-L16)
- symbol: SDK barrel exports
- id: MAP-0650F50CD7
- sourceEvidence:
  - src/services/uta-client/index.ts:15-16: barrel exports UTAManagerSDK and UTAAccountSDK and thereby all legacy compatibility methods plus manager ContractDescription re-export.
- currentBehavior: The public barrel exposes both broad SDK classes and an IBKR-native ContractDescription type.
- problem: Any consumer can reach no-op/stub/wallet methods and native broker types, defeating target protocol ownership and clean cutover.
- preservedBehavior:
  - Retain public read/audit projections and thin proxies as needed.
  - Remove obsolete methods/exports without aliases or deprecated shims.
- openQuestions: —

### MAP-0B349AB7E3

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:155-163](../../../../src/services/uta-client/UTAAccountSDK.ts#L155-L163)
- symbol: getQuote
- id: MAP-0B349AB7E3
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:155-163: getQuote POSTs either a full IBKR Contract or a partial object with optional aliceId to /quote and returns Quote.
- currentBehavior: Quote requests accept a permissive union of broker-native Contract and partial identity hint.
- problem: The input is neither a validated neutral InstrumentQuery nor explicit venue/session context; native values and partial objects can be malformed or resolve ambiguously.
- preservedBehavior:
  - Retain quote retrieval for supported contexts.
  - Remove IBKR Contract and permissive partial input from public API.
- openQuestions: —

### MAP-0CE77CE878

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:242-244](../../../../src/services/uta-client/UTAAccountSDK.ts#L242-L244)
- symbol: status
- id: MAP-0CE77CE878
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:242-244: status GETs /wallet/status and returns GitStatus directly.
- currentBehavior: Wallet Git status is returned as the account status projection.
- problem: Git cleanliness/status is not account connectivity, transaction state, or execution authority; the raw shape has no target revision/scope semantics.
- preservedBehavior:
  - Retain audit/workspace display if existing UI requires it.
  - Remove use as execution/recovery status.
- openQuestions: —

### MAP-0CE933CF7F

- mapping source: [src/services/uta-client/UTAManagerSDK.spec.ts:61-65](../../../../src/services/uta-client/UTAManagerSDK.spec.ts#L61-L65)
- symbol: resolve explicit prefix test
- id: MAP-0CE933CF7F
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.spec.ts:61-65: explicit source prefix resolves its matching trading account even when tradingOnly is enabled.
- currentBehavior: Prefix resolution preserves a matching trading account under the filter.
- problem: Prefix matching can be ambiguous and returns raw identity; it must not choose an implicit subaccount or infer action permissions.
- preservedBehavior:
  - Retain prefix compatibility behavior for unique source match.
  - Remove implicit subaccount/default scope.
- openQuestions: —

### MAP-0D8AA62971

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:141-146](../../../../src/services/uta-client/UTAAccountSDK.ts#L141-L146)
- symbol: getPositions
- id: MAP-0D8AA62971
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:141-146: getPositions GETs positions with optional subAccountId and unwraps positions array.
- currentBehavior: Positions are fetched through an optional subaccount query and unwrapped from a generic array envelope.
- problem: An absent subaccount can conflate aggregate and default account, and the array loses completeness, observation time, scope, instrument identity, and projection version.
- preservedBehavior:
  - Retain position reads and quantity/price meaning.
  - Do not expose unchecked OpenPosition-like rows or default scope.
- openQuestions: —

### MAP-1072AF5B51

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:48-53](../../../../src/services/uta-client/UTAAccountSDK.ts#L48-L53)
- symbol: NotImplementedInSDK
- id: MAP-1072AF5B51
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:48-53: NotImplementedInSDK extends Error and embeds method name, route, and a Step 6 follow-up message.
- currentBehavior: Missing operations are represented by a JavaScript Error whose message explains the absent route.
- problem: Expected unsupported capability, unavailable route, and intentionally removed legacy operation are indistinguishable from defects and must not be parsed from text.
- preservedBehavior:
  - Preserve an explicit typed expected failure or structural absence during migration, without retaining a public text-bearing compatibility exception.
  - Remove Step 6 prose from runtime error messages.
- openQuestions: —

### MAP-10BAE11640

- mapping source: [src/services/uta-client/UTAManagerSDK.spec.ts:42-47](../../../../src/services/uta-client/UTAManagerSDK.spec.ts#L42-L47)
- symbol: resolve default compatibility test
- id: MAP-10BAE11640
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.spec.ts:42-47: resolve() without options is asserted to include trading, account, and data-tier accounts.
- currentBehavior: Default resolve returns all fixture tiers for compatibility.
- problem: This observable selection is useful but does not define scope completeness, health, or execution capability; using it for transaction candidates is unsafe.
- preservedBehavior:
  - Retain all-tier default for current query compatibility.
  - Do not use it as an execution allow-list.
- openQuestions: —

### MAP-1103449DFC

- mapping source: [src/services/uta-client/UTAManagerSDK.ts:21-26](../../../../src/services/uta-client/UTAManagerSDK.ts#L21-L26)
- symbol: UTA manager protocol imports
- id: MAP-1103449DFC
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.ts:21-26: imports generic UTAClient, UTASummary, AggregatedEquity, and ContractSearchHit wire types.
- currentBehavior: Manager methods rely on compile-time shared wire shapes through generic client calls.
- problem: No runtime decoder, branded identity, scope/completeness, projection revision, or typed QueryFailure is guaranteed.
- preservedBehavior:
  - Retain query operations and compatibility fields where meaningful.
  - Remove unchecked generic payload assumptions.
- openQuestions: —

### MAP-139EBB287C

- mapping source: [packages/uta-protocol/src/client/UTAClient.ts:1-11](../../../../packages/uta-protocol/src/client/UTAClient.ts#L1-L11)
- symbol: UTA client transport contract documentation
- id: MAP-139EBB287C
- sourceEvidence:
  - packages/uta-protocol/src/client/UTAClient.ts:1-11: module says createUTAClient is a low-level helper, normalizes errors to JS Error, and defers endpoint validation/WireBrokerError round-trip.
  - Historical ten-route proposal at audit commit a5f23756531cc552b7e12b6d655ae1ffbcd28b64; the current route target is descriptor-bound under K01/K02/K06, not a fixed route list.
- currentBehavior: The package documents a generic HTTP helper and promises only Error-shaped failures; endpoint-specific codecs and typed downstream errors are explicitly future work.
- problem: The public transport contract allows an Alice caller to bypass the transaction/application route set and leaves malformed or expected failures indistinguishable from defects.
- preservedBehavior:
  - Keep the low-level transport purpose and separate higher-level adapters, but replace unchecked public errors and identity inference because those are the incompatibility.
  - Preserve the fixed service-credential/correlation metadata profile while keeping secret bytes out of capability inputs and diagnostics.
- openQuestions: —

### MAP-16E271C335

- mapping source: [src/services/uta-client/UTAManagerSDK.ts:198-212](../../../../src/services/uta-client/UTAManagerSDK.ts#L198-L212)
- symbol: searchContracts
- id: MAP-16E271C335
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.ts:198-212: searchContracts GETs pattern-only aggregate hits, returns [] unavailable, ignores assetClass, and returns flat results unchanged.
- currentBehavior: Manager search drops assetClass and maps unavailable to empty results without runtime validation.
- problem: Search lacks source/venue/AccountScope context, neutral identity/provenance, completeness, and typed failure; [] can conceal catalog outage.
- preservedBehavior:
  - Retain pattern search and supported filtering.
  - Stop ignoring assetClass and empty-unavailable fallback.
- openQuestions: —

### MAP-1981D2BF1C

- mapping source: [src/services/uta-client/UTAManagerSDK.ts:77-79](../../../../src/services/uta-client/UTAManagerSDK.ts#L77-L79)
- symbol: closeAll
- id: MAP-1981D2BF1C
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.ts:77-79: closeAll silently no-ops because UTA closes brokers on SIGTERM.
- currentBehavior: Manager shutdown method does nothing and cannot report lifecycle outcome.
- problem: It can falsely signal process shutdown while UTA supervisor still owns broker Scope and pending jobs.
- preservedBehavior:
  - Retain UTA broker shutdown ownership.
  - Remove no-op lifecycle facade.
- openQuestions: —

### MAP-2078F71FB4

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:299-304](../../../../src/services/uta-client/UTAAccountSDK.ts#L299-L304)
- symbol: stagePlaceOrder
- id: MAP-2078F71FB4
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:299-304: stagePlaceOrder POSTs StagePlaceOrderParams to wallet/stage-place-order and returns AddResult.
- currentBehavior: Place staging mutates legacy wallet state through a raw compatibility parameter bag and returns AddResult.
- problem: It lacks TransactionId/revision, AccountScope, ProposalSnapshot, before-image, preconditions, compensation, and complete order semantics; wallet staging is not durable transaction state.
- preservedBehavior:
  - Retain ability to stage valid order proposals and all meaningful order fields.
  - Delete wallet AddResult ceremony and silent field loss.
- openQuestions: —

### MAP-22C9C06082

- mapping source: [packages/uta-protocol/src/client/UTAClient.ts:48-61](../../../../packages/uta-protocol/src/client/UTAClient.ts#L48-L61)
- symbol: createUTAClient initialization and buildUrl
- id: MAP-22C9C06082
- sourceEvidence:
  - packages/uta-protocol/src/client/UTAClient.ts:48-61: createUTAClient strips one trailing slash and buildUrl accepts arbitrary paths and String-converted query entries.
  - Historical ten-route proposal at audit commit a5f23756531cc552b7e12b6d655ae1ffbcd28b64; the current route target is descriptor-bound under K01/K02/K06.
- currentBehavior: The helper correctly normalizes a base URL and supports injected/global fetch, but URL construction is open-ended and silently stringifies unvalidated values.
- problem: Arbitrary path concatenation can bypass the public route set; string conversion can encode invalid scope, date and decimal values while auth/correlation headers are absent.
- preservedBehavior:
  - Preserve slash normalization, absolute base URL behavior and fetch injection; intentionally close arbitrary paths and raw query records while using the fixed auth/correlation profile.
- openQuestions: —

### MAP-2817C64BCD

- mapping source: [src/services/uta-client/UTAManagerSDK.spec.ts:21-33](../../../../src/services/uta-client/UTAManagerSDK.spec.ts#L21-L33)
- symbol: fakeClient test transport
- id: MAP-2817C64BCD
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.spec.ts:21-33: fake client implements only list and stage-place-order/push paths, throws elsewhere, and is cast to never.
- currentBehavior: The fake transport covers a tiny subset and bypasses UTAClient type/runtime boundary through a never cast.
- problem: Unimplemented endpoints and generic throw prevent tests from exercising typed failure envelopes, scope, preparation preview, durable approval, or Unknown outcomes.
- preservedBehavior:
  - Retain narrow list/stage compatibility tests.
  - Do not use a cast to claim complete client contract.
- openQuestions: —

### MAP-28B2A25500

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:329-334](../../../../src/services/uta-client/UTAAccountSDK.ts#L329-L334)
- symbol: commit
- id: MAP-28B2A25500
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:329-334: commit POSTs a human message to wallet/commit and returns CommitPrepareResult.
- currentBehavior: Commit treats a human Git message plus wallet staging as stage-to-prepare transition.
- problem: A message is not transaction identity or a complete prepared plan; commit does not establish observed before-images, locks, capabilities, compensation, durable scheduler job, or approval binding.
- preservedBehavior:
  - Retain explicit preparation boundary and human audit message if needed.
  - Remove wallet commit as transaction authority.
- openQuestions: —

### MAP-2D273CE5F0

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:268-270](../../../../src/services/uta-client/UTAAccountSDK.ts#L268-L270)
- symbol: exportGitState
- id: MAP-2D273CE5F0
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:268-270: exportGitState always throws NotImplementedInSDK and exposes a synchronous GitExportState return shape.
- currentBehavior: Git export has no route and always throws despite a synchronous legacy return signature.
- problem: The target permits an audit export projection, but the method neither serializes current journal state nor distinguishes absent projection from failure; synchronous shape cannot represent effect/failure.
- preservedBehavior:
  - Retain the human-readable audit export as a versioned async projection for current order/trade-history consumers.
  - Remove synchronous always-throw shape.
- openQuestions: —

### MAP-2EB2A80626

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:343-349](../../../../src/services/uta-client/UTAAccountSDK.ts#L343-L349)
- symbol: simulatePriceChange
- id: MAP-2EB2A80626
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:343-349: simulatePriceChange applies readonly callback then POSTs PriceChangeInput[] to simulate-price and returns SimulatePriceChangeResult.
- currentBehavior: Production Alice proxy can directly mutate simulated prices after only a local callback check.
- problem: This bypasses broker interpreter, durable observation/event model, dispatch identity, recovery, and transaction authority; callback also incorrectly guards a test seam.
- preservedBehavior:
  - Retain deterministic simulation capability in tests.
  - Remove production account method and wallet route.
- openQuestions: —

### MAP-2F5EC699F7

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:351-355](../../../../src/services/uta-client/UTAAccountSDK.ts#L351-L355)
- symbol: refreshCatalog
- id: MAP-2F5EC699F7
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:351-355: refreshCatalog resolves immediately and says catalog refresh runs in UTA's six-hour loop.
- currentBehavior: refreshCatalog is a no-op lifecycle hook that discards caller intent while scheduled refresh is internal.
- problem: Silent success gives no job identity, freshness evidence, or failure; Alice can appear to have refreshed a catalog it did not touch.
- preservedBehavior:
  - Retain internal six-hour scheduling ownership.
  - Remove the silently resolving Alice hook.
- openQuestions: —

### MAP-33FE42CE06

- mapping source: [src/services/uta-client/UTAManagerSDK.ts:127-130](../../../../src/services/uta-client/UTAManagerSDK.ts#L127-L130)
- symbol: has
- id: MAP-33FE42CE06
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.ts:127-130: has lists all summaries and returns boolean for exact id membership.
- currentBehavior: has is a boolean membership convenience over account summaries.
- problem: False can mean absent, unavailable, stale, or malformed; it cannot establish broker readiness or capability.
- preservedBehavior:
  - Retain membership query for UI.
  - Remove false-on-unavailable behavior.
- openQuestions: —

### MAP-3516988AF1

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:148-153](../../../../src/services/uta-client/UTAAccountSDK.ts#L148-L153)
- symbol: getOrders
- id: MAP-3516988AF1
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:148-153: getOrders joins optional ids with commas, GETs /orders, and unwraps OpenOrder[] from a generic envelope.
- currentBehavior: Order reads use comma-delimited raw IDs and return generic OpenOrder rows, with no explicit scope/completeness/checkpoint.
- problem: Raw strings are not branded BrokerOrderId; no-ID fallback can call a no-op pending ID helper and incorrectly return no orders; projection/remote outcome state is lost.
- preservedBehavior:
  - Retain order filtering and all-orders reads.
  - Remove comma-string-only contract and silent empty pending-ID fallback.
- openQuestions: —

### MAP-39D0CF621F

- mapping source: [src/services/uta-client/UTAManagerSDK.spec.ts:1-7](../../../../src/services/uta-client/UTAManagerSDK.spec.ts#L1-L7)
- symbol: spec module contract
- id: MAP-39D0CF621F
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.spec.ts:1-7: module comments define resolve compatibility: no-source includes all tiers, tradingOnly excludes data-tier, explicit sources still resolve.
- currentBehavior: The spec records source-resolution policy as a compatibility behavior, not as proof of runtime protocol or account capability.
- problem: If this compatibility assertion becomes the only contract, source participation can be confused with execution authority and scope resolution remains ambiguous.
- preservedBehavior:
  - Preserve all-tier default and tradingOnly filtering where it remains public.
  - Do not infer execution permission from inclusion in the result.
- openQuestions: —

### MAP-3C82640A79

- mapping source: [src/services/uta-client/UTAManagerSDK.spec.ts:35-40](../../../../src/services/uta-client/UTAManagerSDK.spec.ts#L35-L40)
- symbol: UTAS tier fixture
- id: MAP-3C82640A79
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.spec.ts:35-40: tier fixture includes trading, account, and data summaries, including keyless readonly-style Binance and OKX sources.
- currentBehavior: Fixtures distinguish tier and include keyless/readOnly-style sources for resolution tests.
- problem: Tier alone is not capability: funded readOnly may draft while keyless/data accounts may only query, and connection reach can degrade independently.
- preservedBehavior:
  - Retain source-tier participants and keyless cases.
  - Remove assumptions that keyless is equivalent to all readOnly or that tier grants execution.
- openQuestions: —

### MAP-3DBEF5B1DA

- mapping source: [src/services/uta-client/UTAManagerSDK.ts:110-119](../../../../src/services/uta-client/UTAManagerSDK.ts#L110-L119)
- symbol: resolveOne
- id: MAP-3DBEF5B1DA
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.ts:110-119: resolveOne prefix-matches then throws plain Error for zero/ambiguous hits and returns sole proxy.
- currentBehavior: Resolution failures are generic Error strings; a sole prefix result returns proxy without explicit scope/discovery.
- problem: Expected not-found/ambiguity is not typed and a sole account match does not prove subaccount discovery or capability.
- preservedBehavior:
  - Retain convenience semantics for unique prefix.
  - Remove plain Error and implicit action readiness.
- openQuestions: —

### MAP-3EDA7CA17C

- mapping source: [src/services/uta-client/UTAManagerSDK.spec.ts:12-19](../../../../src/services/uta-client/UTAManagerSDK.spec.ts#L12-L19)
- symbol: summary test fixture
- id: MAP-3EDA7CA17C
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.spec.ts:12-19: summary fixtures use raw string ids, boolean asVendor, capability arrays, and an optimistic healthy connected BrokerHealthInfo.
- currentBehavior: Legacy fixtures encode identity and health as raw/optimistic fields.
- problem: They cannot represent explicit scope, degraded reach, DraftReview versus executable capability, or observed health evidence.
- preservedBehavior:
  - Retain fixture cases needed for source filtering.
  - Remove healthy=true as an implicit default.
- openQuestions: —

### MAP-4080E8FCB3

- mapping source: [src/services/uta-client/UTAManagerSDK.ts:236-243](../../../../src/services/uta-client/UTAManagerSDK.ts#L236-L243)
- symbol: accountFromSummary
- id: MAP-4080E8FCB3
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.ts:236-243: accountFromSummary copies summary id/label into UTAAccountSDK and forwards readonly callback.
- currentBehavior: Summary-to-proxy conversion preserves display identity but forwards a local callback and raw id.
- problem: Conversion does not carry explicit AccountScope/discovery, health/capability evidence, or branded identity; callback is not authority.
- preservedBehavior:
  - Retain label and thin proxy conversion.
  - Remove raw id/callback as authority.
- openQuestions: —

### MAP-42A878D622

- mapping source: [src/services/uta-client/UTAManagerSDK.ts:89-108](../../../../src/services/uta-client/UTAManagerSDK.ts#L89-L108)
- symbol: resolve
- id: MAP-42A878D622
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.ts:89-108: resolve lists summaries, exact-matches id or provider prefix, filters data tier only for no-source tradingOnly, and preserves explicit data source resolution.
- currentBehavior: Resolve implements source-resolution compatibility over listed summaries and a presentation-only tradingOnly filter.
- problem: Raw IDs/source prefixes do not establish branded AccountId, explicit AccountScope, completeness, ambiguity handling, or capability; no-source defaults can hide discovery state.
- preservedBehavior:
  - Retain exact/prefix and tradingOnly compatibility behavior.
  - Keep explicit data source queryable without making it executable.
- openQuestions: —

### MAP-42C229AF4E

- mapping source: [src/services/uta-client/UTAManagerSDK.ts:32-39](../../../../src/services/uta-client/UTAManagerSDK.ts#L32-L39)
- symbol: UTAManagerSDKDeps
- id: MAP-42C229AF4E
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.ts:32-39: deps accept generic client, static/dynamic unavailableReason, and dynamic readonlyMutationReason callback; src/tool/trading.ts:203-207,760-807 defines allowAiTrading as an explicit policy input.
- currentBehavior: Product-mode availability and write policy are represented as strings/functions at manager edge.
- problem: String callbacks cannot distinguish Lite from UTA unavailable, degraded query, DraftReview availability, or execution authorization; they are bypassable and cannot authorize server actions.
- preservedBehavior:
  - Retain product-mode selection at Alice edge.
  - Remove string-only failure and mutation authority.
- openQuestions: —

### MAP-4323EF421D

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:128-134](../../../../src/services/uta-client/UTAAccountSDK.ts#L128-L134)
- symbol: listSubAccounts
- id: MAP-4323EF421D
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:128-134: listSubAccounts GETs /api/trading/uta/:id/subaccounts and unwraps subAccounts from a generic envelope.
- currentBehavior: Subaccount listing trusts a generic JSON envelope and returns an unbranded array.
- problem: The result does not express AccountScope, completeness, projection revision, or discovery-not-ready; an unavailable/partial response could become an empty-looking list.
- preservedBehavior:
  - Retain subaccount read capability.
  - Never map unavailable to [] or choose an implicit subaccount.
- openQuestions: —

### MAP-434E6812E0

- mapping source: [src/services/uta-client/UTAManagerSDK.ts:1-19](../../../../src/services/uta-client/UTAManagerSDK.ts#L1-L19)
- symbol: UTAManagerSDK module contract
- id: MAP-434E6812E0
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.ts:1-19: module comments describe an HTTP adapter mirroring legacy UTAManager, Promise-wrapping sync methods, whole-process restart for mutations, and no-op Alice setup hooks.
- currentBehavior: The manager is documented as a compatibility façade over account lifecycle, Git, and restart behavior while UTA owns the real process.
- problem: The promise of a full old manager shape obscures which methods are query projections versus transaction/lifecycle commands and permits restart/file compatibility authority.
- preservedBehavior:
  - Retain Promise-based Alice boundary where callers require it.
  - Remove claims that manager mutators restart or configure UTA directly.
- openQuestions: —

### MAP-43F6B8ADAA

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:87-97](../../../../src/services/uta-client/UTAAccountSDK.ts#L87-L97)
- symbol: health and disabled readouts
- id: MAP-43F6B8ADAA
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:87-97: health getter returns 'healthy' and disabled getter returns false without a request or cached observation.
- currentBehavior: Health getters are hard-coded optimistic constants.
- problem: They report healthy/enabled even while UTA is unavailable, recovering, disabled, or policy-restricted, so UI and command callers can attempt invalid actions.
- preservedBehavior:
  - Preserve only a clearly labeled, lossy UI projection while callers migrate; it cannot claim readiness or authority.
  - Remove hard-coded defaults and the final public compatibility getter.
- openQuestions: —

### MAP-476FF8B5A1

- mapping source: [src/services/uta-client/UTAManagerSDK.ts:52-55](../../../../src/services/uta-client/UTAManagerSDK.ts#L52-L55)
- symbol: setSnapshotHooks
- id: MAP-476FF8B5A1
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.ts:52-55: setSnapshotHooks accepts unknown and silently no-ops because UTA owns snapshot scheduler.
- currentBehavior: The hook discards caller input and claims no-op ownership split.
- problem: Silent success hides unsupported customization and makes snapshot scheduling impossible to observe/configure from Alice; unknown parameter also defeats type boundary.
- preservedBehavior:
  - Retain UTA scheduler ownership.
  - Remove no-op compatibility method.
- openQuestions: —

### MAP-4BD1D6E885

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:254-260](../../../../src/services/uta-client/UTAAccountSDK.ts#L254-L260)
- symbol: tradeHistory
- id: MAP-4BD1D6E885
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:254-260: tradeHistory GETs /trade-history/:limit and returns trades/fills from a generic envelope.
- currentBehavior: Trade history retrieves fills through a generic bounded route without provenance, reconciliation identity, or accounting projection metadata.
- problem: Fills need durable dispatch/order identity and accounting semantics; a generic array cannot prove broker observation or handle duplicate/reordered observations.
- preservedBehavior:
  - Retain fill/trade history.
  - Do not infer execution outcome solely from history endpoint availability.
- openQuestions: —

### MAP-51667E4DF0

- mapping source: [src/services/uta-client/UTAManagerSDK.ts:63-69](../../../../src/services/uta-client/UTAManagerSDK.ts#L63-L69)
- symbol: initUTA
- id: MAP-51667E4DF0
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.ts:63-69: initUTA always throws NotImplementedInSDK and tells callers to write accounts.json then trigger Guardian restart.
- currentBehavior: Initialization is guaranteed to fail and delegates file mutation/restart outside manager.
- problem: accounts.json plus process restart is alternate authority, bypassing UTA journal/config lifecycle and cannot return typed acceptance, validation, or connection evidence.
- preservedBehavior:
  - Retain ability to add/configure account through a real owner.
  - Remove accounts.json/Guardian compatibility authority.
- openQuestions: —

### MAP-54B73EF7D3

- mapping source: [src/services/uta-client/UTAManagerSDK.ts:169-185](../../../../src/services/uta-client/UTAManagerSDK.ts#L169-L185)
- symbol: reconnectUTA
- id: MAP-54B73EF7D3
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.ts:169-185: reconnectUTA ignores requested id, triggers whole UTA Guardian restart, waits for readiness, and returns ReconnectResult success/error object.
  - packages/guardian-runtime/src/control-server.ts:42-165: existing Guardian control server validates protocol/request id and exposes runtime.status/runtime.stop over a secured Unix endpoint; C14 extends this finite protocol for restart.
- currentBehavior: Reconnect is a whole-process restart with account id ignored and ad hoc success/error object.
- problem: It uses a direct restart helper with no authenticated request/boot correlation, conflates process readiness with transaction recovery, and presents a success/error object without typed control evidence; the ignored id is misleading rather than evidence of account-granular support.
- preservedBehavior:
  - Retain intent to refresh/restart the UTA runtime and observe readiness through control status.
  - Remove account-id pretence, direct triggerUTARestart invocation, and the ad hoc success/error object.
- openQuestions: —

### MAP-5574C0BEE4

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:1-10](../../../../src/services/uta-client/UTAAccountSDK.ts#L1-L10)
- symbol: UTAAccountSDK module contract
- id: MAP-5574C0BEE4
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:1-10: UTAAccountSDK is a broad account-object proxy exporting health, account, market data, wallet, staging, lifecycle, and test-like helpers; it is not a UnifiedTradingAccount subclass.
- currentBehavior: The module presents one legacy account-shaped surface over many unrelated query, wallet, and mutation routes, and its methods are all thin generic HTTP calls.
- problem: The broad object makes transport compatibility look like account authority: callers can reach wallet staging, commit, simulation, and recovery-shaped methods without a durable transaction identity or explicit capability envelope.
- preservedBehavior:
  - Retain a lightweight account-facing API where a current caller needs it.
  - Intentionally remove wallet/Git and direct simulation authority after migration.
- openQuestions: —

### MAP-579425FCFE

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:385-388](../../../../src/services/uta-client/UTAAccountSDK.ts#L385-L388)
- symbol: assertVenueWritable
- id: MAP-579425FCFE
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:385-388: assertVenueWritable invokes optional callback and throws plain Error; only push and simulatePriceChange call it.
- currentBehavior: A dynamic callback guards only two legacy methods and returns string-based generic Error on denial; stage/commit are not guarded here.
- problem: Local callback is bypassable and conflates venue writability with action capabilities. It would wrongly block all drafts for readOnly while failing to protect direct execution paths.
- preservedBehavior:
  - Retain fast local UX rejection where helpful.
  - Do not use callback to suppress valid funded readOnly drafts or as sole execution guard.
- openQuestions: —

### MAP-59F02D72BB

- mapping source: [src/services/uta-client/UTAManagerSDK.ts:83-87](../../../../src/services/uta-client/UTAManagerSDK.ts#L83-L87)
- symbol: listUTAs
- id: MAP-59F02D72BB
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.ts:83-87: listUTAs returns [] when unavailableReason is set, otherwise GETs /api/trading/uta and unwraps utas generically.
- currentBehavior: Unavailable manager mode is represented as empty account list; available mode trusts generic envelope.
- problem: [] conflates no accounts, UTA unavailable, lite mode, and incomplete listing; no AccountScope/discovery/completeness or runtime validation exists.
- preservedBehavior:
  - Retain list query and intentional Lite semantics.
  - Remove empty fallback for unavailable UTA.
- openQuestions: —

### MAP-5C925EFE57

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:114-117](../../../../src/services/uta-client/UTAAccountSDK.ts#L114-L117)
- symbol: waitForConnect
- id: MAP-5C925EFE57
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:114-117: waitForConnect immediately resolves because the proxy owns no local connection state.
- currentBehavior: waitForConnect is a deliberate no-op compatibility method.
- problem: Immediate resolution can be interpreted as broker readiness, but connection readiness and transaction recovery/execution readiness are separate and UTA-owned.
- preservedBehavior:
  - Preserve absence of local broker ownership.
  - Do not use immediate resolve as evidence that execution can proceed.
- openQuestions: —

### MAP-5E17F0B590

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:274-280](../../../../src/services/uta-client/UTAAccountSDK.ts#L274-L280)
- symbol: push
- id: MAP-5E17F0B590
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:274-280: push invokes readonlyMutationReason and POSTs expectedPendingHash to wallet/push, returning PushResult; src/tool/trading.ts:203-207,760-807 defines allowAiTrading as the explicit policy input for pending approval versus the direct path.
- currentBehavior: Push is guarded locally and submits a pending Git hash as the mutation boundary.
- problem: Pending hash is not canonical transaction identity and callback is not durable authorization; push lacks actor/policy/revision/digest/expiry, write-ahead dispatch, leases, compensation, and Unknown outcome handling. Funded readOnly may have drafts but cannot receive a UTA PolicyApprovalBinding or execute here.
- preservedBehavior:
  - Retain user approval intent and stale-plan protection.
  - Remove wallet push and hash authority; preserve draft preparation for funded readOnly.
- openQuestions: —

### MAP-5E72A7392C

- mapping source: [src/services/uta-client/UTAManagerSDK.spec.ts:117-128](../../../../src/services/uta-client/UTAManagerSDK.spec.ts#L117-L128)
- symbol: readonly product-mode test
- id: MAP-5E72A7392C
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.spec.ts:117-128: readonly product-mode test expects stagePlaceOrder to succeed and push to reject via Alice callback with "Trading mode is readonly".
- currentBehavior: Legacy test proves stage and push are separated only by a local string callback.
- problem: The useful draft-vs-execution distinction is not represented as typed capability; callback is bypassable and cannot prove no executable durable effect.
- preservedBehavior:
  - Retain allowance for valid draft analysis where policy allows.
  - Remove string callback as proof and do not call preview PreparedPlan.
- openQuestions: —

### MAP-6D42D9249B

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:46-46](../../../../src/services/uta-client/UTAAccountSDK.ts#L46-L46)
- symbol: IBKR contract type imports
- id: MAP-6D42D9249B
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:46-46: imports Contract, ContractDescription, and ContractDetails from @traderalice/ibkr.
- currentBehavior: IBKR-native contract types are imported into the Alice-facing SDK and used by quote, search, expansion, historical, and details signatures.
- problem: Adapter-native objects cross the public transport boundary, coupling Alice to IBKR and making neutral InstrumentId/description semantics impossible to enforce.
- preservedBehavior:
  - Retain contract search/details functionality for supported venues.
  - Remove IBKR imports and Contract-returning public methods.
- openQuestions: —

### MAP-721FF3395E

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:359-364](../../../../src/services/uta-client/UTAAccountSDK.ts#L359-L364)
- symbol: contractFromAliceId
- id: MAP-721FF3395E
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:359-364: contractFromAliceId always throws NotImplementedInSDK because broker-specific lookup/route is absent.
- currentBehavior: The helper cannot construct a Contract and always throws a legacy error.
- problem: Its advertised IBKR return type is prohibited at the neutral boundary and re-deriving native contract ad hoc can choose wrong venue/instrument.
- preservedBehavior:
  - Retain instrument resolution semantics where callers need them.
  - Remove IBKR-returning helper and error class dependency.
- openQuestions: —

### MAP-78D1F29BC2

- mapping source: [src/services/uta-client/UTAManagerSDK.spec.ts:95-115](../../../../src/services/uta-client/UTAManagerSDK.spec.ts#L95-L115)
- symbol: unavailable carrier test
- id: MAP-78D1F29BC2
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.spec.ts:95-115: unavailable mode expects empty lists/maps for reads, shaped reconnect failure, silent remove, and plain errors for equity/details without touching HTTP client.
- currentBehavior: Unavailable-mode tests encode empty fallback reads, a custom reconnect error shape, silent remove, and generic Error failures.
- problem: Empty authoritative-looking lists/maps erase unavailable evidence; generic errors and silent lifecycle success prevent exhaustive caller handling. Intentional lite/read-only product mode must be distinct from UTA unavailable.
- preservedBehavior:
  - Retain no-network behavior for intentional lite mode.
  - Replace empty fallback and plain Error expectations.
- openQuestions: —

### MAP-7A38B02DED

- mapping source: [packages/uta-protocol/src/client/UTAClient.ts:90-99](../../../../packages/uta-protocol/src/client/UTAClient.ts#L90-L99)
- symbol: UTAClient convenience methods
- id: MAP-7A38B02DED
- sourceEvidence:
  - packages/uta-protocol/src/client/UTAClient.ts:90-99: get/post/put/delete closures forward arbitrary paths and unknown bodies into request.
- currentBehavior: The convenience surface duplicates the generic escape hatch and is the route most adapters use to bypass any future route validation.
- problem: Leaving these exports while adding typed methods preserves an alternate untyped authority and makes migration incomplete.
- preservedBehavior:
  - Keep HTTP verbs internally; remove the public generic closures and migrate callers rather than introducing aliases.
- openQuestions: —

### MAP-7E1806AFC4

- mapping source: [packages/uta-protocol/src/client/UTAClient.ts:37-46](../../../../packages/uta-protocol/src/client/UTAClient.ts#L37-L46)
- symbol: UTAHttpError
- id: MAP-7E1806AFC4
- sourceEvidence:
  - packages/uta-protocol/src/client/UTAClient.ts:37-46: UTAHttpError stores status, unknown body and a message string, with no failure-envelope decode.
- currentBehavior: Non-2xx responses become a JavaScript Error subclass; callers can inspect status/body but cannot exhaustively distinguish validation, auth, conflict, storage, or broker outcomes.
- problem: The message-based error path collapses expected domain failures and encourages callers to match text, losing structured evidence.
- preservedBehavior:
  - Retain HTTP status and safe metadata evidence for diagnostics, but replace string message as the control channel and preserve the selected leaf's exact error fields.
- openQuestions: —

### MAP-849F3BB7E7

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:197-210](../../../../src/services/uta-client/UTAAccountSDK.ts#L197-L210)
- symbol: searchContracts
- id: MAP-849F3BB7E7
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:197-210: searchContracts GETs aggregated search with pattern/source, filters flat hits by this.id, strips source, and unchecked-casts to ContractDescription[].
- currentBehavior: Search assumes flat aggregate hits and filters by account source after receiving generic rows.
- problem: The method discards source identity before returning and omits assetClass/venue context; unchecked cast can accept malformed hits, and aggregate completeness is not represented.
- preservedBehavior:
  - Retain pattern and source filtering.
  - Remove source stripping, flat unchecked cast, and hidden aggregate assumptions.
- openQuestions: —

### MAP-852ABCC448

- mapping source: [src/services/uta-client/UTAManagerSDK.ts:214-223](../../../../src/services/uta-client/UTAManagerSDK.ts#L214-L223)
- symbol: getContractDetails
- id: MAP-852ABCC448
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.ts:214-223: getContractDetails checks unavailable mode and then always throws NotImplementedInSDK without an HTTP request.
- currentBehavior: Manager contract details operation is a guaranteed stub after availability check.
- problem: Public caller cannot obtain details; unavailable and missing implementation are conflated through generic Error and native contract assumptions.
- preservedBehavior:
  - Retain details lookup as a typed neutral projection with an explicit NotFound outcome.
  - Remove guaranteed throw and generic missing-route error.
- openQuestions: —

### MAP-8717FCDC9B

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:67-85](../../../../src/services/uta-client/UTAAccountSDK.ts#L67-L85)
- symbol: UTAAccountSDK constructor and identity cache
- id: MAP-8717FCDC9B
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:67-85: class is a plain UTAAccountSDK (not a UnifiedTradingAccount subclass); constructor stores id/label/client/readonlyMutationReason and no local broker state is created.
- currentBehavior: The object is an intentionally thin non-subclass proxy with cached display identity and no local connection.
- problem: The shape is useful at the Alice boundary, but raw id and callback state can be mistaken for account authority or current capabilities.
- preservedBehavior:
  - Preserve non-subclass behavior and display label.
  - Remove assumptions that proxy closure or object identity controls UTA lifecycle.
- openQuestions: —

### MAP-880396C5C9

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:169-175](../../../../src/services/uta-client/UTAAccountSDK.ts#L169-L175)
- symbol: expandContract
- id: MAP-880396C5C9
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:169-175: expandContract POSTs aliceId and optional ExpandContractFilters to /contract/expand and returns ContractExpansion.
- currentBehavior: Contract expansion accepts an unbranded aliceId and generic filter object and returns a broker-shaped expansion envelope.
- problem: Expansion identity/filter semantics are unchecked and can leak broker-native assumptions; no completeness or unsupported capability result is explicit.
- preservedBehavior:
  - Retain hub-to-leaf expansion where supported.
  - Remove generic filter and unbranded id.
- openQuestions: —

### MAP-88D8077822

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:246-252](../../../../src/services/uta-client/UTAAccountSDK.ts#L246-L252)
- symbol: orderHistory
- id: MAP-88D8077822
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:246-252: orderHistory GETs /order-history/:limit and returns orders projection.
- currentBehavior: Order history is a bounded read through a wallet-independent route but limit is interpolated and response is generic.
- problem: There is no validated limit, scope/filter, projection checkpoint, or explicit reconciliation/remote outcome, so history may be mistaken for broker truth.
- preservedBehavior:
  - Retain history and bounded retrieval.
  - Remove raw URL interpolation and generic array assumption.
- openQuestions: —

### MAP-896164C117

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:214-224](../../../../src/services/uta-client/UTAAccountSDK.ts#L214-L224)
- symbol: getContractDetails
- id: MAP-896164C117
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:214-224: getContractDetails POSTs Contract or partial/aliceId hint and returns ContractDetails or null from /contract/details.
- currentBehavior: Details request accepts a broker-native full/partial union and uses null to represent absence.
- problem: Null conflates not found, unavailable, and malformed/unsupported query; IBKR native type crosses the boundary.
- preservedBehavior:
  - Retain details lookup and absence semantics as explicit NotFound.
  - Remove IBKR Contract and null-as-all-errors.
- openQuestions: —

### MAP-8C22894ED4

- mapping source: [packages/uta-protocol/src/client/UTAClient.ts:63-88](../../../../packages/uta-protocol/src/client/UTAClient.ts#L63-L88)
- symbol: UTAClient.request
- id: MAP-8C22894ED4
- sourceEvidence:
  - packages/uta-protocol/src/client/UTAClient.ts:63-88: request JSON-stringifies body, creates a timeout AbortController, parses text via safeJSON, extracts only an error field on non-2xx, and casts successful body to T.
- currentBehavior: The implementation performs real HTTP and clears its timer, but successful bodies are unchecked and non-2xx errors are reduced to a string field; caller abort signals replace the internally timed signal.
- problem: A structurally wrong success body becomes trusted domain data; malformed JSON is accepted as a string; timeout/abort and response loss do not carry typed transport/protocol context.
- preservedBehavior:
  - Preserve JSON content type, no body requests and timer cleanup, including deadline enforcement when a caller signal is supplied. Intentionally eliminate unchecked casts, error extraction, generic safeJSON acceptance, and the use of Promise completion as an authority boundary.
- openQuestions: —

### MAP-8D25A7D9F1

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:336-341](../../../../src/services/uta-client/UTAAccountSDK.ts#L336-L341)
- symbol: sync
- id: MAP-8D25A7D9F1
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:336-341: sync POSTs optional delayMs to generic per-account sync route and returns SyncResult.
- currentBehavior: Sync is an opaque delayed request with no job identity or distinction between observation/reconciliation/recovery.
- problem: A delayMs call cannot model durable leases, partition ownership, Unknown remote outcomes, or recovery-required transactions and can be lost across process restart.
- preservedBehavior:
  - Retain ability to request reconciliation/observation.
  - Remove opaque delay and wallet sync authority.
- openQuestions: —

### MAP-93C29B5E19

- mapping source: [src/services/uta-client/UTAManagerSDK.ts:60-61](../../../../src/services/uta-client/UTAManagerSDK.ts#L60-L61)
- symbol: registerCcxtToolsIfNeeded
- id: MAP-93C29B5E19
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.ts:60-61: registerCcxtToolsIfNeeded silently no-ops because UTA owns CCXT registration.
- currentBehavior: CCXT registration hook performs no registration in manager.
- problem: The no-op can silently omit Alice agent-tool registration while broker-specific capability belongs in UTA; manager has no target behavior.
- preservedBehavior:
  - Retain CCXT broker capability exposure through UTA.
  - Remove manager no-op hook.
- openQuestions: —

### MAP-9B517DECDC

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:306-311](../../../../src/services/uta-client/UTAAccountSDK.ts#L306-L311)
- symbol: stageModifyOrder
- id: MAP-9B517DECDC
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:306-311: stageModifyOrder POSTs StageModifyOrderParams to wallet/stage-modify-order and returns AddResult.
- currentBehavior: Modify staging sends a raw parameter bag to wallet and returns legacy AddResult.
- problem: No ExistingOrder before-image, BrokerOrderId/version precondition, conflict key, or compensation capability is durable; modification can race with broker changes.
- preservedBehavior:
  - Retain order modification intent and reject races explicitly.
  - Remove AddResult/wallet staging.
- openQuestions: —

### MAP-9D1997ABF8

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:177-195](../../../../src/services/uta-client/UTAAccountSDK.ts#L177-L195)
- symbol: getHistorical
- id: MAP-9D1997ABF8
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:177-195: getHistorical POSTs contract-or-aliceId plus BarParams; server revives dates then delegates broker getHistorical, while failed/unsupported broker queries become 500 payloads.
- currentBehavior: Historical data uses a broker-native-or-partial hint and generic BarParams; client unwraps bars without runtime codec or typed quality/error state.
- problem: Unsupported venue and query failure are collapsed into raw 500 responses; bar timestamps/interval/quality/provenance are not validated at this boundary.
- preservedBehavior:
  - Retain historical query semantics and broker-specific coverage disclosure.
  - Remove Contract/partial input and raw 500 Error mapping.
- openQuestions: —

### MAP-9D5D973F76

- mapping source: [src/services/uta-client/UTAManagerSDK.ts:132-146](../../../../src/services/uta-client/UTAManagerSDK.ts#L132-L146)
- symbol: getBarCapabilities
- id: MAP-9D5D973F76
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.ts:132-146: getBarCapabilities builds id-to-quality from summaries, skips asVendor false/unsupported, defaults missing quality realtime, and returns {} when unavailable.
- currentBehavior: Manager collapses bar support to flat source-to-quality map with empty fallback.
- problem: Capability is contextual to instrument/interval/session/venue and quality evidence; {} conflates unavailable with no support and realtime default can overclaim.
- preservedBehavior:
  - Retain vendor/support filtering as compatibility view.
  - Remove empty/unqualified realtime fallback.
- openQuestions: —

### MAP-9E4130600B

- mapping source: [src/services/uta-client/UTAManagerSDK.ts:246-246](../../../../src/services/uta-client/UTAManagerSDK.ts#L246-L246)
- symbol: ContractDescription re-export
- id: MAP-9E4130600B
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.ts:246-246: re-exports ContractDescription from the manager, exposing IBKR-native contract type through Alice barrel.
- currentBehavior: The public manager barrel leaks a broker adapter type.
- problem: Consumers become coupled to IBKR and cannot use neutral InstrumentDescription/InstrumentId across venues.
- preservedBehavior:
  - Retain instrument description capability in neutral form.
  - Remove IBKR type export.
- openQuestions: —

### MAP-A0797DAD22

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:234-240](../../../../src/services/uta-client/UTAAccountSDK.ts#L234-L240)
- symbol: show
- id: MAP-A0797DAD22
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:234-240: show GETs /wallet/show/:hash and turns an Error.message containing "Commit not found" into null; all other errors rethrow.
- currentBehavior: Commit lookup classifies not-found by substring matching on Error.message.
- problem: Message parsing conflates typed not-found with storage/network failures and makes behavior dependent on wording.
- preservedBehavior:
  - Retain none only for a canonical absent audit commit.
  - Remove Error.message substring matching.
- openQuestions: —

### MAP-A12828EECA

- mapping source: [src/services/uta-client/UTAManagerSDK.ts:27-30](../../../../src/services/uta-client/UTAManagerSDK.ts#L27-L30)
- symbol: IBKR and Guardian dependencies
- id: MAP-A12828EECA
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.ts:27-30: imports IBKR contract types, ReconnectResult, Guardian restart trigger, UTAAccountSDK, and NotImplementedInSDK.
- currentBehavior: Manager directly depends on IBKR native types and Guardian whole-process restart.
- problem: Native types leak public protocol; the direct restart trigger has no authenticated requestId/boot correlation, silently ignores the requested account id without an explicit process-wide contract, and returns readiness without typed control or transaction evidence.
- preservedBehavior:
  - Retain process-wide UTA restart intent and explicit completion evidence.
  - Remove account-id pretence, direct Guardian trigger coupling, and native IBKR types.
- openQuestions: —

### MAP-A2AEF44B22

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:366-369](../../../../src/services/uta-client/UTAAccountSDK.ts#L366-L369)
- symbol: nudgeRecovery
- id: MAP-A2AEF44B22
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:366-369: nudgeRecovery silently resolves because UTA reconnect logic is autonomous.
- currentBehavior: nudgeRecovery is a no-op and provides no transaction/recovery identity or evidence.
- problem: Silent success hides Unknown/RecoveryRequired state and cannot request or observe durable recovery; automatic reconnect is not transaction recovery.
- preservedBehavior:
  - Retain autonomous reconnect separate from explicit transaction recovery.
  - Delete the silent no-op while retaining autonomous reconnect as a separate concern.
- openQuestions: —

### MAP-A458F81B6D

- mapping source: [packages/uta-protocol/src/client/UTAClient.ts:22-29](../../../../packages/uta-protocol/src/client/UTAClient.ts#L22-L29)
- symbol: UTAClient generic methods
- id: MAP-A458F81B6D
- sourceEvidence:
  - packages/uta-protocol/src/client/UTAClient.ts:22-29: UTAClient exports arbitrary request&lt;T&gt;, get/post/put/delete&lt;T&gt; methods with unknown defaults.
  - Historical ten-route proposal at audit commit a5f23756531cc552b7e12b6d655ae1ffbcd28b64; the current route target is descriptor-bound under K01/K02/K06, not a fixed route list.
- currentBehavior: Any caller can supply any HTTP verb/path/body and obtain a compile-time cast to T; the interface does not enumerate public routes or distinguish command from query responses.
- problem: Generic methods erase route identity and permit broker-native or malformed payloads to cross the process boundary, so changing T does not add runtime safety.
- preservedBehavior:
  - Preserve the ability to perform every currently supported operation, including reads and stage/approval migration, but intentionally remove arbitrary paths and unchecked generic payloads.
- openQuestions: —

### MAP-A4FE5AF865

- mapping source: [packages/uta-protocol/src/client/UTAClient.ts:13-20](../../../../packages/uta-protocol/src/client/UTAClient.ts#L13-L20)
- symbol: UTAClientOptions
- id: MAP-A4FE5AF865
- sourceEvidence:
  - packages/uta-protocol/src/client/UTAClient.ts:13-20: UTAClientOptions contains baseUrl, optional fetch override, and optional timeoutMs defaulting to 15000.
- currentBehavior: Client construction normalizes only URL/fetch/timeout configuration; it has no transport principal, correlation context, or separate actor/policy/capability authorization input.
- problem: A timeout is merely an AbortController side effect and cannot be distinguished from an authenticated transport failure; the same options also tempt callers to treat client configuration as trading authority.
- preservedBehavior:
  - Retain base URL, test fetch injection and the 15-second default as compatibility defaults, but make their refinement, fixed auth/correlation profile, and typed result boundary explicit.
- openQuestions: —

### MAP-B7BA614FC2

- mapping source: [src/services/uta-client/UTAManagerSDK.ts:155-158](../../../../src/services/uta-client/UTAManagerSDK.ts#L155-L158)
- symbol: getAggregatedEquity
- id: MAP-B7BA614FC2
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.ts:155-158: getAggregatedEquity throws plain Error when unavailable, otherwise GETs generic /api/trading/equity and returns AggregatedEquity.
- currentBehavior: Aggregate equity relies on generic route and generic Error for local unavailability.
- problem: Accounting projection needs scope/aggregation policy, currency-qualified Money, FX provenance, freshness, and typed unavailable/storage/valuation uncertainty.
- preservedBehavior:
  - Retain aggregate equity read.
  - Remove plain Error and unchecked generic response.
- openQuestions: —

### MAP-B8EEA0928E

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:313-318](../../../../src/services/uta-client/UTAAccountSDK.ts#L313-L318)
- symbol: stageClosePosition
- id: MAP-B8EEA0928E
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:313-318: stageClosePosition POSTs StageClosePositionParams to wallet/stage-close-position and returns AddResult.
- currentBehavior: Close staging sends raw position-close parameters to wallet without durable exposure snapshot or target action semantics.
- problem: It cannot express scope, quantity units, observed exposure, partial-close preconditions, market/session policy, compensation, or transaction revision.
- preservedBehavior:
  - Retain full/partial close intent and quantity semantics.
  - Delete wallet staging AddResult authority.
- openQuestions: —

### MAP-BBC590EFEB

- mapping source: [src/services/uta-client/UTAManagerSDK.ts:187-196](../../../../src/services/uta-client/UTAManagerSDK.ts#L187-L196)
- symbol: removeUTA
- id: MAP-BBC590EFEB
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.ts:187-196: removeUTA ignores id, skips in unavailable mode, triggers whole-process restart, and catches failure with console.warn after external accounts.json deletion.
- currentBehavior: Account removal is external-file deletion plus best-effort whole-process restart; failures are swallowed.
- problem: This loses durable lifecycle/transaction evidence, affects unrelated accounts, ignores target identity, and turns failure into log text.
- preservedBehavior:
  - Retain explicit removal intent.
  - Remove file/restart and console-only error handling.
- openQuestions: —

### MAP-C7EDABAD8A

- mapping source: [src/services/uta-client/UTAManagerSDK.ts:160-167](../../../../src/services/uta-client/UTAManagerSDK.ts#L160-L167)
- symbol: getFxRates
- id: MAP-C7EDABAD8A
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.ts:160-167: getFxRates returns [] in unavailable mode or generic flat rates/currency/source/updatedAt from /api/trading/fx-rates.
- currentBehavior: FX reads flatten observations and silently return empty list when unavailable.
- problem: Empty rates can be mistaken for no currencies; no version/provenance/quality/typed failure or scope/context exists, risking implicit conversion.
- preservedBehavior:
  - Retain rate/source/time display and query.
  - Remove [] unavailable fallback and implicit conversion.
- openQuestions: —

### MAP-C856390894

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:320-325](../../../../src/services/uta-client/UTAAccountSDK.ts#L320-L325)
- symbol: stageCancelOrder
- id: MAP-C856390894
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:320-325: stageCancelOrder POSTs raw orderId to wallet/stage-cancel-order and returns AddResult.
- currentBehavior: Cancel staging accepts an unbranded raw orderId and mutates wallet stage state.
- problem: No scoped identity, order version, before-image, transaction revision, or cancellation conflict/compensation semantics are represented.
- preservedBehavior:
  - Retain cancellation intent and explicit stale-order rejection.
  - Delete wallet stage-cancel-order/AddResult.
- openQuestions: —

### MAP-CA91A83359

- mapping source: [src/services/uta-client/UTAManagerSDK.ts:71-75](../../../../src/services/uta-client/UTAManagerSDK.ts#L71-L75)
- symbol: add and remove
- id: MAP-CA91A83359
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.ts:71-75: add and remove silently no-op because Alice has no in-process broker connections.
- currentBehavior: Manager add/remove discard lifecycle intent.
- problem: Silent void cannot indicate accepted/rejected/unavailable and cannot bind operation to AccountId/Scope or preserve unfinished work.
- preservedBehavior:
  - Retain explicit add/remove capability under UTA ownership.
  - Remove silent no-op methods.
- openQuestions: —

### MAP-CE833CC605

- mapping source: [src/services/uta-client/UTAManagerSDK.spec.ts:49-53](../../../../src/services/uta-client/UTAManagerSDK.spec.ts#L49-L53)
- symbol: resolve tradingOnly tier test
- id: MAP-CE833CC605
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.spec.ts:49-53: tradingOnly resolve excludes data-tier summaries but retains trading/account tiers.
- currentBehavior: tradingOnly is a presentation filter over tier.
- problem: Excluding data-tier accounts is not sufficient to prove an account can draft or execute; funded readOnly and credential state must remain independently represented.
- preservedBehavior:
  - Retain data-tier exclusion and trading/account inclusion.
  - Do not equate trading tier with execution authority.
- openQuestions: —

### MAP-CED1F6DB38

- mapping source: [src/services/uta-client/UTAManagerSDK.ts:225-228](../../../../src/services/uta-client/UTAManagerSDK.ts#L225-L228)
- symbol: assertAvailable
- id: MAP-CED1F6DB38
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.ts:225-228: assertAvailable throws plain Error containing locally resolved unavailableReason.
- currentBehavior: Local product-mode guard converts availability to Error.message text.
- problem: Typed expected unavailability is lost and callers cannot distinguish Lite intentional mode, disconnected UTA, degraded projection, or capability denial.
- preservedBehavior:
  - Retain local presentation mode selection.
  - Remove plain Error as transport-facing expected failure.
- openQuestions: —

### MAP-D030B466D9

- mapping source: [src/services/uta-client/UTAManagerSDK.ts:230-234](../../../../src/services/uta-client/UTAManagerSDK.ts#L230-L234)
- symbol: getUnavailableReason
- id: MAP-D030B466D9
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.ts:230-234: getUnavailableReason evaluates a function dynamically or returns a string/undefined.
- currentBehavior: Dynamic reason lookup is a small Alice presentation hook.
- problem: String reason cannot replace observed UTA health/failure and may be stale or unrelated to scope/capability.
- preservedBehavior:
  - Retain dynamic product-mode lookup.
  - Do not treat it as broker health or authorization.
- openQuestions: —

### MAP-D147414CA0

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:377-379](../../../../src/services/uta-client/UTAAccountSDK.ts#L377-L379)
- symbol: setCurrentRound
- id: MAP-D147414CA0
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:377-379: setCurrentRound ignores simulation round input because heartbeat-driven round is UTA-internal.
- currentBehavior: The setter silently discards round input.
- problem: A no-op control surface makes simulation/time behavior unverifiable and conflates scheduler clock ownership with Alice account state.
- preservedBehavior:
  - Retain deterministic simulation through test composition.
  - Remove silent Alice setter.
- openQuestions: —

### MAP-D176AC7146

- mapping source: [src/services/uta-client/UTAManagerSDK.spec.ts:68-93](../../../../src/services/uta-client/UTAManagerSDK.spec.ts#L68-L93)
- symbol: data-source participation test
- id: MAP-D176AC7146
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.spec.ts:68-93: getBarCapabilities includes enabled vendor sources, excludes asVendor false and unsupported bars, and defaults missing quality to realtime.
- currentBehavior: The test defines current source participation and quality default behavior for bar capabilities.
- problem: Source participation and a missing quality default do not prove contextual capability, freshness, or whether quality is observed versus assumed. Defaulting missing quality to realtime can overstate evidence.
- preservedBehavior:
  - Retain enabled-vendor and supported-bar filtering.
  - Remove unqualified realtime default unless protocol evidence explicitly guarantees it.
- openQuestions: —

### MAP-D701154BEF

- mapping source: [src/services/uta-client/UTAManagerSDK.ts:121-125](../../../../src/services/uta-client/UTAManagerSDK.ts#L121-L125)
- symbol: get
- id: MAP-D701154BEF
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.ts:121-125: get lists all summaries, exact-matches id, and returns account proxy or undefined.
- currentBehavior: get is an optional convenience lookup over current list response.
- problem: Undefined conflates unavailable, absent, and stale listing; raw id lookup lacks branded AccountId/scope and proxy capability evidence.
- preservedBehavior:
  - Retain exact-id convenience.
  - Do not use undefined as unavailable fallback.
- openQuestions: —

### MAP-E20AF38FFA

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:165-167](../../../../src/services/uta-client/UTAAccountSDK.ts#L165-L167)
- symbol: getMarketClock
- id: MAP-E20AF38FFA
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:165-167: getMarketClock GETs account-wide /market-clock with no venue, instrument, session, or jurisdiction parameters.
- currentBehavior: Market clock is queried as an account-wide uncontextualized value.
- problem: Session open/closed depends on venue, instrument, session policy, jurisdiction, and time; account-wide boolean cannot drive action preconditions safely.
- preservedBehavior:
  - Retain market session reads.
  - Remove account-wide implicit clock.
- openQuestions: —

### MAP-E46B6C1B23

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:262-266](../../../../src/services/uta-client/UTAAccountSDK.ts#L262-L266)
- symbol: getState
- id: MAP-E46B6C1B23
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:262-266: getState always throws NotImplementedInSDK because wallet cannot synthesize the legacy GitState shape.
- currentBehavior: The legacy getState API is guaranteed to fail because the expected wallet state route is absent.
- problem: Keeping a method that always throws advertises unsupported state as an account operation and leaves no typed distinction between removed API and unavailable state.
- preservedBehavior:
  - Retain explicit typed unavailability during migration rather than throwing.
  - Remove synchronous GitState contract.
- openQuestions: —

### MAP-E56045946F

- mapping source: [packages/uta-protocol/src/client/UTAClient.ts:101-103](../../../../packages/uta-protocol/src/client/UTAClient.ts#L101-L103)
- symbol: safeJSON
- id: MAP-E56045946F
- sourceEvidence:
  - packages/uta-protocol/src/client/UTAClient.ts:101-103: safeJSON returns parsed unknown JSON or the original response text after JSON.parse failure.
- currentBehavior: Malformed response text is deliberately returned as an unknown value, allowing error handling to proceed with a string body.
- problem: This silently treats protocol corruption as an acceptable payload and prevents callers from distinguishing syntax failure from a valid domain response.
- preservedBehavior:
  - Preserve successful JSON parsing and support explicitly declared empty responses; intentionally remove text fallback and all raw-body/header/parameter/native-message diagnostics.
- openQuestions: —

### MAP-EBBB24441A

- mapping source: [src/services/uta-client/UTAManagerSDK.spec.ts:8-10](../../../../src/services/uta-client/UTAManagerSDK.spec.ts#L8-L10)
- symbol: spec imports
- id: MAP-EBBB24441A
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.spec.ts:8-10: tests import Vitest, UTAManagerSDK, and raw UTATier/UTASummary wire types; no runtime protocol schema or decoder is exercised.
- currentBehavior: Tests build compile-time wire objects and invoke SDK methods without boundary decoding.
- problem: Passing TypeScript fixtures does not prove network payload validation, typed failure mapping, date/decimal conversion, or effect ownership.
- preservedBehavior:
  - Retain existing source-resolution coverage.
  - Remove any implication that raw generic imports validate runtime contracts.
- openQuestions: —

### MAP-EC915A8014

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:136-139](../../../../src/services/uta-client/UTAAccountSDK.ts#L136-L139)
- symbol: getAccount
- id: MAP-EC915A8014
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:136-139: getAccount GETs /account with optional subAccountId query and returns generic AccountInfo.
- currentBehavior: Account information is fetched with an optional raw subaccount query and returned as unchecked wire data.
- problem: Optional scope allows aggregate/default ambiguity and raw money/currency/status values; no projection freshness or typed query failure is represented.
- preservedBehavior:
  - Retain account/equity reads and optional aggregate use only when explicitly named.
  - Remove implicit single-wallet default.
- openQuestions: —

### MAP-ED4E7C549B

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:371-375](../../../../src/services/uta-client/UTAAccountSDK.ts#L371-L375)
- symbol: getPendingOrderIds
- id: MAP-ED4E7C549B
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:371-375: getPendingOrderIds always returns [] because pending snapshot construction is now expected in UTA.
- currentBehavior: The helper always returns an empty list and shifts snapshot responsibility away from Alice.
- problem: Returning [] is a false complete listing and breaks callers that use it to query orders; it hides pending work and does not provide scope/projection revision.
- preservedBehavior:
  - Retain pending-order read behavior through a real typed query.
  - Remove empty-array fallback.
- openQuestions: —

### MAP-EDCEFC83C3

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:119-124](../../../../src/services/uta-client/UTAAccountSDK.ts#L119-L124)
- symbol: getCapabilities
- id: MAP-EDCEFC83C3
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:119-124: getCapabilities returns empty supportedSecTypes/supportedOrderTypes arrays and instructs callers to use manager list data.
- currentBehavior: The account SDK reports an empty capability set and defers authority to manager summaries.
- problem: Empty arrays are ambiguous between unsupported, unavailable, not loaded, and zero capability; manager summaries lack full account/scope/instrument context.
- preservedBehavior:
  - Retain capability querying.
  - Remove empty-array fallback and manager-list coupling.
- openQuestions: —

### MAP-EDF4CE65FB

- mapping source: [src/services/uta-client/UTAManagerSDK.ts:41-50](../../../../src/services/uta-client/UTAManagerSDK.ts#L41-L50)
- symbol: UTAManagerSDK constructor and state
- id: MAP-EDF4CE65FB
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.ts:41-50: constructor stores client and callbacks only; no broker connections, transaction state, journal, scheduler, or projection authority.
- currentBehavior: Stateless manager boundary is structurally aligned with Alice owning presentation and UTA owning broker/runtime state.
- problem: The absence of local state is valuable but untyped callbacks still let callers infer authority; methods must not recreate state inside manager.
- preservedBehavior:
  - Retain statelessness and non-authority.
  - Remove callbacks once target capability protocol is adopted.
- openQuestions: —

### MAP-EEF88CE91D

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:55-65](../../../../src/services/uta-client/UTAAccountSDK.ts#L55-L65)
- symbol: UTAAccountSDKDeps
- id: MAP-EEF88CE91D
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:55-65: UTAAccountSDKDeps accepts a generic client, raw string id, optional label, and optional readonlyMutationReason callback.
- currentBehavior: The dependency contract treats identity as string and delegates write policy to an optional Alice callback.
- problem: The callback is neither authoritative nor applied to all writes; it also conflates readOnly UX with actual UTA capability. Funded readOnly accounts must remain able to stage/prepare drafts while execution remains prohibited.
- preservedBehavior:
  - Retain label as display metadata and optional local UX callback during migration.
  - Do not disable all draft methods merely because readOnly is true.
- openQuestions: —

### MAP-F0015AC61F

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:381-383](../../../../src/services/uta-client/UTAAccountSDK.ts#L381-L383)
- symbol: close
- id: MAP-F0015AC61F
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:381-383: close immediately resolves because proxy has no local state and UTA owns broker shutdown.
- currentBehavior: close is a no-op on the proxy and does not close UTA or broker resources.
- problem: The method suggests lifecycle authority where none exists; a caller may believe broker shutdown completed.
- preservedBehavior:
  - Preserve UTA ownership of broker shutdown.
  - Remove immediate-resolve lifecycle facade.
- openQuestions: —

### MAP-F199C6F4E7

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:99-112](../../../../src/services/uta-client/UTAAccountSDK.ts#L99-L112)
- symbol: getHealthInfo
- id: MAP-F199C6F4E7
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:99-112: getHealthInfo returns a fabricated healthy/readable/trading BrokerHealthInfo with zero failures and all lifecycle flags false.
- currentBehavior: getHealthInfo synthesizes a fully healthy snapshot without contacting UTA.
- problem: The fabricated snapshot hides degraded, reconnecting, keyless, account-policy, and capability-specific states and contradicts UTA-owned lifecycle evidence.
- preservedBehavior:
  - If callers still need a display projection during migration, expose only named fields with evidence and no authority claim.
  - Stop reporting trading=true or failures=0 without evidence.
- openQuestions: —

### MAP-F1A6447C79

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:13-45](../../../../src/services/uta-client/UTAAccountSDK.ts#L13-L45)
- symbol: UTA protocol type imports
- id: MAP-F1A6447C79
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:13-45: imports are compile-time UTA wire types for account, market data, health, capabilities, accounting, Git, staging, and contract expansion; methods use UTAClient generic return assertions.
- currentBehavior: The SDK imports many nominal wire interfaces but no runtime schema/decoder is visible at this boundary.
- problem: TypeScript generic parameters do not validate network JSON, brand IDs, qualify Money/Decimal/date values, or distinguish expected query and transaction failures; a server shape change can cross into Alice unchecked.
- preservedBehavior:
  - Retain endpoint semantics and existing caller-facing asynchronous operations where their behavior is still needed.
  - Remove unchecked generic casts and raw response-shape assumptions.
- openQuestions: —

### MAP-F58C379DB0

- mapping source: [src/services/uta-client/UTAAccountSDK.ts:282-290](../../../../src/services/uta-client/UTAAccountSDK.ts#L282-L290)
- symbol: reject
- id: MAP-F58C379DB0
- sourceEvidence:
  - src/services/uta-client/UTAAccountSDK.ts:282-290: reject POSTs optional reason and expectedPendingHash to wallet/reject without readonly guard or canonical transaction identifier.
- currentBehavior: Reject uses optional reason plus pending Git hash, and no local readonly guard is applied.
- problem: Rejection is a transaction state transition but current identity is process-local/pending Git state; no actor/scope/revision or durable event is guaranteed.
- preservedBehavior:
  - Retain explicit user rejection reason and stale-plan protection.
  - Remove wallet/reject route as authority and optional-hash identity.
- openQuestions: —

### MAP-F6D21D0013

- mapping source: [src/services/uta-client/UTAManagerSDK.ts:57-58](../../../../src/services/uta-client/UTAManagerSDK.ts#L57-L58)
- symbol: setFxService
- id: MAP-F6D21D0013
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.ts:57-58: setFxService accepts unknown and silently no-ops because UTA owns FxService.
- currentBehavior: FX injection setter discards its service argument.
- problem: Caller cannot know whether FX source changed; manager cannot own accounting FX and unknown type bypasses schema.
- preservedBehavior:
  - Retain UTA FX ownership and explicit query capability.
  - Remove silent setter.
- openQuestions: —

### MAP-F70A0055B5

- mapping source: [src/services/uta-client/UTAManagerSDK.ts:148-153](../../../../src/services/uta-client/UTAManagerSDK.ts#L148-L153)
- symbol: size
- id: MAP-F70A0055B5
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.ts:148-153: size is async and counts listUTAs response.
- currentBehavior: size derives count from current account list.
- problem: Count inherits list fallback and cannot distinguish complete zero from unavailable/partial; count is not a connection or capability signal.
- preservedBehavior:
  - Retain count convenience.
  - Do not return zero for unavailable.
- openQuestions: —

### MAP-F7F2554961

- mapping source: [src/services/uta-client/UTAManagerSDK.spec.ts:55-59](../../../../src/services/uta-client/UTAManagerSDK.spec.ts#L55-L59)
- symbol: resolve explicit data-tier test
- id: MAP-F7F2554961
- sourceEvidence:
  - src/services/uta-client/UTAManagerSDK.spec.ts:55-59: explicit data-tier source resolves even with tradingOnly enabled.
- currentBehavior: An explicit source request overrides the presentation filter for direct resolution.
- problem: Direct query resolution must not bypass capability/authorization or make data-tier source executable.
- preservedBehavior:
  - Retain direct read/query resolution for data-tier source.
  - Do not grant staging/execution from direct resolution.
- openQuestions: —
