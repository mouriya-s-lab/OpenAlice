# UTA：可组合能力契约

状态：目标设计；不是已接入的 provider 协议或交易执行实现。本文是本轮所有分组设计的共同约束；[总设计](../../uta-effect-runtime-detailed-design.md)负责总体边界，[交易执行契约](../transaction-contract.md)只负责需要受控交易写入的能力。

## K01 抽象为接入作者省工作

接入作者只声明一次精确 schema、语义单位、能力说明、处理函数与所需资源，再组合读取、订阅或交易执行包装器。静态类型、边界校验、能力清单、CLI 帮助和 AI 元数据从这份声明计算，不再分别维护 interface、validator、命令表和提示词。验收是新增一种 provider 参数或能力不修改内核能力 switch，也不迫使其他 provider 实现空方法。

契约之外允许类、回调、缓存、任意语言 SDK、REST/OpenAPI、网关及独立进程；不要求 provider 内部遵守某一种 FP 编程范式。确定性组合和执行准入集中为纯转换，是为了边界可靠，不是为了把所有 IO 改写成同一种库。

## K02 共同的是元契约，不是完整 Broker SDK

固定 `CapabilityDescriptor` 的外层：协议版本、稳定能力身份、命令路径、描述、schema 版本/指纹、输入 schema、结果 schema、领域错误 schema、交付方式、效果类别、权限/资源要求、来源与可用性证据。每个叶子的具体 schema 与命令树由 provider 声明。不存在必须包含 Place/Modify/Cancel/Close 的全局 `ActionContractMap`，也不存在靠返回 Unsupported 填满的 `IBroker`。

结构上没有 cancel 就没有 cancel 叶子；没有 option 业务就没有 option 命名空间。空父节点递归消除。实现存在但暂时未登录、限流或断连，保留能力身份及精确契约，另报具名 availability，不能伪造不支持，也不能继续展示为可执行。授权视图可以隐藏当前主体无权发现的叶子；临时授权变化不得伪装成 provider schema 改变。

能力树按当前 provider 实例/环境/账户 scope 与主体解析。发现返回 revision；调用绑定能力身份和 schema 指纹。发现后被替换或撤销必须返回明确的 stale/availability/authorization 错误，不能让相同命令路径悄悄执行另一语义。名称冲突在装载时拒绝，不靠 last-write-wins。

## K03 Schema 是声明源，类型是推导结果

本仓库已有 Zod 4.3.6；可执行设计样例使用该已安装版本，不为设计引入 Effect/SQL 依赖。跨语言 wire 使用可导出、可校验的 JSON Schema 契约；TS 接入端从 schema 推导静态类型。不得再为 schema 手抄对应 interface 或枚举所有订单组合。

静态可知的 provider 声明保留输入/输出/错误的具体类型。运行时新装的外国进程能力不可能回溯改变已编译 TypeScript；内核持有已校验的 schema 描述和封装其校验器的调用句柄，在执行边界验证输入、输出与错误。`unknown` 只在反序列化入口，不能用 cast 将动态 JSON 冒充某个静态 provider 类型，也不能让裸 JSON 穿过业务边界。

wire schema 不携带函数。schema 导出必须拒绝无法表示的运行时 transform、未解析引用及非法结构；不得把不可导出的约束降级为任意 object。时间、十进制、单位、关联等业务检查若不在 schema 中表达，必须作为具名、版本化的语义约束一并声明，并由对应边界执行；JSON Schema 合法不等于交易风险已通过。schema 指纹覆盖实际执行的契约和语义版本，不只覆盖帮助文本。

## K04 语义单位与 HOF，而非订单组合类型大全

`Order`、`Candle`、`Instrument`、`News`、`NewsGroup` 是可组合的语义单位，不是内核穷举的一切业务。未来单位通过同样的元契约发布。订单的数量、价格、时效、保护和原生字段使用具有前置条件的 schema/HOF 组合：每次组合保留并推导精确输入、输出、错误及资源要求；非法组合由组合器的类型或 schema 拒绝。一个 provider 的合法扩展不迫使其他 provider 接受该字段。

局部互斥选择仍可用小型 union，例如 units 与 notional、pull 与 push。禁止手写 Market/Limit/Stop/Trailing 与每种保护/期限/venue 的笛卡尔积。`withX` 不能返回退化的 `Order => Order`，不能覆盖已有字段或丢掉扩展 schema。HOF 的函数只存在于装载进程中；等待、执行和恢复保存版本化描述数据、参数与实现身份，不序列化闭包。

