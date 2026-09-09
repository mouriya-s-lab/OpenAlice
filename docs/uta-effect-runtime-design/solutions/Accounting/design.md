# Accounting：可组合能力边界下的事实、成交与估值投影

## 设计状态与负责范围

这是目标设计，不是生产迁移，也不宣称下列语义单元、能力叶或投影已经在仓库中导出。Accounting 负责四类相互关联但边界不同的语义：

1. 成交事实、成本基础与外部余额调整；
2. FX 观察、金额转换与账户估值；
3. 订单/成交历史的可查询投影；
4. 持仓数学、账户聚合和 broker-reported 事实的并列保留。

本组不能把这些领域重新合并成一个 SDK-shaped domain helper。共同边界采用 `composition-contract.md` K01-K12：声明精确 schema、语义单位、结果/错误、交付方式和资源要求，再由组合器推导类型、校验、元数据和外层投影。`CapabilityDescriptor` 是固定的 UTA-facing 元契约，不是一个要求所有 provider 实现同一批动作的接口。

当前源码仍是调查事实：`cost-basis.ts:1-24,38-173` 把 GitCommit replay 当作 CCXT spot WAC authority，并把 mark bootstrap、长仓假设和未知 action 默认藏在 helper 中（MAP-D807137749、MAP-EBE3DF37DD、MAP-EB2F40AA83）；`fx-service.ts:1-220` 把 live/cache/default/1:1 fallback、网络、TTL、warning 和数值 USD 转换放进 mutable class（MAP-C3F063DA6A、MAP-20D6995F44、MAP-B7DBA0C5CB、MAP-2683B949E2）；`order-history.ts:24-263` 直接解释 IBKR Contract/Order、按 Git 数组对齐并 query-time 扫描 external provenance（MAP-2A6F3FE722、MAP-B34D1F5166、MAP-9B65095C78）；`position-math.ts:1-118` 把 `IBroker.Position` 形状作为跨层 authority，并对缺失/零 multiplier 和未知 side 采用隐式 fallback（MAP-D53569BA15、MAP-948A6A2A73、MAP-147386F739、MAP-A50E762BBD）。这些是 source evidence，不是目标契约。

## 组合边界：固定元契约，开放 provider 叶

### 1. 能力叶与 schema 来源

Accounting 需要的概念叶可以是 `CostBasisProjection`、`FxLookup`、`OrderHistoryQuery`、`FillObservation`、`PositionValuation` 或 `AccountValuation`；这些是语义单位名，不是要求未来建立同名模块。每个叶由接入作者声明自己的 input/result/error schema、交付方式、效果类别、资源/权限要求、schema 指纹和 availability evidence。新增 provider 参数只能改变该叶的声明、推导出的调用校验和 metadata，不能要求内核增加 global switch 或其它 provider 的空 handler（K01、K02、K03）。

Provider 可以保留任意 native SDK、REST/OpenAPI、事件协议或独立进程。adapter 在边界 runtime-decode native payload，随后把已验证的 `InstrumentDescriptor`、`OrderSpec`、`FillEvent`、`FxRateObservation`、`PositionObservation` 或 `AccountFact` 交给纯转换。native 参数（例如期权 expiry/strike/right/multiplier、TIF、trailing、protection、parent/OCA/leg、venue lookup key、provider timestamp 和 broker execution identity）作为 provider 精确声明的扩展保留；不能因某个 provider 没有它而在 UTA 侧伪造默认值，也不能把 IBKR 的 sentinel 或 `IBroker.Position` 变成 universal SDK contract（K02、K03、K04、K07）。

结构性缺失与暂时不可用必须分开：schema 中没有该字段/叶时，父节点不生成该结构；叶存在但尚未登录、限流、断连或权限不足时，保留能力身份与精确契约，并报告具名 availability，不能把 unavailable 当作 Unsupported 或普通空值（K02、K03）。订单 field 的有限安全 union 仍可在局部存在，但不手写 Market/Limit/Stop 与保护、期限、venue 的笛卡尔积；`OrderSpec` 由 provider 声明的 schema/HOF 片段组合，非法组合在声明边界被拒绝（K04）。HOF 只在装载进程中运行，持久记录保存版本化 descriptor、参数和实现身份，不序列化闭包。

### 2. Public data 与 account/order facts

`FxRateObservation` 的公共最小事实是有方向的 `CurrencyPair`、Decimal rate、provider/observation identity、observedAt/receivedAt、schema/freshness 和 uncertainty。公共 market-data pull/push、cache、Instrument/Candle/News 等数据单位不凭空附加 `AccountId` 或 `SubAccountId`。只有账户 valuation、position、fill、order、cost basis、cash/margin/fee 和 account reconciliation 等账户事实携带 `AccountScope = AccountId + explicit SubAccountId`；其余能力使用自身精确 schema 或显式 `Public` scope。

