# TargetGaps：按可组合能力闭合 26 个目标空缺

本稿是目标设计，不是生产迁移、provider 接入或验收结果。逐条源码证据、当前行为、保留义务和验证案例在同目录 `analyses.json`；原始输入与 closure 仍用于追溯。共同契约是 [`composition-contract.md`](../composition-contract.md) 的 K01–K12，本稿不重新定义它，也不把设计中的名字说成已经存在的模块或导出。

本组必须同时满足两个边界：

1. **固定 UTA-facing 外层，开放 provider 内部。** Provider 只声明能力树叶子、精确输入/结果/领域错误 schema、交付方式、效果类别、资源和 availability 证据。SDK、类、回调、REST/OpenAPI、独立 bridge 进程和 provider-native 参数都可以保留。能力描述、校验、静态类型、CLI/help 与 AI 元数据从声明组合，不由内核维护全局 Broker SDK 或完整 action 表。
2. **数据交付与受控效果分开。** `Candle`、`Instrument`、`News`、`NewsGroup` 是数据语义单位；pull 是有限结果，push 是有生命周期、背压、cursor/finality/gap 契约的资源 scoped stream。只有确实改变外部状态的能力才组合 `withTransaction`，进入 approval、write-ahead、CAS、dispatch、observation、recovery；数据读取、缓存和每一帧 stream 不使用订单事务、补偿或订单锁。

## 1. 证据、范围与当前缺口

以下是本组调查中仍然成立的源码事实，目标设计只改变 authority 边界，不改写它们：

- `src/webui/routes/trading-proxy.ts:1-12,29-34` 明确说明 Alice→UTA 只有 loopback 信任，转发 request-id 等关联 header，没有 Alice–UTA authentication；`src/webui/routes/trading-config.ts:216-249,272-331` 仍由 Alice 创建、编辑、停用账户并触发 reload/reconnect，还能在 ephemeral 路径擦除交易状态。
- `src/tool/trading.ts:203-207,760-807` 保留产品事实：`allowAiTrading=false` 返回人工审批路径，开启时当前代码直接调用 `uta.push`。`services/uta/src/domain/trading/UnifiedTradingAccount.ts:180-205` 仍是一个 generic dispatcher，按 action 分支直接调用 broker；这两处是迁移证据，不是新架构要求保留的全局 SDK。
- `UnifiedTradingAccount.ts:572-595` 的 partial-close 数量保护仍有价值，但它是本地重读 position 的保护，不能冒称 provider-native reduce-only、外部版本串行化或成交保证。`:651-700,784-790` 说明多 sub-account 需要显式 selector，旧 commit 只把 sub-account 写进 message，历史 `Operation/GitCommit` 并未获得可逆 scope 字段。
- `services/uta/src/domain/trading/order-sync-poller.ts:53-105` 有进程内 running flag、串行 account loop、pending-order sync 和 external-order observation；`git-persistence.ts:27-47` 把读/parse/permission/IO 错误一起 fallback，并整文件覆盖。它们分别是 data/effect durability gap，不应再被包装成一个万能 broker transaction。
- `services/uta/src/main.ts:63-189` 当前先初始化 manager、purge ephemeral UTA、snapshot/catalog/timer/routes，再提供 `ok/startedAt/utas` health；simulator 通过 `routes-simulator.ts:105-221` 直接操作 MockBroker。`services/uta/package.json:14-34` 没有选定 SQL/native stack，`services/uta/tsup.config.ts:11-19` 外置 node_modules/native，Dockerfile `51-65,107-159` 有独立 UTA closure 与 complete `/data` home。这些都是实施和 empirical gate，不是已经完成的 runtime。

审计 mapping 的 architecture 行号是历史调查输入，固定在 Git `a5f23756531cc552b7e12b6d655ae1ffbcd28b64`；它们不能替代当前实现或 native evidence。每个 note 的 exact sourceEvidence 在 `analyses.json`，原始 question text 在 `questions-closure.json`，reviews/entries 由独立 review/regeneration 处理。

## 2. 能力组合边界（NOTE-9-1、NOTE-14-1、NOTE-2-1）

### 2.1 一次声明，多个投影

每个 provider instance 按当前主体、环境和 resource scope 发布 capability tree。固定的 `CapabilityDescriptor` 外层只描述：协议版本、稳定能力身份、命令路径、描述、schema version/fingerprint、input/result/error schema、delivery mode、effect category、权限/资源要求、来源与 availability 证据。具体叶子 schema 和父树由 provider 声明，空父节点递归消除。

