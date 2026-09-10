
# HttpRoutes — source investigation and migration evidence


## Entries

### MAP-0682C42EA8

- mapping source: [services/uta/src/__tests__/trading-tools.spec.ts:169-193](../../../../services/uta/src/__tests__/trading-tools.spec.ts#L169-L193)
- symbol: getOrders.UNSETFiltering
- id: MAP-0682C42EA8
- sourceEvidence:
  - services/uta/src/__tests__/trading-tools.spec.ts:169-193: Mocks a raw OpenOrder with IBKR UNSET numeric values and zero parentId, then verifies that unset optional fields are omitted from the returned order summary.
- currentBehavior: Mocks a raw OpenOrder with IBKR UNSET numeric values and zero parentId, then verifies that unset optional fields are omitted from the returned order summary.
- problem: 测试在工具摘要层过滤 IBKR UNSET_DOUBLE、UNSET_DECIMAL 与 parentId=0；若 decoder 不在 adapter 统一处理，重启或其它 broker 仍可能把 sentinel 持久化成业务值。
- preservedBehavior:
  - 保留未设置 lmt/aux/trail/parent/tpsl 不出现在 summary。
  - 保留 status/order identity 等非 optional 字段。
- openQuestions:
  - 仍需在各 broker adapter 核实 native sentinel 的完整集合与版本；Mock/IBKR 当前证据只覆盖此测试使用的几种。

### MAP-07DB18F4C8

- mapping source: [services/uta/src/__tests__/trading-tools.spec.ts:213-228](../../../../services/uta/src/__tests__/trading-tools.spec.ts#L213-L228)
- symbol: getOrders.decimalSerialization
- id: MAP-07DB18F4C8
- sourceEvidence:
  - services/uta/src/__tests__/trading-tools.spec.ts:213-228: Sets a small Decimal limit price and verifies that the tool emits the exact decimal string instead of a JavaScript number.
- currentBehavior: Sets a small Decimal limit price and verifies that the tool emits the exact decimal string instead of a JavaScript number.
- problem: 测试证明小数价格在当前工具输出仍是字符串，却没有证明 Decimal 文本穿过 draft、journal、projection 和 native compile 后仍精确。
- preservedBehavior:
  - 保留 `0.00001234` 原样输出为字符串。
  - 保留 Decimal arithmetic 在 adapter/domain 内完成。
- openQuestions: —

### MAP-08E9053B72

- mapping source: [services/uta/src/__tests__/trading-tools.spec.ts:314-329](../../../../services/uta/src/__tests__/trading-tools.spec.ts#L314-L329)
- symbol: createTradingTools.getContractDetails.expansion
- id: MAP-08E9053B72
- sourceEvidence:
  - services/uta/src/__tests__/trading-tools.spec.ts:314-329: Calls getContractDetails with a source and Alice identifier, spies on the broker, and verifies that the broker receives an expanded native query retaining the original identifier.
- currentBehavior: Calls getContractDetails with a source and Alice identifier, spies on the broker, and verifies that the broker receives an expanded native query retaining the original identifier.
- problem: 测试用 broker spy 证明 aliceId 被展开为 native contract；details 的 expansion filters、identity provenance 和 raw ContractDetails 脱敏没有被协议约束。
- preservedBehavior:
  - 保留输入 aliceId 展开为 native query 且 identity 不丢失。
  - 保留 search-&gt;details 的 drilldown 用法。
- openQuestions: —

### MAP-0B6606BE1C

- mapping source: [services/uta/src/__tests__/trading-tools.spec.ts:103-119](../../../../services/uta/src/__tests__/trading-tools.spec.ts#L103-L119)
- symbol: createTradingTools.searchContracts
- id: MAP-0B6606BE1C
- sourceEvidence:
  - services/uta/src/__tests__/trading-tools.spec.ts:103-119: Spies on two separate MockBroker instances and verifies that searchContracts aggregates one matching contract description from each registered UTA.
- currentBehavior: Spies on two separate MockBroker instances and verifies that searchContracts aggregates one matching contract description from each registered UTA.
- problem: 搜索测试仅用两个 broker spy 聚合 ContractDescription；它没有表达 allSettled 后的 Partial coverage，也没有证明 native contract 已被转换为 canonical InstrumentId。
- preservedBehavior:
  - 保留两个 MockBroker 的同 pattern 结果聚合为两条。
  - 保留单 broker 失败不使全量搜索失败。
- openQuestions: —

### MAP-0C2AAEE0A8

- mapping source: [services/uta/src/__tests__/trading-tools.spec.ts:230-242](../../../../services/uta/src/__tests__/trading-tools.spec.ts#L230-L242)
- symbol: getOrders.orderIdentity
- id: MAP-0C2AAEE0A8
- sourceEvidence:
  - services/uta/src/__tests__/trading-tools.spec.ts:230-242: Provides a string orderId from getPendingOrderIds while the native Order carries a numeric sentinel, and verifies that the returned summary preserves the explicit string identity.
- currentBehavior: Provides a string orderId from getPendingOrderIds while the native Order carries a numeric sentinel, and verifies that the returned summary preserves the explicit string identity.
- problem: 测试以 getPendingOrderIds 的字符串覆盖 native Order 的数值 sentinel；若该 join 规则不进入持久 projection，长 ID 或重启后仍可能被 numeric orderId 覆盖。
- preservedBehavior:
  - 保留 `uuid-abc-123` 从 getPendingOrderIds 输出。
  - 避免 19 位 CCXT id 被 native numeric orderId 截断。
- openQuestions: —

### MAP-0CD7FA4541

- mapping source: [services/uta/src/__tests__/trading-tools.spec.ts:195-211](../../../../services/uta/src/__tests__/trading-tools.spec.ts#L195-L211)
- symbol: getOrders.optionalFields
- id: MAP-0CD7FA4541
- sourceEvidence:
  - services/uta/src/__tests__/trading-tools.spec.ts:195-211: Mocks a limit order with a lmtPrice and nested take-profit/stop-loss values and verifies that explicitly present optional fields survive summarization.
- currentBehavior: Mocks a limit order with a lmtPrice and nested take-profit/stop-loss values and verifies that explicitly present optional fields survive summarization.
- problem: 测试只确认 lmtPrice 和 tpsl 在摘要中出现；它没有把这些字段绑定到 OrderType/ProtectionSpec 的合法关系，也无法区分 capability unavailable 与静默丢失。
- preservedBehavior:
  - 保留显式 lmtPrice 与 nested takeProfit/stopLoss 在 summary 中可见。
  - 保留精确价格字符串。
- openQuestions: —

### MAP-0E76C75480

- mapping source: [services/uta/src/http/routes-simulator.ts:105-114](../../../../services/uta/src/http/routes-simulator.ts#L105-L114)
- symbol: createSimulatorRoutes and GET /utas
- id: MAP-0E76C75480
- sourceEvidence:
  - services/uta/src/http/routes-simulator.ts:105-114: Creates an independent Hono app and lists only manager entries whose broker is a MockBroker, returning id/label summaries.
- currentBehavior: Creates an independent Hono app and lists only manager entries whose broker is a MockBroker, returning id/label summaries.
- problem: This endpoint is a simulator fixture discovery surface, not a target transaction API; it must not be mistaken for the authoritative account/capability listing. The route has no authenticated transport principal or separate operation-authorization check; direct MockBroker mutation is mounted as an HTTP surface.
- preservedBehavior:
  - 保留 GET /utas 只列 MockBroker simulator，不列 real object。
  - 保留 id/label 对 dev UI 的发现能力。
- openQuestions: —

### MAP-0FC7B6DD68

- mapping source: [services/uta/src/http/routes-trading.ts:84-88](../../../../services/uta/src/http/routes-trading.ts#L84-L88)
- symbol: readExpectedPendingHash
- id: MAP-0FC7B6DD68
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:84-88: Extracts and trims a legacy expectedPendingHash from an unknown request body, returning undefined for absent/non-string values.
- currentBehavior: Extracts and trims a legacy expectedPendingHash from an unknown request body, returning undefined for absent/non-string values.
- problem: readExpectedPendingHash 从 unknown body 中提取并 trim Git hash；它让 process-local staging hash 成为 approval 身份，绕过 canonical plan digest、revision、expiry 和 actor binding。
- preservedBehavior:
  - 保留旧 hash 作为 optimistic conflict 的安全目的，不保留其 Git-specific 形状。
  - 保留缺字段不触发 mutation。
- openQuestions: —

### MAP-146D2109B6

- mapping source: [services/uta/src/http/routes-trading.ts:90-95](../../../../services/uta/src/http/routes-trading.ts#L90-L95)
- symbol: resolveAccount
- id: MAP-146D2109B6
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:90-95: Reads the path id and directly resolves a UnifiedTradingAccount through UTAEngineContext. Missing ids return null for each caller to turn into a local 404.
- currentBehavior: Reads the path id and directly resolves a UnifiedTradingAccount through UTAEngineContext. Missing ids return null for each caller to turn into a local 404.
- problem: Path strings are passed directly into in-process account lookup with no protocol decoding, authorization decision, or projection/service boundary.
- preservedBehavior:
  - 保留不存在账户 404 语义。
  - 保留同一 route 可以按 account id 定位，但不暴露 UnifiedTradingAccount。
- openQuestions: —

### MAP-165076A00B

- mapping source: [services/uta/src/http/trading-order-entry.spec.ts:222-233](../../../../services/uta/src/http/trading-order-entry.spec.ts#L222-L233)
- symbol: place-order commit-message propagation test
- id: MAP-165076A00B
- sourceEvidence:
  - services/uta/src/http/trading-order-entry.spec.ts:222-233: Posts a one-shot order and asserts the exact user message is passed to legacy uta.commit.
- currentBehavior: Posts a one-shot order and asserts the exact user message is passed to legacy uta.commit.
- problem: 测试把 human message 转发给 uta.commit；message 因此看似执行输入，未区分 TradeAction、approval actor、audit rationale 和 broker payload。
- preservedBehavior:
  - 保留 exact human message visible in audit history where supplied.
  - Remove forwarding assertion to `uta.commit(message)` as execution contract.
- openQuestions: —

### MAP-1BDBE358B1

- mapping source: [services/uta/src/http/simulator.spec.ts:130-150](../../../../services/uta/src/http/simulator.spec.ts#L130-L150)
- symbol: external-deposit route test
- id: MAP-1BDBE358B1
- sourceEvidence:
  - services/uta/src/http/simulator.spec.ts:130-150: Calls the simulator endpoint with a wallet-source deposit, then checks MockBroker position quantity, wallet avg-cost source, and mark-price placeholder cost.
- currentBehavior: Calls the simulator endpoint with a wallet-source deposit, then checks MockBroker position quantity, wallet avg-cost source, and mark-price placeholder cost.
- problem: external-deposit 测试只观察进程内 position 的 wallet cost source/mark placeholder；没有 observation identity、dedup、MissingMark/Indeterminate 或 accounting projection 证据。
- preservedBehavior:
  - 保留 1.0093 quantity, wallet source, avgCost=80000 after mark, cash unchanged.
- openQuestions: —

### MAP-1C7C835F5A

- mapping source: [services/uta/src/http/routes-simulator.ts:181-193](../../../../services/uta/src/http/routes-simulator.ts#L181-L193)
- symbol: POST /uta/:id/external-deposit
- id: MAP-1C7C835F5A
- sourceEvidence:
  - services/uta/src/http/routes-simulator.ts:181-193: Directly injects a wallet-source position into MockBroker through externalDeposit, bypassing the order pipeline, then returns {ok:true}; failures become string 400 responses.
  - services/uta/src/domain/trading/brokers/mock/MockBroker.ts:680-697: externalDeposit accepts positive quantity, leaves cash unchanged, and uses markPrice or Decimal(0) as wallet avgCost for a new position.
- currentBehavior: Directly injects a wallet-source position into MockBroker through externalDeposit, bypassing the order pipeline, then returns {ok:true}; failures become string 400 responses.
- problem: The route directly injects a wallet-source position and returns {ok:true}; when no mark exists the MockBroker source uses zero as avgCost, so the target must make missing-mark placeholder policy explicit rather than presenting zero as valuation truth.
- preservedBehavior:
  - 保留 deposit 不扣 cash、wallet-source tag、markPrice 作为 placeholder avgCost。
  - 保留 external event 绕过 order pipeline 的模拟含义。
- openQuestions: —

### MAP-1E2638E1F3

- mapping source: [services/uta/src/__tests__/trading-tools.spec.ts:123-135](../../../../services/uta/src/__tests__/trading-tools.spec.ts#L123-L135)
- symbol: getOrders.makeOpenOrder
- id: MAP-1E2638E1F3
- sourceEvidence:
  - services/uta/src/__tests__/trading-tools.spec.ts:123-135: Builds an OpenOrder fixture from native IBKR Order, OrderState, and contract values, including Decimal quantities/prices and an Alice identifier.
- currentBehavior: Builds an OpenOrder fixture from native IBKR Order, OrderState, and contract values, including Decimal quantities/prices and an Alice identifier.
- problem: makeOpenOrder 直接构造 IBKR Order、OrderState 和 Contract；测试因此把 adapter 输入当成公共 OrderSnapshot，未验证 sentinel、scope 和稳定 order identity 的解码边界。
- preservedBehavior:
  - 保留 fixture 能表达 Decimal 数量/价格与 Alice identity。
  - 保留 adapter-specific construction 作为 broker conformance fixture，但不扩大公共 schema。
- openQuestions: —

### MAP-21CA670156

- mapping source: [services/uta/src/http/routes-simulator.ts:123-135](../../../../services/uta/src/http/routes-simulator.ts#L123-L135)
- symbol: POST /uta/:id/mark-price
- id: MAP-21CA670156
- sourceEvidence:
  - services/uta/src/http/routes-simulator.ts:123-135: Validates a simulator mark price, calls MockBroker.setMarkPrice directly, allows the broker to auto-match pending orders, and returns the filled order ids; broker exceptions become a 400 string error.
- currentBehavior: Validates a simulator mark price, calls MockBroker.setMarkPrice directly, allows the broker to auto-match pending orders, and returns the filled order ids; broker exceptions become a 400 string error.
- problem: Direct mark-price mutation and auto-fill are god-view test controls, not a durable TransactionCommand or broker dispatch with DispatchIdentity. The route has no authenticated transport principal or separate operation-authorization check; direct MockBroker mutation is mounted as an HTTP surface.
- preservedBehavior:
  - 保留 setMarkPrice 自动撮合 pending orders 并返回 filled ids。
  - 保留 broker exception 不再变成 generic Error.message，而成为 typed fill rejection。
- openQuestions: —

### MAP-2444CEB754

- mapping source: [services/uta/src/http/routes-simulator.ts:195-207](../../../../services/uta/src/http/routes-simulator.ts#L195-L207)
- symbol: POST /uta/:id/external-withdraw
- id: MAP-2444CEB754
- sourceEvidence:
  - services/uta/src/http/routes-simulator.ts:195-207: Directly injects a simulator withdrawal by calling MockBroker.externalWithdraw(nativeKey, quantity), bypassing transaction and accounting services, with string 400 errors.
  - services/uta/src/domain/trading/brokers/mock/MockBroker.ts:700-710: externalWithdraw subtracts requested quantity and deletes the position whenever the remainder is &lt;=0; it does not reject an over-withdrawal or non-positive quantity.
- currentBehavior: The route passes nativeKey and quantity directly to MockBroker.externalWithdraw; that method subtracts without quantity/exposure validation and deletes the position whenever the remainder is non-positive, then returns {ok:true}.
- problem: The current external-withdraw route can turn an over-sized or non-positive request into deletion/negative intermediate exposure and reports only {ok:true}; the target must validate Quantity against the observed position before recording a typed external observation.
- preservedBehavior:
  - 保留 cash 不变、全部提取删除 position、部分提取保留 wallet cost source；将当前 oversell/delete permissiveness 改为 typed InsufficientQuantity rejection。
- openQuestions: —

### MAP-248B2B5279

- mapping source: [services/uta/src/http/simulator.spec.ts:1-12](../../../../services/uta/src/http/simulator.spec.ts#L1-L12)
- symbol: simulator route spec contract
- id: MAP-248B2B5279
- sourceEvidence:
  - services/uta/src/http/simulator.spec.ts:1-12: Documents and imports an end-to-end HTTP adapter spec intended to use a real MockBroker, explicitly checking route wiring and markPrice-to-position behavior rather than vi.fn broker stubs.
- currentBehavior: Documents and imports an end-to-end HTTP adapter spec intended to use a real MockBroker, explicitly checking route wiring and markPrice-to-position behavior rather than vi.fn broker stubs.
- problem: simulator.spec 声明用真实 MockBroker 验证 HTTP wiring 与 markPrice-to-position；它只覆盖一条进程内 vertical slice，不能证明认证、fixture journal 或 production transaction 隔离。
- preservedBehavior:
  - 保留 real MockBroker rather than vi.fn for matching behavior.
  - 保留 markPrice-to-position assertion as evidence.
- openQuestions: —

### MAP-24F7AD27D6

- mapping source: [services/uta/src/http/routes-simulator.ts:151-165](../../../../services/uta/src/http/routes-simulator.ts#L151-L165)
- symbol: POST /uta/:id/orders/:orderId/fill
- id: MAP-24F7AD27D6
- sourceEvidence:
  - services/uta/src/http/routes-simulator.ts:151-165: Resolves a MockBroker, accepts optional price/qty, directly forces a pending order fill, and returns {ok:true}; broker exceptions become a 400 string error.
- currentBehavior: Resolves a MockBroker, accepts optional price/qty, directly forces a pending order fill, and returns {ok:true}; broker exceptions become a 400 string error.
- problem: Manual fill bypasses prepare, write-ahead dispatch, compensation, and remote-outcome reconciliation by mutating the simulator directly. The route has no authenticated transport principal or separate operation-authorization check; direct MockBroker mutation is mounted as an HTTP surface.
- preservedBehavior:
  - 保留 optional price 默认 mark/limit/100 以及 optional partial qty。
  - 保留 unknown orderId 400。
- openQuestions: —

### MAP-25883E620A

- mapping source: [services/uta/src/http/simulator.spec.ts:176-208](../../../../services/uta/src/http/simulator.spec.ts#L176-L208)
- symbol: manual fill route tests
- id: MAP-25883E620A
- sourceEvidence:
  - services/uta/src/http/simulator.spec.ts:176-208: Places a pending limit order on a real MockBroker, manually fills it through the simulator endpoint, verifies pending state clears, and verifies an unknown order id returns 400.
- currentBehavior: Places a pending limit order on a real MockBroker, manually fills it through the simulator endpoint, verifies pending state clears, and verifies an unknown order id returns 400.
- problem: manual-fill 测试通过 route 直接清掉 pending order，并以 400 表示 unknown；它没有 partial-fill cumulative state、fixture observation identity 或 production observation boundary。
- preservedBehavior:
  - 保留 default mark/limit fill behavior, pending state clears on full fill, unknown id 400.
- openQuestions: —

### MAP-27AD48107A

- mapping source: [services/uta/src/__tests__/trading-tools.spec.ts:344-371](../../../../services/uta/src/__tests__/trading-tools.spec.ts#L344-L371)
- symbol: placeOrder.inputSchema.emptyOptionalNumerics
- id: MAP-27AD48107A
- sourceEvidence:
  - services/uta/src/__tests__/trading-tools.spec.ts:344-371: Uses the placeOrder input schema with empty strings for optional numeric fields and verifies parsing succeeds, empty fields become undefined, and totalQuantity remains the supplied decimal string.
- currentBehavior: Uses the placeOrder input schema with empty strings for optional numeric fields and verifies parsing succeeds, empty fields become undefined, and totalQuantity remains the supplied decimal string.
- problem: 测试允许 optional numeric 空字符串转 undefined，却仍把 placeOrder 输入作为可选字段袋；该边界需要明确 Absent、sizing XOR 和未知字段拒绝，而不能由后续 legacy staging 猜测。
- preservedBehavior:
  - 保留 LLM 发送 `cashQty/lmtPrice/...: ""` 时成功并变成 undefined/Absent。
  - 保留 totalQuantity `0.01` 字符串。
- openQuestions: —

### MAP-2B0B0BF616

- mapping source: [services/uta/src/http/simulator.spec.ts:13-31](../../../../services/uta/src/http/simulator.spec.ts#L13-L31)
- symbol: FakeUTA and makeCtx
- id: MAP-2B0B0BF616
- sourceEvidence:
  - services/uta/src/http/simulator.spec.ts:13-31: Creates a fake UTA map with MockBroker or arbitrary object values, exposes get/resolve/listUTAs manager stubs, and casts the context to UTAEngineContext.
- currentBehavior: Creates a fake UTA map with MockBroker or arbitrary object values, exposes get/resolve/listUTAs manager stubs, and casts the context to UTAEngineContext.
- problem: simulator 测试用任意 object 充当 broker 并 cast UTAEngineContext；错误 capability、scope 或非 simulator 实例可在请求前被类型系统放过。
- preservedBehavior:
  - 保留 one mock + one non-mock listing scenarios.
  - 保留 per-test isolation.
- openQuestions: —

### MAP-2F69B76FDC

- mapping source: [services/uta/src/http/routes-trading.ts:127-135](../../../../services/uta/src/http/routes-trading.ts#L127-L135)
- symbol: createTradingRoutes and GET /uta
- id: MAP-2F69B76FDC
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:127-135: Creates an unauthenticated Hono route set and lists ctx.utaManager.listUTAs() directly as the response for GET /uta.
- currentBehavior: Creates an unauthenticated Hono route set and lists ctx.utaManager.listUTAs() directly as the response for GET /uta.
- problem: Alice authenticates the user-facing proxy, but this UTA loopback route exposes raw manager summaries and has no named protocol schema or typed transport-principal boundary. Transport authentication must not be conflated with transaction authorization.
- preservedBehavior:
  - 保留 GET /uta 的 id/label listing。
  - 保留 Alice proxy path，但不再把 loopback reach 当授权。
- openQuestions:
  - The repository does not provide the UTA↔Alice service credential/issuer/verifier implementation; Main/deployment must designate the secret provisioning and verifier owner without route-local crypto or a body-supplied identity.

### MAP-2F790BE2E6

- mapping source: [services/uta/src/http/routes-trading.ts:363-378](../../../../services/uta/src/http/routes-trading.ts#L363-L378)
- symbol: POST /uta/:id/contracts/details
- id: MAP-2F790BE2E6
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:363-378: Builds an IBKR Contract from arbitrary body JSON, calls account.getContractDetails, returns a raw detail object/null, and maps all errors to a string 500.
- currentBehavior: Builds an IBKR Contract from arbitrary body JSON, calls account.getContractDetails, returns a raw detail object/null, and maps all errors to a string 500.
- problem: The handler turns arbitrary JSON into a native SDK object and exposes raw broker details, which the target transport/protocol boundary forbids.
- preservedBehavior:
  - 保留 details drilldown 的 found/not-found distinction, expressed as a typed response variant rather than raw null。
  - 保留 aliceId/symbol/secType/currency filters through typed query.
- openQuestions: —

### MAP-2FADFA4CDF

- mapping source: [services/uta/src/http/trading-order-entry.spec.ts:178-191](../../../../services/uta/src/http/trading-order-entry.spec.ts#L178-L191)
- symbol: place-order push failure test
- id: MAP-2FADFA4CDF
- sourceEvidence:
  - services/uta/src/http/trading-order-entry.spec.ts:178-191: Configures push to throw and asserts HTTP 500 with phase=push, exercising the final legacy broker execution phase without checking durable intent or remote outcome.
- currentBehavior: Configures push to throw and asserts HTTP 500 with phase=push, exercising the final legacy broker execution phase without checking durable intent or remote outcome.
- problem: 测试把 push throw 映射为 HTTP 500 phase=push；异常既可能发生在 remote mutation 前后，不能据此声称 rejected，必须以 DispatchStarted 和 observation 分类。
- preservedBehavior:
  - 保留 push failure scenario as final broker-phase failure.
  - Do not claim remote rejection from thrown push exception without observation evidence.
- openQuestions: —

### MAP-3194C27217

- mapping source: [services/uta/src/http/routes-trading.ts:226-239](../../../../services/uta/src/http/routes-trading.ts#L226-L239)
- symbol: POST /uta/:id/sync
- id: MAP-3194C27217
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:226-239: Accepts an unvalidated optional numeric delayMs and calls uta.sync directly to force broker state synchronization; all exceptions become a 500 string error.
- currentBehavior: Accepts an unvalidated optional numeric delayMs and calls uta.sync directly to force broker state synchronization; all exceptions become a 500 string error.
- problem: The route has no command schema, durable job identity, lease/reconciliation semantics, or unknown-outcome handling; it calls legacy in-memory UTA synchronization directly.
- preservedBehavior:
  - 保留 AI 可主动触发 stale state synchronization。
  - 保留 optional delay only as a bounded 0–60000ms scheduling hint; it never decides business authority or sleeps inside a request.
- openQuestions: —

### MAP-32AD0C3DCD

- mapping source: [services/uta/src/http/routes-trading.ts:578-592](../../../../services/uta/src/http/routes-trading.ts#L578-L592)
- symbol: POST /uta/:id/wallet/close-position
- id: MAP-32AD0C3DCD
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:578-592: One-shot close handler validates the legacy close body, strips message, preserves qty as a string, then stages/commits/pushes through runOneShot.
- currentBehavior: One-shot close handler validates the legacy close body, strips message, preserves qty as a string, then stages/commits/pushes through runOneShot.
- problem: one-shot close-position 把 string qty（或缺省 qty）带过 stage→commit→push；执行前的 All resolution、exposure drift 与 partial-fill recovery 均被旧 Git pipeline 隐藏。
- preservedBehavior:
  - 保留 qty string precision and no-qty close-all behavior.
  - Preserve target distinction between close and place SELL (risk/authorization).
- openQuestions: —

### MAP-38469CADA4

- mapping source: [services/uta/src/__tests__/trading-tools.spec.ts:1-15](../../../../services/uta/src/__tests__/trading-tools.spec.ts#L1-L15)
- symbol: trading-tools test boundary imports
- id: MAP-38469CADA4
- sourceEvidence:
  - services/uta/src/__tests__/trading-tools.spec.ts:1-15: Imports createTradingTools, UTAManager, UnifiedTradingAccount, MockBroker, IBKR Order/OpenOrder values, and contract extensions; the comments explicitly place this spec at Alice's tool boundary over co-located UTA broker/domain stubs.
- currentBehavior: Imports createTradingTools, UTAManager, UnifiedTradingAccount, MockBroker, IBKR Order/OpenOrder values, and contract extensions; the comments explicitly place this spec at Alice's tool boundary over co-located UTA broker/domain stubs.
- problem: 该 spec 直接把 createTradingTools 与 UTAManager、UnifiedTradingAccount、MockBroker 及 IBKR Order/OpenOrder 放在同一进程；因此工具边界可以绕过序列化协议，测试不会发现 native SDK 值或进程内对象泄漏到 Alice/HTTP。
- preservedBehavior:
  - 保留该 spec 作为 Alice tool boundary 的行为证据。
  - 保留 MockBroker 与工具层的端到端关联，但移除 native SDK 值穿过公共边界。
- openQuestions: —

### MAP-3A43AEAF75

- mapping source: [services/uta/src/http/routes-simulator.ts:81-101](../../../../services/uta/src/http/routes-simulator.ts#L81-L101)
- symbol: resolveMock and parseBody
- id: MAP-3A43AEAF75
- sourceEvidence:
  - services/uta/src/http/routes-simulator.ts:81-101: resolveMock looks up a UTA by path id, performs an instanceof MockBroker check, and emits ad hoc string errors; parseBody catches invalid JSON and returns Zod issue arrays in a local {error, issues} envelope.
- currentBehavior: resolveMock looks up a UTA by path id, performs an instanceof MockBroker check, and emits ad hoc string errors; parseBody catches invalid JSON and returns Zod issue arrays in a local {error, issues} envelope.
- problem: Resolution and validation are local imperative checks with concrete-class detection and unstructured errors; there is no typed authorization, capability, or protocol failure mapping.
- preservedBehavior:
  - 保留 missing id=400、unknown id=404、real broker=400 的语义差异，但转为 named errors。
  - 保留 malformed JSON 与 schema issues 不进入 MockBroker。
- openQuestions: —

### MAP-3C4CDD1C56

- mapping source: [services/uta/src/http/simulator.spec.ts:58-86](../../../../services/uta/src/http/simulator.spec.ts#L58-L86)
- symbol: GET /uta/:id/state tests
- id: MAP-3C4CDD1C56
- sourceEvidence:
  - services/uta/src/http/simulator.spec.ts:58-86: Verifies a full raw MockBroker snapshot after setting a mark price, 404 for unknown ids, and 400 when the selected broker is not a simulator.
- currentBehavior: Verifies a full raw MockBroker snapshot after setting a mark price, 404 for unknown ids, and 400 when the selected broker is not a simulator.
- problem: state 测试序列化 raw MockBroker snapshot 并覆盖 404/non-simulator；没有约束 versioned simulator projection、freshness 或原生对象不得穿过 wire。
- preservedBehavior:
  - 保留 full snapshot assertion cash=50000, mark BTC=80000; 404 unknown and 400 non-sim behavior.
- openQuestions: —

### MAP-3C6243143F

- mapping source: [services/uta/src/http/routes-trading.ts:343-361](../../../../services/uta/src/http/routes-trading.ts#L343-L361)
- symbol: POST /uta/:id/historical
- id: MAP-3C6243143F
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:343-361: Accepts arbitrary contract/params JSON, constructs an IBKR Contract, revives start/end dates imperatively, calls account.getHistorical, and returns raw bars or a string 500 error.
- currentBehavior: Accepts arbitrary contract/params JSON, constructs an IBKR Contract, revives start/end dates imperatively, calls account.getHistorical, and returns raw bars or a string 500 error.
- problem: Broker-native Contract construction and permissive params cross the transport boundary, and date revival is not a shared runtime schema; raw adapter values are exposed.
- preservedBehavior:
  - 保留 start/end ISO input and `{bars}` conceptual response.
  - 保留 interval/whatToShow values only where capability evidence supports them.
- openQuestions: —

### MAP-3CBE1C6172

- mapping source: [services/uta/src/http/routes-trading.ts:13-60](../../../../services/uta/src/http/routes-trading.ts#L13-L60)
- symbol: placeOrderSchema, closePositionSchema, cancelOrderSchema
- id: MAP-3CBE1C6172
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:13-60: Local Zod schemas validate the legacy wallet/order request shapes. Place-order uses optional quantity/cash/price/order fields with a free-form orderType and aliceId; close/cancel retain legacy ids and commit message requirements.
- currentBehavior: Local Zod schemas validate the legacy wallet/order request shapes. Place-order uses optional quantity/cash/price/order fields with a free-form orderType and aliceId; close/cancel retain legacy ids and commit message requirements.
- problem: Optional-field bags and free-form orderType make the route-local schema unable to describe the exact provider capability; aliceId/message are legacy surface concerns, and the schema is not the selected declaration-derived protocol.
- preservedBehavior:
  - 保留旧输入中已被调查的 trailing、GTD/outsideRth、parent/OCA、TP/SL 与 Decimal string precision；仅在选定 provider schema 声明时保留。
  - 将 commit message 与 action/approval payload 分离。
- openQuestions: —

### MAP-3CDB550874

- mapping source: [services/uta/src/http/routes-trading.ts:144-165](../../../../services/uta/src/http/routes-trading.ts#L144-L165)
- symbol: GET /contracts/search
- id: MAP-3CDB550874
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:144-165: Reads pattern/query, assetClass, and source/accountId query strings, invokes searchTradeableContracts across configured accounts, and returns raw hits/count plus a configured-account count.
- currentBehavior: Reads pattern/query, assetClass, and source/accountId query strings, invokes searchTradeableContracts across configured accounts, and returns raw hits/count plus a configured-account count.
- problem: The route performs permissive query parsing and delegates a broker-side heuristic over UTA instances; response and errors are not named protocol values and capability context is incomplete.
- preservedBehavior:
  - 保留 pattern/query alias、assetClass hint、source/accountId filter。
  - 保留 count 与 configured account visibility，但改为 typed completeness。
- openQuestions: —

### MAP-3D3861C921

- mapping source: [services/uta/src/http/routes-trading.ts:192-215](../../../../services/uta/src/http/routes-trading.ts#L192-L215)
- symbol: POST /test-connection
- id: MAP-3D3861C921
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:192-215: Parses an arbitrary request into utaConfigSchema, dynamically creates a broker, calls init/getAccount/getPositions directly, returns raw account/positions, and best-effort closes the broker in finally.
- currentBehavior: Parses an arbitrary request into utaConfigSchema, dynamically creates a broker, calls init/getAccount/getPositions directly, returns raw account/positions, and best-effort closes the broker in finally.
- problem: The HTTP handler directly constructs a concrete broker and invokes lifecycle/query methods, accepts arbitrary config at the process boundary, and exposes raw broker results; it bypasses application/broker-spi layering and shared protocol schemas.
- preservedBehavior:
  - 保留 setup wizard 能验证连接并读取 account+positions 的成功信号。
  - 保留 best-effort close 作为 Scope finalizer，而非 route finally swallow。
- openQuestions: —

### MAP-3FABE05A73

- mapping source: [services/uta/src/__tests__/trading-tools.spec.ts:17-24](../../../../services/uta/src/__tests__/trading-tools.spec.ts#L17-L24)
- symbol: makeUta / makeManager
- id: MAP-3FABE05A73
- sourceEvidence:
  - services/uta/src/__tests__/trading-tools.spec.ts:17-24: Constructs one UnifiedTradingAccount for each MockBroker and registers each account in a UTAManager, giving tool tests an in-process multi-account manager.
- currentBehavior: Constructs one UnifiedTradingAccount for each MockBroker and registers each account in a UTAManager, giving tool tests an in-process multi-account manager.
- problem: 测试通过 `new UnifiedTradingAccount` 和 `UTAManager.add` 建立账户目录；这只证明进程内注册，不证明 AccountScope、权限目录或投影在跨进程读取时保持一致。
- preservedBehavior:
  - 保留多账户查询可同时建立两个独立账户。
  - 保留标签仅为展示，不用 label 路由交易。
- openQuestions: —

### MAP-44AA5A48AB

- mapping source: [services/uta/src/http/routes-trading.ts:241-259](../../../../services/uta/src/http/routes-trading.ts#L241-L259)
- symbol: POST /uta/:id/simulate-price
- id: MAP-44AA5A48AB
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:241-259: Accepts any array-valued changes field, calls uta.simulatePriceChange directly for all account types, and classifies thrown errors by regex matching 'simulate' or 'mock' to choose 400 versus 500.
  - services/uta/src/domain/trading/git/TradingGit.ts:753-879: simulatePriceChange uses Decimal arithmetic, supports `symbol=all` by scaling each position's own mark (including derivatives), excludes derivative rows from symbol-level underlying changes, and returns currentState/simulatedState/summary projections.
- currentBehavior: Accepts any array-valued changes field, calls uta.simulatePriceChange directly for all account types, and classifies thrown errors by regex matching 'simulate' or 'mock' to choose 400 versus 500.
- problem: Input is only checked as Array, the route reaches a legacy UTA method, and error category is inferred from text, contrary to typed protocol/error channels.
- preservedBehavior:
  - 保留 AI PnL exploration endpoint intent。
  - MockBroker-specific unsupported result remains clean 4xx typed, real broker query errors remain distinct.
- openQuestions: —

### MAP-468691D82C

- mapping source: [services/uta/src/__tests__/trading-tools.spec.ts:40-65](../../../../services/uta/src/__tests__/trading-tools.spec.ts#L40-L65)
- symbol: UTAManager.resolve
- id: MAP-468691D82C
- sourceEvidence:
  - services/uta/src/__tests__/trading-tools.spec.ts:40-65: Checks account-source resolution semantics: no source returns every registered UTA, an exact source returns one matching account, and an unknown source returns an empty array.
- currentBehavior: Checks account-source resolution semantics: no source returns every registered UTA, an exact source returns one matching account, and an unknown source returns an empty array.
- problem: 测试把 unknown source 断言为空数组，同时把 all/exact 解析留给进程内 manager；这会把 UnknownAccount 与合法 Complete(empty) 混淆，也未验证 principal 的 scope 过滤。
- preservedBehavior:
  - 保留 source 缺省返回全部注册账户。
  - 保留 exact id 返回单一账户，未知 source 不触发 broker 调用。
- openQuestions: —

### MAP-4AFBEA2B00

- mapping source: [services/uta/src/__tests__/trading-tools.spec.ts:27-36](../../../../services/uta/src/__tests__/trading-tools.spec.ts#L27-L36)
- symbol: asSDK
- id: MAP-4AFBEA2B00
- sourceEvidence:
  - services/uta/src/__tests__/trading-tools.spec.ts:27-36: Casts an in-process UTAManager to UTAManagerSDK because the tool accepts an HTTP-adapter-shaped interface; the comments document that getFxRates is absent and silently falls through to empty rates.
- currentBehavior: Casts an in-process UTAManager to UTAManagerSDK because the tool accepts an HTTP-adapter-shaped interface; the comments document that getFxRates is absent and silently falls through to empty rates.
- problem: 测试把 UTAManager 强制 cast 成 UTAManagerSDK，而且缺少的 getFxRates 被工具层 catch 成空 rates；因此服务能力缺失会被伪装成成功的空查询。
- preservedBehavior:
  - 保留工具可以在不创建 broker stub 的情况下查询账户。
  - 保留缺失 FX 能力不会影响不需要 FX 的订单查询。
- openQuestions: —

### MAP-4D35581185

- mapping source: [services/uta/src/http/routes-trading.ts:608-630](../../../../services/uta/src/http/routes-trading.ts#L608-L630)
- symbol: per-account snapshot routes
- id: MAP-4D35581185
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:608-630: GET snapshots reads an optional file-backed SnapshotService and silently returns an empty list on missing service/errors; DELETE decodes a timestamp and directly deletes a snapshot, returning simple success/not-found responses.
- currentBehavior: GET snapshots reads an optional file-backed SnapshotService and silently returns an empty list on missing service/errors; DELETE decodes a timestamp and directly deletes a snapshot, returning simple success/not-found responses.
- problem: The route delegates to the current file-backed snapshot service, hides all read/delete failures as empty/simple responses, and has no shared schemas or projection checkpoint semantics.
- preservedBehavior:
  - 保留 per-account recent snapshots query and optional limit.
  - 保留 not-found delete response, but typed; preserve auditability.
- openQuestions: —

### MAP-4DE6045663

- mapping source: [services/uta/src/__tests__/trading-tools.spec.ts:373-387](../../../../services/uta/src/__tests__/trading-tools.spec.ts#L373-L387)
- symbol: placeOrder.inputSchema.invalidNumerics
- id: MAP-4DE6045663
- sourceEvidence:
  - services/uta/src/__tests__/trading-tools.spec.ts:373-387: Uses a non-positive totalQuantity and verifies that the placeOrder schema rejects the input before execution.
- currentBehavior: Uses a non-positive totalQuantity and verifies that the placeOrder schema rejects the input before execution.
- problem: 测试只在 Zod schema 阶段拒绝 totalQuantity=0；正数、有限 Decimal 和 journal 未写入的 invariant 还没有贯穿 application admission。
- preservedBehavior:
  - 保留 totalQuantity=0 在 schema gate 失败。
  - 保留 invalid optional numerics 不进入 execution。
- openQuestions: —

### MAP-4EFAFBF364

- mapping source: [services/uta/src/http/routes-trading.ts:261-267](../../../../services/uta/src/http/routes-trading.ts#L261-L267)
- symbol: GET /uta/:id/subaccounts
- id: MAP-4EFAFBF364
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:261-267: Resolves an account then calls account.listSubAccounts through queryAccount, returning raw sub-account values and health-derived ad hoc errors.
- currentBehavior: Resolves an account then calls account.listSubAccounts through queryAccount, returning raw sub-account values and health-derived ad hoc errors.
- problem: The route calls the legacy account object directly and does not provide named sub-account/query schemas or capability context.
- preservedBehavior:
  - 保留 ordinary broker one-wallet listing 与 CCXT multiple wallet listing。
  - 保留 explicit `subAccountId` query use case。
- openQuestions: —

### MAP-52CB0F382D

- mapping source: [services/uta/src/http/routes-trading.ts:557-576](../../../../services/uta/src/http/routes-trading.ts#L557-L576)
- symbol: POST /uta/:id/wallet/place-order
- id: MAP-52CB0F382D
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:557-576: One-shot handler validates the legacy place-order bag, strips message, calls uta.stagePlaceOrder, then runOneShot performs commit and push in one HTTP request.
- currentBehavior: One-shot handler validates the legacy place-order bag, strips message, calls uta.stagePlaceOrder, then runOneShot performs commit and push in one HTTP request.
- problem: one-shot place-order 在同一请求中 stage、commit、push；因此输入请求隐式获得 venue mutation 权限，prepare/approval 前无法证明 broker ledger 为空。
- preservedBehavior:
  - 保留 existing user-facing order entry intent via multi-step API, not single roundtrip.
  - 保留 precision and full OrderSpec.
- openQuestions: —

### MAP-560B7EEA32

- mapping source: [services/uta/src/__tests__/trading-tools.spec.ts:291-296](../../../../services/uta/src/__tests__/trading-tools.spec.ts#L291-L296)
- symbol: createTradingTools.getQuote.malformedAliceId
- id: MAP-560B7EEA32
- sourceEvidence:
  - services/uta/src/__tests__/trading-tools.spec.ts:291-296: Invokes getQuote with an identifier lacking the expected separator and verifies that the result contains an Invalid aliceId error.
- currentBehavior: Invokes getQuote with an identifier lacking the expected separator and verifies that the result contains an Invalid aliceId error.
- problem: 测试只检查 malformed aliceId 的错误文本；分隔符解析和 ownership 失败若未成为 typed codec，调用方仍可能在 broker 调用后才发现身份无效。
- preservedBehavior:
  - 保留无分隔符输入返回 Invalid/Malformed aliceId。
  - 保留 malformed 请求在 broker 调用前失败。
- openQuestions: —

### MAP-58D4065C2F

- mapping source: [services/uta/src/http/routes-trading.ts:498-516](../../../../services/uta/src/http/routes-trading.ts#L498-L516)
- symbol: POST /uta/:id/wallet/stage-place-order
- id: MAP-58D4065C2F
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:498-516: Stage-only route accepts arbitrary JSON and calls uta.stagePlaceOrder directly, returning TradingGit.add-like result or a string 400 error.
- currentBehavior: Stage-only route accepts arbitrary JSON and calls uta.stagePlaceOrder directly, returning TradingGit.add-like result or a string 400 error.
- problem: stage-place-order 接受任意 JSON 并直接执行 TradingGit.add-like staging；draft 的完整 OrderSpec、scope/revision 和 no-job-before-approval invariant 因而不在 authority 中。
- preservedBehavior:
  - 保留 stage-only agent ergonomics（draft now, review/approve later）作为选定受控 effect 的可选能力。
  - 保留 provider schema 已声明的订单字段与精度，不把一个 provider 的扩展强加给其他 provider。
- openQuestions: —

### MAP-5C97C6CC79

- mapping source: [services/uta/src/http/routes-trading.ts:97-125](../../../../services/uta/src/http/routes-trading.ts#L97-L125)
- symbol: queryAccount
- id: MAP-5C97C6CC79
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:97-125: Implements shared route query handling: offline accounts are nudged and return 503 with health info; broker errors are converted to {error, code, transient} and 500/503 based on a permanent boolean; successful values are serialized directly.
- currentBehavior: Implements shared route query handling: offline accounts are nudged and return 503 with health info; broker errors are converted to {error, code, transient} and 500/503 based on a permanent boolean; successful values are serialized directly.
- problem: Health and broker failures are represented by local strings/booleans and direct side effects; expected failures are not the target ADTs and successful/native values have no named response schema.
- preservedBehavior:
  - 保留 offline 返回 unavailable 类状态；保留 transient/permanent 可供 UI 重试提示。
  - 保留 native broker errors 被分类，但改为 typed code。
- openQuestions: —

### MAP-5FBCD3EE4E

- mapping source: [services/uta/src/http/routes-trading.ts:302-315](../../../../services/uta/src/http/routes-trading.ts#L302-L315)
- symbol: GET /uta/:id/quote/:symbol
- id: MAP-5FBCD3EE4E
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:302-315: Preserves a legacy symbol path, constructs an @traderalice/ibkr Contract in the HTTP handler, sets symbol, and calls account.getQuote directly through queryAccount.
- currentBehavior: Preserves a legacy symbol path, constructs an @traderalice/ibkr Contract in the HTTP handler, sets symbol, and calls account.getQuote directly through queryAccount.
- problem: The transport constructs and passes a concrete broker SDK object and exposes a legacy symbol-only query, violating the prohibition on broker SDK values in public protocol/transport.
- preservedBehavior:
  - 保留 path `:symbol` compatibility during caller migration via explicit symbol-&gt;InstrumentId resolver.
  - 保留 source account routing.
- openQuestions: —

### MAP-631DC01624

- mapping source: [services/uta/src/http/routes-simulator.ts:24-41](../../../../services/uta/src/http/routes-simulator.ts#L24-L41)
- symbol: numericString, setMarkPriceSchema, tickPriceSchema, fillOrderSchema
- id: MAP-631DC01624
- sourceEvidence:
  - services/uta/src/http/routes-simulator.ts:24-41: Simulator price and fill bodies are validated with local Zod schemas; numericString accepts either a string or a number and normalizes both to String, while price movement and fill quantity remain unbranded primitive values.
- currentBehavior: Simulator price and fill bodies are validated with local Zod schemas; numericString accepts either a string or a number and normalizes both to String, while price movement and fill quantity remain unbranded primitive values.
- problem: Local schemas accept ordinary numbers and erase nominal financial types during normalization; the target requires shared runtime schemas and branded decimal/domain values at the boundary.
- preservedBehavior:
  - 保留现有 mark/tick/fill 三种控制的语义区分。
  - 保留精确字符串在价格/数量中的精度。
- openQuestions: —

### MAP-6837C09018

- mapping source: [services/uta/src/http/trading-order-entry.spec.ts:20-69](../../../../services/uta/src/http/trading-order-entry.spec.ts#L20-L69)
- symbol: makeMockUTA
- id: MAP-6837C09018
- sourceEvidence:
  - services/uta/src/http/trading-order-entry.spec.ts:20-69: Builds a vi-stubbed UTA capturing stagePlaceOrder/stageClosePosition/stageCancelOrder, synchronous commit, async push, reject, and status calls; configured failures model stage, commit, or push phases and return a legacy PushResult.
- currentBehavior: Builds a vi-stubbed UTA capturing stagePlaceOrder/stageClosePosition/stageCancelOrder, synchronous commit, async push, reject, and status calls; configured failures model stage, commit, or push phases and return a legacy PushResult.
- problem: makeMockUTA 用 vi stubs 捕获 staging/commit/push/reject/status；异常调用顺序不是 SQL writer、scheduler lease 或 broker ledger 的 crash/recovery 证据。
- preservedBehavior:
  - 保留 stage/commit/push failure scenarios as regression input categories.
  - 保留 reject no prepared hash safety intent as no-dispatch state rule.
- openQuestions: —

### MAP-6A13EE36A7

- mapping source: [services/uta/src/http/routes-simulator.ts:43-77](../../../../services/uta/src/http/routes-simulator.ts#L43-L77)
- symbol: contractSchema, externalDepositSchema, externalWithdrawSchema, externalTradeSchema
- id: MAP-6A13EE36A7
- sourceEvidence:
  - services/uta/src/http/routes-simulator.ts:43-77: The simulator accepts a permissive IBKR-like contract object plus nativeKey and wallet/external-trade fields; derivative metadata, secType, side, quantity, and price are validated locally but remain optional/native-key request fields.
- currentBehavior: The simulator accepts a permissive IBKR-like contract object plus nativeKey and wallet/external-trade fields; derivative metadata, secType, side, quantity, and price are validated locally but remain optional/native-key request fields.
- problem: The public body shape is a permissive broker-specific contract surface and direct state-mutation command, not a named domain/protocol ADT. Optional fields allow invalid combinations that the target order/action contract forbids.
- preservedBehavior:
  - 保留 OPT/FUT/CASH/BOND/CRYPTO 元数据可供 simulator fixture 建模。
  - 保留 deposit/withdraw 不走 order pipeline，trade 可改变 cash/position。
- openQuestions: —

### MAP-6AED1E318D

- mapping source: [services/uta/src/http/trading-order-entry.spec.ts:269-277](../../../../services/uta/src/http/trading-order-entry.spec.ts#L269-L277)
- symbol: close-position validation test
- id: MAP-6AED1E318D
- sourceEvidence:
  - services/uta/src/http/trading-order-entry.spec.ts:269-277: Verifies missing commit message returns 400 and no staging occurs for close-position.
- currentBehavior: Verifies missing commit message returns 400 and no staging occurs for close-position.
- problem: close validation 测试把缺 message 当作唯一 400 条件；新 action 必须验证 principal/commandId/scope/instrument/Quantity|All，而不需要 Git message。
- preservedBehavior:
  - 保留 missing message test as malformed legacy request, but change reason to missing approval metadata if needed.
  - Preserve no staging behavior.
- openQuestions: —

### MAP-6AF6021791

- mapping source: [services/uta/src/http/routes-trading-wallet.spec.ts:41-57](../../../../services/uta/src/http/routes-trading-wallet.spec.ts#L41-L57)
- symbol: wallet push hash-conflict test
- id: MAP-6AF6021791
- sourceEvidence:
  - services/uta/src/http/routes-trading-wallet.spec.ts:41-57: Stubs push to throw PendingHashConflictError and verifies a stale expected hash yields 409 PENDING_HASH_CONFLICT while push receives the stale hash.
- currentBehavior: Stubs push to throw PendingHashConflictError and verifies a stale expected hash yields 409 PENDING_HASH_CONFLICT while push receives the stale hash.
- problem: 测试以 PendingHashConflictError 模拟 stale hash；冲突是否保持 durable transaction version、无 jobs/locks/events，不能由一次 vi throw 得出。
- preservedBehavior:
  - 保留 stale client 不得把 hash change 当 success。
  - 保留调用方能看到冲突并重新读状态。
- openQuestions: —

### MAP-6BF94B5092

- mapping source: [services/uta/src/http/routes-trading.ts:443-469](../../../../services/uta/src/http/routes-trading.ts#L443-L469)
- symbol: POST /uta/:id/wallet/reject
- id: MAP-6BF94B5092
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:443-469: Requires pending Git state and an expectedPendingHash, optionally accepts a reason, calls uta.reject, and maps hash conflicts to a 409 code while all other errors become 500 strings.
- currentBehavior: Requires pending Git state and an expectedPendingHash, optionally accepts a reason, calls uta.reject, and maps hash conflicts to a 409 code while all other errors become 500 strings.
- problem: The route authorizes rejection with a process-local Git hash and returns string errors. It has no shared runtime schema or typed transaction-state conflict; revision/actor are not fields of the canonical Reject command.
- preservedBehavior:
  - 保留 optional human reason and user-rejected audit projection。
  - 保留 stale optimistic guard returns conflict rather than silently accepting.
- openQuestions: —

### MAP-6CE9D89D9B

- mapping source: [services/uta/src/http/routes-simulator.ts:209-221](../../../../services/uta/src/http/routes-simulator.ts#L209-L221)
- symbol: POST /uta/:id/external-trade
- id: MAP-6CE9D89D9B
- sourceEvidence:
  - services/uta/src/http/routes-simulator.ts:209-221: Directly injects a user-executed exchange trade into MockBroker.externalTrade with native contract metadata and returns {ok:true}; errors are unstructured 400 strings.
- currentBehavior: Directly injects a user-executed exchange trade into MockBroker.externalTrade with native contract metadata and returns {ok:true}; errors are unstructured 400 strings.
- problem: The route directly changes position/cash state with no durable transaction/observation identity, accounting event, compensation, or unknown-outcome handling. The route has no authenticated transport principal or separate operation-authorization check; direct MockBroker mutation is mounted as an HTTP surface.
- preservedBehavior:
  - 保留 BUY .5 BTC@60000 使 cash 100k-&gt;70k、avgCost=60000、wallet tag。
  - 保留外部 SELL 开空与 Alice order SELL 无仓拒绝的语义差异。
- openQuestions: —

### MAP-6E09B3ED77

- mapping source: [services/uta/src/http/trading-order-entry.spec.ts:95-114](../../../../services/uta/src/http/trading-order-entry.spec.ts#L95-L114)
- symbol: place-order happy-path test
- id: MAP-6E09B3ED77
- sourceEvidence:
  - services/uta/src/http/trading-order-entry.spec.ts:95-114: Posts a legacy place-order body and asserts HTTP 200, a PushResult hash, and exact stagePlaceOrder→commit→push call order.
- currentBehavior: Posts a legacy place-order body and asserts HTTP 200, a PushResult hash, and exact stagePlaceOrder→commit→push call order.
- problem: happy-path 测试断言 stagePlaceOrder→commit→push 和 Git hash；它没有验证 Draft/Prepare/Approve 顺序、durable job/DispatchIdentity 或 Ack 与 Filled 的差别。
- preservedBehavior:
  - 保留 happy path places market BUY qty `0.001`.
  - Preserve exact action association and no implicit approval by POST.
- openQuestions: —

### MAP-6FA0B99F88

- mapping source: [services/uta/src/http/routes-simulator.ts:17-22](../../../../services/uta/src/http/routes-simulator.ts#L17-L22)
- symbol: simulator transport dependencies
- id: MAP-6FA0B99F88
- sourceEvidence:
  - services/uta/src/http/routes-simulator.ts:17-22: The HTTP module imports Hono/Zod, UTAEngineContext, the concrete MockBroker class, and SecType contract metadata, binding the transport directly to the in-process simulator implementation.
- currentBehavior: The HTTP module imports Hono/Zod, UTAEngineContext, the concrete MockBroker class, and SecType contract metadata, binding the transport directly to the in-process simulator implementation.
- problem: The route boundary has a concrete MockBroker dependency and no shared named request/response protocol, so it is not the target transport-to-application dependency direction.
- preservedBehavior:
  - 保留 /api/simulator 作为 dev simulator control surface。
  - 保留 real broker 不能接受 god-view commands。
- openQuestions: —

### MAP-75C6D069F1

- mapping source: [services/uta/src/http/routes-trading.ts:61-78](../../../../services/uta/src/http/routes-trading.ts#L61-L78)
- symbol: PHASE_STATUS and runOneShot
- id: MAP-75C6D069F1
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:61-78: Maps executeOneShotOrder's stage/commit/push string error union to HTTP 400/500 and returns {error, phase}; successful requests return the push result directly.
- currentBehavior: Maps executeOneShotOrder's stage/commit/push string error union to HTTP 400/500 and returns {error, phase}; successful requests return the push result directly.
- problem: runOneShot 把 stage、commit、push 的错误 union 直接映射为 phase 与 400/500，并返回 push result；这种 transport phase 不能表达 durable preparation、approval gate 或 Unknown outcome。
- preservedBehavior:
  - 保留 route 能报告阶段性失败，但改用 state/failure variant。
  - 保留 commit response loss 可由 commandId 查询收敛；`allowAiTrading` disabled remains AwaitingApproval, enabled may request auto-approval only after Principal/policy checks.
- openQuestions: —

### MAP-793589DE30

- mapping source: [services/uta/src/http/simulator.spec.ts:46-56](../../../../services/uta/src/http/simulator.spec.ts#L46-L56)
- symbol: GET /utas simulator-list test
- id: MAP-793589DE30
- sourceEvidence:
  - services/uta/src/http/simulator.spec.ts:46-56: Creates one real MockBroker and one non-Mock object, verifies GET /utas returns 200 and includes only the simulator id.
- currentBehavior: Creates one real MockBroker and one non-Mock object, verifies GET /utas returns 200 and includes only the simulator id.
- problem: GET /utas 测试只断言 real MockBroker 被列出而 arbitrary object 被排除；它未验证 simulator admin authorization、generation/coverage，且可能与生产 account listing 混用。
- preservedBehavior:
  - one real MockBroker listed, arbitrary non-Mock excluded, HTTP 200 only with authorized principal.
- openQuestions: —

### MAP-7B9EA96B62

- mapping source: [services/uta/src/http/routes-trading.ts:471-496](../../../../services/uta/src/http/routes-trading.ts#L471-L496)
- symbol: POST /uta/:id/wallet/push
- id: MAP-7B9EA96B62
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:471-496: Requires pending Git state and expectedPendingHash, calls uta.push to execute staged operations, maps PendingHashConflictError to 409, and exposes push result or string 500.
- currentBehavior: Requires pending Git state and expectedPendingHash, calls uta.push to execute staged operations, maps PendingHashConflictError to 409, and exposes push result or string 500.
- problem: wallet/push 依赖 pending Git state/hash 后直接调用 uta.push，且把异常变成 409/500；它没有 durable DispatchPlanned/DispatchStarted，也没有区分人工 approval 与受授权的 AI auto-approval。
- preservedBehavior:
  - 保留 human approval wall when AI trading is disabled；保留 source tool 的 enabled path as an explicit service-authorized auto-approval mode, replacing Git hash with plan binding。
  - 无论 mode，approval 仍先写 durable plan/jobs，Ack ≠ fill。
- openQuestions: —

### MAP-8239373D6C

- mapping source: [services/uta/src/http/routes-trading.ts:283-293](../../../../services/uta/src/http/routes-trading.ts#L283-L293)
- symbol: GET /uta/:id/orders
- id: MAP-8239373D6C
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:283-293: Accepts comma-separated raw ids or derives pending ids from account.getPendingOrderIds, calls account.getOrders directly, and returns raw order objects.
- currentBehavior: Accepts comma-separated raw ids or derives pending ids from account.getPendingOrderIds, calls account.getOrders directly, and returns raw order objects.
- problem: Raw comma-separated ids and direct pending-order calls bypass typed identifiers, projection authority, preconditions, and shared response schemas.
- preservedBehavior:
  - 保留 optional ids filter and default pending-order view.
  - 保留 raw order details only through normalized OrderSnapshot.
- openQuestions: —

### MAP-8456875518

- mapping source: [services/uta/src/http/routes-trading.ts:317-328](../../../../services/uta/src/http/routes-trading.ts#L317-L328)
- symbol: POST /uta/:id/quote
- id: MAP-8456875518
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:317-328: Accepts arbitrary JSON, Object.assigns it into a native IBKR Contract, calls account.getQuote, and returns the native result or a string 500 error.
- currentBehavior: Accepts arbitrary JSON, Object.assigns it into a native IBKR Contract, calls account.getQuote, and returns the native result or a string 500 error.
- problem: Arbitrary caller fields become broker SDK state through Object.assign and the raw broker result crosses HTTP; no request/response runtime schema or typed capability/error mapping exists.
- preservedBehavior:
  - 保留 POST quote for clients holding richer instrument refs.
  - 保留 broker-specific error visibility via structured code.
- openQuestions: —

### MAP-8588C24A12

- mapping source: [services/uta/src/__tests__/trading-tools.spec.ts:91-99](../../../../services/uta/src/__tests__/trading-tools.spec.ts#L91-L99)
- symbol: createTradingTools.listUTAs
- id: MAP-8588C24A12
- sourceEvidence:
  - services/uta/src/__tests__/trading-tools.spec.ts:91-99: Calls the tool layer with no arguments and verifies that it returns an array of summaries containing the registered account identifier.
- currentBehavior: Calls the tool layer with no arguments and verifies that it returns an array of summaries containing the registered account identifier.
- problem: listUTAs 只断言返回数组和 id；它未约束 health、capability、scope、freshness 或凭据脱敏，工具可以继续依赖过于乐观的摘要。
- preservedBehavior:
  - 保留无参数 listUTAs 返回所有已注册账户摘要与 id。
  - 不把密钥、native adapter 或 raw broker health object 发送给工具。
- openQuestions: —

### MAP-861915C783

- mapping source: [services/uta/src/http/routes-trading.ts:330-341](../../../../services/uta/src/http/routes-trading.ts#L330-L341)
- symbol: POST /uta/:id/contract/expand
- id: MAP-861915C783
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:330-341: Accepts arbitrary body fields, stringifies aliceId, passes unknown filters to account.expandContract, and returns the raw expansion or a string 500 error.
- currentBehavior: Accepts arbitrary body fields, stringifies aliceId, passes unknown filters to account.expandContract, and returns the raw expansion or a string 500 error.
- problem: The route accepts unknown filters and legacy aliceId text, then returns a native/domain expansion object without schema or jurisdiction/capability validation.
- preservedBehavior:
  - 保留 hub→leaves expansion for bonds/options/futures.
  - 保留 `aliceId` compatibility only as decoded canonical alias, not as free string.
- openQuestions: —

### MAP-87FA16A102

- mapping source: [services/uta/src/http/routes-trading.ts:269-274](../../../../services/uta/src/http/routes-trading.ts#L269-L274)
- symbol: GET /uta/:id/account
- id: MAP-87FA16A102
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:269-274: Resolves a UTA and directly calls getAccount, optionally passing an unvalidated subAccountId query string; queryAccount serializes the native account result.
- currentBehavior: Resolves a UTA and directly calls getAccount, optionally passing an unvalidated subAccountId query string; queryAccount serializes the native account result.
- problem: The handler exposes a legacy broker/account return object and primitive query id directly; it is not a typed projection query at the transport boundary.
- preservedBehavior:
  - 保留 omission=subaccount aggregate 与 explicit wallet query 的 distinction。
  - 保留 native account fields 的业务内容，但 normalized values。
- openQuestions: —

### MAP-8878826403

- mapping source: [services/uta/src/http/simulator.spec.ts:152-174](../../../../services/uta/src/http/simulator.spec.ts#L152-L174)
- symbol: external-trade route test
- id: MAP-8878826403
- sourceEvidence:
  - services/uta/src/http/simulator.spec.ts:152-174: Injects a BUY trade through the simulator endpoint and verifies position avg cost, wallet-source tagging, and cash decrease on the real MockBroker.
- currentBehavior: Injects a BUY trade through the simulator endpoint and verifies position avg cost, wallet-source tagging, and cash decrease on the real MockBroker.
- problem: external-trade 测试只观察 MockBroker position/cash；它不能证明 external fill 与 Alice dispatch 分离，也不能证明 journal replay 不重复扣款。
- preservedBehavior:
  - BUY .5@60000 creates wallet-sourced position avgCost 60000 and cash 70000 from 100k.
- openQuestions: —

### MAP-891F1FEA91

- mapping source: [services/uta/src/http/trading-order-entry.spec.ts:205-220](../../../../services/uta/src/http/trading-order-entry.spec.ts#L205-L220)
- symbol: place-order numeric precision test
- id: MAP-891F1FEA91
- sourceEvidence:
  - services/uta/src/http/trading-order-entry.spec.ts:205-220: Posts a high-precision totalQuantity and inspects captured stage arguments to ensure the exact string reaches legacy staging without float conversion.
- currentBehavior: Posts a high-precision totalQuantity and inspects captured stage arguments to ensure the exact string reaches legacy staging without float conversion.
- problem: 测试只检查高精度 quantity 到达 stage 参数；它未证明 canonical decimal 在 journal digest、prepared native plan、重启 projection 中保持同一文本。
- preservedBehavior:
  - 保留 high-precision quantity exact string requirement.
  - Extend proof through persistence and dispatch rather than stopping at staging.
- openQuestions: —

### MAP-8A6F5C59E6

- mapping source: [services/uta/src/http/trading-order-entry.spec.ts:71-93](../../../../services/uta/src/http/trading-order-entry.spec.ts#L71-L93)
- symbol: makeRoutes and post helper
- id: MAP-8A6F5C59E6
- sourceEvidence:
  - services/uta/src/http/trading-order-entry.spec.ts:71-93: Creates a minimal casted UTAEngineContext containing only manager.get and invokes createTradingRoutes; post sends JSON to the Hono app and parses the response.
- currentBehavior: Creates a minimal casted UTAEngineContext containing only manager.get and invokes createTradingRoutes; post sends JSON to the Hono app and parses the response.
- problem: 测试只提供 manager.get 的 casted context 并解析 JSON response；它没有 authenticated transport principal、shared codec 或 response 后的 journal state 对照。
- preservedBehavior:
  - 保留 Hono request helper and JSON response parse convenience.
  - 保留 route-specific path calls during migration.
- openQuestions: —

### MAP-8D000718DA

- mapping source: [services/uta/src/http/trading-order-entry.spec.ts:1-18](../../../../services/uta/src/http/trading-order-entry.spec.ts#L1-L18)
- symbol: one-shot route test contract and imports
- id: MAP-8D000718DA
- sourceEvidence:
  - services/uta/src/http/trading-order-entry.spec.ts:1-18: Defines the current one-shot contract as one HTTP roundtrip wrapping stage→commit→push, with phase-specific errors, message validation, and numeric-string precision expectations, then imports createTradingRoutes.
- currentBehavior: Defines the current one-shot contract as one HTTP roundtrip wrapping stage→commit→push, with phase-specific errors, message validation, and numeric-string precision expectations, then imports createTradingRoutes.
- problem: order-entry spec 把 route contract 定义为一次 stage→commit→push roundtrip；这会把 legacy Git phases、message requirement 和 HTTP status 当作新 transaction protocol。
- preservedBehavior:
  - 保留 current one-shot scenarios as migration evidence.
  - 保留 phase-specific failure intent but map to typed transaction states.
- openQuestions: —

### MAP-8F1E449867

- mapping source: [services/uta/src/http/routes-trading.ts:632-694](../../../../services/uta/src/http/routes-trading.ts#L632-L694)
- symbol: GET /snapshots/equity-curve
- id: MAP-8F1E449867
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:632-694: Loads per-account snapshots, groups timestamps by minute, sums Number-converted net liquidation values, carries forward missing accounts, and silently returns {points:[]} on any failure.
- currentBehavior: Loads per-account snapshots, groups timestamps by minute, sums Number-converted net liquidation values, carries forward missing accounts, and silently returns {points:[]} on any failure.
- problem: Transport performs aggregation over file-backed snapshots, coerces financial values to JavaScript numbers, mutates intermediate records for carry-forward, and hides projection/storage failures as empty data.
- preservedBehavior:
  - 保留 minute grouping, chronological sorting, per-account values and carried values where policy permits.
  - Preserve empty curve only when Complete query has no observations, not on any failure.
- openQuestions: —

### MAP-95C382B4F8

- mapping source: [services/uta/src/http/routes-trading.ts:167-190](../../../../services/uta/src/http/routes-trading.ts#L167-L190)
- symbol: GET /fx-rates
- id: MAP-95C382B4F8
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:167-190: Walks each UTA; skips offline accounts and catches errors only around positions/account reads. It collects non-USD currencies, then calls ctx.fxService.getRate outside that catch, so FX failures escape. Returns primitive rate/source/timestamp records.
- currentBehavior: Walks each UTA; skips offline accounts and catches errors only around positions/account reads. It collects non-USD currencies, then calls ctx.fxService.getRate outside that catch, so FX failures escape. Returns primitive rate/source/timestamp records.
- problem: Transport performs live aggregation, omits offline or failed account reads, lets FX failures escape as generic route failure, and returns primitive strings/numbers without currency-qualified values or typed uncertainty.
- preservedBehavior:
  - 保留 USD 排除与 non-USD currency discovery。
  - 保留 per-currency source/updatedAt 供工具解释。
- openQuestions: —

### MAP-98CE02C334

- mapping source: [services/uta/src/http/routes-trading.ts:530-540](../../../../services/uta/src/http/routes-trading.ts#L530-L540)
- symbol: POST /uta/:id/wallet/stage-close-position
- id: MAP-98CE02C334
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:530-540: Stage-only route accepts arbitrary JSON and directly calls uta.stageClosePosition, returning a legacy Git add result or a string 400 error.
- currentBehavior: Stage-only route accepts arbitrary JSON and directly calls uta.stageClosePosition, returning a legacy Git add result or a string 400 error.
- problem: stage-close-position 直接把任意 body 交给 stageClosePosition；qty 缺省同时承载 close-all 和缺字段两种含义，且没有 exposure before-image 或准备期重检。
- preservedBehavior:
  - 保留 explicit qty precision and close-all semantics.
  - 保留 close as risk-reducing action only if policy explicitly grants exemption.
- openQuestions: —

### MAP-9B42BF213C

- mapping source: [services/uta/src/http/routes-trading.ts:518-528](../../../../services/uta/src/http/routes-trading.ts#L518-L528)
- symbol: POST /uta/:id/wallet/stage-modify-order
- id: MAP-9B42BF213C
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:518-528: Stage-only route accepts arbitrary JSON and directly calls uta.stageModifyOrder, returning a legacy Git add result or a string 400 error.
- currentBehavior: Stage-only route accepts arbitrary JSON and directly calls uta.stageModifyOrder, returning a legacy Git add result or a string 400 error.
- problem: stage-modify-order 把任意 body 转给 legacy stageModifyOrder；它没有目标订单的 ScopedOrderRef/version，也不能表示 native amend 与 cancel-replace 的语义损失。
- preservedBehavior:
  - 保留 modify endpoint intent but require complete semantics and target identity.
  - 保留 broker identity/queue-loss risk as explicit outcome, not fake success.
- openQuestions: —

### MAP-9CF3FC0756

- mapping source: [services/uta/src/http/trading-order-entry.spec.ts:116-142](../../../../services/uta/src/http/trading-order-entry.spec.ts#L116-L142)
- symbol: place-order validation tests
- id: MAP-9CF3FC0756
- sourceEvidence:
  - services/uta/src/http/trading-order-entry.spec.ts:116-142: Verifies missing commit message and missing totalQuantity/cashQty return 400 without invoking stage, commit, or push.
- currentBehavior: Verifies missing commit message and missing totalQuantity/cashQty return 400 without invoking stage, commit, or push.
- problem: 验证缺 message 或缺 sizing 时不调用 legacy methods；新边界还必须分别拒绝缺 command metadata、非法 action relation 和 unauthorized scope，并证明 writer/broker 未变。
- preservedBehavior:
  - 保留 missing message/quantity 等旧输入不产生 staging/dispatch side effect 的证据；message 不再成为所有 effect 的必填 action 字段。
  - 保留 schema/application 早拒绝的安全目的。
- openQuestions: —

### MAP-9DB36046FA

- mapping source: [services/uta/src/http/simulator.spec.ts:88-128](../../../../services/uta/src/http/simulator.spec.ts#L88-L128)
- symbol: mark-price route tests
- id: MAP-9DB36046FA
- sourceEvidence:
  - services/uta/src/http/simulator.spec.ts:88-128: Uses a real MockBroker to place a limit order, verifies mark-price updates leave it pending then auto-fill it at the trigger price and update positions, and verifies malformed body returns 400.
- currentBehavior: Uses a real MockBroker to place a limit order, verifies mark-price updates leave it pending then auto-fill it at the trigger price and update positions, and verifies malformed body returns 400.
- problem: mark-price 测试通过真实 MockBroker 验证 80k pending 到 79k fill；它没有把 SetMarkPrice/FillObservation identity、replay 和 admin capability 纳入 durable fixture。
- preservedBehavior:
  - 保留 80k pending then 79k auto-fill, filled id, pending=0, position=1.
  - 保留 wrongField 400 intent.
- openQuestions: —

### MAP-A034B94A3A

- mapping source: [services/uta/src/http/trading-order-entry.spec.ts:298-315](../../../../services/uta/src/http/trading-order-entry.spec.ts#L298-L315)
- symbol: cancel-order validation tests
- id: MAP-A034B94A3A
- sourceEvidence:
  - services/uta/src/http/trading-order-entry.spec.ts:298-315: Verifies empty orderId and empty commit message each return HTTP 400 for the one-shot legacy route.
- currentBehavior: Verifies empty orderId and empty commit message each return HTTP 400 for the one-shot legacy route.
- problem: cancel validation 测试把空 orderId 与空 commit message 放在同一 legacy 400 contract；新协议应仅以 branded nonempty id 和 command envelope 判定，并禁止隐式 dispatch。
- preservedBehavior:
  - 保留 empty orderId returns 400 intent.
  - Replace empty commit message check with typed approval/audit metadata rule.
- openQuestions: —

### MAP-A33EC0E470

- mapping source: [services/uta/src/http/trading-order-entry.spec.ts:193-203](../../../../services/uta/src/http/trading-order-entry.spec.ts#L193-L203)
- symbol: place-order missing-UTA test
- id: MAP-A33EC0E470
- sourceEvidence:
  - services/uta/src/http/trading-order-entry.spec.ts:193-203: Posts to an unknown account id and asserts HTTP 404 before the legacy pipeline runs.
- currentBehavior: Posts to an unknown account id and asserts HTTP 404 before the legacy pipeline runs.
- problem: unknown account 测试只观察 legacy route 的 404；它没有区分 malformed AccountId、TransactionNotFound 和跨 scope Forbidden，也没有持久化不变性。
- preservedBehavior:
  - 保留 unknown account returns 404 before action.
  - Preserve no broker call/no staged state.
- openQuestions: —

### MAP-A7201E902B

- mapping source: [services/uta/src/http/routes-trading.ts:137-142](../../../../services/uta/src/http/routes-trading.ts#L137-L142)
- symbol: GET /equity
- id: MAP-A7201E902B
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:137-142: Calls utaManager.getAggregatedEquity() and serializes its result without a request/response schema or accounting/valuation error model.
- currentBehavior: Calls utaManager.getAggregatedEquity() and serializes its result without a request/response schema or accounting/valuation error model.
- problem: The route directly invokes a manager aggregate and returns an untyped aggregate shape; target accounting owns currency/FX/uncertainty and read projections are rebuildable.
- preservedBehavior:
  - 保留跨账户聚合 equity/cash/PnL 以及 per-account rows。
  - 保留 keyless/data accounts 不混入 funded portfolio。
- openQuestions: —

### MAP-A88187B75A

- mapping source: [services/uta/src/__tests__/trading-tools.spec.ts:69-87](../../../../services/uta/src/__tests__/trading-tools.spec.ts#L69-L87)
- symbol: UTAManager.resolveOne
- id: MAP-A88187B75A
- sourceEvidence:
  - services/uta/src/__tests__/trading-tools.spec.ts:69-87: Returns the sole UTA for an exact source and throws a string-bearing error when no UTA matches the requested source.
- currentBehavior: Returns the sole UTA for an exact source and throws a string-bearing error when no UTA matches the requested source.
- problem: resolveOne 在未命中时抛出依赖错误文本的异常；调用方无法区分 unknown 与 ambiguous，也无法在协议层稳定处理 404/409。
- preservedBehavior:
  - 保留成功时返回唯一匹配账户。
  - 把旧 Error message 改为可稳定解析的 code 与 matches。
- openQuestions: —

### MAP-AB73E0949C

- mapping source: [services/uta/src/http/routes-simulator.ts:137-149](../../../../services/uta/src/http/routes-simulator.ts#L137-L149)
- symbol: POST /uta/:id/tick-price
- id: MAP-AB73E0949C
- sourceEvidence:
  - services/uta/src/http/routes-simulator.ts:137-149: Validates nativeKey and deltaPercent, calls MockBroker.tickPrice directly, and returns auto-filled order ids; missing mark price or other broker errors are converted to a 400 string error.
- currentBehavior: Validates nativeKey and deltaPercent, calls MockBroker.tickPrice directly, and returns auto-filled order ids; missing mark price or other broker errors are converted to a 400 string error.
- problem: This is a deterministic test control and not a broker-observed market event or durable trading transaction. The route has no authenticated transport principal or separate operation-authorization check; direct MockBroker mutation is mounted as an HTTP surface.
- preservedBehavior:
  - 保留无 markPrice 先 set 才能 tick 的顺序约束。
  - 保留 tick 后自动撮合返回 filled ids。
- openQuestions: —

### MAP-AC5E619E59

- mapping source: [services/uta/src/http/routes-trading.ts:594-606](../../../../services/uta/src/http/routes-trading.ts#L594-L606)
- symbol: POST /uta/:id/wallet/cancel-order
- id: MAP-AC5E619E59
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:594-606: One-shot cancel validates orderId/message, stages cancellation, and immediately commits/pushes through the Git pipeline.
- currentBehavior: One-shot cancel validates orderId/message, stages cancellation, and immediately commits/pushes through the Git pipeline.
- problem: one-shot cancel 校验 orderId/message 后立即 stage、commit、push；并发 fill、order version 和 Unknown outcome 没有 durable observation 边界。
- preservedBehavior:
  - 保留 cancellation caller endpoint intent and order identity precision.
  - Do not silently turn cancel into success when venue rejects/race fills.
- openQuestions: —

### MAP-AC8C619E99

- mapping source: [services/uta/src/http/routes-trading.ts:416-420](../../../../services/uta/src/http/routes-trading.ts#L416-L420)
- symbol: GET /uta/:id/wallet/status
- id: MAP-AC8C619E99
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:416-420: Returns uta.status(), exposing pending Git message/staging/head state as the wallet status response.
- currentBehavior: Returns uta.status(), exposing pending Git message/staging/head state as the wallet status response.
- problem: The current route exposes live TradingGit authority. It cannot be deleted while UTAAccountSDK.status remains public, but it must not authorize execution.
- preservedBehavior:
  - 保留 current SDK status() during migration as read-only view.
  - 保留 UI can show staged/pending/recovery information, with renamed semantics.
- openQuestions: —

### MAP-B198583232

- mapping source: [services/uta/src/http/routes-trading-wallet.spec.ts:16-39](../../../../services/uta/src/http/routes-trading-wallet.spec.ts#L16-L39)
- symbol: wallet push/reject missing expectedPendingHash tests
- id: MAP-B198583232
- sourceEvidence:
  - services/uta/src/http/routes-trading-wallet.spec.ts:16-39: Asserts push and reject return 409 PENDING_HASH_REQUIRED and do not call mutation methods when the legacy pending hash is absent.
- currentBehavior: Asserts push and reject return 409 PENDING_HASH_REQUIRED and do not call mutation methods when the legacy pending hash is absent.
- problem: 测试把缺 expectedPendingHash 映射成 PENDING_HASH_REQUIRED；该旧检查只保护 Git staging，不能替代 transactionId/revision/digest/expiry/principal 的 canonical command 校验。
- preservedBehavior:
  - 保留缺少 expected pending hash 时不会调用 push/reject。
  - 保留旧 hash conflict 的 409 类语义，改为 typed transaction conflict。
- openQuestions: —

### MAP-B9C114CCA4

- mapping source: [services/uta/src/http/routes-trading.ts:408-414](../../../../services/uta/src/http/routes-trading.ts#L408-L414)
- symbol: GET /uta/:id/wallet/show/:hash
- id: MAP-B9C114CCA4
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:408-414: Looks up a Git commit by hash through uta.show and returns the commit or a 404 string error.
- currentBehavior: Looks up a Git commit by hash through uta.show and returns the commit or a 404 string error.
- problem: The route treats a Git hash as the lookup authority, while target Git hashes are not transaction identifiers and Git persistence is not recovery source.
- preservedBehavior:
  - 保留 UI deep-link to a human-readable historical entry where possible.
  - 保留 missing entry 404 semantics.
- openQuestions: —

### MAP-CA93BD9449

- mapping source: [services/uta/src/__tests__/trading-tools.spec.ts:244-270](../../../../services/uta/src/__tests__/trading-tools.spec.ts#L244-L270)
- symbol: getOrders.groupByContract
- id: MAP-CA93BD9449
- sourceEvidence:
  - services/uta/src/__tests__/trading-tools.spec.ts:244-270: Mocks three pending orders across AAPL and ETH and verifies that groupBy contract returns an object keyed by each Alice contract identifier with the expected order clusters.
- currentBehavior: Mocks three pending orders across AAPL and ETH and verifies that groupBy contract returns an object keyed by each Alice contract identifier with the expected order clusters.
- problem: 测试以 Alice 字符串作为 object key 聚类 AAPL/ETH；display alias 可能把同符号不同 venue 或不同 scope 合并，也没有为无法解析 identity 保留失败状态。
- preservedBehavior:
  - 保留 AAPL 两单、ETH 一单分别聚类。
  - 保留结果可按 Alice contract identity 显示，但内部 identity 为 InstrumentId。
- openQuestions: —

### MAP-CEE9B91D31

- mapping source: [services/uta/src/__tests__/trading-tools.spec.ts:298-310](../../../../services/uta/src/__tests__/trading-tools.spec.ts#L298-L310)
- symbol: createTradingTools.getQuote.sourceRouting
- id: MAP-CEE9B91D31
- sourceEvidence:
  - services/uta/src/__tests__/trading-tools.spec.ts:298-310: Registers Alpaca and Bybit accounts, calls getQuote with bybit-main|BTC and no explicit source, and verifies only the Bybit broker receives the request.
- currentBehavior: Registers Alpaca and Bybit accounts, calls getQuote with bybit-main|BTC and no explicit source, and verifies only the Bybit broker receives the request.
- problem: 测试以 Alice ID 的 provider 前缀选择 bybit，并仅用 spy 证明 alpaca 未被调用；source mismatch、授权 scope 和不可用账户仍没有稳定的协议结果。
- preservedBehavior:
  - 保留无 explicit source 时由 aliceId 路由到 bybit-main。
  - 保留 alpaca broker 不接收请求。
- openQuestions: —

### MAP-D034C92CBD

- mapping source: [services/uta/src/http/routes-trading-wallet.spec.ts:1-14](../../../../services/uta/src/http/routes-trading-wallet.spec.ts#L1-L14)
- symbol: wallet route test harness
- id: MAP-D034C92CBD
- sourceEvidence:
  - services/uta/src/http/routes-trading-wallet.spec.ts:1-14: Builds a minimal UTAEngineContext whose manager returns one arbitrary mock UTA and imports the legacy TradingGit PendingHashConflictError; tests exercise createTradingRoutes directly without authentication or real transaction services.
- currentBehavior: Builds a minimal UTAEngineContext whose manager returns one arbitrary mock UTA and imports the legacy TradingGit PendingHashConflictError; tests exercise createTradingRoutes directly without authentication or real transaction services.
- problem: wallet route 测试 cast 一个只含 manager.get 的 UTAEngineContext，并导入 PendingHashConflictError；它无法观察 authenticated principal、SQLite receipt、jobs/locks 或 broker interpreter 的真实边界。
- preservedBehavior:
  - 保留该文件覆盖 wallet approval route 的行为意图。
  - 保留测试隔离与可控 broker failure，但把 stub 替成 typed interpreter。
- openQuestions: —

### MAP-D236542360

- mapping source: [services/uta/src/http/trading-order-entry.spec.ts:280-296](../../../../services/uta/src/http/trading-order-entry.spec.ts#L280-L296)
- symbol: cancel-order happy-path test
- id: MAP-D236542360
- sourceEvidence:
  - services/uta/src/http/trading-order-entry.spec.ts:280-296: Posts a legacy cancel-order body and asserts HTTP 200 plus a staged orderId forwarded to stageCancelOrder.
- currentBehavior: Posts a legacy cancel-order body and asserts HTTP 200 plus a staged orderId forwarded to stageCancelOrder.
- problem: cancel 测试只断言 orderId 被转发到 stageCancelOrder；它没有建立 ScopedOrderRef/version、approval job 或 late-fill/Unknown outcome。
- preservedBehavior:
  - 保留 orderId ord-42 accepted through staging intent.
  - Preserve explicit cancel before approval.
- openQuestions: —

### MAP-D250B2BDC3

- mapping source: [services/uta/src/http/routes-trading.ts:276-281](../../../../services/uta/src/http/routes-trading.ts#L276-L281)
- symbol: GET /uta/:id/positions
- id: MAP-D250B2BDC3
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:276-281: Calls account.getPositions with an optional raw subAccountId and returns {positions: ...} through queryAccount, exposing broker/account-native position values.
- currentBehavior: Calls account.getPositions with an optional raw subAccountId and returns {positions: ...} through queryAccount, exposing broker/account-native position values.
- problem: The route directly queries the legacy account/broker object and serializes the result without target projection, observation, or domain-value schemas.
- preservedBehavior:
  - 保留 `{positions}` response shape concept and optional wallet filtering。
  - 保留 Decimal quantity/market values; no float conversion。
- openQuestions: —

### MAP-D266753674

- mapping source: [services/uta/src/http/routes-simulator.ts:116-121](../../../../services/uta/src/http/routes-simulator.ts#L116-L121)
- symbol: GET /uta/:id/state
- id: MAP-D266753674
- sourceEvidence:
  - services/uta/src/http/routes-simulator.ts:116-121: Resolves a MockBroker and serializes its full simulator state directly through getSimulatorState without an application query or explicit response schema.
- currentBehavior: Resolves a MockBroker and serializes its full simulator state directly through getSimulatorState without an application query or explicit response schema.
- problem: The response is an internal simulator state view and is not the target authoritative account or transaction projection. The route has no authenticated transport principal or separate operation-authorization check; direct MockBroker mutation is mounted as an HTTP surface.
- preservedBehavior:
  - 保留 state endpoint 能显示 cash、markPrices、positions、pendingOrders。
  - 保留 unknown UTA=404、non-simulator=400 的可诊断性（typed）。
- openQuestions: —

### MAP-D3212B77F2

- mapping source: [services/uta/src/http/routes-trading.ts:295-300](../../../../services/uta/src/http/routes-trading.ts#L295-L300)
- symbol: GET /uta/:id/market-clock
- id: MAP-D3212B77F2
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:295-300: Calls account.getMarketClock directly and serializes its account-scoped result through queryAccount.
- currentBehavior: Calls account.getMarketClock directly and serializes its account-scoped result through queryAccount.
- problem: The target explicitly says market clock is not an account-wide boolean, while this route delegates to an account-wide getMarketClock with no venue/instrument/session dimensions.
- preservedBehavior:
  - 保留 market clock query surface for callers needing session info。
  - 保留 closed/open distinction, but make dimensions explicit.
- openQuestions: —

### MAP-D58BA63EC0

- mapping source: [services/uta/src/http/routes-trading.ts:80-82](../../../../services/uta/src/http/routes-trading.ts#L80-L82)
- symbol: ALLOWED_ASSET_CLASSES
- id: MAP-D58BA63EC0
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:80-82: Defines a local allow-list for the contract-search query and uses a protocol AssetClassHint type, but it is not itself a decoded request schema or capability ADT.
- currentBehavior: Defines a local allow-list for the contract-search query and uses a protocol AssetClassHint type, but it is not itself a decoded request schema or capability ADT.
- problem: A local string Set and cast only filters one query hint; it does not represent target capability derivation or validate the full contract-search request.
- preservedBehavior:
  - 保留 equity/crypto/currency/commodity/unknown hints 与 crypto normalization。
  - 保留 invalid hint 不使 route crash，但将其变成稳定 validation failure 而不是静默当作 unknown。
- openQuestions: —

### MAP-D5B92C2A08

- mapping source: [services/uta/src/http/routes-trading.ts:542-555](../../../../services/uta/src/http/routes-trading.ts#L542-L555)
- symbol: POST /uta/:id/wallet/stage-cancel-order
- id: MAP-D5B92C2A08
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:542-555: Stage-only cancel route manually checks that orderId is a string, calls uta.stageCancelOrder, and returns a legacy Git add result or string 400 error.
- currentBehavior: Stage-only cancel route manually checks that orderId is a string, calls uta.stageCancelOrder, and returns a legacy Git add result or string 400 error.
- problem: stage-cancel-order 只检查 orderId 是 string 后就写入 staging；它没有 ListingComplete、order version/fills before-image 或与 simulator force-cancel 的边界。
- preservedBehavior:
  - 保留 orderId validation and stage-before-approval flow.
  - Preserve late fill/identity loss as typed observation/compensation risk.
- openQuestions: —

### MAP-DB305A9D5D

- mapping source: [services/uta/src/http/simulator.spec.ts:33-42](../../../../services/uta/src/http/simulator.spec.ts#L33-L42)
- symbol: req helper
- id: MAP-DB305A9D5D
- sourceEvidence:
  - services/uta/src/http/simulator.spec.ts:33-42: Builds Hono Request objects with optional JSON body, invokes the route app, parses any non-204 response as JSON, and returns status/body pairs.
- currentBehavior: Builds Hono Request objects with optional JSON body, invokes the route app, parses any non-204 response as JSON, and returns status/body pairs.
- problem: 测试 helper 直接构造 Hono Request、读取任意 JSON status/body；它没有统一 credential、protocol decoder 或 mutation 后 durable receipt 的观察路径。
- preservedBehavior:
  - 保留 optional JSON body and 204 handling.
  - 保留 direct Hono request convenience.
- openQuestions: —

### MAP-DF17C576FF

- mapping source: [services/uta/src/__tests__/trading-tools.spec.ts:274-289](../../../../services/uta/src/__tests__/trading-tools.spec.ts#L274-L289)
- symbol: createTradingTools.getQuote.resolution
- id: MAP-DF17C576FF
- sourceEvidence:
  - services/uta/src/__tests__/trading-tools.spec.ts:274-289: Resolves mock-paper|AAPL through the UTA, spies on broker.getQuote, verifies that the broker receives a native contract with populated symbol/localSymbol and the original Alice identifier, and checks the quote source.
- currentBehavior: Resolves mock-paper|AAPL through the UTA, spies on broker.getQuote, verifies that the broker receives a native contract with populated symbol/localSymbol and the original Alice identifier, and checks the quote source.
- problem: 测试通过 getQuote spy 检查 native Contract 的 symbol/localSymbol/aliceId；这验证了 adapter 事实，但当前 tool 边界仍直接暴露 native construction，未验证授权后返回的规范 Quote。
- preservedBehavior:
  - 保留 aliceId 解析后 broker 收到 symbol/localSymbol 与原 Alice identity。
  - 保留返回 source/account ownership。
- openQuestions: —

### MAP-DFB69CBAAD

- mapping source: [services/uta/src/http/routes-simulator.ts:167-179](../../../../services/uta/src/http/routes-simulator.ts#L167-L179)
- symbol: POST /uta/:id/orders/:orderId/cancel
- id: MAP-DFB69CBAAD
- sourceEvidence:
  - services/uta/src/http/routes-simulator.ts:167-179: Directly invokes MockBroker.cancelPendingOrder for a forced simulator cancellation and emits an unstructured 400 on failure.
  - services/uta/src/domain/trading/brokers/mock/MockBroker.ts:623-628: cancelPendingOrder only checks that the order exists, then unconditionally writes status=Cancelled even for a terminal order.
- currentBehavior: The route resolves a MockBroker and calls cancelPendingOrder; MockBroker only checks existence and then unconditionally sets status=Cancelled, so the god-view command can overwrite a Filled/Cancelled order.
- problem: Simulator force-cancel calls MockBroker.cancelPendingOrder, whose source implementation overwrites any existing order status without checking Submitted; this unsafe fixture behavior must be replaced by an explicit pending-only control command, separate from production CancelOrder.
- preservedBehavior:
  - 保留强制取消 pending simulator order 的清理用途。
  - 保留不存在 order 返回 400，改为 typed。
- openQuestions: —

### MAP-E66037B98B

- mapping source: [services/uta/src/__tests__/trading-tools.spec.ts:331-340](../../../../services/uta/src/__tests__/trading-tools.spec.ts#L331-L340)
- symbol: createTradingTools.getContractDetails.crossUTA
- id: MAP-E66037B98B
- sourceEvidence:
  - services/uta/src/__tests__/trading-tools.spec.ts:331-340: Passes an Alice identifier belonging to another account while selecting mock-paper and verifies that the tool reports the account mismatch without a broker call assertion.
- currentBehavior: Passes an Alice identifier belonging to another account while selecting mock-paper and verifies that the tool reports the account mismatch without a broker call assertion.
- problem: 测试以错误字符串报告 other-account|AAPL，但没有把 runtime canonical ownership 作为 broker 调用前的决定；nominal TypeScript brand 不能替代该检查。
- preservedBehavior:
  - 保留 other-account|AAPL 对 mock-paper source 报账户不匹配。
  - 保留错误在 broker call 前可观察。
- openQuestions: —

### MAP-E98645ED1A

- mapping source: [services/uta/src/http/routes-trading.ts:217-224](../../../../services/uta/src/http/routes-trading.ts#L217-L224)
- symbol: POST /uta/:id/reconnect
- id: MAP-E98645ED1A
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:217-224: Calls utaManager.reconnectUTA(id) directly and chooses HTTP 200 or 500 from a success boolean, with no account existence, authorization, typed connection state, or protocol failure mapping.
- currentBehavior: Calls utaManager.reconnectUTA(id) directly and chooses HTTP 200 or 500 from a success boolean, with no account existence, authorization, typed connection state, or protocol failure mapping.
- problem: Connection lifecycle is reached through the legacy manager and reduced to success/500 rather than target scoped Layer/supervision and typed degraded capability.
- preservedBehavior:
  - 保留 reconnect endpoint 与 success/failure response intent。
  - 不再把 whole-process restart boolean 当单账户 broker readiness。
- openQuestions: —

### MAP-EA13BA2333

- mapping source: [services/uta/src/http/trading-order-entry.spec.ts:144-176](../../../../services/uta/src/http/trading-order-entry.spec.ts#L144-L176)
- symbol: place-order stage and commit failure tests
- id: MAP-EA13BA2333
- sourceEvidence:
  - services/uta/src/http/trading-order-entry.spec.ts:144-176: Configures the UTA stub to throw during staging or commit, then verifies phase=stage/commit, HTTP 400, no later phase, and no reject when commit has no prepared hash.
- currentBehavior: Configures the UTA stub to throw during staging or commit, then verifies phase=stage/commit, HTTP 400, no later phase, and no reject when commit has no prepared hash.
- problem: 测试把 staging/commit throw 映射为 phase=stage/commit；这种 stub 失败不能证明 PrepareFailure 的状态演进、SQL rollback 或 Preparing 恢复。
- preservedBehavior:
  - 保留 stage/commit errors stop later work and no reject when no prepared hash.
  - Change generic `Error` to named failure and durable state.
- openQuestions: —

### MAP-EBC1DF5535

- mapping source: [services/uta/src/__tests__/trading-tools.spec.ts:137-167](../../../../services/uta/src/__tests__/trading-tools.spec.ts#L137-L167)
- symbol: getOrders.compactSummaries
- id: MAP-EBC1DF5535
- sourceEvidence:
  - services/uta/src/__tests__/trading-tools.spec.ts:137-167: Executes a staged and pushed market order, then checks that getOrders returns compact fields such as source, action, orderType, quantity, and status while excluding raw IBKR fields.
- currentBehavior: Executes a staged and pushed market order, then checks that getOrders returns compact fields such as source, action, orderType, quantity, and status while excluding raw IBKR fields.
- problem: 测试先走 stage/commit/push 再查询 compact order；HTTP/tool 结果因此仍可把 Git push 成功当作订单事实，并未约束 projection stale 或 broker observation 延迟。
- preservedBehavior:
  - 保留 compact 输出核心 fields 并排除 softDollarTier/transmit/blockOrder/sweepToFill。
  - 保留已提交市场单后查询仍能看到规范状态。
- openQuestions: —

### MAP-EC8F4C5533

- mapping source: [services/uta/src/http/trading-order-entry.spec.ts:236-267](../../../../services/uta/src/http/trading-order-entry.spec.ts#L236-L267)
- symbol: close-position one-shot tests
- id: MAP-EC8F4C5533
- sourceEvidence:
  - services/uta/src/http/trading-order-entry.spec.ts:236-267: Covers explicit close quantity and close-all behavior, asserting HTTP 200 and that legacy stageClosePosition receives a string qty or no qty, preserving Decimal precision and All semantics through stage/commit/push.
- currentBehavior: Covers explicit close quantity and close-all behavior, asserting HTTP 200 and that legacy stageClosePosition receives a string qty or no qty, preserving Decimal precision and All semantics through stage/commit/push.
- problem: close 测试用缺省 qty 表达 close-all，并以 stage 参数检查精度；它没有验证 prepare 时解析 All、exposure before-image、partial fill 和补偿评估。
- preservedBehavior:
  - 保留 explicit qty string and no qty = close all.
  - Preserve precision and close-after-fill cleanup intent.
- openQuestions: —

### MAP-F3C5E04898

- mapping source: [services/uta/src/http/routes-trading.ts:1-11](../../../../services/uta/src/http/routes-trading.ts#L1-L11)
- symbol: route module imports
- id: MAP-F3C5E04898
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:1-11: The boundary imports Hono/Zod but also UnifiedTradingAccount, BrokerError, order-entry, TradingGit hash handling, order-history projections, and a domain contract-search helper; route composition therefore reaches legacy execution and Git persistence APIs directly.
- currentBehavior: The boundary imports Hono/Zod but also UnifiedTradingAccount, BrokerError, order-entry, TradingGit hash handling, order-history projections, and a domain contract-search helper; route composition therefore reaches legacy execution and Git persistence APIs directly.
- problem: The HTTP module directly imports old UTA/Git execution and projection helpers rather than target application/protocol abstractions, and BrokerError is collapsed later into ad hoc HTTP fields.
- preservedBehavior:
  - 保留现有 Hono route mount 与 UI/SDK URL 迁移窗口。
  - 保留 query 与 mutation 分离，删除 direct legacy authority。
- openQuestions: —

### MAP-F42728FD63

- mapping source: [services/uta/src/http/routes-trading.ts:390-399](../../../../services/uta/src/http/routes-trading.ts#L390-L399)
- symbol: GET /uta/:id/order-history
- id: MAP-F42728FD63
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:390-399: Projects lifecycle-collapsed order rows from uta.exportGitState().commits using domain order-history logic and returns them as an exchange-frontend view.
- currentBehavior: Projects lifecycle-collapsed order rows from uta.exportGitState().commits using domain order-history logic and returns them as an exchange-frontend view.
- problem: Current order history treats Git commits as its source, contrary to the target journal authority and rebuildable projection contract.
- preservedBehavior:
  - 保留一行 per order lifecycle collapsed exchange-front-end view。
  - 保留 limit parameter and order source labels, expanded to include prepared/unknown semantics.
- openQuestions: —

### MAP-F454EFC3B2

- mapping source: [services/uta/src/http/routes-trading.ts:422-441](../../../../services/uta/src/http/routes-trading.ts#L422-L441)
- symbol: POST /uta/:id/wallet/commit
- id: MAP-F454EFC3B2
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:422-441: Validates a nonempty message, calls uta.commit synchronously to finalize staged Git operations, and returns the prepared Git commit or a generic 500 string error.
- currentBehavior: Validates a nonempty message, calls uta.commit synchronously to finalize staged Git operations, and returns the prepared Git commit or a generic 500 string error.
- problem: wallet/commit 只校验 message 后同步调用 uta.commit 并返回 Git commit；它把 preparation、审计文本和 Git persistence 混成一个结果，且没有 serializable plan 或 commit-after-approval barrier。
- preservedBehavior:
  - 保留 current commit as a validation/preparation boundary.
  - 保留 hash-like digest for optimistic review, but make digest canonical plan identity.
- openQuestions: —

### MAP-F589132F03

- mapping source: [services/uta/src/http/routes-trading.ts:401-406](../../../../services/uta/src/http/routes-trading.ts#L401-L406)
- symbol: GET /uta/:id/trade-history
- id: MAP-F589132F03
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:401-406: Projects fill-only trade rows from exported Git commits and returns them as a raw trade list.
- currentBehavior: Projects fill-only trade rows from exported Git commits and returns them as a raw trade list.
- problem: The route uses Git commit export as history authority and returns untyped records, with no broker-observed execution/reconciliation or accounting projection boundary.
- preservedBehavior:
  - 保留 fill-only trade history and source labels order/external/reconcile。
  - 保留 limit/read-only route; remove Git authority.
- openQuestions: —

### MAP-FC80F364B6

- mapping source: [services/uta/src/http/routes-trading.ts:380-388](../../../../services/uta/src/http/routes-trading.ts#L380-L388)
- symbol: GET /uta/:id/wallet/log
- id: MAP-FC80F364B6
- sourceEvidence:
  - services/uta/src/http/routes-trading.ts:380-388: Reads a legacy TradingGit log directly from UnifiedTradingAccount, with ad hoc numeric limit/symbol query parsing, and returns commit records.
- currentBehavior: Reads a legacy TradingGit log directly from UnifiedTradingAccount, with ad hoc numeric limit/symbol query parsing, and returns commit records.
- problem: The route reads UTA-owned TradingGit state directly, while target Git is rebuildable human-readable projection and SQLite journal is authoritative.
- preservedBehavior:
  - 保留 log limit/symbol browsing；保留 human-readable commit/audit metadata 作为 projection。
  - 不再让 Git records authorize execution。
- openQuestions: —

### MAP-FE1C608463

- mapping source: [services/uta/src/http/routes-trading-wallet.spec.ts:59-78](../../../../services/uta/src/http/routes-trading-wallet.spec.ts#L59-L78)
- symbol: wallet push expected-hash success test
- id: MAP-FE1C608463
- sourceEvidence:
  - services/uta/src/http/routes-trading-wallet.spec.ts:59-78: Stubs push to return a Git PushResult and verifies matching expectedPendingHash produces HTTP 200 and forwards the hash to push.
- currentBehavior: Stubs push to return a Git PushResult and verifies matching expectedPendingHash produces HTTP 200 and forwards the hash to push.
- problem: 测试把 matching hash 的 Git PushResult 当作 HTTP success；这没有区分 approval receipt、DispatchStarted、Ack 和 fill，也无法证明 response 丢失后的 command convergence。
- preservedBehavior:
  - 保留 matching expected hash historically permits push；new success means approved/queued, with Human mode when AI trading is disabled and AuthorizedAuto mode only from server policy when enabled。
  - 保留 UI 可在成功后查询 transaction status。
- openQuestions: —
