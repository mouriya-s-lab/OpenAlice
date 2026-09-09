# LeverUp effect-runtime 目标设计

## 范围、状态与证据边界

本设计覆盖 `LeverupBroker.spec.ts` 的 23 个 MAP 与 `LeverupBroker.ts` 的 28 个 MAP，共 51 项。它是迁移方向，不是已经接入的 provider 协议、交易实现或 native conformance 结果。共同约束是 [`composition-contract.md`](../composition-contract.md) K01-K12；本组不创建新的全局订单接口，也不声称本地 fixture 证明了远端行为。

源码中的 `IBroker`、viem、REST client、Pyth Hermes 与 EIP-712 对象是当前 adapter 的事实边界。`IBroker` 仍然是源码中的 legacy facade（`LeverupBroker.ts:23-31,80-96`），但它不是目标 UTA contract；目标只从 provider 的声明组合能力树，并在最外层保留需要的 compatibility projection。任何当前源码行号都只表示本组复核时的 source evidence，不把历史 mapping 的旧架构结论当作规范。

当前事实由以下 source anchors 支撑：

- 配置只校验 `live/testnet` 与 64 位十六进制 private key；`init()` 构造 signer/client、只 probe RPC `chainId`，随后设置 `initialized`（`LeverupBroker.ts:83-150`）。
- `placeOrder` 只接受 `MKT`，从 Pyth 取价格，硬编码 USDC/LVUSD、1x 与零 TP/SL，签名后 POST relayer，并把 `inputHash` 放入进程内 `Map`（`LeverupBroker.ts:213-317`）。测试只断言 mock 的 60000 价格、Pyth bytes、inputHash 与 `Submitted`（`LeverupBroker.spec.ts:269-301`）。
- `closePosition` 读取 reader 的 OPEN 记录，按 pair 取第一行，忽略 quantity，签名并 POST close；返回的 inputHash 不进入 tracking（`LeverupBroker.ts:327-374`）。
- `getOrder` 只观察进程内 `orderTracking`，把 `executed/success` 映射为 `Filled/Inactive`；读不到 tracking 时返回 `null`（`LeverupBroker.ts:450-492`）。
- reader 的分页字段存在但 broker 固定请求 page 0、只筛 OPEN（`reader-client.ts:59-90`）；qty、价格、margin 的尺度有注释，fee 货币/尺度没有 native 证据（`reader-client.ts:31-57`）。
- position projection 静默丢弃未知 pair，把 entry 当 market、margin 当 market value、multiplier 设为 1、PnL 设为 0（`LeverupBroker.ts:416-448`）。account 还把不明 fee 当作 USDC/USD 近似聚合（`:378-414`）。
- Pyth 只提供单一 mark；当前 quote 把它复制为 bid/ask 并把 volume 设为 0，market clock 固定 `isOpen: true`（`LeverupBroker.ts:494-518`）。
- 静态 pair registry 只覆盖文档称谓的 20/23 对，testnet 数组直接别名 mainnet 数组（`pairs.ts:29-33,62-68`）。unknown native key 会合成缺少 pair/feed 的 Contract（`LeverupBroker.ts:531-547`）。
- EIP-712 源码同时保留 nested/flat 两种 open primary type，并建议 relayer reject 后 fallback；salt 依赖 `Date.now()`/`Math.random()`（`eip712.ts:4-10,54-124`）。这只证明本地编码向量，不证明远端接受。

## 目标形状：固定元契约，开放 provider tree

UTA-facing 外层只固定 `CapabilityDescriptor` 的元字段：稳定能力身份、命令路径、schema 版本/指纹、输入/结果/领域错误 schema、交付方式、效果类别、资源/权限要求、来源与 availability。LeverUp 通过该 descriptor 发布自己的能力叶子；每个叶子的输入、输出、错误与 native 扩展由 provider schema 声明并可由 HOF 组合。这里的“树”是目标概念，不是声称仓库已有某个导出模块。

本组明确不引入：

- 全局 `ActionContractMap` 或要求每个 provider 都实现 Place/Modify/Cancel/Close 的 `IBroker`。
- 用 `Unsupported` 空 handler 填满不存在的 option、cancel、modify、partial-close 或保护能力。
- 手写 Market/Limit/Stop/Trailing/venue/protection 的笛卡尔订单类型。
- 把 provider 的 REST/SDK 类、闭包、client 或 signer 放进可持久化 record。