`PublicScope` 与 `AccountScope` 是不同的 scope 形态：公共 Candle/Instrument/News/NewsGroup 能力不得凭空造 account 或 sub-account；订单、持仓、余额、buying-power、account config 等 account facts 才要求 `AccountScope`，其中 provider 能区分钱包时必须有显式 `subAccountId`。一个具体能力可以声明自己的更窄 scope；scope 不能从 socket reachability、URL、numeric order id 或调用者 body 猜出。

```
flowchart LR
  D[Provider declaration] --> S[Exact input/result/error schemas]
  D --> U[Semantic unit and scope]
  D --> R[Delivery and resource contract]
  D --> A[Availability evidence]
  S --> C[CapabilityDescriptor]
  U --> C
  R --> C
  A --> C
  C --> V[Validation, static types, help, CLI and AI metadata]
  C --> I[Fixed UTA-facing invocation boundary]
  I --> P[Provider-native adapter or bridge]
```

这里的 `D` 可以由类、函数、SDK wrapper、REST client 或独立进程产生；schema wire 中不携带函数。运行时能力必须绑定 discovery revision、capability identity 和 schema fingerprint；被替换或撤销时返回 stale/availability/authorization 错误，不静默执行另一语义。名称冲突在装载时拒绝。

### 2.2 Provider-native order fields 不被抹平

`Order` 是可组合语义单位，不是所有 provider 的完整订单全集。数量、notional、价格、时效、保护、parent/OCA、extended session 及 provider 原生字段以带前置条件的 schema/HOF 组合；provider 声明哪些组合合法，内核只检查声明后的精确 schema、scope、单位和风险约束。不得推测“非市价不能 notional”或将一个 provider 的组合规则传播到另一 provider；不支持的叶子/字段结构性缺席，不能靠所有 provider 返回 `Unsupported` 填满。

对 effect leaf，`withTransaction` 只增加可持久化 prepared payload、approval、dispatch identity、ack/observation/error/recovery 所需的 data contract，不把原生 dispatch 函数暴露给 public handle。组合器必须保留 provider extension schema 和资源要求；闭包只存在于装载进程，持久化只保存描述、参数、版本和实现身份。

### 2.3 Bridge 错误边界

Provider bridge 统一 UTA 一侧的 version negotiation、discovery、correlated request/response 或 stream、cancel；不统一 provider 内部协议。SDK 接口存在不能推导 read-only、idempotency、atomicity、absence、compensation 或 sandbox safety。adapter 逐字段解码 native payload：

- 输入拒绝、已声明领域错误、delivery/process error、output violation 和 load/metadata error 分开；
- 已可能发出的 effect 遇断连或坏响应必须是 `OutcomeUnknown`，不能改写成 `KnownRejected`；
- data output 的坏 frame 可结束/暂停该数据叶子，不得创建 order rejection；
- availability 与 authorization/risk/precondition 分开；实现存在但未登录、限流或断连时保留能力身份并报告具名 availability；
- 持有交易密钥的异构进程仍是受信执行边界，类型不能冒称沙箱安全。

## 3. 数据交付与受控效果

| 维度 | 数据能力（K05） | 受控效果（K08） |
|---|---|---|
| 单位 | Candle、Instrument、News、NewsGroup 及 provider extension | `Order` 或未来其他确实改变外部状态的 semantic unit |
| 交付 | pull：一次有限结果、分页/cursor、完整性；push：Opening/Live/Paused/Ended/Failed 等资源生命周期 | intent → prepare → approve → claim/start → adapter mutation → ack/observation → settlement/recovery |
| 资源 | connection、quota、cache、storage、stream buffer、backpressure | logical effect locks、run permits、risk reservations、approval/dispatch identity |
| durability | 只保存声明所需的 cursor、frame identity、freshness/finality、gap/replay evidence；可丢 cache 但不得伪造连续性 | WAL/CAS/idempotency/reconcile/Unknown/compensation 只在确有 mutation 时启用 |
| 取消/重试 | SIGINT/close 取消本次订阅并释放本次资源；是否 resume 由 provider replay contract 决定 | DispatchStarted 后 lease 过期不代表远端 sender 消失；无 idempotency/absence/fence 证据只能 Observe/Recovery |
| 触发 | data event 是 evidence，finality/ordering/gap 必须检查 | event trigger source != authority；触发只产生 Activation，按冻结 policy 进入 approval 或明示执行 |

