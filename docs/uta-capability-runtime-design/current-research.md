# UTA 核心设计：本轮研究证据与裁决

本记录保存本轮调查的前提、实际结论及 Main 裁决；当前设计正文仍是[主书](../uta-capability-runtime-design.md)，完整工作范围见[唯一活动计划](../../plans/uta-core-design-research.md)。Main 不编写代码；subagent 可承担必要代码工作，第二档、第三档可在抽象研究中用测试验证抽象是否可行，不指派纯粹的代码测试任务，不以测试通过代替设计论证。旧归档的执行结果不称为本轮验证。

## 起点核对

当前分支是 `docs/uta-effect-runtime-architecture`。启动时 `git fetch origin` 成功；`git status -sb` 显示该分支跟踪同名 origin 分支，已有 AGENTS.md、PLANS.md、主书、事件流册、research-practice.md 和活动计划六个未提交文件。它们是已有成果，本轮在其上继续，不清空或重置。

直接读取的起点包括：初版架构 §§1–3；当前主书全部核心关系及事件派生章节；旧调查索引；当前研究实践记录；活动计划；承接册共同关系与来源导航。主书已有固定/动态后继（§5.4.1–5.4.2）、Controlled 消费者构造（§10.1.1）、Close（§13.4）及账户/FX（§13.5）的正面解释。活动计划仍将声明构造写成未开始的问题，与这些现有成果不一致；本轮已将计划改为沿实际后继连接研究。

这项起点检查不是对全册的验收。旧承接册 LCORE-SCOPE-ROUTING 中，选定表达限制 alias 为离线导入，具体替代段却仍保留“Keep a compatibility parser only at protocol edge during cutover”。两种权威结论不相容，后续整合必须区分原调查记录与当前承接判断，不能靠覆盖率隐藏它。

## 小范围调查的实际发现

`ConnectionSurvey` 只读当前主书 §§8–13、16 及 EF06–EF11，指出 Agent 回复与受控接纳之间需要显式的构造和竞争推导。Main 回读后限缩了这一判断：EF11 已经保存 request、intent revision、epoch、evidence/checkpoint 及 receipt 关联，也已经规定 CAS，不能称为“没有关联”或“没有竞争控制”。需要说明的是这些已有操作数怎样被同一控制决定消费，而不是再加字段。

Main 与独立构造研究者分别核对到一个具体错接：EF10 的 SeekAuthorizedExecution 时序进入 `SubmitIntent`，而 EF11 明确 RequestSubmission 针对已接纳的原意图，并给出 `PrepareSubmission`。延后激活已经拥有 intent revision，不应再从外部创建一次意图。研究将以原意图的控制接纳、证据依赖与后继工作构造解释两条处置路径；不是仅把箭头文字改名。


## 小范围校准与放行

`ActivationConstruct` 独立推导共同操作数及持久后继；`ActivationCounterview` 用 crossing 和 NewsGroup 给出有限轨迹。两者都没有编写代码、测试或运行样例。Main 接受的是以下经核对的关系，不是两份报告的整体结论：

1. 同一 P 需要提供 C/E 声明、初始/rearm 构造和支持选择；schema 不能产生初态或语义依赖。deferUntil 由此构造普通进展、修订依赖、请求/回复和恢复消费者。
2. crossing 的旧 baseline 被修订时，历史 selected evidence 可以失效，即使当前只保存最后值的 checkpoint 数值没有变化。当前计算支持与历史控制责任支持必须分开。
3. RequestSubmission 继续原意图的内部控制路径；writer 将原请求依据延续到 submission，并在 Prepare/批准/Start 实际消费。只有这样，correction 与 Start 在同一提交域的次序分类才能保证已失效依据不会取得新的 Start。

Main 拒绝并保留在原报告附录中的外推：Partial 成员不足必为 Gap；修订后自动将 crossing 移到历史位置；旧依据变化必定改变当前 checkpoint 全部字段；必须机械求出最小依赖闭包及自动 replay。合法替代是保留业务未定状态、声明保守支持、失效并等待可信边界重建。Start 先提交而 native call 尚未发生时，后到 correction 不保证物理不发送。

