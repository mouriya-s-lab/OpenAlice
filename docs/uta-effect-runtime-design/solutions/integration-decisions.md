# UTA：源码调查的共享设计裁决

状态：当前目标设计。规范依据为[组合契约 K01–K12](composition-contract.md)；这里将既有 C01–C16 源码发现落实到正确边界，不建立第二套类型全集。现有生产行为仍以源码为准。

## C01 Scope 按能力声明，公共数据不伪造账户

`UnifiedTradingAccount.ts:665-688` 混淆尚未发现的子账户与单账户默认值，`:776-791` 只在消息中记录 sub-account。账户相关意图、订单引用、观察、冲突 key 和 approval 必须显式绑定 `AccountScope(accountId, subAccountId)`；解析尚未完成时不能默认授权。

公共 Candle、News、Instrument 或 process health 不凭空带账户。其具体 schema 明确使用 provider/source identity；需要区分时采用 Public 与 AccountScoped 的局部 union。instrument 的可寻址身份也不因为查询主体不同而被重命名成账户身份。查询得到的账户目录 revision 是事实，不是永久执行许可。对应 K02、K04、K07、K08。

## C02 订单语义用组合保留，不用全局类型表裁剪

`UnifiedTradingAccount.ts:603-637,693-724` 和 `packages/uta-protocol/src/types/git.ts:256-294` 的输入包括数量/notional、trailing、TIF、session、parent/OCA、TP/SL。它们是不能丢失的源行为，不是所有 provider 必须支持的字段。

Order 基础声明经数量、价格、时效、保护、native extension 等 HOF 得到精确 schema；合法组合由该 provider 的声明和证据约束，不规定“所有非市价都不能 notional”等跨 provider 猜测。局部互斥选项可用 schema union，不手写整个订单笛卡尔积。结构无能力者不发布命令；某个参数变体不支持时，该变体不在该叶子的输入 schema 中，不能误删其他仍可用变体。

保留具体约束：`CcxtBroker.ts:524-534` 的 notional→units 若在执行时取新价会改变批准内容，目标冻结所选 quote/rounding/units 或明确授权的推导规则。`LongbridgeBroker.ts:271-313` 忽略 `_tpsl` 不能成为成功路径；`AlpacaBroker.ts:314-342` 的 OTO/bracket 和 child identity 必须保留。native protection 与 runtime-managed child program 是不同机制，禁止静默互换。对应 K03、K04、K08。

## C03 批次失败策略只属于组合交易效果

`TradingGit.ts:143-155` 在 exception 后继续，并把异常当 rejected。若迁移旧独立交易批次，明确保留 ContinueOnKnownRejection；Unknown 先暂停并恢复事实，不按 catch 行为决定继续。

IndependentBatch、AllOrCompensate、VenueNativeAtomic 描述具有授权和证据的交易组合，不是 NewsGroup、数据分页或 `Promise.all` 的统一模型。每个 step 保持自己的 schema-bound 结果；不给异构 provider 规定四动作全集。对应 K04、K05、K08。

## C04 原子 writer 看到递进状态

交易/触发消费 writer 在一次存储提交内按稳定顺序读取前序决定后的状态，校验 command identity 和 expected version，写决定、执行投影及 outbox/receipt。不能对同一旧快照预计算多个冲突决定后直接落盘。

业务拒绝返回具名拒绝而不伪造 commit 成功；存储失败不完成任何成功 receipt。commit 成功但响应丢失按原 command id 查询。普通数据读/流不通过这个 writer，也不等交易 DB 才能交付。对应 K05、K08、K09。

## C05 恢复与无派发暂停保留不同资源

可能已派发的执行进入 RecoveryRequired 后保留或显式转移冲突排他权给 durable recovery owner，不因标签变化释放风险。已经证明没有 DispatchStarted 的 revision 可以原子退休并释放 execution reservation。

ReturnToAgent/KeepSuspended 保留的是未发送意图，不应长期占用整账户执行锁；Rearm 必须重新准备、评估额度与授权。已发送/未知的对象不能伪装成可丢弃草稿。对应 K08–K10。

## C06 进程、数据能力与执行 readiness 分离

IBKR restored callback 只证明连接提示，不证明快照完整或可重发订单。RequestId/connection generation 不是 DispatchId；accountName、native identity 和 callback evidence 不能丢。

进程 lifecycle 可用有限状态表达；具体能力的 availability 独立；交易 authority 另需 journal/recovery barrier。一个 broker 不可用不阻断无关公共数据和 lite 模式，public quote 成功不证明账户可写。进程状态不是可跳过 writer/CAS 的执行凭证。对应 K02、K05、K07、K08。

## C07 有界数据范围与完整 absence 证据不同