`Instrument`、`Candle`、`News`、`NewsGroup` 是可组合的数据语义单位，而不是 LeverUp 必须实现的全套 broker methods。LeverUp 当前有 Instrument/catalog、Pyth mark、account/position 与 session 数据；没有本设计凭空新增 News/NewsGroup 或 push stream。公共数据叶子可以是 `Public`，不凭 wallet 地址造 `AccountScope`。只有 account、position 或 controlled trading 的具体 schema 声明需要时，才绑定 `AccountId + SubAccountId`；缺少该 scope 时返回 `ScopeRequired`，不选择单一钱包默认值（MAP-61E3A9F0E4、MAP-123F8DBC3D、MAP-0233341AE8）。

K01 的收益是接入作者声明一次精确 schema、语义单位、处理函数与资源需求后得到 descriptor、校验与帮助投影；K02/K03 保证不存在的叶子不被伪造，静态 TS schema 与 JSON Schema/运行时 decoder 不分叉。provider 可以继续使用 viem、REST、OpenAPI、任意语言进程或自己的内部范式；K07 只统一 UTA-facing adapter 边界，不统一内部 SDK。

## 数据路径与效果路径必须分开

### 数据路径

Pyth、reader、catalog、account balance、position listing 与 market session 是数据/查询能力。pull 是一次有限结果；如果未来某个 provider 叶子声明 push，则必须声明 stream 的创建、取消、结束、错误、cursor、缺口、背压与恢复，不能把 frame 当 stdout 或订单事务。当前 LeverUp source 没有可证明的行情 push 契约，本设计不创造一个。

- `InstrumentCatalog` returns `Complete | Partial | Unavailable`. Each descriptor preserves venue/category/synthetic-perp semantics and explicit jurisdiction evidence (`Known | Unknown`) alongside canonical identity, deployment, pairBase/feed, and coverage. Empty matching and unavailable/coverage不足 are distinct; 20/23 registry缺口、500BTC/500ETH 的 placeholder `pairBase` 与 testnet address alias 都是 coverage/native-identity evidence，不是“无能力”的证明。placeholder 条目可以作为带 high-leverage 标记的公开目录事实，但在地址/部署证据前不能成为可写 native target（MAP-A8A98337B2、MAP-E8C004E0EC、MAP-796C0C5B19、MAP-D8C97E1870、MAP-17D90B12AC）。
- `ReaderPort` 解码 exact REST wire schema，保留每页、cursor、scope、as-of、未知 row 与 raw digest，输出 `PositionListing` 与 `PositionObservation`。page 0、过滤 OPEN、unknown pair 或缺页都不能证明空仓（MAP-0233341AE8、MAP-BC7663242A）。
- 价、fee、margin、multiplier 与 PnL 各有自己的单位/证据。entry 不是 mark，margin 不是 market value，未知 fee 不得减余额，PnL=0 不是事件。没有 mark/FX/multiplier 时返回 `ValuationUnavailable`，但保留原始事实（MAP-B9BAFEC82F、MAP-123F8DBC3D）。
- Pyth decoder 保留 integer/exponent Decimal、feed、confidence、publish time 与 binary update 的独立 evidence。mark-only quote 采用显式 `QuoteShape = MarkOnly | TwoSided`，并以 `VolumeKnown | VolumeUnavailable` 表示流动性；不把 mark 复制成 bid/ask（MAP-AC1BAD4D60、MAP-481A2438E0）。session 仅在存在 versioned calendar/evidence 时返回 Open/Closed，否则 Unknown（MAP-47A0790F1B）。

这些读取可以消耗连接、配额、cache、存储或付费资源，仍可受资源权限/配额控制；但它们不使用 prepare/approve/compensate、订单锁或每帧 WAL。只有当一个 controlled trading leaf 选择某条数据作为决定证据时，保存选中的 evidence reference、消费身份、freshness 与 frozen input，不把整个行情流事务化。

### Controlled trading effects

当前有 source evidence 的交易叶子只有 market open 与 full close 的方向性能力；它们不是所有 provider 必须拥有的命令。可表达为概念上的 `open` 与 `close-all` leaf，前提是对应 `CapabilityDescriptor` 的 deployment、schema、scope、availability 与 native evidence 都成立。`modify`、`cancel` 与 partial/Units close 当前没有目标叶子：legacy `IBroker` 的 false/error 分支保留在兼容层，不能变成一组返回 Unsupported 的完整 handler。legacy `closePosition` 的 quantity 省略表示该无 amount native endpoint 的 full close，兼容层应映射为显式 `All`；调用者若提供 quantity 则视为未声明的 Units 变体并拒绝，不能静默升级为 All（MAP-04032EFDC4、MAP-50F8D30457、MAP-A2A0451C27、MAP-B53E29D3CC）。