当一条数据被用于 effect 决策，持久化的是选中的 evidence、消费身份、触发 predicate 和 execution decision，不把完整行情流事务化。`ReturnToAgent` 只适用于选中的 effect trigger policy：原子消费 activation、暂停 binding、保留未发送 intent/evidence、创建稳定 ReviewRequest/outbox，**不创建 broker dispatch**；保留、rearm、revise、discard 都是显式命令，迟到回复按 revision/review identity CAS。

## 4. 各目标缺口的实施方向

### 4.1 身份、生命周期、模拟器与 authority（NOTE-2-1、NOTE-15-1、NOTE-19-1）

Alice 保留人机界面、Workspace/Session correlation 和用户认证；UTA 接收带 audience、home identity、principal、body digest、issuedAt/expiresAt、commandId 和 proof 的 `AuthenticatedAliceRequest`。UTA 自己解析 capability、scope、policy snapshot 和 credential reference；`allowAiTrading` 只能成为经过授权的 product-policy input。关闭时仍是 AwaitingApproval；开启时也必须形成 digest-bound approval 并经过 normal prepare/writer/DispatchStarted，不得再直接 push。

账户 Configure/RotateCredentialReference/Disable/Retire 是独立 lifecycle capability，带 expected config revision。SQLite 与 sealed secret store 不假装分布式原子：writer 记录 reference write intent，按 revision 幂等应用，再开启对应 availability。未分类的 remote liability 阻止 destructive retire；secret 不进入 plan、log、public view。

Transport 只拿命名 application/query/capability/data ports；不注入 `JournalWriter`、`SqlClient`、SDK object 或 manager god-view。Simulator 是独立 MockVenue ledger 的 ExternalVenueStimulus；真实 effect 仍走正常 approval/dispatch/observation。Recovery 只接受带 actor/scope/version/evidence 的小型 ADT，拒绝任意 SQL、row patch、force-success 或任意 state tag。单 UTA home 保留 effect authority；provider broker/data facts、market-data stream、telemetry/backup 都不能成为第二套审批/恢复 authority。

### 4.2 Writer、draft、state、locks、criteria、compensation（NOTE-4-1、NOTE-4-2、NOTE-5-1 至 NOTE-5-5）

- **Writer/admission（NOTE-4-1）：** 有界 user-admission 与 internal-progress ingress 由一个 writer 服务；batch 只 drain 当时有限快照，按 lane/FIFO 顺序用 staged state 连续决定。receipt 只在 commit 后完成；SQL failure 整批 rollback。provider data pull/push 的 buffer、cursor 和 cancellation 不进入 effect writer，也不以每帧 WAL 保护。
- **Draft/cache（NOTE-4-2）：** `CapabilityDraftView` 可由 STM/TRef 等实现，但只是 PublicScope 或 AccountScope capability 的 local view。只有 effect DraftRecord/PrepareStarted receipt 产生 saved revision；cache eviction 不会修改已批准 effect，data cursor eviction 也不创造 approval。
- **Effect state/event（NOTE-5-1）：** `EffectDecision` 保留 `Rejected | Unchanged | Accepted`，并保留十二个受控效果生命周期及 PlanRef/ProgressRef；duplicate command 返回旧 receipt。数据 result/frame 用 provider schema、cursor/finality/gap projection，不折叠成 effect state，也不伪造 aggregate event。
- **锁与资源（NOTE-5-2、NOTE-8-1）：** Account/Exposure/Order/Connection 仅在声明的 effect resource 必要时进入 canonical conflict set；AccountScope 和 provider-required subAccountId 不从 public data 推造。data stream 的 ProviderInstance/feed/subscription quota 是独立 DataResourceKey；stream 结束不能释放 Unknown effect 的经济排他。
- **证据准则（NOTE-5-3）：** criterion 由 prepared effect 声明，transport 200、socket write、普通 callback 不能替代 native acceptance/working/fill/exposure/cancel/terms/group evidence。provider native group id 可能在 dispatch 后才出现，先冻结 logical group identity，再 durable bind。
- **补偿（NOTE-5-4）：** assessment/intent 只保存 Exact/StateRestoring/Economic/None 数据和 assumptions；runtime compiler 在 adapter 收集 applied facts 后纯组合。NativeConformanceRecord 按 capability leaf/effect variant 记录 identity scope、horizon、lookup/absence/fence、restoration domain 和 evidence version；未验证保持 NativeGuaranteeUnproven。
- **失败策略（NOTE-5-5）：** IndependentBatch、AllOrCompensate、ProviderDeclaredAtomic 是 controlled-effect policy。legacy translation 明确选择 ContinueOnKnownRejection；Unknown 暂停余下 effect。provider 没有 native atomic evidence 时本地 SQL group 不升级为 atomic。data delivery 有自己的 end/gap/overflow policy，不调用 compensation。