列表能力明确 scope、查询范围、coverage、as-of 和 continuation；Complete(empty)、Partial、Unavailable 不混淆。ByIds 与枚举 open orders 是不同查询语义；结果关联每个请求 identity。这里是可复用的结果组合器，不是所有 provider 必须实现的固定 Query ADT。

一次列表未见订单不足以证明远端拒绝/撤销。执行恢复保留原生 lookup descriptor、namespace、symbol、held child 等证据，不能依赖进程内 orderId 缓存。相同原则适用于 Candle 范围和 News feed coverage，但不会赋予它们交易状态。对应 K03–K05、K08。

## C08 风控是受控效果的准入包装器

`guards/cooldown.ts:15-31` 在 check 中写时间；目标纯评估读取已提交 intent/attempt/reservation 与 now，只有成功持久接受执行意图才消耗该策略定义的提交窗口。其他业务计时起点须另有显式策略，不由 guard 顺序决定。

最大仓位需要已知 mark/FX/multiplier、净值与未结 reservation；未知或非正 equity 不伪造 0% 放行。Whitelist 依赖已解析目标，不用缺 symbol 免检。风险降低动作的豁免按实际 effect risk/授权策略判断，不靠全局动作名或 provider 分支。数据读取没有订单风控/补偿，但仍受自己的资源/付费权限控制。对应 K05、K08。

## C09 身份独立于 secret，执行环境需要证据

AccountId 不从当前 apiKey/privateKey hash 重新生成；secret rotation 替换 credential binding，不重建历史。公共 provider identity 也不因 secret 轮换变成新数据来源。

paper/live 环境必须由配置和实际 endpoint/account evidence 一致证明，端口号或 testnet 字面量不够。凭据只在受限执行/桥接进程解析；descriptor、计划、AI metadata 和诊断不含 secret。SDK 无法拆分读写权时承认受信任边界，不宣称 schema 能隔离恶意 IO。对应 K02、K07、K08。

Alice 到 UTA 的 HTTP v1 采用具名 service-credential profile：`Authorization: Bearer <resolved credential>`，correlation header 为 `X-Request-ID` 并由响应回显。CredentialRef 是本地 opaque 引用，不是 wire 字段或指定磁盘路径；现有 secret/config owner 注入 resolver。UTA-owned `ServiceCredentialBinding` 将已验证凭据关联到稳定 service identity、grants 与 revocation revision；每次请求仍校验当前 binding，不由 token 文本、loopback、body 或客户端自报的 TransportPrincipal 推导权限。header 大小写按 HTTP 规则处理，日志永不保存 Authorization 值。

服务认证只证明 Alice service 身份，不等于交易批准：Alice 从可信 Session context 附加 provenance，UTA 独立检查该 service 可代理的主体、scope 与 C12 policy。普通 capability 参数不能自填 transport principal。首次 credential provisioning、轮换/撤销的实际生效和部署 verifier 仍须运行验收，但 header 名、主体构造方向与 CredentialRef 边界已是设计决定，不再作为待选问题。

## C10 证据不越级

源码调查证明当前实现的行为；分组 reviewer 检查目标与来源、组合契约的一致性；hash/计数证明输入没有遗漏或过期。可执行契约实验只证明其实际调用的组合、CLI/帧或转换；它们不是真实 provider、SQLite 恢复或 AI 投递验收。

[旧实现故障实验](source-experiments.md)保留可复现证据。native guarantees、paper、finality、absence、foreign-process security 等没有实测的事实继续标未验证。新 review 绑定当前 analyses、group design 与 K 契约，不能复用旧版本的 accepted。对应 K11、K12。

## C11 保存描述与身份，不保存闭包

HOF 在接入时计算 schema-bound handler；持久化保存 schema/semantic/compiler/predicate version、参数、实现身份与必要 evidence。计划和 TriggerBinding 不携带函数、Scope、SDK 实例或 secret。缺失对应版本时暂停/重准备，不能运行当前闭包偷偷解释历史。

共同 digest 方向为 JCS-v1 + SHA-256，保留完整 64-hex；Plan、command、order terms、capability 使用不同 domain/version 和固定 projection，不互当证据。算法是已选设计，不是 native 行为的 empirical question；具体 codec/cross-language 字节向量仍需实际验证。交易字段边界见[执行契约](../transaction-contract.md)，能力 fingerprint projection 见[provider wire 契约](../provider-contract.md)。

Alice HTTP client 的公开模块形态固定为 `Promise<Result<Output, Failure>>` 加 `AbortSignal`；push 使用声明帧的 `AsyncIterable`。调用者取消与内部 deadline 必须组合，不能用 `callerSignal ?? timeoutSignal` 绕过 deadline。内部可使用 Effect 或其他实现风格，但不把它变成 SDK 或 foreign provider 的强制依赖。