Accounting 不从 `{utaId}|{nativeKey}` 猜出 sub-account。`UnifiedTradingAccount.ts:509-520` 只证明 `aliceId` 是 `{utaId}|{nativeKey}`，`:784-791` 只把 staged sub-account IDs 写入 commit message，Operation/GitCommit 没有可逆绑定。历史导入没有 manifest 或 linked evidence 时，scope 是 `Unavailable`，不是默认钱包。该限制对应 MAP-CA5605FEB6、MAP-FE7C71CD03 及 closure 中的 empirical-retained obligation。

### 3. 数据读取与受控交易效果

FX lookup、position/account observation、history query 和 cache 是 data capabilities：pull 返回有 schema 的有限结果，push 若存在则声明帧、cursor、缺口、背压、取消和恢复；cache 只保存 observation 与 freshness，不是 stdout、order WAL、approval 或 compensation job。数据读取不使用订单 prepare/approve/compensate，也不会因 cache miss、stale mark 或 FX outage 自动触发交易补偿（K05、K06、K08）。

实际订单写入才进入受控效果包装：`DispatchStarted`、lease/CAS、command identity、write-ahead、unknown 先对账、reconcile/recovery 和补偿的非 ACID 限制只约束订单 effect execution。Accounting 接收已确认的 remote observation 并折叠成交事实；它不决定 redispatch，也不把一帧行情或外部触发事件当作批准。外部余额变化可形成带 scope、reason、actor、observation 和授权证据的 `ReconciliationEvent`，但它不是 FillEvent、订单 dispatch 或 realized-PnL 证据（K08-K10）。

## 四条实现方向

### A. 成交与成本基础：typed facts，纯 WAC fold

保留 `cost-basis.spec.ts:89-173` 的有效 Spot WAC、Decimal precision、部分卖出保持 average 和 valid close-as-sell 场景（MAP-977FF0C895、MAP-EB2F40AA83）。将 SDK/Git fixture 改成 schema-decoded `FillEvent`、`ReconciliationEvent`、`JournalEnvelope` 和 scoped identity；缺 scope、price、side、sequence 或 provenance 不再变成 null、silent skip 或 BUY。`CostBasisState` 以账户事实的 `AccountScope + InstrumentId + settlement CurrencyCode` 为 key，状态显式区分 Empty、Established、Unattributed、Unavailable、Corrupt。

`evolveCostBasis` 是纯 Decimal 转换：买入按 SpotWac 加权平均，长仓卖出保持 basis，超卖交给显式 ShortExposure/Unsupported policy；重复 `(event identity, payload digest)` 是 no-op，冲突进入 recovery。mark 只能作为带 reason/authority 的 ReconciliationEvent 观察，不能建立伪造 acquisition provenance。`FillMeasure` 是 Accounting 的局部语义 ADT：每个声明 `FillObservation` 的 provider leaf 必须把自己的精确 schema 映射为 cumulative cursor 或 execution stream 之一，且仅在该 adapter 有证据时使用；无法判定或不支持时保留 Unknown/CapabilityUnavailable，不生成 FillEvent。`syncOrders` 的旧形状只保留为调查证据，不能用其 positional result 推断 provider 语义（MAP-7BEE7FDB8C、MAP-68C7EFD89F、MAP-556EBB388B）。

Journal writer 可以把事实 event、scoped accounting projection 和 checkpoint 原子落盘；这属于事实投影的 durability，不是给读行情或 cache 加订单审批。Git exporter 只读已提交 journal，legacy Git import 需要 per-record manifest；不能用文件顺序、当前时间或 `aliceId` 推导历史 sequence/scope（MAP-D807137749、MAP-EBE3DF37DD）。

### B. FX 与估值：有方向的 observation，显式 uncertainty

将 `fx-service.spec.ts:1-228` 的 raw snapshot、global fetch、real sleep、stale numeric fallback、dated default、unknown 1:1、warning Set 和 zero early return 作为缺陷证据（MAP-082EF635D6、MAP-A6935CF652、MAP-F57EB058EB、MAP-1B24CAB86B、MAP-5159E38E38、MAP-1CA6BEB099、MAP-1955CFFDB9、MAP-946AA65B76）。目标是 `CurrencyCode`/`CurrencyPair`/`DecimalRate`/`Instant` 的 schema-first boundary，加上 `Identity | Confirmed | Estimated | Stale | UnknownFx | Unavailable | Invalid` 的明确结果。