这些构造与边界已进入主书 §5.7、§11.1.1、§11.2、§11.5 及 EF07/EF10/EF11。放行依据是它们解释了此前断言未说明的实际消费，并能区分相反时序；不是模型一致或没有发现反例。因此扩大到流算子、纯规则/组协调及旧承接一致性，分别检查不同关系，不按 Provider 名称或固定问题表复制答案。

## 历史收敛判断的直接归档证据

Main 直接读取 [后继研究归档](research-continuation-evidence.tar.gz) 的三个成员：

- `uta-continuation-research/request.json`：用户要求“为什么要停下来报告？”，并保留小范围调查、检查方法、再扩大研究的完整原话。
- `uta-continuation-research/UtaCoreConvergence.json`：inspection_scope 只读主书和 construction-gate；assessment 检查四项连接。它以“未发现阻断所述目标场景表达的核心设计矛盾”给出可交付判断，并把声明构造等关系划为后续实现义务。
- `uta-continuation-research/semantic-gate.md`：Main 将上述局部对抗综合纳入整项收敛依据，宣布可交付候选核心设计。

这三项证明一次具体的证据范围升级：局部缺陷搜索不能代替全目标的正面构造论证，声明必须保持一致也不能代替说明怎样构造一致性。不能以“尚未生产实现”这一真实边界掩盖仍需完成的设计关系。该归档保持不变；本轮会话调查继续核对其他偏离的原始记录。

## 扩大研究：数据构造与控制组合

`DataComposition` 研究 filter/window/join/merge 的纯推进、状态及成员终态；Main 回到当前§5.4、8、16.5，接受共同操作数与有限 Candle/News/FX 消费，拒绝把可行构造强化成普遍实现限制。裁决后§5.4.3及EF04明确：只需足够的修订证据而非保存全部被过滤payload；source revision不默认全序；时间/边界是显式输入；外层invocation终止不禁止合法owner继续修订稳定的持久projection。原报告和后续澄清分别保留，不能把原先过强的四项前提作为当前结论。

`ControlComposition` 从§9–10、EF06–09及旧guard契约推导纯规则与writer消费。Main保留§9.1已有的两种cooldown触点，不将approval-bound示例提升为公共默认。§10.5和EF06现明确：writer外guard结果是candidate/evidence；声明的消费触点在当前local state上重算/核验完整read-set，并原子提交相应消费。各自intent revision的CAS不覆盖共享额度；两个旧prepare各提议占用60、已有40且上限100时，完整共享范围的串行决定只允许第一笔占用。远端余额变化不受此证明约束。

组控制沿同一成员的criterion、resolution、exposure与责任引用构造多轴progress，见§10.4及EF09。A partial 4/6、B started Unknown不能被summary压成“失败可逆”；B不等于零敞口，A也可能继续成交。补偿规划必须消费这些责任和允许等级，产生新的受控关联，不把原attempt改写为未发生。以上为构造及条件推演，没有本轮生产实现或Broker运行结论。

## 经实践支持的研究方式

本轮有效做法不是固定prompt：先回读候选关系，避免把已有构造判成空白；再让独立视角给具体操作数和相反时序，Main核对并裁决外推；只沿实际缺口扩大到不同的组合关系。派工允许反驳分组和前提，报告不因模型档次或完成状态获得权威。

已经实际纠正的两类误判尤其重要：一是把历史上用户授权的逐源码映射和并行规模当作偏离；二是把当前声明支持一种实现解释，强化成全量缓存、全序修订或固定消费时点。前者须按当时授权审查，后者须检查存在的合法替代。禁令与设计都约束错误机制，不排除合法研究方法和业务特化。

## 历史会话偏离与禁令依据