语义单位提供可互操作的最小事实，不消灭 provider 特性。`Candle<Extension>` 是基础蜡烛字段加该 provider 任意**精确声明**的扩展对象；不是 `Record<string, unknown>`。Instrument 的 native identity 与可选已解析业务事实分开，未知 multiplier/币种不可用默认值捏造。News 保留出处、发布时间/抓取时间、更正与撤回；NewsGroup 是有身份和成员/选择规则的分组，分组存在不证明其成员是完整或同步快照。

## K05 数据交付不使用交易事务

`pull` 是一次请求的有限结果，可以有明确分页/不完整结果；`push` 是有创建、取消、结束及错误契约的实时流。两者可组合相同 Candle/News 等 schema，但不承诺相同 freshness/finality/replay 能力。内部流是有生命周期和背压的资源，不是 stdout。

读取与订阅会消耗连接、配额、缓存、存储或付费资源，因此仍受资源权限与配额控制；它们不需要订单 prepare/approve/compensate、订单锁或每个数据帧的交易 WAL。仅当某条数据被用于订单决策时，持久化**选中的证据、触发消费身份和执行决定**，不是将整条行情流事务化。

流声明数据帧与控制帧的 schema，明确顺序范围、cursor、重放能力、缺口、背压溢出及断连恢复。当前 K 线更新、已闭合 K 线、更正/撤回必须可区分；收到一个 push frame 不自动表示收盘。不能凭本地接收序号制造原生版本或跨重启的完整重放保证。未知 finality 必须报告未知；依赖 closed-bar 的触发器不能自动接受它。

## K06 CLI 是最外层解释器

从同一能力树计算 `uta <provider> ...` 命令、机器可读 describe/help 和调用校验，不单列手写命令映射。当前实际产品 CLI 仍是 Alice 注入的 CLI；此处 `uta` 是目标投影，不宣称二进制已经发布。复杂对象用 JSON 参数保留 schema，不强行将嵌套 union 摊成一组含混 optional flags。

pull 在 stdout 输出一个有 schema 的有限结果；push 持续输出具名 NDJSON 帧，错误/结束帧可机器识别；普通诊断只在 stderr。SIGINT/管道关闭取消订阅并释放本次拥有的资源，不取消已被交易 writer 接受的订单。CLI 附着生命周期与持久触发订阅分开：关闭 tail 观察进程不能隐式撤销一个已注册的待触发意图。

AI 先 discover/describe，再按该叶子的确切 schema 调用。帮助中展示支持的变体、必填字段、单位、范围、风险/效果、availability、交付和恢复能力，而不是让 AI 猜 provider 参数或读源码。

## K07 异构进程边界只统一 UTA 一侧

foreign provider 可以保留任意 native 协议；桥接进程在 UTA-facing 边界提供版本协商、发现、关联请求/响应或流以及取消。OpenAPI/SDK 生成器可帮助生成声明，但不能用接口是否存在推导其只读、幂等、原子性或补偿保证。native 原文由各 adapter 精确解码，不让内核依赖 SDK 类型。

协议检查错误分为装载/元数据错误、输入拒绝、已声明领域错误、交付/进程错误、输出违约；已可能发出的交易遇到进程断开或坏响应归 OutcomeUnknown，不能归 KnownRejected。通过凭据、进程权限和窄执行通道限制效果；类型不能阻止持有交易密钥的恶意进程偷偷下单。若某 SDK 无法拆分读写权限，该进程是显式受信任的执行边界，需要审计与 conformance，不能宣称任意插件沙箱安全。

## K08 交易是可选的受控效果包装器

`withTransaction` 只包装需要交易副作用的能力。包装后 public handle 只能提交意图/查看 receipt，不能拿到原生 dispatch 函数。该能力关联自己的精确 input、可持久化 prepared payload、ack、observation、error 与恢复 schema；异构能力组合后关联仍由各自 schema-bound handler 保存，而不是全局 tag switch。

已有调查中的 scope/单位校验、准备冻结、approval digest、write-ahead、唯一 command identity、lease/CAS、unknown 先对账、补偿非 ACID、shipped migration 和单 authority cutover 保留。它们约束**订单效果执行路径**，不扩散到普通数据查询/流。是否可逆、原生幂等、完整 absence 或 native atomic 必须有 provider 证据；能力存在不等于获得这些保证。数据缓存失败不能触发交易补偿。