### 4.3 Storage、关系、调度、前置条件与 provider bridge（NOTE-7-1、NOTE-7-2、NOTE-8-2 至 NOTE-9-1）

选定的 embedded storage 只在 native dependency/ABI/open+migrate/pragmas 真实证据齐全后进入 effect `Ready`。`uta.sqlite` 负责 effect receipts/events/jobs/locks/recovery、capability descriptor/availability 等必要记录；provider data cache/cursor projection 是 typed PublicScope/AccountScope records，有自己的 retention/freshness，不把每帧行情放进 order WAL。主文件损坏不能 fallback 到空历史或旧路径掩盖；non-trading Alice 可在 effect storage unavailable 时保持独立可用。

关系约束必须用 named versioned codec、FK/UNIQUE/CHECK 和纯 relation constructor 共同表达。effect job 的 preparation/expiry/observation/compensation target 不能伪造 step id；data pull/push 用 cursor/stream lifecycle target。Started effect 使用单调 epoch、DispatchStarted 记录和 Unknown-safe observe；stream 使用自己的 cursor/replay/finality/close contract。fairness、token budget、wait barrier 只决定 effect job admission；数据 buffer 按声明的 Lossless/Latest/DropOldest/backpressure 策略运行。

Effect precondition 由具体 capability 组合 `TransactionVersion`、`ProviderOrderVersion`、`ExposureEquals`、`BuyingPowerAtLeast`、`MarketSessionOpen` 等局部 union。Account/order 事实必须带 AccountScope，并在 provider 能区分钱包时带显式 subAccountId；公共 Candle/Instrument/News 用 PublicScope 或 provider 自己声明的 scope。不能用公共行情 cache 推出账户可用额度，不能把本地 check 说成 remote atomic。

NOTE-9-1 的旧 generic broker switch 只作为迁移事实。目标 provider adapter 以一处 declaration 导出 schema、静态类型、validator、descriptor、help/CLI/AI metadata；`withTransaction` 只作用于 effect leaf。新增 provider-native field 应只改该 declaration 和生成投影；没有 option/cancel/某种保护能力的 provider tree 就没有叶子和命令。没有全局 `ActionContractMap`、没有全 broker full handler，也没有 Market/Limit/Stop/保护/venue 的笛卡尔 handwritten variants。

### 4.4 Startup、defect、observability、routes（NOTE-12-1、NOTE-12-2、NOTE-13-1、NOTE-14-1、NOTE-16-1）

Startup 用一个带 evidence 的 `RuntimeHealth`（Initializing/Recovering/Ready/Stopping/Failed）与 local effect journal barrier。Prepared/AwaitingApproval 只恢复 review/expiry；Queued 且无 Started 才能 requeue；Started/Unknown 必须 observe；Aborting/Compensating/RecoveryRequired 恢复当前 owner。provider reach/availability 与 data stream state 是 PublicScope/AccountScope scoped views，不阻塞无关 scope，也不由 socket health 推出 effect writable。

Failure 分类区分 domain/provider rejection、connection unavailable、precondition conflict、delivery gap、output violation、OutcomeUnknown 与 persisted/replay/relational defects。effect journal defect 关闭受影响 authority 并保留 evidence；单一 data leaf 的坏 frame 可 isolate/pause；没有 blanket catch、空结果 fallback 或把 possible-send 变成 KnownRejected。