本轮读取原生记录并提取user/assistant正文；不是仅依赖标题、旧摘要或完成报告。主要记录为OMP会话 `01a07aa4-260f-77eb-b35f-f53e9f2d78ed`（原文件 `2026-09-07T06-52-53-135Z_01a07aa4-260f-77eb-b35f-f53e9f2d78ed.jsonl`），另核对Codex设计分叉 `019f5f67-5117-7281-bbf7-7cd770f7f7ea`。两者cwd均指向本仓库。下列行号指原生JSONL物理行，message ID用于回查，不以报告生成行号替代。

| 经核实的机制 | 原文定位与直接证据 | AGENTS约束 |
|---|---|---|
| 抽象被业务方案替代 | OMP4041–4048；`df431b4c`指出抽象文档变业务文档，`383a92c0`承认未解决基本构件/关联/组合，却以流程、术语和验证统计宣称完成 | 禁止用业务详述、运行统计替代抽象论证 |
| 预设业务分组、全盘采纳子代理 | OMP4047–4048；`f87e8082`指出未经概况调查派业务任务，`d4ebf703`明确task预装栏目、验收错层且未用IRC质询 | 派工允许反驳前提，Main核查并裁决，不禁并行 |
| 静态清单冒充事件流；黑箱被误作不可描述 | OMP5832–5845；`055de92c`纠正对象列表，`385885df`要求函数/类型组合与可预计状态流向，`5c3807e9`承认把类型缩成字段、把外部不透明误作内部行为不可预定义 | 解释计算、消费和时间语义，不强求枚举Provider内部 |
| 映射被降为索引、既有依据被删除、又转成只归纳旧UTA | OMP4301–4305、5914–5930；`34b77ca2`指出能力对照被删除，`4e0a64a0`承认只用覆盖索引，`0d830830`纠正忽略新预设场景 | 保存原始研究身份，新旧场景共同检验候选 |
| 自设一轮交付终点 | OMP6478–6494；`f731354a`问为何停止，`76b3331f`定位计划把主线缩成校准/落盘/发布，仍有可行动研究却结束 | 阶段检查不自动结束原主线；同时对应上面的局部收敛归档证据 |
| 翻译压缩类型契约却以结构数宣称完成 | Codex分叉327–344；用户turn `019f6008-4f3c-7c62-820a-2af6459b186f`指出类型化内容缺失；assistant `msg_069f9247afa01d74016a56065748188199a2a54dda15d44fd3`确认漏Precondition及压缩 | 核对语义保留，不以行数/章节/图数代替 |
| 查历史变成执行历史；自拟解释污染原文 | OMP7367–7373、7393–7398；`b1cb48f5`纠正擅自转冒烟实验，`b1d8a020`定位7199为越界点；`454dd0d4`要求仅保存指定原文，`c8844204`确认额外前言不属原文 | 当前授权独立于历史待办，原文与助手推导分开 |

调查中明确排除的错误解释：OMP第8行 `a1530d30` 当时确实授权逐源码/章节映射、覆盖统计和子代理分工。不能用后来方法论否定这项合法历史任务，也不能将并行数量、候选模型的存在或数据库/Effect讨论本身判作偏离。当前用户明确授权新增证据禁令，故AGENTS的新节与原方法论分开，不篡改其原文。

这些禁令限制目标替换和证据外推，允许业务实例、候选修改、不同模型思考、经校准的扩大研究及当前授权的抽象可行性验证。它们不设固定模板、人数或额外批准关卡；本轮的历史支线完成也不构成主线停止条件。

## 本轮实际形式论证

`FormalControl`建立一个固定IntentRevision、一个已提交请求及其继承依据、一个原子writer的SMT状态关系，使用本机Z3 5.1.0（64 bit）。规格的14种转移不调用待证不变量；FreshStart将ghost颁发计数加一，不把结论预设为系统公理。初态及全部转移保持性通过反例不可满足核对，再验证非空性、推论和可达反例：50项义务得到27 unsat、23 sat、0 unknown。这里sat用于启用性及明确应当存在的反例，不是失败数。

Main直接阅读196行`control-model.smt2`和生成的义务，绕过Python驱动执行`z3 -smt2 -T:60 obligations.smt2`。本轮`main-solver-stdout.txt`与研究者的完整stdout经`cmp`一致，stderr为空。证明的范围是该模型任意有限执行前缀，而不是跑到某个固定深度。