客户端局部传输失败采用 `Cancelled`、`DeadlineExceeded`、`TransportUnavailable`、`ProtocolViolation`；已验证远端 boundary error 以 `RemoteBoundaryFailure` 保留其具名 code，已验证领域拒绝以 `RemoteDomainFailure<LeafError>` 保留所选叶子的精确 error schema。它们是局部边界 ADT，不是全局 provider/action error map。未收到受控命令的 receipt 时保留原 command identity 并查询结果，不能由客户端 timeout 断言 broker KnownRejected 或重新发单；native OutcomeUnknown 仍由 UTA 的 dispatch evidence 决定。

`ProtocolViolation` 诊断只保留 request/capability/schema identity、phase、HTTP status、content type、received byte count，以及最多 16 个具名 issue code/schema-declared path；每个 path 上限 128 字符，整个 UTF-8 JSON 诊断上限 4096 bytes，超出时裁剪诊断条目并明确标记。未绑定 capability 或尚无响应的字段用对应 absence variant，不捏造值。禁止保存 response 原文、参数值、headers、native message 或 raw-body digest；错误 decode 不能回退为 body text 成功值。schema 校验与实际 sink redaction 仍需集成验证，证据字段和上限本身已选定。

原生 group identity 在派发后出现时作为观察追加绑定，不提前捏造或改变已批准 digest。prepare、expiry、observe、复核投递不是虚构的交易 step，各有准确工作 identity。

恢复旧备份/clone 与普通 crash restart 分开：前者需 quarantine、观察和明确 authority cutover。可复制的 databaseUuid/watermark 不能单独 fence 另一主机。数据缓存恢复不自动获得交易发送许可。对应 K03、K04、K08–K10。

## C12 Draft、人工批准、策略批准与数据权限不同

`UnifiedTradingAccount.ts:549-563` 允许 funded readOnly staging，但禁止 mutation；保留非执行 draft/preview。`src/tool/trading.ts:203-207,760-807` 的 allowAiTrading 是已有产品策略，不强制改成人工批准一切，也不保留直接 push 绕过 authority。

目标批准来自经认证主体或已授权 policy，绑定 scope、intent/plan revision、digest、expiry、policy version 和必要 trigger 条件。CLI body 的布尔值、行情事件或 AI 普通文字不能自授权。公共数据不需要伪造 funded account 或交易批准。对应 K05、K08–K10。

## C13 不完整估值保留真实仓位

`brokers/contract-builder.ts:129-144` 混合 broker-reported 和 locally-derived 估值分量。目标保留 quantity/identity 等事实，valuation 明确 Complete/Incomplete 及各分量来源；不以默认 currency、FX、multiplier、price 或 0 PnL 伪造完整值。

零/负 equity 是可报告的有符号事实，不是整个账户应消失的理由。只有需要完整估值的执行前提拒绝它作为有效分母。估值是数据转换；其结果被交易消费时才成为已选证据。对应 K04、K05、K08。

## C14 复用 Guardian 控制协议，停止不等于取消订单

`packages/guardian-runtime/src/control-server.ts:42-165` 已有 protocol、request id、runtime.status/runtime.stop 及 Unix socket 0600 权限。目标在此控制边界支持关联 UTA restart，而不再建立 flag/ack 文件协议。

Accepted 不等于 Ready；关联新 bootId 与实际结果，失败或丢失关联返回明确状态。进程控制不需要虚构 AccountScope。停止释放 owned 数据流并让持久绑定在恢复后报告 replay/gap；不能取消未知交易或凭重启自动重新发送。Windows ACL/跨平台认证仍需真实 owner 验证。对应 K05–K08。

## C15 意图等待、交易状态、审批视图分开

HeldIntent/TriggerBinding 负责未发送意图的条件与保留；交易状态负责已接受的受控效果；ApprovedPlan 是验证过的执行视图，不是另一个交易状态。批准过期、保留期限、订阅 lease 和执行 lease 分别表示不同有效性，不共享一个 timeout。

ReturnToAgent 消费一次 Activation 后暂停绑定、创建唯一 ReviewRequest，零派发。Discard/KeepSuspended/Rearm/Revise/RequestSubmission 的状态前置条件与 CAS 见[触发契约](../trigger-contract.md)。无效果关闭不冒称发生补偿；已可能派发者只能观察/恢复，不能回到等待草稿复用身份。对应 K08–K10。

## C16 目标、观察和消息投递各有完成含义

交易 criterion 是明确提交目标：请求已被接受、订单工作、成交、取消被观察、条款符合或目标 exposure 达成不能互换。ExposureTarget 是期望；ExposureSnapshot 才携带观测时间和 native/local/unknown revision evidence。后续观察只能判断固定目标，不能改写批准语义。

同理，push 已发送一帧不证明 Candle closed；outbox 已写不证明 AI 已收到；AI 已收到不证明回复命令通过；KeepSuspended 不等于 Rearm。每个边界按自己的 typed receipt/终态确认，不统一为 success boolean。对应 K04–K06、K08–K10。