Routes/CLI 是最外层 interpreter：先 auth/discover/describe，再按叶子 schema decode、invoke、encode。controlled-effect leaf 使用 receipt/idempotency/expected-version；pull 返回有限带 schema 结果；push 返回具名 frames、error/end/cancel。固定 UTA-facing routes 不等于固定 provider command tree；权限视图可以隐藏主体无权发现的叶子。Observability 和 projection-store 只消费 typed context：effect context 带 plan/dispatch identity，data context 带 provider/resource/cursor/finality；redaction 拒绝 raw SDK fields，metrics label 保持有界。

### 4.5 独立验收、真实环境与发行（NOTE-17-1、NOTE-18-1、NOTE-18-2）

Slice 3 使用独立 MockVenue process/ledger、UTA authority 和 scoped instruments。effect crash cuts 覆盖 prepared-before-approval、approval-before-claim、claim-before-start、venue-accepted-before-ack、ack-before-projection、abort-before-compensation、compensation-accepted-before-ack，并加入 paused stale-worker；data cuts 覆盖 finite pull pagination、push disconnect/replay gap、frame finality correction、overflow/backpressure、SIGINT cancellation。Mock 的 reversible ledger 只证明 fixture capability，不升级真实 provider guarantee。

真实验收走 authenticated Alice Workspace→UTA capability/effect path。S1–S14 只在 capability/环境实际适用时运行；结构性缺失记 `NotApplicable(reason)`，环境/session/entitlement/native evidence 不足记 `Blocked`，不能 silent skip。S7 external/manual stimulus 单独记录 actor/provenance，只验证 observation，不绕过 UTA approval。baseline 必须包含 provider 声明的所有 relevant namespaces、protective/conditional children、positions/balances/units、completeness 和 cleanup outcome；Unknown 不得 generic flatten。

每个 Source/Docker/PackagedDesktop OS/arch cell 都要真实执行 native load/open/migrate、durable effect kill/recover、consistent backup/restore、complete-home relocate、corruption、read-only/full disk、double-owner。restore 先 durable `RestoreQuarantine`，再 ObservationOnly，对照当前 provider facts；旧 owner stop/fence、residual handling 和显式 cutover 未证实就不开 effect authority。databaseUuid/checksum/high-watermark 只供 audit correlation，不能证明 rollback/clone detection、sole owner、remote exactly-once 或 native idempotency。

## 5. 跨边界时序与不变量

```mermaid
sequenceDiagram
  participant C as Alice/CLI/AI
  participant U as UTA boundary
  participant D as Capability declaration
  participant W as Effect writer
  participant P as Provider adapter
  participant S as Data stream resource

  C->>U: authenticate + discover/describe
  U->>D: resolve scope, identity, schema fingerprint, availability
  D-->>U: exact leaf contract
  alt finite pull or push data leaf
    U->>S: open/read with cursor and resource policy
    S-->>U: finite page or typed frame/error/end
    U-->>C: schema result; no approval/compensation
  else controlled effect leaf
    U->>W: prepare/approve intent and receipt
    W-->>U: committed effect revision/dispatch identity
    U->>P: dispatch only after DispatchStarted
    P-->>U: native ack/evidence or possible-send failure
    U->>W: normalize evidence and recover/settle
    W-->>C: receipt/status/review; never raw SDK object
  end
```

必须成立：

- 发现后替换/撤销能力返回 stale/availability/authorization 错误，不重定向到另一语义；
- provider extension 不被转成 `Record<string, unknown>`，schema fingerprint 覆盖实际执行契约和语义版本；
- PublicScope 数据不获得虚构 AccountScope；AccountScope 事实不缺 provider 要求的 subAccountId；scope 不由 source event 或 socket health 授权；
- pull 有有限结果与 completeness，push 有创建/取消/结束/错误、顺序范围、cursor、gap、背压和断连恢复契约；收到一帧不等于 closed/final；
- 只有 controlled effect 使用 approval/WAL/CAS/dispatch/compensation；data cache failure 不触发 compensation；
- `ReturnToAgent` 不创建 dispatch，review reply 使用 expected revision/review identity；预授权也绑定 intent/plan version、限制、有效期和 source conditions；
- NativeConformanceRecord/真实 acceptance 是 provider/effect-specific。SDK method、empty listing、mock success、HTTP 200、manifest metadata 都不是 native guarantee。

## 6. 可证伪验收与保留风险

以下实验直接对应 K12，并将当前 investigation evidence 变成可证伪 obligation；本设计阶段不宣称它们已执行：