关键反例不是“没有锁”：错误Start仍检查Approved及独立job CAS，只删除共同依据检查。求解器给出Reply、RecordPrepared、ApproveSchedule、Correction、错误Start的可达轨迹：Correction使reviewRevision从0到1，而jobRevision仍为3；旧job匹配3后获得新grant。正确关系拒绝该Start。另一个sat轨迹保留Start先提交、Correction随后提交、native call最后发生，故结论只是不再取得新的Start，不是修订能撤回旧grant。lease到期也不等于旧sender已死。

模型没有证明支持依赖足够、Provider事实真实、SQLite实际原子性、outbox活性、授权/风险/余额、真实grant不可复制、Alice跨域交付或更强证据下重发；单修订的模型也不证明多意图联合性质。它支持§11.5的条件控制关系，不是新UTA实现或整体设计的验收替代物。Main没有编写代码或测试；这次执行是subagent提供规格的形式求解。

## 全目标审核后的实际修正

`ExpressionAudit`阅读全文主书及EF01–14核心正文，逐段论证共同声明、静态/动态关联、D0/M/D1/F、R/P、流状态、Controlled及deferred的成立前提。它没有将所有“缺字段”当作缺口，而是找到三条实际连接：补偿计划到所选C.Intent；持续账户修订产生新FX读取再回注step；Mock/capture/config管理命令如何取得同源公开声明。Main分别复用§5.4.1/2、§5.4.3和§7.4补齐，未新增通用workflow或业务switch。EF09也修正了把补偿候选误标为C自身compensation槽的混淆。

`GoalAudit`按目标和业务时序复核，并实际使用AGENTS禁令继续研究。Main拒绝其中要求公共Partial谓词ADT、自动支持闭包、全局规则五分ADT、统一NewsGroup成员实现及核心唯一Candle修订策略的外推；回读后审核者撤回五项，分别归回具体声明/业务履约。Candle的独立观测身份与同identity冲突仍在EF03写清；支持充分性在§11.2写成可被反例推翻的条件，而非自动分析器。

继续研究保留了有区分力的新问题，而非以撤回数量收口：

- **未命中等待截止。** 96、98尚未crossing，到达可信截止时，普通advance不能伪造Candidate/Gap。§11.1.1由同D另构造lifecycle消费者；FutureBoundary起点与expiry/终点分开，关闭未发送意图仍与Start同域竞争。首次截止升级可据C/终点/冻结政策创建请求，不引用不存在的旧request。
- **异构补偿目标。** `GroupGrade`用A=Exact、B=Economic区分逐成员状态恢复与较窄经济目标。§10.4绑定成员target/claim/证据及组函数，不取标签min/max；Main保留同目标下可证蕴含，不强迫每成员仅一项claim，也不要求准入时预知未来敞口。实际补偿再消费原成员与C的criterion/resolution/exposure/责任。
- **Alice接纳后执行。** `AdmissionOwnership`先核对已有idempotency/CAS而非重新发明它们，再构造executionRef的claim/启动/终态/Unknown关系。Main将reply交接与worker状态分开，拒绝Terminal必有reply、完成必须先于reply、lease到期无人负责等暗含假设。§11.4和EF11保留positive no-start及旧launcher不可迟到的重试前提、跨owner竞态与retention责任，不声称进程exactly-once。

原审核和独立裁决附录分别保存；当前采纳以本文及主书为准。上述研究是构造推导和有限时序核对，除前节Z3形式求解外，没有本轮执行代码测试或启动产品/Broker。

## 全目标的正面证据对应

