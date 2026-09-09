# 可组合能力设计：跨契约审查

## 审查边界

独立审查覆盖 K01–K12、总体设计、数据、触发/AI 复核、交易执行、foreign-provider wire、三份扩展调查及实际 Alice handoff 源码。下面的反例已在目标契约中处理；这只是设计层裁决，不表示持久 writer、真实 AI 投递或 native provider 已实现。

源码 owner 的逐项审查另存各组 `reviews.json`。每份审查绑定该组 `analyses.json`、`design.md` 和共享组合契约的精确 SHA-256；生成器不能替 reviewer 生成 accepted。最终执行结果与原始问题保留情况见 [verification.md](verification.md) 和 [coverage.json](coverage.json)。

## 数据、触发与异构边界反例

| 编号 | 会破坏契约的具体情形 | 当前裁决 |
|---|---|---|
| CAP-R01 | 新 epoch 让同一条旧 K 线获得新去重键，再次激活 | Rearm 同时固定可信的严格未来 source boundary；epoch 只做本地 fencing，不证明事件新鲜。无法取得 source ordering/handshake 证据则暂停。 |
| CAP-R02 | 首次已为 true 的快照被误认作 false-to-true；false 帧被过滤后丢失前态 | 显式 each-eligible-event/edge-crossing 与首次快照策略；edge 保存最小可信 checkpoint，缺口、无法证明连续性的重启、schema 漂移或重设使其失效。仅 Waiting 消费激活。 |
| CAP-R03 | close=101 命中后修正为 99，被 NotMatch 或暂停过滤，旧 job 仍执行 | 已选证据有独立 correction/retraction 维护路径及 watch horizon；writer 将撤销旧 review/资格/未发送 job 与 DispatchStarted 排序。已经发送或 unknown 只观察/对账。 |
| CAP-R04 | 同一意图的一个绑定返回 AI，另一个绑定自动提交 | 每个 intentId/revision 只允许一个 live binding；多条件在其声明内组合，竞争注册返回 BindingConflict。 |
| CAP-R05 | KeepSuspended 消耗 review，之后却没有合法命令能管理保留草稿 | 返回独立 HeldIntentControl；认证查询当前 revision/deadline/allowedCommands，后续 Rearm/Revise/Discard 用 control CAS，不复用旧 review。 |
| CAP-R06 | Alice 已启动任务但响应丢失；重试再次启动 AI，或 admission 已写却没有 task | admission 使用 `(reviewId, deliveryGeneration)`、principal/recipient/payload 绑定；Reserved/TaskBound 等中间态可同键恢复。无法确定 spawn 结果先 reconcile；旧 worker 未证明停止，不开启新 generation。 |
| CAP-R07 | 随机 Inbox append 与单独 dedup ledger 之间崩溃，造成重复或丢失 | Inbox 需要业务键原子 lookup-or-append；不能用两次独立写入声称 exactly-once。Issue 的确定 ID 投影与 AI handoff 分开。 |
| CAP-R08 | AI 返回一段文字被当作订单已处置；旧 callback 覆盖新结果 | admission、turn output、结构化命令和 UTA receipt 分开；缺少有效命令仍待处理。回调按 generation/attempt CAS；认证先于 receipt lookup，同 ID 同规范化 payload 返回原 receipt，不同 payload 冲突。 |
| CAP-R09 | 共同 asset/interval/streamKind enum 成为 provider 新功能上限 | item schema 来自被绑定能力；provider barSpec、精确扩展及 exact/unknown/unsupported 投影保留真实语义，不维护全局 native 功能表。 |
| CAP-R10 | 同一 Candle 来自完整和不完整数据窗口，谓词输入相同却要求不同裁决 | coverageEvidence 显式进入 predicate 输入，带 source/window、covered-through、watermark 与 replay/gap checkpoint，不依赖隐藏状态。 |
| CAP-R11 | extension namespace 与 value 分开后可错配；扩展 digest 被拿去比较整个 leaf | 声明精确命名 extension object；每个 namespace/version/fingerprint 绑定其对应 validator，不能与整个 capability fingerprint 混同。 |
| CAP-R12 | 两个十进制 volume 的单位不同，仍直接相加或比较 | Present volume 明确 amount、measurement basis/unit 及必要证据；unknown/unavailable 不补零，测量口径不兼容则不聚合。 |
| CAP-R13 | 允许的 effect/delivery 组合没有 wire 路径；观察断流抹掉已知 ack | 公开 controlled 入口返回准入 receipt；worker-only native controlled call 返回 ack，两者分开。异步观察是关联 dispatch 的独立 resource+push；观察失败不覆盖已验证 ack。 |
| CAP-R14 | strict streamControl 拒绝含 type/requestId 的实际 frame；随意 strip 又掩盖坏字段 | 先验证固定 envelope；control 只移除明确的 type/requestId，再验证 exact streamControl；data 只将 payload 交给 output validator。 |
| CAP-R15 | 简化原生 OHLC fixture 缺时间/终态/计量事实，却声称是完整共享 Candle | wire fixture 明确声明 ProviderCandleFrame；没有的语义不虚构。共享 Candle 必须提供其声明的投影和证据。 |
| CAP-R16 | fingerprint 是否含嵌套 schema annotation 未定义；示例 correlation/digest 不一致 | JCS-v1/SHA256 哈希完整 schema 与指定 execution projection，只排除具名外层展示/availability 字段；校验 profile 与语义责任显式声明。 |