同币种是纯 identity，不造 provider timestamp；跨币种严格使用 `amount_to = amount_from × rate`，pair、provider observation time、finite positive rate 和 freshness 都必须通过 adapter schema。default dataset 是 versioned immutable estimate，不是 broker fact；stale/default 可由非交易 `EstimateAdmissionPolicy` 允许 display/query，但 confirmed equity、risk 和 reservation 默认只接收 Confirmed/Identity。zero 先验证金额和 currency；HKD/USD zero 不能绕过未知 FX。Longbridge 的 cross-rate 只能组合同一 valuation context 中两项已验证 observation，不能除 warning 或 unknown 数字（MAP-592DD5394C、MAP-612CCE1A5D、MAP-B7DBA0C5CB）。

Provider client、Hub HTTP、cache、backoff、Clock 和 observability 是可替换 ports/layers。cache eviction、通知 dedupe 或网络重试不能改变已提交 valuation；uncertainty 先持久化为 valuation evidence，通知只是可选副作用。`uta-manager.ts:205-267` 不再把 missing account facts 当 zero，`routes-trading.ts:169-189` 不再返回无 pair/uncertainty 的裸 rate；公共 FX query 仍是 data capability，不创建 order intent 或 compensation path。

### C. 订单/成交历史：投影使用 provider-declared observations

`order-history.spec.ts:43-168` 的一行 place→sync、external/cancel、option metadata、anonymous rejection、reconcile labeling 和 origin/sync dedupe 是保留的 observable behavior（MAP-51B32EF77E、MAP-CD50878370）。投影输入由 adapter 声明的 OrderSpec fragments、InstrumentDescriptor、ScopedOrderRef、Dispatch/RemoteObservation 和 FillEvent 构成；`toHistoryContract` 不再知道 IBKR sentinel，`decStr` 不再在 projection 中 unchecked parse，未知 action 不再默认 BUY（MAP-2A6F3FE722、MAP-66445C2610、MAP-0BC39A0EFF）。

公共 history lifecycle 是投影 vocabulary，不是所有 provider 必须实现的完整 broker handler 产品。provider 只发出其叶声明并且实际观察到的状态/字段；没有 cancel、option namespace 或某个 native parameter 时就没有对应 leaf/extension。已声明的 trailing/TIF/protection/parent/OCA/leg 等字段按原生 schema 精确保留，结构性 absent 不伪造，availability 单独暴露。projection reducer 以 scoped/native identity、event sequence 和 payload digest 去重；Partial/Unavailable listing 不能推断 cancel，Unknown/Reconciling 不能被猜成 terminal。

Order projection、FillsProjection、CostBasisProjection 分开：order row 保存 lifecycle/join，FillEvent 才贡献成交和 notional，ReconciliationEvent 可由独立 history-adjustment projection 暴露但不是 FillEvent，FeeEvent 保留 currency-qualified amount，realized/unrealized PnL 依各自 evidence/policy。查询只读投影，不再 query-time scan Git；完整 reduction 后按 descending journal sequence 再以 deterministic event identity tie-breaker 排序，最后应用 limit（MAP-B34D1F5166、MAP-0C54B9142F、MAP-9B65095C78）。

### D. 持仓数学与账户聚合：单位、来源、政策分离

`position-math.spec.ts:5-138` 的 stock/option/future multiplier 公式、long/short sign、zero-at-cost、Decimal precision 和短仓不重复计入现金的场景是保留不变量（MAP-022335DA27、MAP-45921BE3BA、MAP-70D15B704F、MAP-A318FB662B）。`valuePosition` 只接收已构造的 Quantity/Price/ContractMultiplier/Side/CurrencyCode 与 mark observation；输出带 Money、formula version、freshness 和 `Derived` evidence。完整 broker marketValue/PnL 保留为 `BrokerReported`，一侧或零组件保留为 `Incomplete`，不能互相覆盖或把 missing 变成 zero/one。

multiplier、optional mark、side、currency、cash/margin/collateral/fee 语义来自 provider/account capability evidence。显式 unit multiplier one 可以有效，但 absent/zero/invalid 不得默认 one；unknown side、missing FX 或 missing multiplier 产生 Invalid/Unavailable。`AccountValuation` 组合 scoped AccountFacts 和 currency-qualified buckets，输出 Complete/Partial/Rejected，并同时保留 broker-reported NetLiquidation 与 derived total；short proceeds 只有在该 broker/account policy 证实时才扣除（MAP-D53569BA15、MAP-A901893CDA、MAP-948A6A2A73、MAP-147386F739、MAP-6033F222D1、MAP-B5B21108F4、MAP-A50E762BBD）。

源层的差异不能靠一个全局公式抹平：`contract-builder.ts:109-127` 的 multiplier=1/generic Error、Longbridge `:437-447,449-540` 的 cross-rate/marketPrice/cost fallback、IBKR `:611-645` 的 broker NetLiquidation precedence 和 Mock `:387-414` 的 in-memory arithmetic 都必须分别解码为 facts、availability 和 policy。Mock 可以解释公式场景，但不能证明 live native guarantee。