一个 LeverUp open leaf 可组合 shared `Order` 语义单位（side、quantity/notional 等）与 provider-native exact fields；HOF 组合必须保留并推导精确 input/output/error/resource schema，不能把 native `pairBase`、token、broker、保护字段、deadline 或其他扩展抹掉。LeverUp 当前只证明 MKT/CRYPTO_PERP 候选，具体合法组合由该 provider leaf 声明；placeholder high-leverage `pairBase` 未经 native 地址证据时不可写；不能从其他 provider 推断 LIMIT、Notional、GTD、保护或 relation 的规则（MAP-F8AC526698、MAP-90178E421A、MAP-5EDC8088C6、MAP-CA4DC0FDF9、MAP-4AD307691B）。

`withTransaction` 只包住会产生远端 trading mutation 的 leaf：

1. 纯 prepare 解码 `AccountScope`（如果该 leaf 要求）、canonical `InstrumentDescriptor`、provider-native input、Pyth/quote evidence、token/scale policy、schema/domain/deployment fingerprint、显式 command identity 与 deadline；open leaf 另外分配 durable `OpenNonce`，close-all 不捏造 nonce，只冻结 `positionHash`/deadline。效果准入同时绑定该叶子的 preconditions、`ConflictKey`、`CommitCriterion`、`CompensationCapability`（没有 native undo 时显式 `None`/reason）。
2. JournalWriter 在发送前写入 serializable intent/receipt、before-image/preconditions 与必要 lock；CAS/lease/epoch 冻结唯一 `DispatchStarted`。这些 WAL/CAS/idempotency/reconcile 规则只约束 open/close effect，不扩散到 quote、reader 或 account query。
3. signer/HTTP 是 adapter effects。relayer 的 `inputHash` 是 opaque lookup handle；有效 HTTP response 最多是 action-specific `Ack`/`Submitted` projection。response loss、503、timeout 或坏语义在 DispatchStarted 后是 `Unknown/RecoveryRequired`，只允许 observation，不盲目重发。
4. 观察必须用 provider evidence policy：`executed/success` 本身不能证明 Filled/Closed/finality；只有 native terminal/fill/residual evidence 才能升级 projection。relayer duplicate-submit scope、retention、status finality、chain finality 与 Pyth binary 的链上语义仍未证实。

如果未来由外部事件触发该 effect，事件只提供 K09 的 source evidence，不提供 authority；binding 的默认策略、scope、intent revision、谓词、有效期与授权主体必须已冻结。若策略是 `ReturnToAgent`，按 K10 原子消费并暂停 unsent intent，写 durable ReviewRequest/outbox，**不创建 broker dispatch**；回复只能由显式 KeepSuspended/Rearm/Revise/Discard/RequestSubmission schema 处理。当前 LeverUp source 没有事件触发实现，本段只是跨边界约束，不宣称已有 trigger module。

## 身份、部署与 schema

`ChainDeployment` 将 environment、chainId、RPC、reader/relayer endpoint、USDC/LV/agent/address set 与 protocol revision 绑定。testnet 字符串不能覆盖 `TESTNET_PAIRS = MAINNET_PAIRS` 的缺证据。`SigningDomain` 的 `OneClickAgent`/`1`/chainId/verifyingContract 只是 eip712 输入；只有 deployment/address-set 与 schema evidence 对齐时，open/close signing leaf 才可用（MAP-C6C1199DD4、MAP-7F36FE8E07、MAP-5E91CFA930、MAP-D1A1D77A33）。

Schema variant 是 provider leaf 的 immutable capability，不是 fallback 开关。nested/flat open signatures 的差异与 close bytes 偶然相等只保留为 codec evidence；不能在 response ambiguity 后改 variant、重签或另 POST。仅 open effect 使用 `OpenNonce`，close-all 仅持久化其 `positionHash`/deadline 与 dispatch identity；纯 codec 按叶子接受显式 `OpenNonce`/`Instant`/`deadline`（open）或 `positionHash`/`Instant`/`deadline`（close）。`commandId + payloadDigest` 的本地幂等不等于 relayer deduplication（MAP-B100B9C54C、MAP-6786905A37、MAP-96C363D9C7、MAP-50F0F7A825）。