规范落点：[数据契约](../data-contract.md)、[触发契约](../trigger-contract.md)、[provider 契约](../provider-contract.md)、[跨组裁决 C01–C16](integration-decisions.md)。表中的协议推演不是已执行 crash test。

## 既有订单调查继续约束执行

订单中心调查中的故障没有因抽象改变而消失，其适用范围限定为真正的受控效果：

- AccountScope 贯穿账户相关输入、准备数据、授权、native request、订单事实和恢复；公共 Instrument/Candle/News 不捏造账户。
- 订单条款由所选叶子的 schema/HOF 保留，不能删除原生字段来凑全局 Order union；不支持的参数 variant 从该输入 schema 缺失，临时 unavailable 另行表达。
- 准备阶段冻结 native payload、Decimal 转换、报价/单位证据、criterion 与授权 digest；dispatch 不重新计算已批准内容。
- ack 与 fill、cancelled、条款更新和 flat 是不同证据。Complete、Partial、Unavailable 及 ByIds 与 Enumeration 的边界决定是否能证明 absence。
- write-ahead、scoped command receipt、writer CAS、发送身份、已知拒绝与 OutcomeUnknown 继续必要；timeout、lease 到期或进程重启不能证明可安全重发。
- cooldown 等风险规则先纯评估，已提交决定才消费 reservation；未知估值不能放行交易，查询仍保留真实 signed/zero/negative 事实。
- 恢复/补偿具有独立 authority、证据和授权；不承诺跨券商 ACID、远端 exactly-once 或 native undo。
- 普通数据缓存、账户观察、分页和流 checkpoint 使用数据 owner 的持久化/资源策略，不借用订单 WAL、审批、锁或补偿。

既有实际故障注入保存在 [source-experiments.md](source-experiments.md)，用于说明旧执行路径的失败窗口。

## 当前 Alice 能做什么，还缺什么

| 当前源码事实 | 设计所需但不能声称已存在的扩展 |
|---|---|
| `src/workspaces/conversation-control.ts:116-220,270-405` 有 exact/reconstructed/unavailable resolution 与 ask | 认证 UTA bridge、review-keyed durable admission 和一致的重试恢复 |
| `src/workspaces/headless-task-registry.ts:187-243` 持久 task；启动时将残留 running 标为 interrupted | Reserved/task binding/spawn/receipt 各 crash 边界的 reconciliation，不能假定 detached exactly-once |
| `src/workspaces/issues/comment-delivery.ts:150-190` 记录非空 assistant reply | 精确 disposition schema 的校验、命令提交与 UTA receipt，不以文本回复代替决定 |
| `src/core/inbox-store.ts:116-120,233-243` append 随机 UUID | 业务键原子去重投影；Inbox 不承担第二条 AI handoff authority |

### Alice HTTP 边界的设计选择

独立复核接受 C09/C11 的明确选择：Authorization Bearer 与 X-Request-ID；本地 CredentialRef 和 UTA-owned service binding，不传可伪造的 TransportPrincipal；公开 SDK 使用 Promise<Result>/AbortSignal 与 AsyncIterable，provider 内部不被迫采用 Effect；固定局部传输失败与精确 leaf-domain errors 分开；ProtocolViolation 只保存有上限的非正文诊断。当前 `packages/uta-protocol/src/client/UTAClient.ts:22-35,63-87` 仍是旧 Promise/unchecked JSON 路径，caller signal 会绕过内部 deadline。

header 名、模块风格、失败标签和诊断上限是已裁决的设计问题；部署凭据、verifier、取消与 sink 脱敏的实际运行才是实现验收。不能把前者机械重开为 empirical，也不能因设计已裁决就声称后者已验证。

## 仍保留的实现与经验性门槛

- 原生 event identity、finality、correction horizon、snapshot-to-subscription boundary、replay、完整订单 absence 和 native idempotency。
- 真正持久 writer 与独立远端 ledger 的 crash matrix，包括 correction/DispatchStarted、旧 worker 隔离、发送后断线与迟到 fill。
- 实际负责 Session 收到警告，KeepSuspended 后再次查询/管理，跨 Alice/UTA 重启保留正确 receipt 且 ReturnToAgent 零派发。
- 完整 foreign bridge v1、JSON Schema vocabulary/format/semantic profile、跨语言 JCS/Decimal/time vectors及资源上限验收。
- 部署凭据权限隔离、shipped-state 迁移和单一执行 authority cutover。

可执行样例只证明它实际走过的本地契约路径。生产实现和外部证据不足时保留具名 Unknown/Unavailable 或拒绝执行；不能用计数、hash 或 accepted review 消除这些义务。