## Durability、迁移与事实保留

Accounting projection 的 writer 记录 schema/version、scope（仅适用的账户事实）、InstrumentId、observation/event identity、payload digest、sequence/checkpoint、source、asOf 和 uncertainty。事件与对应 projection 更新必须可重放且 CAS/unique 保护重复；这不等于 broker exactly-once，也不把 Git 或 cache 变成 authority。数据 pull/push 的 cursor、gap、finality、背压和断连恢复由其声明的交付 schema 负责，不能用交易锁或 WAL 模拟完整 replay。

切换顺序是：先定义 schema/constructors 与 provider extension；再在 adapter boundary 解码 native payload 和 capability/availability；随后落地纯 reducer、事实事件和可重建 projection；最后迁移 manager/routes/history consumers，并将 Git 留作 audit export。旧行为只在有证据的范围保留：valid WAC、execution-price attribution、origin/sync dedupe、option/native fields、signed short arithmetic、同币种 identity 和 Decimal precision。没有证据的 short/lot/tax/correction/multiplier/FX timestamp/account policy 必须显式 Unavailable/Unsupported/Unknown/RecoveryRequired。

## 可证伪场景与实现验收

以下场景直接对应 MAP 证据并用于实现 gate；它们不是当前实现已通过的测试：

- 1 unit @ 50,000 与 1 unit @ 80,000 得 WAC 65,000；partial sell 不改变 WAC；over-sell 不静默清空 short exposure（MAP-977FF0C895）。
- origin 与 sync 对同一 execution identity 只产生一笔 FillEvent；相同 digest 重放 no-op，digest 变化进入 recovery；unknown/StillWorking 不产生 fill 或 rejection（MAP-7BEE7FDB8C、MAP-68C7EFD89F）。
- `100 HKD × 0.1282 = 12.82 USD` 的 Confirmed observation 保留 pair/provider/observedAt；stale/default/unknown 不能进入 confirmed equity；`USD/USD` zero 是 Identity，而 `HKD/USD` zero 仍必须有 lookup result（MAP-612CCE1A5D、MAP-1955CFFDB9）。
- `2 × 70 USD × 100 = 14,000 USD`；10 USD fee 仍是独立 Money；mixed currencies 未有 accepted FX 时返回 Partial/Rejected；外部 `quantityDelta` 不生成 FillEvent 或 realized PnL（MAP-CD50878370、MAP-0C54B9142F）。
- `100 × 210 × 1 = 21,000 USD`、`5 × 70 × 100 = 35,000 USD`，以及 `2 × 5,850 × 50 = 585,000 USD`；相应长仓 unrealized PnL 为 `1,000 USD`、`6,000 USD`、`5,000 USD`；zero/missing/negative multiplier、unknown side、missing required mark 不能产出 plausible value（MAP-022335DA27、MAP-6033F222D1、MAP-147386F739）。
- 同 symbol 但不同 expiry/right/venue 的 InstrumentDescriptor 不合并；provider 未声明的 option/cancel/native field 不会凭空出现在 capability tree；declared native extension 可在 projection round-trip 中保留（MAP-2A6F3FE722、MAP-0BC39A0EFF、MAP-51B32EF77E）。
- Partial listing 不推断 cancel；Git audit export 删除或重建不改变 authoritative projections；cache eviction、通知抑制或进程重启不改变已提交 valuation evidence（MAP-B34D1F5166、MAP-1CA6BEB099、MAP-A66387BED8）。

## 尚未解决的 native 证据

仍需外部/adapter evidence 的事项不能被抽象宣称已解决：历史 `aliceId` 到显式 SubAccountId 的关联；各 venue 是 cumulative fill 还是 execution stream 及 correction identity；vendor/Hub/yfinance 的实际 payload、provider timestamps 和 freshness SLA；currency/alias registry；每个 broker/account 的 FX、multiplier、field availability、short/margin/collateral/NetLiquidation policy；legacy Git import manifest 的 scope、identity、sequence 和时间映射；公共 protocol 的排序、精度和最终字段名。对应 closure entries 保持 empirical-retained 或 integration-resolved 的原始问题文本与证据义务。

K12 的验证必须分别证明：声明新增 provider 字段会同时改变 schema-derived type/validator/metadata/CLI；不支持的 option/cancel 树没有该 leaf；错误输入在 handler 前被拒绝；pull/push 交付与取消可区分；外进程输出按声明 schema 校验；以及一次真实 candle/market observation 触发 ReturnToAgent 时只形成可追踪 ReviewRequest/outbox、零 broker dispatch。Accounting 只负责其事实/估值投影证据，不把这些实验冒称为 native broker safety 或完整 runtime 已实现。