| 目标/关系 | 当前构造与为什么能够消费 | 保证边界 |
|---|---|---|
| 接入只声明一次 | §3–4、5.3的Unit/schema/Constraint/实现关联共同产生parser、描述与解释；基础约束沿投影提升而非复制字段 | 不反射任意函数语义；实现身份一致不证明业务正确 |
| 异构Provider及静动态发现 | §4.2、5.4.1/2、7在同一binding内解析输入、解释与认证结果；新增必填值由适用constructor、显式失败或调用者参与处理 | 远端schema不使已编译TS长出新union；缺合法投影不伪造共同结果 |
| 原生订单差异 | §6.1、10.1.1由每个A独立槽位及函数派生控制消费者，私有Start不能从公共receipt取出 | 不支持能力缺席；Ack不等于filled；native保证须逐叶子取证 |
| Candle Pull/Push与透明投影 | §6.2、8、13.2、16.5复用精确值但区分页/流生命周期；透明性以状态/身份关系及观察保持逐步推导 | field shape相同不证明业务谓词相同；SnapshotEnd不结束live流 |
| NewsGroup和数据组合 | §5.4.3、6.4及EF04由业务函数推进成员/窗口/配对；Partial、缺侧、修订与终态由声明消费，后继Query结果按当前依赖回注 | 不补零、不制造全序/原子快照；组级来源不被强迫提供成员 |
| Instrument与账户/FX | §5.4.1、6.3、13.5由合法身份/输入关系构造后继；保留原账户值供F及当前FX消费 | display symbol不是跨源身份；FX质量、单位及时间证据不可省略 |
| 纯规则与本地控制 | §9.1、10.5同evolve推进推测状态，writer在声明触点核对完整共享read-set并提交 | 后置拒绝不泄漏消费；本地reservation安全不锁远端账户 |
| 异构效果与补偿 | §10.4、EF09由成员多轴结果进入冻结组目标；A计划经合法输入构造成为独立C | 无标签折叠、无隐式降级；补偿不消除原历史或Unknown责任 |
| 数据激活与截止 | §11.1/2同D生成P初态、进展、支持及lifecycle消费者，历史依据与当前C支持分离 | NoActivation不等于false；终点不是Gap；支持充分性是明确语义义务 |
| 返回Agent及原意图执行 | §11.3–5、EF10/11同request交接到Alice admission，精确回复回原intent；basis持续被Prepare/批准/Start消费 | 没有跨owner原子性；Agent回复不批准交易；已颁grant不被修订物理撤回 |
| 管理、配置与模拟器 | §7.4和EF05/12/13由各owner管理声明派生发现/parser/路由/结果，host只聚合描述 | 不伪装Query，不强制交易Recipe，不承诺任意未来管理协议无需扩展 |
| 恢复、迁移与旧契约 | §9.4、10.3、14及EF12/14保持原binding/attempt/责任，原证据与当前结论分开 | 缺Started marker不证明no-start；未解决工作不靠回滚数据或旧callback重发 |

这张表是查漏入口，成立理由在所引正文的构造和时序中；不是以每格有名称证明完整。对组合的结论限定于明确操作数与保证前提，不从已覆盖场景推断无限扩展。

## 旧承接册的当前结论同步

`LegacyConsistency`回到承接册及原始调查，确认起点的live parser冲突，并逐类核对相同机制在pack/IBroker、路由、生命周期、投影/导出、空值与listing、静态行情形状及迁移中的表现。修正限定在承接册Markdown与JSON的当前判断，不改原始`currentBehavior`、`sourceReferences`、legacy-bindings或原solutions。内部调用者切换后删除旧路径；具体已发布外部责任必须先被确认，才能单独定义其单向、版本化只读投影，不能以未来可能兼容为由保留通用shim。

保留差异本身的业务含义：真实零值不等于缺失数据；空输入仍可合法no-op；有充分观察时Cancelled仍是正常业务结论；Gap是连续性事实而非第四种Coverage。cooldown在本承接节选择approval/queue消费，其他规则可以显式选择Start触点；两者都要求writer在实际触点消费当前共享依据，不将一种示例提升为公共默认。

原始事实保留与Markdown/JSON的本批镜像核对记录在归档的`legacy-consistency-mechanical-evidence.md`。这些机械比较用于防止文档同步丢失调查或制造第二套当前结论，不证明旧Broker实现已履行新协议。

## 设计结论与实现证据的边界