凭据仅由 SignerPort 在效果边界解析。`PrivateKeyAccount`、viem client、REST client、闭包与 Zod schema object 不进 plan/receipt/diagnostic；Zod 4.3.6/JSON Schema 是声明与解码工具，不要求引入新的 universal SDK 或 Effect 依赖（MAP-CB02240E08、MAP-406869F527、MAP-5FA94B52E3）。

## 实现者自由与不可越过的边界

实现者可以选择 TypeScript/Zod、REST/OpenAPI、viem、独立 bridge process、缓存、数据库、语言与内部组合风格。必须保持以下窄边界：

- UTA-facing descriptor、schema fingerprint、availability、delivery/effect/resource metadata 可被 discover/describe/call；provider-native input/output/error 在该叶子内精确校验。
- public data leaf 不伪造 AccountScope；account-bound reader/position/order leaf 明确声明 scope 并拒绝默认 subaccount。
- 结构上不存在的能力不生成空 namespace/handler；暂时断连、限流、未登录但已声明的能力保留身份并报告 availability，不伪造 Unsupported schema 或可执行状态。
- `Candle`/quote/reader/cache 失败不触发交易补偿；交易效果的 compensation/recovery 也只能以 native evidence 声称可逆/幂等/atomic，不能由 SDK 方法名推断。
- compatibility `IBroker` 可继续把 canonical leaf 结果投影为 legacy `success/orderState/null`，但该 projection 不能成为 kernel authority。

## 测试、封装与控制面归属

测试条目（MAP-6F4E5CBAB5、MAP-5FA94B52E3、MAP-A9E4B4C39D、MAP-E00D066E13、MAP-DD63DE7255、MAP-AC474EA806、MAP-405AB5279C）负责 scoped fixtures、exact route/response codecs、redacted signer 与资源释放。它们不要求所有测试都启动 JournalWriter；只有明确模拟 open/close response-loss 的场景才使用隔离的真实 SQLite journal/scheduler、独立 remote-ledger 与 controlled-effect journal，并在 fresh runtime 重启后验证一条有理由的 observation/recovery action。fixed key 仍是 synthetic vector，不是 live account evidence；fixture 也不能替代真实 broker acceptance、补偿策略与 declared baseline/no-unexpected-open-orders 收口。

配置/身份/生命周期条目（MAP-079143FA81、MAP-BA518AF53A、MAP-5E91CFA930、MAP-61E3A9F0E4、MAP-6A6E5DA953、MAP-796DFD3470、MAP-C6C1199DD4、MAP-406869F527）负责资源、scope、deployment、signer 与 capability availability。它们不拥有 provider order WAL；该职责属于 selected `withTransaction` wrapper。catalog/Instrument/quote/account/position 条目（MAP-A8A98337B2、MAP-C78F741F42、MAP-E8C004E0EC、MAP-796C0C5B19、MAP-D8C97E1870、MAP-17D90B12AC、MAP-AC1BAD4D60、MAP-481A2438E0、MAP-47A0790F1B、MAP-B9BAFEC82F、MAP-123F8DBC3D、MAP-0233341AE8、MAP-BC7663242A）负责数据 evidence 与 coverage，不承担 approval/dispatch/compensation。

## 可证伪场景与验收

以下场景对应 K12，并保留原 MAP 的 empirical obligations；它们是未来实现 gate，不是当前 mock 已经通过的声明：

