
# TargetGaps — source investigation and migration evidence


## Entries

### NOTE-12-1

- chapter: 12
- note source (historical audit input; architecture references pinned to revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64): docs/uta-effect-runtime-architecture.md:1239-1262
- note source paths: [docs/uta-effect-runtime-architecture.md](https://github.com/mouriya-s-lab/OpenAlice/blob/a5f23756531cc552b7e12b6d655ae1ffbcd28b64/docs/uta-effect-runtime-architecture.md) (pinned historical revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64)
- obligation: Startup recovery classification
- gap: No current startup coordinator opens/migrates/verifies the journal, rebuilds stale authoritative projections, acquires broker Layers, scans non-terminal transactions/expired leases, and classifies no-dispatch, dispatch-without-result, abort-in-progress, and terminal states before admission.
- original requiredChange (historical audit input; not current target): Implement the ordered startup state machine and open command admission only after all unfinished work has one durable classified next action.
- id: NOTE-12-1
- sourceEvidence:
  - services/uta/src/main.ts:63-87,104-128,145-176: current startup initializes managers/timers then exposes health/routes without journal classification
  - services/uta/src/domain/trading/uta-manager.ts:63-71: account startup restores file state and callback persistence
  - historical architecture evidence pinned at Git a5f23756531cc552b7e12b6d655ae1ffbcd28b64 (former lines 1239-1262): ordered recovery gate and per-account degraded reach
- currentBehavior: Startup restores available file history, starts snapshot/order timers and serves routes; it has no durable unfinished-work scan.
- problem: A boolean health response can be mistaken for safe command admission while old effects are unclassified; one unreachable broker must not indefinitely block unrelated accounts after local authority is valid.
- preservedBehavior:
  - One broken broker configuration does not stop non-trading Alice or independent available accounts
  - Keyless market-data scopes remain query-only and are never classified as executable trading accounts
- openQuestions: —

### NOTE-12-2

- chapter: 12
- note source (historical audit input; architecture references pinned to revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64): docs/uta-effect-runtime-architecture.md:1293-1300
- note source paths: [docs/uta-effect-runtime-architecture.md](https://github.com/mouriya-s-lab/OpenAlice/blob/a5f23756531cc552b7e12b6d655ae1ffbcd28b64/docs/uta-effect-runtime-architecture.md) (pinned historical revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64)
- obligation: Expected failure versus defect policy
- gap: Legacy code often converts corrupt persisted data or impossible states to empty/default values or generic errors; no owning-worker shutdown policy preserves diagnostic evidence.
- original requiredChange (historical audit input; not current target): Keep domain/broker/connection/conflict/unknown outcomes in typed failure channels, but treat malformed persisted records, impossible transitions, and broken schema invariants as defects that stop the affected worker/process and retain evidence.
- id: NOTE-12-2
- sourceEvidence:
  - services/uta/src/domain/trading/git-persistence.ts:28-39: all read/parse errors fall back then return undefined
  - services/uta/src/domain/trading/git/TradingGit.ts:147-153: thrown exceptions become broker rejected strings
  - services/uta/src/main.ts:179-189: shutdown swallows manager/event-log failures
  - historical architecture evidence pinned at Git a5f23756531cc552b7e12b6d655ae1ffbcd28b64 (former lines 1293-1300): defects stop owner and preserve evidence
- currentBehavior: Corrupt persisted JSON can appear as empty history; unexpected execution errors are recorded as rejections.
- problem: Retry supervision after an impossible transition can repeat mutation, and silent defaults erase the evidence needed to classify old effects.
- preservedBehavior:
  - Transient broker outages remain isolated rather than crashing every account
  - Expected user mistakes return actionable typed errors instead of stack traces
- openQuestions: —

### NOTE-13-1

- chapter: 13
- note source (historical audit input; architecture references pinned to revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64): docs/uta-effect-runtime-architecture.md:1317-1325
- note source paths: [docs/uta-effect-runtime-architecture.md](https://github.com/mouriya-s-lab/OpenAlice/blob/a5f23756531cc552b7e12b6d655ae1ffbcd28b64/docs/uta-effect-runtime-architecture.md) (pinned historical revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64)
- obligation: Required operational projections and metrics
- gap: Current health/log rows do not provide transactions by state/age, unknown outcomes awaiting reconciliation, RecoveryRequired residual exposure, durable queue lag/lease age, journal writer latency/backpressure, and projection checkpoint lag as typed operational views.
- original requiredChange (historical audit input; not current target): Add projection/query services and structured metrics for every listed view, keyed by transaction/step/dispatch/account/conflict/journal context and redacted by schema.
- id: NOTE-13-1
- sourceEvidence:
  - services/uta/src/main.ts:147-152: health reports only ok/startedAt/account count
  - services/uta/src/domain/trading/order-sync-poller.ts:80-90: human strings show update/error without durable dispatch context
  - historical architecture evidence pinned at Git a5f23756531cc552b7e12b6d655ae1ffbcd28b64 (former lines 1302-1325): context and operational views required
  - detailed design D14: high-cardinality context must not become metric labels
- currentBehavior: Logs describe account polling, but no operational query identifies the age, ownership and residual of each unknown transaction.
- problem: A healthy socket counter cannot indicate stalled writer, stale projection or unresolved execution; putting transaction ids into metrics produces unbounded cardinality and may leak sensitive identities.
- preservedBehavior:
  - Human readable account/broker errors remain actionable but schema-redacted
  - Polling errors remain nonfatal when they are expected reach failures
- openQuestions: —

### NOTE-14-1

- chapter: 14
- note source (historical audit input; architecture references pinned to revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64): docs/uta-effect-runtime-architecture.md:1331-1347
- note source paths: [docs/uta-effect-runtime-architecture.md](https://github.com/mouriya-s-lab/OpenAlice/blob/a5f23756531cc552b7e12b6d655ae1ffbcd28b64/docs/uta-effect-runtime-architecture.md) (pinned historical revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64)
- obligation: Complete transaction-oriented public route set
- gap: No current target implementation provides POST /transactions, PUT /transactions/:id/draft, POST prepare/approve/reject/recover, GET transaction/events, GET /capabilities, or GET /accounts/:id/state with shared runtime schemas. Legacy wallet Git routes, no-op recovery, empty capability fallbacks, and manager/SDK state shapes are not target route implementations.
- original requiredChange (historical audit input; not current target): Add all ten application-owned transaction/capability/account routes listed in the architecture, with shared @traderalice/uta-protocol request/response/error schemas, durable admission semantics, and no database-row or broker-native payload exposure.
- id: NOTE-14-1
- sourceEvidence:
  - historical architecture evidence pinned at Git a5f23756531cc552b7e12b6d655ae1ffbcd28b64 (former lines 1331-1347): exact ten transaction/capability/account routes
  - services/uta/src/http/routes-trading.ts:20-77,198-224: legacy loose schemas, one-shot pipeline and manager routes
  - detailed design D13: runtime schemas, error coverage and event pagination
- currentBehavior: Legacy routes operate on account instances and stringly order fields; one-shot status maps stage/commit/push rather than durable command acceptance.
- problem: Returning prepare success before a plan is durably compiled or exposing generic manager data makes client retry and approval ambiguous. Transport timeout is not transaction rejection.
- preservedBehavior:
  - One-shot UX can compose create/replace/prepare under policy but must expose durable waiting-for-approval
  - All legacy quantity/TP-SL/trailing/GTD/parent/OCA fields survive in named ADTs or fail explicit unsupported capability
- openQuestions: —

### NOTE-15-1

- chapter: 15
- note source (historical audit input; architecture references pinned to revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64): docs/uta-effect-runtime-architecture.md:1356-1356; services/uta/src/http/routes-trading.ts:127-224; services/uta/src/http/routes-simulator.ts:105-221
- note source paths: [docs/uta-effect-runtime-architecture.md](https://github.com/mouriya-s-lab/OpenAlice/blob/a5f23756531cc552b7e12b6d655ae1ffbcd28b64/docs/uta-effect-runtime-architecture.md) (pinned historical revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64)、[services/uta/src/http/routes-trading.ts](../../../../services/uta/src/http/routes-trading.ts)、[services/uta/src/http/routes-simulator.ts](../../../../services/uta/src/http/routes-simulator.ts)
- obligation: Process-local database authority
- gap: No explicit runtime boundary prevents future administrative SQL/row mutation exposure; current administrative/simulator routes directly reach managers and MockBroker state.
- original requiredChange (historical audit input; not current target): Keep journal/database services private to the UTA process. Transport may expose only typed application projections and typed recovery commands; never expose SQL, table rows, or direct database mutations.
- id: NOTE-15-1
- sourceEvidence:
  - services/uta/src/http/routes-simulator.ts:116-220: simulator routes directly mutate MockBroker state
  - services/uta/src/http/routes-trading.ts:198-224: test-connection builds a broker and reconnect reaches manager
  - historical architecture evidence pinned at Git a5f23756531cc552b7e12b6d655ae1ffbcd28b64 (former lines 1344-1356): typed recovery only, private database
- currentBehavior: Transport receives manager/broker access and simulator endpoints can alter external-trade-like state directly.
- problem: A future admin SQL callback or simulator mutation through transaction store would bypass dispatch evidence and make crash experiments tautological.
- preservedBehavior:
  - Simulator can still drive fills/prices/external balance changes for development
  - Those changes remain distinct from approved user transaction intent
- openQuestions: —

### NOTE-16-1

- chapter: 16
- note source (historical audit input; architecture references pinned to revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64): docs/uta-effect-runtime-architecture.md:1302-1325; docs/uta-effect-runtime-architecture.md:1358-1375
- note source paths: [docs/uta-effect-runtime-architecture.md](https://github.com/mouriya-s-lab/OpenAlice/blob/a5f23756531cc552b7e12b6d655ae1ffbcd28b64/docs/uta-effect-runtime-architecture.md) (pinned historical revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64)
- obligation: Canonical observability module destination
- gap: The module graph and chapter 13 require observability execution context, redaction, metrics, and operational views, but the chapter-16 source-layout table provides no observability/ row.
- original requiredChange (historical audit input; not current target): Add services/uta/src/observability/ as the canonical owner for ExecutionContext, ObservabilityRedactor, structured sinks/metrics, and operational-view instrumentation; keep domain and broker adapters dependent only on typed ports.
- id: NOTE-16-1
- sourceEvidence:
  - historical architecture evidence pinned at Git a5f23756531cc552b7e12b6d655ae1ffbcd28b64 (former lines 1302-1325): observability obligations exist but layout row is absent
  - detailed design D14: observability owner, stage ADT, redaction, and projection-store views
  - services/uta/src/main.ts:42-54,127-152: current composition emits inline console logs and health response
- currentBehavior: Current main and poller own ad hoc logging; target source layout lacks an explicit observability destination despite operational requirements.
- problem: Without a concrete import boundary, adapters may log raw SDK payloads or domain functions may acquire logger/time dependencies, and operational queries may drift into another authority store.
- preservedBehavior:
  - Logs still identify the account for operational debugging
  - Non-trading Alice remains outside UTA observability composition
- openQuestions: —

### NOTE-17-1

- chapter: 17
- note source (historical audit input; architecture references pinned to revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64): docs/uta-effect-runtime-architecture.md:1401-1405
- note source paths: [docs/uta-effect-runtime-architecture.md](https://github.com/mouriya-s-lab/OpenAlice/blob/a5f23756531cc552b7e12b6d655ae1ffbcd28b64/docs/uta-effect-runtime-architecture.md) (pinned historical revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64)
- obligation: Slice 3 compensation and multi-step execution
- gap: Current source has no complete compensation-class, conflict-key/lock, commit-criterion, partial-fill abort, compensation-failure, and restart-recovery vertical slice.
- original requiredChange (historical audit input; not current target): Implement and runtime-verify Slice 3 before heterogeneous real-broker cutovers; do not proceed with multi-step atomic-policy claims until the complete failure/recovery path is executable.
- id: NOTE-17-1
- sourceEvidence:
  - historical architecture evidence pinned at Git a5f23756531cc552b7e12b6d655ae1ffbcd28b64 (former lines 1385-1419): slice order requires durable Mock, approval, then compensation before real brokers
  - detailed design D15/D16: independent persistent broker ledger and seven crash cuts
  - services/uta/src/http/routes-simulator.ts:151-175: existing simulator can model partial fill/cancel but has direct in-process state mutation
- currentBehavior: Simulator endpoints provide useful stimuli, but no executable multi-step compensation protocol with independent crash-surviving venue facts exists in the examined path.
- problem: Proving only happy-path place then adding brokers leaves the load-bearing late-fill/abort/stale-worker mechanisms untested. An in-process mock erased with UTA cannot falsify duplicate recovery.
- preservedBehavior:
  - Mock can still simulate external activity, not just echo configured results
  - Real broker adaptation does not inherit mock-only Exact capability
- openQuestions: —

### NOTE-18-1

- chapter: 18
- note source (historical audit input; architecture references pinned to revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64): docs/uta-effect-runtime-architecture.md:1457-1463; docs/uta-live-testing.md:15-32,222-396; services/uta/src/domain/trading/__test__/e2e/README.md:81-92; services/uta/src/domain/trading/__test__/e2e/setup.ts:1-29,101-105
- note source paths: [docs/uta-effect-runtime-architecture.md](https://github.com/mouriya-s-lab/OpenAlice/blob/a5f23756531cc552b7e12b6d655ae1ffbcd28b64/docs/uta-effect-runtime-architecture.md) (pinned historical revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64)、[docs/uta-live-testing.md](../../../../docs/uta-live-testing.md)、[services/uta/src/domain/trading/__test__/e2e/README.md](../../../../services/uta/src/domain/trading/__test__/e2e/README.md)、[services/uta/src/domain/trading/__test__/e2e/setup.ts](../../../../services/uta/src/domain/trading/__test__/e2e/setup.ts)
- obligation: Real-broker acceptance protocol and scenario catalog
- gap: Legacy broker e2e setup correctly filters to paper/sandbox/demo accounts, but the existing suites do not implement the complete target acceptance evidence: exclusive alice-uta agent-surface execution, recorded before/after baseline, dispatch identity and raw status evidence, unknown-outcome reconciliation, compensation, failure cleanup/manual-stop handling, full applicable S1-S14 catalog, and explicit no-unexpected-open-orders finish.
- original requiredChange (historical audit input; not current target): Retain the non-live account gate, then run all applicable broker scenarios through the public agent surface, record baseline/identities/status/evidence, exercise unknown reconciliation and compensation, and finish flat or at the declared baseline with no unexpected open orders.
- id: NOTE-18-1
- sourceEvidence:
  - services/uta/src/domain/trading/__test__/e2e/setup.ts:25-29,97-105: non-live preset filtering exists but is not live account evidence
  - docs/uta-live-testing.md:15-32,224-298,327-350: exclusive agent surface, opt-in live lane and S1-S14 behaviors
  - docs/uta-live-testing.md:268-273: S7 nevertheless asks for direct broker probe script
  - docs/uta-live-testing.md:302-320: listing completeness, string ids, fees and child-order identities required
  - LiveEvidence design (current acceptance distinction; stable integration boundary K02/K07/K12): paper/session/entitlement hints versus real acceptance evidence
- currentBehavior: Legacy setup filters non-live accounts but initializes raw brokers; scenario catalog mixes exclusive alice-uta execution with a direct external-order probe in S7.
- problem: A suite can accidentally bypass approval/transport and still look green, omit unsupported applicable scenarios, or leave working protective/conditional orders hidden by partial listings.
- preservedBehavior:
  - Non-live preset gate and explicit live-paper opt-in stay mandatory
  - S5 verifies both protection legs including hidden trigger/held namespaces
  - S13 directories cannot trade; S14 derivative units/signs stay exact
  - Source inspection, mocks, paper markers and SDK method presence do not prove paper availability, entitlements or native guarantees
- openQuestions:
  - Current paper account availability, venue session/entitlements and concrete native retry/absence evidence are empirical and intentionally not queried during this design-only assignment.

### NOTE-18-2

- chapter: 18
- note source (historical audit input; architecture references pinned to revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64): docs/uta-effect-runtime-architecture.md:1465-1472; services/uta/package.json:1-35
- note source paths: [docs/uta-effect-runtime-architecture.md](https://github.com/mouriya-s-lab/OpenAlice/blob/a5f23756531cc552b7e12b6d655ae1ffbcd28b64/docs/uta-effect-runtime-architecture.md) (pinned historical revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64)、[services/uta/package.json](../../../../services/uta/package.json)
- obligation: Source, Docker, and packaged-Electron SQLite acceptance
- gap: Current UTA package/runtime has no mapped native SQLite dependency or executable evidence that every distribution opens/migrates the embedded database, survives abrupt termination, backup/restore, and OPENALICE_HOME relocation, or fails loudly on corruption.
- original requiredChange (historical audit input; not current target): Package the selected SQLite stack for every supported architecture and execute the complete source/Docker/Electron storage acceptance matrix against the real runtime.
- id: NOTE-18-2
- sourceEvidence:
  - services/uta/package.json:14-34: SQLite native runtime dependencies absent
  - services/uta/tsup.config.ts:11-19: node_modules/native modules remain external
  - Dockerfile:51-65,107-137: UTA has a separate production dependency closure
  - Dockerfile:143-159: OPENALICE_HOME=/data persistent volume
  - docs/data-locations.md:8-27,36-42: complete home versus narrower project transfer semantics
  - historical architecture evidence pinned at Git a5f23756531cc552b7e12b6d655ae1ffbcd28b64 (former lines 1465-1472): source/Docker/Electron storage acceptance requires native load, crash recovery, backup/restore, relocation, and loud corruption failure
  - detailed design D13/D15: exact semver/native ABI and executable API remain unexecuted
- currentBehavior: UTA builds an external-dependency ESM bundle; Docker separately deploys UTA production dependencies and persists the complete data volume. No examined manifest supplies SQLite.
- problem: A source install passing does not prove packaged native module ABI resolution, full WAL backup, relocation or corruption behavior. Project transfer excluding runtime identity is not automatically a safe trading-authority migration. A copied SQLite database can be internally consistent while being an arbitrary rollback or clone; databaseUuid, checksum, and journal high-watermark are audit metadata, not proof of sole ownership, freshness, or fencing of another host.
- preservedBehavior:
  - Docker retains independent UTA dependency closure and optional broker-pack separation
  - Data root remains portable complete home
  - Non-trading Alice can still run when UTA native driver is unavailable
  - Manifest/package metadata alone does not upgrade an unexecuted distribution cell or native ABI claim
- openQuestions:
  - Release-supported OS/architecture matrix and packaged native ABI load results must be supplied by the packaging execution slice; this assignment has inspected manifest/bundle/Docker contracts but does not fabricate executed distribution evidence.

### NOTE-19-1

- chapter: 19
- note source (historical audit input; architecture references pinned to revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64): docs/uta-effect-runtime-architecture.md:1474-1489
- note source paths: [docs/uta-effect-runtime-architecture.md](https://github.com/mouriya-s-lab/OpenAlice/blob/a5f23756531cc552b7e12b6d655ae1ffbcd28b64/docs/uta-effect-runtime-architecture.md) (pinned historical revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64)
- obligation: No process-external database, queue, or workflow requirement
- gap: Existing SQLite/scheduler recommendations do not explicitly forbid introducing an external database, durable queue, or workflow service as a runtime prerequisite.
- original requiredChange (historical audit input; not current target): Keep UTA self-contained with embedded SQLite and in-process Effect runtime; external infrastructure may not become required execution authority or recovery state.
- id: NOTE-19-1
- sourceEvidence:
  - historical architecture evidence pinned at Git a5f23756531cc552b7e12b6d655ae1ffbcd28b64 (former lines 1474-1489): forbids external authority stores/workflow engines and blind retries
  - services/uta/src/main.ts:63-168: current UTA process owns managers, poller, FX, snapshots and HTTP
  - Dockerfile:107-137,143-170: co-located UTA process and persistent home, not an external database prerequisite
- currentBehavior: UTA is a co-located service with local state and optional brokers; adding durability does not require a new infrastructure service.
- problem: Delegating scheduler/history to Redis/Postgres/workflow service would create deployment and recovery dependencies outside the chosen home and split execution authority.
- preservedBehavior:
  - UTA remains optional for non-trading users and deployable with the existing local/Docker process topology
  - Broker facts remain remote authority; embedded SQLite does not pretend to own venue state
- openQuestions: —

### NOTE-2-1

- chapter: 2
- note source (historical audit input; architecture references pinned to revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64): docs/uta-effect-runtime-architecture.md:89-105; src/webui/plugin.ts:226-256; src/webui/routes/trading-proxy.ts:1-12; src/webui/routes/trading-config.ts:80-337; src/tool/trading.ts:1-15,184-211,633-809; src/server/cli-commands.ts:241-296; src/services/connector-client/uta-review.ts:19-46,73-120,150-218; src/services/connector-client/action-bridge.ts:23-113
- note source paths: [docs/uta-effect-runtime-architecture.md](https://github.com/mouriya-s-lab/OpenAlice/blob/a5f23756531cc552b7e12b6d655ae1ffbcd28b64/docs/uta-effect-runtime-architecture.md) (pinned historical revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64)、[src/webui/plugin.ts](../../../../src/webui/plugin.ts)、[src/webui/routes/trading-proxy.ts](../../../../src/webui/routes/trading-proxy.ts)、[src/webui/routes/trading-config.ts](../../../../src/webui/routes/trading-config.ts)、[src/tool/trading.ts](../../../../src/tool/trading.ts)、[src/server/cli-commands.ts](../../../../src/server/cli-commands.ts)、[src/services/connector-client/uta-review.ts](../../../../src/services/connector-client/uta-review.ts)、[src/services/connector-client/action-bridge.ts](../../../../src/services/connector-client/action-bridge.ts)
- obligation: Alice/UTA process and authority boundary
- gap: These Alice-owned UI, CLI, native-agent, approval, proxy, and connector entry points are outside the UTA coverage denominator. The current trading-config path also writes accounts.json, restarts Guardian, and invokes UTA lifecycle operations from Alice, so the exact ownership cut is not represented by UTA-only rows.
- original requiredChange (historical audit input; not current target): Keep user/session/workspace authentication, presentation, and correlation in Alice; move account/broker lifecycle, compilation, approval state, execution, durable scheduling, reconciliation, and compensation authority into UTA. Define a typed authenticated BFF protocol across the process boundary.
- id: NOTE-2-1
- sourceEvidence:
  - src/webui/routes/trading-proxy.ts:1-12,29-34: loopback proxy explicitly has no Alice-to-UTA authentication and forwards correlation headers
  - src/webui/routes/trading-config.ts:216-249,272-331: Alice reads/writes account configuration, triggers reload/reconnect, and can wipe ephemeral history
  - src/tool/trading.ts:203-207,760-807: allowAiTrading=false returns a manual-approval response while true directly calls uta.push for committed pending work
  - src/server/cli-commands.ts:241-296: alice-uta exports git push/reject and other trading commands
  - src/services/connector-client/uta-review.ts:150-218: connector approval is pendingHash-based and readonly errors are classified by regex
  - src/services/connector-client/action-bridge.ts:45-91,111-140: connector UTA requests are claimed/released and processed outside a durable UTA transaction
- currentBehavior: Alice owns more than presentation: account CRUD and secret masking/unmasking run in Alice, connector actions fetch status then push/reject by hash, and the AI tool has an explicit allowAiTrading switch that can call uta.push directly when enabled. Loopback is the only interprocess trust assumption.
- problem: A host-local caller can bypass Alice presentation guards; a connector status check or client-supplied actor is not authorization for the plan eventually executed. The enabled AI path is an existing explicit capability, but its current boolean gate is outside UTA and does not durably bind actor, scope, revision, digest, policy version, and expiry. Configuration replacement and process restart have no transaction/recovery ownership fence.
- preservedBehavior:
  - Duplicate broker identity returns a conflict rather than silently creating a second authority
  - Account id remains stable across credential rotation
  - allowAiTrading=false remains an AwaitingApproval/manual Web UI path; explicit enabled policy retains the source auto-push capability only as a UTA-authorized auto-approval binding
  - Lite/read-only presentation and connector hidden-operation warnings remain explicit
- openQuestions: —

### NOTE-2-2

- chapter: 2
- note source (historical audit input; architecture references pinned to revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64): docs/uta-effect-runtime-architecture.md:98-105
- note source paths: [docs/uta-effect-runtime-architecture.md](https://github.com/mouriya-s-lab/OpenAlice/blob/a5f23756531cc552b7e12b6d655ae1ffbcd28b64/docs/uta-effect-runtime-architecture.md) (pinned historical revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64)
- obligation: Durable reconciliation and compensation ownership
- gap: Current order-sync and snapshot workers plus the FX service are mapped, but no current source implements a durable compensation worker owned by UTA.
- original requiredChange (historical audit input; not current target): Add journal-backed reconciliation and compensation workers under durable-scheduler; recovery and compensation decisions remain transaction-kernel authority.
- id: NOTE-2-2
- sourceEvidence:
  - services/uta/src/domain/trading/order-sync-poller.ts:53-98: timer scans healthy accounts and invokes sync with no durable job identity
  - services/uta/src/domain/trading/git/TradingGit.ts:141-155: operation errors become rejected results and there is no compensation phase
- currentBehavior: The poller can discover fills but cannot resume a persisted abort or distinguish an already-sent compensating mutation after restart.
- problem: A compensator built as a callback or finalizer loses both its applied-effect basis and its dispatch identity; retry can open an additional economic position.
- preservedBehavior:
  - An unhealthy broker does not stop unrelated account observations
  - Idle accounts do not repeatedly query known-empty pending books; scheduled external observation remains distinct
- openQuestions: —

### NOTE-4-1

- chapter: 4
- note source (historical audit input; architecture references pinned to revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64): docs/uta-effect-runtime-architecture.md:307-307
- note source paths: [docs/uta-effect-runtime-architecture.md](https://github.com/mouriya-s-lab/OpenAlice/blob/a5f23756531cc552b7e12b6d655ae1ffbcd28b64/docs/uta-effect-runtime-architecture.md) (pinned historical revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64)
- obligation: Effect Queue boundary
- gap: No current facility implements Queue as bounded admission/worker wake-up while durable jobs remain authoritative in SQLite. Legacy queues and Promise chains either lack capacity or durability separation.
- original requiredChange (historical audit input; not current target): Use a configured-capacity Effect Queue only for admission/wake-up, block producers at capacity, and persist EffectJob identity before any broker mutation. Never present the Queue as the authoritative job store.
- id: NOTE-4-1
- sourceEvidence:
  - historical architecture evidence pinned at Git a5f23756531cc552b7e12b6d655ae1ffbcd28b64 (former lines 920-951): bounded writer queue, take/drain group commit and post-commit Deferred
  - services/uta/src/domain/trading/git/TradingGit.ts:171-179: persistence occurs after memory commit/head mutation
- currentBehavior: Current execution has a per-instance inflight boolean, not a bounded process-wide durable admission service.
- problem: A naive queue implementation can acknowledge before commit, drop blocked callers, deadlock outcome ingestion behind new admission, or evaluate conflicting commands against the same pre-batch state.
- preservedBehavior:
  - Callers still receive explicit per-command errors; one business conflict must not reject unrelated commands
  - No silent batch-size truncation; configured queue capacities remain visible
- openQuestions: —

### NOTE-4-2

- chapter: 4
- note source (historical audit input; architecture references pinned to revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64): docs/uta-effect-runtime-architecture.md:308-308
- note source paths: [docs/uta-effect-runtime-architecture.md](https://github.com/mouriya-s-lab/OpenAlice/blob/a5f23756531cc552b7e12b6d655ae1ffbcd28b64/docs/uta-effect-runtime-architecture.md) (pinned historical revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64)
- obligation: STM / TRef boundary
- gap: No current facility explicitly models atomic in-memory ProposalSnapshot views while preventing them from becoming crash-recovery authority.
- original requiredChange (historical audit input; not current target): Use STM/TRef only for editable pre-prepare proposal views; after prepare, journal-backed transaction/version/job state is authoritative and restart-recoverable.
- id: NOTE-4-2
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.ts:61-116: stagingArea/pendingHash are mutable memory state
  - historical architecture evidence pinned at Git a5f23756531cc552b7e12b6d655ae1ffbcd28b64 (former lines 307-308): STM is limited to proposal views
- currentBehavior: Staging mutates an array and commit derives a hash from current operations/time, but neither edit nor prepare is journal-backed.
- problem: Making a TRef snapshot authoritative after prepare would let cache eviction or restart invalidate a plan without a durable revision transition.
- preservedBehavior:
  - User can stage and review before external mutation
  - Editing an approved/prepared plan requires reapproval rather than mutating queued work
- openQuestions: —

### NOTE-5-1

- chapter: 5
- note source (historical audit input; architecture references pinned to revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64): docs/uta-effect-runtime-architecture.md:315-338
- note source paths: [docs/uta-effect-runtime-architecture.md](https://github.com/mouriya-s-lab/OpenAlice/blob/a5f23756531cc552b7e12b6d655ae1ffbcd28b64/docs/uta-effect-runtime-architecture.md) (pinned historical revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64)
- obligation: Decision and Evolution contracts
- gap: Current guards, switch dispatch, and mutable aggregates do not implement a canonical decide result containing non-empty events plus external effects or a pure exhaustive evolve boundary.
- original requiredChange (historical audit input; not current target): Add typed Decision&lt;State, Command, Event, ExternalEffect, Failure&gt; and Evolution&lt;State, Event&gt;; decisions are pure, accepted facts become durable events, and evolution exhaustively applies them.
- id: NOTE-5-1
- sourceEvidence:
  - historical architecture evidence pinned at Git a5f23756531cc552b7e12b6d655ae1ffbcd28b64 (former lines 317-355): baseline Decision only admits nonempty-event success and state has twelve variants
  - services/uta/src/domain/trading/git/TradingGit.ts:141-184: booleans/rejected strings collapse execution outcomes
- currentBehavior: A pushed batch gathers heterogeneous results without a replayable transaction-state event transition model.
- problem: The baseline Decision cannot represent a duplicate without emitting fake facts; its state payloads lose plan/progress during reconciliation. State/event completeness must cover initial creation, draft edits, approvals, dispatch, rejection, compensation and recovery.
- preservedBehavior:
  - Rejection before dispatch has no external undo work; show Compensated(NoEffectsApplied) rather than pretending a trade was reversed
  - Committed at acceptance continues independent order observation without reopening its historical criterion
- openQuestions: —

### NOTE-5-2

- chapter: 5
- note source (historical audit input; architecture references pinned to revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64): docs/uta-effect-runtime-architecture.md:403-412
- note source paths: [docs/uta-effect-runtime-architecture.md](https://github.com/mouriya-s-lab/OpenAlice/blob/a5f23756531cc552b7e12b6d655ae1ffbcd28b64/docs/uta-effect-runtime-architecture.md) (pinned historical revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64)
- obligation: Lock release lifecycle invariant
- gap: Mappings mention durable locks but no current implementation guarantees release only after terminal state or explicit operator-owned recovery is durable.
- original requiredChange (historical audit input; not current target): Persist lock ownership/release with transaction transitions and prohibit release before Committed, Compensated, or durable RecoveryRequired ownership.
- id: NOTE-5-2
- sourceEvidence:
  - historical architecture evidence pinned at Git a5f23756531cc552b7e12b6d655ae1ffbcd28b64 (former lines 403-412 and 1014-1018): lock release constrained by durable state; baseline lock row includes lease expiry
- currentBehavior: No durable lock owner exists; inflightWrite is a process-local wallet guard.
- problem: Treating LogicalLock.lease_expires_at like a worker lease would release economic exclusion while a remote mutation is unknown. Merely naming RecoveryRequired cannot safely allow conflicting new trades.
- preservedBehavior:
  - No-effect rejection permits a new proposal
  - Prepared plan editing remains possible, but only via a provably unexecuted revision boundary
- openQuestions: —

### NOTE-5-3

- chapter: 5
- note source (historical audit input; architecture references pinned to revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64): docs/uta-effect-runtime-architecture.md:418-430
- note source paths: [docs/uta-effect-runtime-architecture.md](https://github.com/mouriya-s-lab/OpenAlice/blob/a5f23756531cc552b7e12b6d655ae1ffbcd28b64/docs/uta-effect-runtime-architecture.md) (pinned historical revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64)
- obligation: Complete CommitCriterion ADT
- gap: No current type represents AcceptedByVenue, WorkingAtVenue, FullyFilled, TargetExposureReached, and NativeAtomicGroupConfirmed as an immutable prepared-plan criterion.
- original requiredChange (historical audit input; not current target): Add the exhaustive ADT to PreparedPlan and require settlement to evaluate it; venue acceptance must never be reinterpreted as fill completion.
- id: NOTE-5-3
- sourceEvidence:
  - historical architecture evidence pinned at Git a5f23756531cc552b7e12b6d655ae1ffbcd28b64 (former lines 418-430): five immutable commit criterion variants
  - services/uta/src/domain/trading/git/TradingGit.ts:181-184: submitted/rejected determines push response
  - services/uta/src/domain/trading/order-sync-poller.ts:77-85: fills are discovered after push
- currentBehavior: Push reports submission while later sync discovers execution; this distinction is real and must survive the new transaction terminology.
- problem: One generic Confirmed value can be incorrectly treated as fulfilment of every criterion; native group id may not exist until dispatch although the plan must be immutable before approval.
- preservedBehavior:
  - Submitted orders remain queryable and continue sync after acceptance-level settlement
  - No claim that venue acceptance means filled
- openQuestions: —

### NOTE-5-4

- chapter: 5
- note source (historical audit input; architecture references pinned to revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64): docs/uta-effect-runtime-architecture.md:432-444
- note source paths: [docs/uta-effect-runtime-architecture.md](https://github.com/mouriya-s-lab/OpenAlice/blob/a5f23756531cc552b7e12b6d655ae1ffbcd28b64/docs/uta-effect-runtime-architecture.md) (pinned historical revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64)
- obligation: Complete CompensationCapability ADT
- gap: No current contract models Exact, StateRestoring, Economic with risk, and None with reason, or enforces policy-specific admission. Cancel plus replace is currently treated too casually despite identity and queue-priority loss.
- original requiredChange (historical audit input; not current target): Compile a capability for every step during prepare, enforce allowed classes per execution policy, and never classify cancel-plus-replace as exact rollback.
- id: NOTE-5-4
- sourceEvidence:
  - historical architecture evidence pinned at Git a5f23756531cc552b7e12b6d655ae1ffbcd28b64 (former lines 432-444): function-bearing compensation union and explicit cancel-replace loss
  - services/uta/src/domain/trading/UnifiedTradingAccount.ts:180-196: direct mutation dispatcher has no applied-state-specific undo contract
  - Alpaca provider design: client identity/observation are separate; server idempotency, child-group and close semantics remain conformance evidence
  - CcxtCore provider design: Unknown is RecoveryRequired; native idempotency evidence remains insufficient
  - Ibkr provider design: unknown dispatch/listing evidence and client idempotency/complete lookup remain unproven
  - Longbridge provider design: post-dispatch Unknown and native idempotency/absence/protection remain conformance gaps
- currentBehavior: Mutations directly call the broker and no prepared restoration claim or evidence scope is recorded.
- problem: An undo closure cannot be journaled, and reverse BUY/SELL does not restore cash, fees, queue priority or identity. A capability judged before a fill is not a future guarantee.
- preservedBehavior:
  - Partial-close quantity is checked against observed exposure
  - Cancel and replace never advertises Exact when venue identity/priority changes
  - Mock reversible-ledger behavior and SDK method presence never upgrade a real adapter's compensation or idempotency class
- openQuestions:
  - Which real broker/action combinations have empirically proven restoration and idempotency guarantees remains adapter-specific acceptance evidence; unproven capabilities are unavailable, not assumed.

### NOTE-5-5

- chapter: 5
- note source (historical audit input; architecture references pinned to revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64): docs/uta-effect-runtime-architecture.md:446-456
- note source paths: [docs/uta-effect-runtime-architecture.md](https://github.com/mouriya-s-lab/OpenAlice/blob/a5f23756531cc552b7e12b6d655ae1ffbcd28b64/docs/uta-effect-runtime-architecture.md) (pinned historical revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64)
- obligation: Complete ExecutionPolicy ADT
- gap: No current type represents IndependentBatch, AllOrCompensate with accepted undo class, and VenueNativeAtomic with mechanism. Git grouping, approval messages, and request grouping can be mistaken for atomicity.
- original requiredChange (historical audit input; not current target): Add the exhaustive policy ADT, bind it to the prepared transaction, and enforce compensation/native-atomic evidence during admission and settlement.
- id: NOTE-5-5
- sourceEvidence:
  - historical architecture evidence pinned at Git a5f23756531cc552b7e12b6d655ae1ffbcd28b64 (former lines 446-456): three policies do not imply grouping atomicity
  - services/uta/src/domain/trading/git/TradingGit.ts:141-155: legacy loop continues after each known failure
- currentBehavior: Legacy push executes each operation even when an earlier one rejects. It does not undo successful siblings.
- problem: An implicit stop default would silently change the existing behavior. AllOrCompensate and native atomicity also need admission-time group membership and capability evidence rather than a group label.
- preservedBehavior:
  - Legacy independent batches continue on known rejection and retain successful siblings
  - Unknown always suspends remaining forward steps; unsafe legacy catch-as-reject is intentionally removed
- openQuestions: —

### NOTE-7-1

- chapter: 7
- note source (historical audit input; architecture references pinned to revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64): docs/uta-effect-runtime-architecture.md:884-918
- note source paths: [docs/uta-effect-runtime-architecture.md](https://github.com/mouriya-s-lab/OpenAlice/blob/a5f23756531cc552b7e12b6d655ae1ffbcd28b64/docs/uta-effect-runtime-architecture.md) (pinned historical revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64)
- obligation: Selected embedded SQLite stack and authority boundary
- gap: No current source composes effect, @effect/sql, @effect/sql-sqlite-node, and better-sqlite3 at &lt;OPENALICE_HOME&gt;/data/trading/uta.sqlite with WAL, foreign keys, full synchronous durability, read-only query services, and typed no-bypass storage failures.
- original requiredChange (historical audit input; not current target): Add the single process-local database Layer, monotonic migrations, versioned Effect Schema codecs, required pragmas, one writer service, read-only query access, and typed StorageFailure. Distinguish SQLite physical WAL from the UTA domain journal.
- id: NOTE-7-1
- sourceEvidence:
  - services/uta/package.json:14-34: runtime dependencies contain Hono/Zod/Decimal but no selected Effect/SQLite stack
  - services/uta/src/domain/trading/git-persistence.ts:14-47: per-account JSON read/fallback/write authority
  - historical architecture evidence pinned at Git a5f23756531cc552b7e12b6d655ae1ffbcd28b64 (former lines 884-918): selected embedded stack, one path and required pragmas
  - docs/data-locations.md:8-27: complete-home isolation forbids two writers sharing one home
  - detailed design D13/D17: exact semver/native ABI and executable API remain to be locked in an implementation slice
- currentBehavior: Each account loads a JSON commit history and rewrites it; database authority and crash barrier do not exist.
- problem: File histories cannot atomically couple several accounts, command receipts, locks and dispatch jobs. A driver silently opening an alternate path or disabling synchronous durability would falsify receipt semantics.
- preservedBehavior:
  - OPENALICE_HOME remains the portable user data root
  - No secret moves into trading database
  - An optional UTA failure must not prevent non-trading Alice use
  - Embedded SQLite remains an implementation option for controlled-effect authority; exact library/package/ABI availability is an empirical gate rather than a capability-composition requirement
- openQuestions:
  - Exact compatible Effect/sql/sqlite-node/better-sqlite3 semver and native binary build/ABI evidence are absent from the current UTA manifest; first storage slice must lock and execute them before availability claims.

### NOTE-7-2

- chapter: 7
- note source (historical audit input; architecture references pinned to revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64): docs/uta-effect-runtime-architecture.md:953-1043
- note source paths: [docs/uta-effect-runtime-architecture.md](https://github.com/mouriya-s-lab/OpenAlice/blob/a5f23756531cc552b7e12b6d655ae1ffbcd28b64/docs/uta-effect-runtime-architecture.md) (pinned historical revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64)
- obligation: Authoritative table model and schema constraints
- gap: No current schema implements TRANSACTIONS, TRANSACTION_EVENTS, TRANSACTION_STEPS, DISPATCH_ATTEMPTS, EFFECT_JOBS, LOGICAL_LOCKS, REMOTE_OBSERVATIONS, COMPENSATION_STEPS, and PROJECTION_CHECKPOINTS with the listed keys, relationships, lease/idempotency fields, and named payload schemas.
- original requiredChange (historical audit input; not current target): Introduce these tables and FK/PK constraints in journal-store migrations; every payload uses a named versioned runtime schema and participates in the one logical writer transaction.
- id: NOTE-7-2
- sourceEvidence:
  - historical architecture evidence pinned at Git a5f23756531cc552b7e12b6d655ae1ffbcd28b64 (former lines 953-1043): nine baseline tables omit receipt/epoch/schema association constraints
  - services/uta/src/domain/trading/git-persistence.ts:28-47: persisted JSON currently has no schema decode or relational validation
- currentBehavior: JSON history has no FK/version uniqueness guaranteeing a job belongs to its exact prepared step or compensation direction.
- problem: Nine table names alone permit orphan jobs, reused dispatch identity, partially leased rows and unbound compensation sources. Logical locks cannot use SQL string uniqueness alone for parent/child conflicts.
- preservedBehavior:
  - Order ids remain strings and decimal fields serialize as decimal strings
  - Legacy history remains audit evidence even when not safe to import as executable work
- openQuestions: —

### NOTE-8-1

- chapter: 8
- note source (historical audit input; architecture references pinned to revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64): docs/uta-effect-runtime-architecture.md:1065-1078
- note source paths: [docs/uta-effect-runtime-architecture.md](https://github.com/mouriya-s-lab/OpenAlice/blob/a5f23756531cc552b7e12b6d655ae1ffbcd28b64/docs/uta-effect-runtime-architecture.md) (pinned historical revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64)
- obligation: ConflictKey ADT and scheduler exclusion
- gap: Current code has scattered account/order/exposure guards but no exhaustive Account/Exposure/Order/Connection ConflictKey contract or scheduler guarantee that same-key jobs exclude while independent partitions progress within broker limits.
- original requiredChange (historical audit input; not current target): Compile and persist conflict keys during prepare; enforce same-key non-concurrency and allow independent-key concurrency only within connection-declared limits.
- id: NOTE-8-1
- sourceEvidence:
  - historical architecture evidence pinned at Git a5f23756531cc552b7e12b6d655ae1ffbcd28b64 (former lines 1065-1078): Account/Exposure/Order/Connection conflict keys
  - services/uta/src/domain/trading/UnifiedTradingAccount.ts:665-688,784-790: sub-account is omitted or only message-stamped
- currentBehavior: Wallet-wide memory guards do not identify order/exposure conflicts or persist explicit sub-account scope.
- problem: Equal-string locks miss Account-versus-Order hierarchy; a single Connection key on every order removes legitimate concurrency. Partial acquisition can deadlock cross-account multi-step plans.
- preservedBehavior:
  - Same order mutation remains excluded
  - Independent instruments/accounts can progress subject to shared cash reservations and connection limits
- openQuestions: —

### NOTE-8-2

- chapter: 8
- note source (historical audit input; architecture references pinned to revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64): docs/uta-effect-runtime-architecture.md:1080-1092
- note source paths: [docs/uta-effect-runtime-architecture.md](https://github.com/mouriya-s-lab/OpenAlice/blob/a5f23756531cc552b7e12b6d655ae1ffbcd28b64/docs/uta-effect-runtime-architecture.md) (pinned historical revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64)
- obligation: Atomic lease acquisition and dispatch-boundary recovery
- gap: No current worker atomically selects eligible unleased work, stamps owner/expiry, appends JobClaimed, commits, and then executes. Restart cannot distinguish reclaim from work that crossed dispatch.
- original requiredChange (historical audit input; not current target): Implement the complete SQLite lease transaction; expired pre-dispatch work may be reclaimed, while any prior attempt across the dispatch boundary enters observation/reconciliation rather than blind redispatch.
- id: NOTE-8-2
- sourceEvidence:
  - historical architecture evidence pinned at Git a5f23756531cc552b7e12b6d655ae1ffbcd28b64 (former lines 1080-1092 and 1264-1291): lease transaction and insufficient DispatchPlanned-only sequence
  - services/uta/src/domain/trading/git/TradingGit.ts:119-125: finally only clears a memory guard
- currentBehavior: No durable boundary distinguishes a claimed but unsent operation from a broker-accepted operation whose response was lost.
- problem: Lease expiration fences local writes but cannot revoke a paused worker's network call. Reclaiming as fresh dispatch after a possible send creates duplicate economic effects.
- preservedBehavior:
  - Connection recovery is independent and may continue for unrelated accounts
  - Valid late broker facts are not discarded merely because a worker lease expired
- openQuestions: —

### NOTE-8-3

- chapter: 8
- note source (historical audit input; architecture references pinned to revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64): docs/uta-effect-runtime-architecture.md:1094-1101
- note source paths: [docs/uta-effect-runtime-architecture.md](https://github.com/mouriya-s-lab/OpenAlice/blob/a5f23756531cc552b7e12b6d655ae1ffbcd28b64/docs/uta-effect-runtime-architecture.md) (pinned historical revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64)
- obligation: Fair blocking admission and separate lossy market data
- gap: Current timers/queues do not express connection concurrency/rate policy, starvation-safe priority, no-drop trading backpressure, and explicit separation from lossy/coalescing market-data streams.
- original requiredChange (historical audit input; not current target): Declare typed per-connection limits, block trading producers at capacity, prohibit truncation/drop, and isolate any explicitly lossy market-data policy from durable command admission.
- id: NOTE-8-3
- sourceEvidence:
  - services/uta/src/domain/trading/order-sync-poller.ts:53-95: one running flag plus serial account loop lets a slow account delay later accounts
  - historical architecture evidence pinned at Git a5f23756531cc552b7e12b6d655ae1ffbcd28b64 (former lines 1094-1101): explicit no-drop trading admission and starvation prevention
  - historical architecture evidence pinned at Git a5f23756531cc552b7e12b6d655ae1ffbcd28b64 (former lines 949-951): writer drains available work without silent cap
- currentBehavior: Polling is serialized in process order and scheduling policy is hidden in timer cadence rather than an auditable connection budget.
- problem: Always preferring recovery/high priority can starve normal work; always bypassing a blocked multi-key job can let younger single-key jobs prevent it forever. Queue capacity alone does not cap durable outstanding work.
- preservedBehavior:
  - No new public provider/broker calls for idle work
  - One bad broker does not starve unrelated healthy connection queues
- openQuestions: —

### NOTE-8-4

- chapter: 8
- note source (historical audit input; architecture references pinned to revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64): docs/uta-effect-runtime-architecture.md:1103-1117
- note source paths: [docs/uta-effect-runtime-architecture.md](https://github.com/mouriya-s-lab/OpenAlice/blob/a5f23756531cc552b7e12b6d655ae1ffbcd28b64/docs/uta-effect-runtime-architecture.md) (pinned historical revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64)
- obligation: Complete preconditions including buying power
- gap: No chapter mapping names BuyingPowerAtLeast(amount), and current live checks do not durably bind external-state versions or require re-prepare when invalidated.
- original requiredChange (historical audit input; not current target): Add TransactionVersion, OrderVersion, ExposureSnapshot, and BuyingPowerAtLeast variants to PreparedStep; external invalidation yields a typed conflict and explicit re-prepare.
- id: NOTE-8-4
- sourceEvidence:
  - services/uta/src/domain/trading/UnifiedTradingAccount.ts:572-595: close amount rereads positions but has no version/freshness binding
  - historical architecture evidence pinned at Git a5f23756531cc552b7e12b6d655ae1ffbcd28b64 (former lines 1108-1117): preconditions include ExposureSnapshot and BuyingPowerAtLeast
- currentBehavior: Partial close validates the latest quantity against an unversioned broker position before dispatch; other preconditions are not immutable plan inputs.
- problem: External snapshot mismatch cannot safely be swallowed into retry. Two different instruments can each pass the same buying power check unless their unsettled spending is reserved locally.
- preservedBehavior:
  - Close quantity remains positive and no greater than observed exposure
  - Local check is not advertised as native reduce-only or cross-venue serializability
- openQuestions: —

### NOTE-9-1

- chapter: 9
- note source (historical audit input; architecture references pinned to revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64): docs/uta-effect-runtime-architecture.md:1119-1185
- note source paths: [docs/uta-effect-runtime-architecture.md](https://github.com/mouriya-s-lab/OpenAlice/blob/a5f23756531cc552b7e12b6d655ae1ffbcd28b64/docs/uta-effect-runtime-architecture.md) (pinned historical revision a5f23756531cc552b7e12b6d655ae1ffbcd28b64)
- obligation: Complete broker service-provider interface
- gap: Current adapters expose legacy Promise-based IBroker objects, mutable connection state, direct mutations, static capability arrays, and ad hoc observation. No current broker-spi module implements the complete scoped BrokerConnectionService, typed BrokerActionInterpreter dispatch/observe/compensation contract, RemoteOutcome ADT, and context-derived ActionAvailability.
- original requiredChange (historical audit input; not current target): Introduce the complete typed SPI with the first executable broker slice: scoped connection Layer, runtime action schema, contextual availability, durable dispatch identity, separate observe RemoteOutcome, typed failures, and compensation compilation. Migrate each adapter without allowing old and new paths to own the same mutation.
- id: NOTE-9-1
- sourceEvidence:
  - services/uta/src/domain/trading/UnifiedTradingAccount.ts:180-205: Promise&lt;unknown&gt; dispatcher and guard pipeline
  - services/uta/src/domain/trading/brokers/types.ts:1-7: legacy broker types re-export public package
  - historical architecture evidence pinned at Git a5f23756531cc552b7e12b6d655ae1ffbcd28b64 (former lines 1121-1185): scoped connection, interpreter, outcome and contextual capability requirements
  - Alpaca provider design: client identity and broker idempotency/child-group evidence remain acceptance facts
  - CcxtCore provider design: Unknown is RecoveryRequired and native idempotency evidence is not established
  - CcxtVenues provider design: timeout requires observation and venue coverage; partial listings are not absence
  - Ibkr provider design: lookup scope and native idempotency remain unproven
  - Longbridge provider design: post-dispatch Unknown and native absence/idempotency remain open
- currentBehavior: UnifiedTradingAccount calls one generic broker interface directly and receives erased mutation results; public broker types are coupled through a compatibility re-export.
- problem: An interpreter whose Action/Ack/Observation generics widen independently can return an observation for the wrong action. Runtime availability must not serialize Schema or functions into a plan or client response.
- preservedBehavior:
  - All existing order-entry features remain represented and receive explicit capability decisions
  - Connection-specific health is preserved without embedding transaction state in the connection
  - Unproven SDK/mock outcomes, empty listings and transport acknowledgements never become native capability evidence
- openQuestions:
  - Each broker's native idempotency horizon, complete lookup namespaces and absence/fencing proof require real broker evidence; without it retry capability is ReconcileBeforeRetry only.