1. 在一个 provider declaration 增加精确 native field，静态类型、validator、descriptor fingerprint、help/CLI/AI metadata 同时改变，内核无 capability switch 改动。
2. 删除某 provider 的 option/cancel leaf，发现树无该叶子、命令或空父节点；另一个 provider 不被迫实现空方法。
3. 将错误 input、坏 native output、未知 frame finality 分别送到 handler 前、adapter boundary 和 stream consumer，观察它们成为各自 typed error，而非 cast/empty result。
4. Pull 返回有限分页并明确 incomplete；push 发送 frame、gap、correction、end、error、SIGINT cancellation；stream resource 释放且不产生 order approval/WAL。
5. 以一条 candle/data activation 触发 `ReturnToAgent`：同一 durable decision 暂停 binding、保留 intent/evidence、写稳定 review/outbox，broker dispatch 计数为零；重复 event、迟到 reply、rearm/revise 不复用旧 identity/approval。
6. 在独立 MockVenue 的每个 effect crash cut、late fill、partial fill、compensation failure、paused stale-worker 场景中，重启后只能出现一个有证据的下一步；无 native idempotency/absence/fence 时保持 Unknown/RecoveryRequired。
7. 运行真实 acceptance 时，paper/session/entitlement marker 或 SDK method 但缺完整 baseline/native evidence 只能得到 Blocked/NotApplicable；S7 external stimulus 不得计为 UTA execution；隐藏 protective/conditional namespace 使 baseline 失败。
8. 在每个 distribution cell 和 restore workflow 中，错误 ABI、corrupt journal、rollback/clone、double owner、missing provider bridge schema 均 fail closed；ObservationOnly 未完成前不得 effect Ready。

尚未解决的 native/环境问题仍列在 closure：NOTE-5-4 的每 provider/effect restoration/idempotency，NOTE-7-1 的 selected Effect/SQL/native ABI，NOTE-9-1 的 identity/lookup/absence/fencing，NOTE-18-1 的真实 non-live/session/entitlement，NOTE-18-2 的 distribution matrix/packaged ABI。新组合设计不会把这些问题标成已解决；没有 evidence 的 capability 只能 unavailable 或 unknown-safe。

## 7. 调查/MAP 对照

本组没有另行发明 MAP ID；`TargetGaps/entries.md` 的 26 个历史调查单元以 NOTE ID 作为本组 mapping anchor。实现和 review 应通过这些 exact anchors 回到 sourceEvidence，而不是把本设计中的概念名当 production export：

- 身份、authority、模拟与本地部署：[`NOTE-2-1`](entries.md#note-2-1)、[`NOTE-15-1`](entries.md#note-15-1)、[`NOTE-19-1`](entries.md#note-19-1)。
- writer、draft、effect state、locks、criteria、compensation、policy：[`NOTE-4-1`](entries.md#note-4-1)、[`NOTE-4-2`](entries.md#note-4-2)、[`NOTE-5-1`](entries.md#note-5-1)、[`NOTE-5-2`](entries.md#note-5-2)、[`NOTE-5-3`](entries.md#note-5-3)、[`NOTE-5-4`](entries.md#note-5-4)、[`NOTE-5-5`](entries.md#note-5-5)。
- storage、schema/relations、resource/scheduler/precondition、provider bridge：[`NOTE-7-1`](entries.md#note-7-1)、[`NOTE-7-2`](entries.md#note-7-2)、[`NOTE-8-1`](entries.md#note-8-1)、[`NOTE-8-2`](entries.md#note-8-2)、[`NOTE-8-3`](entries.md#note-8-3)、[`NOTE-8-4`](entries.md#note-8-4)、[`NOTE-9-1`](entries.md#note-9-1)。
- startup、defect、operations、transport、observability：[`NOTE-12-1`](entries.md#note-12-1)、[`NOTE-12-2`](entries.md#note-12-2)、[`NOTE-13-1`](entries.md#note-13-1)、[`NOTE-14-1`](entries.md#note-14-1)、[`NOTE-16-1`](entries.md#note-16-1)。
- independent fixture、真实 evidence、packaging：[`NOTE-17-1`](entries.md#note-17-1)、[`NOTE-18-1`](entries.md#note-18-1)、[`NOTE-18-2`](entries.md#note-18-2)。

每个单元的 source path/line、保留行为、open question 和 contractDisposition 以 `analyses.json` 为准；本节只提供实现方向索引，不复制一张旧方法大全。