本轮的正面结论是：已研究的作者声明能够经明确构造产生公开消费与解释关系；业务函数在这些关系中表达来源、转换、规则和后继，而不是要求共同核心逐项认识业务。组合只在输入构造、结果投影、资源/权限、支持充分性和各自协议承诺成立时保持所述性质。时间推演进一步区分候选与提交、当前计算与历史责任、接纳与执行、目标满足与尝试解析，没有把这些区别压成单一成功状态。

剩余核验不包括尚待发明的上述消费关系，而是其明确前提在具体实现中的履约：

- Provider/版本/账户是否真正提供所声明的身份、连续性、finality、replay、幂等或补偿保证；不能从统一接口推断原生能力。
- 具体持久层是否原子保存决定、工作、依据和receipt，解释器是否执行关联/权限/版本检查，以及真实grant是否只能由合法路径消费；SMT模型不是这些实现的证明。
- 具体业务函数是否声明足够支持，输入转换是否保留其业务含义，时间政策是否符合所需市场承诺；类型与有限场景不自动证明函数语义。
- Alice的实际launcher是否能提供no-start和no-late-spawn证据，跨进程恢复及消息重投是否履行责任；设计明确了证据不足时的Unknown，而未承诺跨owner原子性或进程exactly-once。

生产代码、Broker运行、用户状态迁移和维护者接受不属于本轮已经取得的证据。后续实现须按对应owner的真实入口验证这些义务；不能以本设计或形式求解输出跳过运行验收。

## 可携带的研究证据

[本轮研究归档](current-research-evidence.tar.gz)保存独立研究报告、Main裁决附录、带原生定位的会话正文摘录，以及形式规格、求解义务和实际输出。归档根目录为`uta-current-research-evidence/`；相对路径哈希清单用于核对解包资料。整份私人会话、思考和tool payload、下载的第三方文档不进入归档。审核报告记录各自读到的快照；当前结论以主书和本记录的裁决为准，不能把整合前的发现重新当成当前缺口。

形式求解可从归档独立复现：解包后进入`uta-current-research-evidence/formal/`，确认`z3 -version`，执行`z3 -smt2 -T:60 obligations.smt2`。该义务文件自包含，不需要Python驱动或原session目录；对照同目录的`main-solver-stdout.txt`及`report.md`解释每项sat/unsat。记录的求解器版本是5.1.0，换版本后的模型打印顺序不属于业务契约。

可读性核验只检查文档能否被工具解析、链接能否定位及证据能否复现。设计验收仍依据前述构造、业务语义和时间推演，不以解析数量或归档文件数量代替。

## 最终交付核验

Main实际解包交付的归档，执行`shasum -a 256 -c MANIFEST.sha256`，34项全部OK；归档SHA-256为`d4be28eb038e6ea247f8fa4a99d0ad5351fde095d48fb262a4fe149d854ae164`。随后在解包后的`formal/`直接用Z3 5.1.0运行自包含义务，stdout与归档内Main原复跑记录经`cmp`逐字节一致，stderr为空。归档不是只能在原session路径读取的证据链接。

`Readability`实际使用marked 15.0.12解析/生成7份Markdown的HTML，并用Mermaid 11.17.2解析20张图；748个本地链接/锚点通过，68张表的623行无列数不一致。一个外部RFC链接未作网络核验；当时唯一延后的归档链接已由Main上述解包及求解查实。解析不包括浏览器视觉效果，也不是业务正确性证明。

旧承接册的99组原始行为及1,562项来源引用保持不变；97项本批当前判断在Markdown/JSON中等值。完整字段比较保留16项既有表示差异（JSON角色映射与Markdown角色前缀），没有新增镜像差异；不将其表述为两份文件字面完全相同。

本阶段按计划的七类条件完成设计验收：共同声明、计算与特化、时间与状态、数据与控制、新旧契约、不确定性，以及有会话证据且不妨碍研究的禁令。完成的是这些前提与范围下的核心设计候选和可追踪研究产物，不是生产实现或维护者接受。分支hold保持，计划保留至维护者接受。