1. **Public scope boundary：** 不带 AccountScope 的 catalog search、Instrument detail、Pyth mark 与 session query 可以按其 Public schema运行；同一调用若伪造 subaccount 或把 wallet 当 scope，必须被拒绝。account/position/open/close leaf 缺 scope 时返回 `ScopeRequired`。
2. **Deployment binding：** chainId、oneClickAgent、token/address-set、reader/relayer endpoint 或 schema fingerprint 任一不匹配，受控效果在 signing/DispatchStarted 前失败；testnet alias 与 500BTC/500ETH placeholder `pairBase` 不能授权未经证据绑定的 native write。
3. **Catalog/listing coverage：** 20/23 catalog、totalPages>1、缺页、未知 pair row 或 reader 断连产生 Partial/Unavailable；不得用 `[]`、NoPosition 或 null 掩盖缺证据。
4. **Data units：** Pyth integer/exponent 保持精度；mark-only quote 使用 `MarkOnly`/`VolumeUnavailable`，不把 mark 当 bid/ask/volume；未知 fee/multiplier/FX 不改变余额/valuation；entry 不能变成 market price。
5. **Provider tree absence：** describe/discover 没有 LeverUp modify、cancel 或 partial-close leaf；legacy method 的 compatibility outcome 不产生 HTTP/DispatchStarted；未来新增能力必须新增有版本 schema，而不是复用 false branch。
6. **Open admission：** non-MKT/UNSET/zero/negative/overflow/unsupported provider extension 在 open leaf 编译前失败；BUY/SELL、10/18/6 编码和 native field names 按该 leaf schema保留，并绑定明确的 `CommitCriterion`/preconditions/compensation class；其他 provider 的合法组合不得被套用。
7. **Close-all selection：** 同 display pair 多行要求明确 scoped `positionHash` 与完整 account listing；Units 请求保持 absent/unavailable，不得改写为 All；省略 legacy quantity 映射为显式 All，明确 All 才能提交当前 close endpoint。
8. **Ambiguous dispatch：** controlled effect 在 DispatchStarted 后杀 worker、丢 response/503 或 status GET 失败，重启只产生同 identity observation/Unknown，不发送另一 schema、另一 salt 或第二次 blind POST。
9. **Status evidence：** 200 `inputHash` 只有 Ack/Submitted；没有 fill/terminal/finality evidence 的 `executed=true` 不能 Filled/Closed，未证实 `success=false` 不能 Rejected；完整 scoped lookup 之外不得返回 absence/null。
10. **Signer/recovery isolation：** fixed test credential 可产生预期签名，但 serialized intent、diagnostic、HTTP fixture 不含 key/SDK/client；同 command+digest 重放返回既有 local receipt，冲突 digest 为 IdempotencyConflict。

## 未解决的 native 证据

以下问题必须保持显式 unavailable/unknown，不能由抽象或 mock 关闭：relayer duplicate-submit/idempotency scope、inputHash lookup/retention、`executed/success` 终态语义、fill/transaction finality、close partial support、testnet pair 地址、500BTC/500ETH placeholder pairBase 地址、fee currency/scale、catalog 全量性、session/calendar、accepted EIP-712 primary type/protocol version、Pyth binary update 的链上效果、以及当前未证实的 compensation/undo guarantee。相关原始问题与 evidence 保留在 `questions-closure.json`；closure 只改现行安全决策，不改原 question 文本或 450-question denominator。

独立 conformance 取得证据后，必须绑定 deployment/schema/catalog/scope revision，再提升对应 leaf 的 availability 或 observation policy；不得修改旧 fixture 后宣称 native guarantee，也不得让一条新证据扩张其他 provider 的 capability tree。

## MAP 导航

- **测试/fixture/端口：** MAP-6F4E5CBAB5、MAP-5FA94B52E3、MAP-A9E4B4C39D、MAP-E00D066E13、MAP-DD63DE7255、MAP-AC474EA806、MAP-405AB5279C。
- **配置/部署/身份/资源：** MAP-C6C1199DD4、MAP-7F36FE8E07、MAP-079143FA81、MAP-BA518AF53A、MAP-5E91CFA930、MAP-61E3A9F0E4、MAP-796DFD3470、MAP-6A6E5DA953、MAP-406869F527。
- **Catalog/Instrument/data：** MAP-A8A98337B2、MAP-C78F741F42、MAP-E8C004E0EC、MAP-796C0C5B19、MAP-D8C97E1870、MAP-17D90B12AC、MAP-AC1BAD4D60、MAP-B9BAFEC82F、MAP-123F8DBC3D、MAP-0233341AE8、MAP-481A2438E0、MAP-47A0790F1B、MAP-BC7663242A。
- **Open/sign/dispatch/status：** MAP-F8AC526698、MAP-2FF2A5B544、MAP-D61B8CB8B4、MAP-90178E421A、MAP-5EDC8088C6、MAP-6786905A37、MAP-50F0F7A825、MAP-B100B9C54C、MAP-96C363D9C7、MAP-AFEC8DA518、MAP-A3B8CD6164、MAP-BC274E8422、MAP-5D7C69A184。
- **Capability and structural absence:** MAP-CA4DC0FDF9、MAP-4AD307691B、MAP-A2A0451C27、MAP-B53E29D3CC、MAP-04032EFDC4、MAP-50F8D30457、MAP-D1A1D77A33。
- **Units/codecs:** MAP-B04EEC79F3、MAP-CB02240E08。

以上目标只规定 UTA-facing boundary、证据与恢复安全性；LeverUp adapter 内部仍可选择自己的 SDK、protocol decomposition、cache 与 process topology，只要声明的 leaf schema 和 native evidence 不被隐藏或扩大。