只读账户允许非执行 draft/preview；没有执行权限时不能伪装批准。已知拒绝与可能已发送分开；远端 ack 不等于成交/取消/条款更新完成。执行 criterion 是提交时的明确目标，不能在事后偷换。

## K09 触发来源与授权来源正交

订单可由 CLI、AI、外部受认证调用或特定订阅事件激活。持久 `TriggerBinding` 绑定等待意图/revision、事件源的能力/参数/版本、具名谓词及其配置、触发语义、有效期、负责人和**解析后冻结的默认处理策略**。来源事件是证据，不是批准；创建者、观察源、调用主体、执行授权主体和负责回复的 agent 是不同字段。

事件经过 schema/来源/新鲜度/顺序/谓词检查后产生 Activation。同 binding epoch 与可信事件 identity 仅消费一次；消费记录、等待状态变化和执行/通知 outbox 必须同一 durable decision。订阅断连、没有可靠重放、缺口、schema 漂移或无法确定事件身份时，不凭重试次数放行交易，进入具名暂停/复核策略。

默认值在注册时解析并持久化，不在触发时读取一份可能已改的全局配置。`ReturnToAgent` 是一种策略而非所有触发的固定行为；另有明确预授权的执行策略。没有提供有效执行授权时，安全选择是返回 agent/停止执行，不是自动下单。预授权也必须绑定 intent/plan 的版本、限制、有效期与源条件；触发不能绕过执行前复核。

## K10 返回 agent 是可恢复的业务分支

当选中的策略为 ReturnToAgent：原子消费本次激活、暂停该绑定、保留未发送意图及 evidence、创建有稳定身份的 ReviewRequest/outbox，**不创建 broker dispatch**。告警包含具体订单参数与 scope/revision、触发事件/谓词/时间/缺口、为什么要求复核、已有批准是否失效、当前保留期限、负责人和允许操作的精确 schemas。写入 outbox 不冒称 AI 已收到；Alice 的 Workspace/Session/Inbox 负责投递和回复，UTA 不重建模型 loop 或通用事件总线。

回复是显式命令，不是从 AI 文字里猜授权：Discard（仅未发送）、KeepSuspended（明确截止时间/理由）、Rearm（新 binding epoch、有效期、未来事件起点和策略）、Revise（新 intent revision，重准备/重授权）、RequestSubmission（走正常授权）。保留不是自动恢复触发；延长有效期不是延长旧 approval；处理旧告警需要 expected revision 与 review identity 的 CAS。

无人回复时执行冻结的超时策略，不能自动批准。暂停订单的数据保留与交易风险 reservation 分开：已确认无派发者可释放执行锁/额度，重新激活必须重新评估；不能因保留草稿长期阻塞账户。已发送或结果未知的订单不适用草稿丢弃/重新提交，只能走观察和授权恢复。投递重试复用同一 review identity；退役 Workspace/Session 显式转交，不静默新建任意 agent 承担交易权限。

## K11 复用调查而不继承错误的覆盖结论

原 155 文件、1437 MAP 与 26 NOTE 是订单中心调查的确定范围；它们保留源码证据、具体缺陷、行为与外部验证义务，不代表 Candle/News/流/AI 反馈已调查完整。每个已有条目的目标模型按本契约重新裁决，保留恰当的交易约束，移除全局强制 handler/封闭订单全集/所有 IO 事务化的要求。

旧 review 只证明当时那一版；修改后的 analyses 需要当前内容的独立复核。原始 question 输入保存追溯性，closure 中的当前决定直接改成现行结论；未验证 native 行为仍保留，不用新抽象掩盖。补充调查见 [数据](data-investigation.md)、[触发与 AI 回路](trigger-investigation.md)、[异构 provider](provider-investigation.md)。

## K12 验证抽象是否值得存在

设计验收必须实际执行以下可证伪实验：组合新增 provider 字段后静态类型/validator/metadata/CLI 同时改变；不支持 option/cancel 的树没有该命令；错误输入在 handler 前被拒绝；pull 有限输出与 push 持续帧/取消可区分；外进程输出按声明校验；一次 candle 激活按 ReturnToAgent 产生可追踪复核且零派发；重复事件/迟到回复/重新激活不复用旧身份或授权。

可执行样例只证明其实际覆盖的组合、边界与状态转换，不证明完整 provider runtime、持久 writer、真实 agent 投递或 native 交易安全。后者在实现 gate 中分别用真实进程/持久状态/负责 Session/独立 broker ledger 验证。行数、MAP 计数、typecheck 或 mock 成功不能替代这些证据。
