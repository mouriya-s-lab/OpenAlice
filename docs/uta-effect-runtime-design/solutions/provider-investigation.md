# 异构 provider / native 边界调查

状态：源码调查与目标设计后果；不是生产实现，也不是新的共享契约。本文按 `composition-contract.md` 的 K01–K12 复核现有 provider pack、UTA protocol、AI tool/CLI 以及 native/foreign gateway 边界。`[支持]` 表示源码直接证明，`[缺失]` 表示在核查的当前路径中没有该能力，`[未验证]` 表示需要 SDK、远端服务或真实进程证据；目标模型均明确标为“目标”。

## 1. 结论摘要

1. **当前仓库已经有 schema-first 的局部材料，但没有固定的 capability 元契约。** 工具用 Zod input schema 声明，CLI 可以把 input schema 投影为 JSON Schema；输出 schema、领域错误 schema、effect/delivery、schema revision/fingerprint 和 availability 没有进入现有工具/CLI 注册形状。
2. **`IBroker` 仍是闭合的大接口。** `placeOrder/modifyOrder/cancelOrder/closePosition`、账户/持仓/订单/报价/时钟等方法被集中要求；只有 `getOpenOrders`、`getHistorical`、部分 identity/capability hooks 是可选的。LeverUp 明确不支持 modify/cancel，却仍以字符串失败实现这些必需方法。这正是 K02 要删除的 universal stub 形状。
3. **现有 pack registry 是同进程动态模块加载，不是 foreign-process wire protocol。** registry 只检查 pack API version、engine、`configSchema`、`createBroker`；没有 `describe/discover/invoke/stream/cancel`、descriptor revision 或 schema fingerprint。任意语言/REST/SDK/gateway 需要在 adapter/bridge 进程边界重新声明并解码。
4. **native 数据差异不能压进 IBKR 风格的有限订单全集。** IBKR `Order`/`Contract` 拥有大量 venue-specific 字段；CCXT order id 是可能超过 JS number 的 opaque string；Alpaca 有 qty/notional、bracket/OTO legs；Longbridge 有自己的 order type/TIF 与多市场证券；LeverUp 是 EIP-712 + relayer hash/status + Pyth payload。公共语义单位只能提供最小互操作事实，并通过精确声明的 extension schema 保留 richness。
5. **目标最小 wire 合同应固定 envelope，不固定 provider 的完整业务接口。** descriptor 只固定 protocol/version、capability identity、command path/description、scope（仅适用于账户相关事实的 `Public | Account`）、input/output/error schemas、schema version/fingerprint、delivery、effect、resource/permission、source/availability。没有 capability 的命名空间/叶子就不存在；暂时断连/限流另报 availability，不能用空数组或 `Unsupported` stub 冒充。
6. **CLI 目标应成为 capability tree 的最外层解释器。** 当前 shared CJS shim 已经是无业务逻辑的 argv→JSON→HTTP forwarder，但服务端 `CLI_EXPORTS.commands` 仍是手写 map；目标必须让 describe/help/invoke 从同一 capability tree 派生，而不是要求新 provider 改核心 switch 或命令表。

## 2. 依据与现有 schema/CLI seams

### 2.1 已安装 schema conventions

[支持] 本仓库当前明确使用 Zod 4.3.6：root `package.json:105-131` 声明 `zod: ^4.3.6`，`packages/uta-protocol/package.json:26-34` 与 `services/uta/package.json:14-30` 也直接声明 `zod: ^4.3.6`。核查的 manifests 没有直接声明 TypeBox、`zod-to-json-schema` 或 canonical-JSON package；这不是说依赖树绝对没有 transitive copy，而是这些不是当前 provider protocol 的直接声明源。[未验证] 具体实现若依赖 JSON Schema validator，需在依赖变更/运行时确认。

[支持] 普通 AI tool 从 `tool()` 和 Zod input schema 构造：`src/tool/market.ts:10-36` 使用 `tool({ description, inputSchema: z.object(...), execute })`；交易工具同样如此，`src/tool/trading.ts:633-672` 的 `placeOrder` schema 声明 action、orderType、数量/价格、TIF、TPSL、sub-account 等。

[支持] AI-facing schema 中存在运行时 transform：`src/tool/trading.ts:137-150` 的 `positiveNumeric` 是 string refinement 加 `.transform()`，把空字符串转为 `undefined`。这是 AI input 体验的实现细节，不应直接成为 wire schema；K03 要求把可导出的 wire schema 与具名 semantic constraint 分开，而不是将 transform 静默降为任意对象。

[缺失] 当前 `Tool` declaration 主要只有 input schema 和 execute；`src/server/cli.ts:217-241` 的 manifest group value 只有 `tool/description/schema`，没有 output/error schema；`src/core/mcp-export.ts:17-24,38-62,109-131` 将结果统一转换成 MCP text/image content，未声明业务输出 ADT 或错误 schema。因此“input 能导出”不能被误称为“完整 capability contract”。

### 2.2 Tool registry 与 CLI 投影

[支持] 全局 registry 是可覆盖的 `Record<string, Tool>`：`src/core/tool-center.ts:17-24` 的 `register()` 按名称写入，后注册覆盖同名工具；`src/core/tool-center.ts:44-65` 只提供 Vercel/MCP tool 视图、inventory、lookup。工作区 registry 是 factory 数组，`src/core/workspace-tool-center.ts:257-285` 按名称覆盖并为每个 context build concrete `Tool`。

[支持] 当前 CLI export map 由手写 `CLI_EXPORTS` 提供：`src/server/cli-commands.ts:27-47` 将 `(group,verb)` 绑定内部 tool name，`src/server/cli-commands.ts:241-297` 进一步手写 UTA account/contract/order/position/git/market/sim 命令表，`src/server/cli-commands.ts:314-340` 再从该 map 做 invoke gating。新增 provider capability 现在不会仅靠 provider descriptor 出现在 CLI；仍需改变这份命令映射或另加投影层。该事实与 K06 的目标“从同一能力树计算 `uta <provider> ...`”相冲突，是需要迁移的 trunk seam，不是目标规范。

[支持] gateway manifest 通过现有 tool registry 查找映射工具：`src/server/cli.ts:212-257` 构建 groups，并调用 `z.toJSONSchema(tool.inputSchema, { io: 'input', unrepresentable: 'any' })`（`:227-233`）。这里有两个设计风险：

- `unrepresentable: 'any'` 会把不可表达的 transform/约束降级为任意输入，而不是 K03 要求的导出拒绝；
- catch 后留下 `{}`（`:234-236`），因此 schema 导出失败会变成“无 flags”，让 AI 猜参数。

[支持] invoke 路径以 `z.strictObject(extractMcpShape(tool))` 做输入校验，拒绝未知 flag 并返回字段级错误：`src/server/cli.ts:285-305`。但 `extractMcpShape` 通过 Zod 内部 `_zod` 结构和 `any` 做 number coercion，见 `src/core/mcp-export.ts:66-106`；这是当前边界适配实现，不是可跨进程复用的固定 schema contract。

[支持] CLI shim 的外层职责已经接近目标：文件头说明它是“argv → JSON → HTTP forwarder”，不拥有 schema/business logic，见 `src/workspaces/cli/bin/openalice-cli.cjs:1-22`；它从 manifest 展开 group/verb/help 并把 parsed args 发送给 invoke，见 `:63-96,101-150`；flag 解析与嵌套 JSON 值处理在 `:201-283`。因此目标迁移应保留“CLI 是 interpreter”这一边界，只把服务端 source 改为动态 capability tree，并保留复杂 union 为 JSON 参数，不把 provider-specific union 拆成含混 optional flags。

### 2.3 当前 pack loading seam

[支持] engine/preset 仍是闭合集合：`packages/uta-protocol/src/brokers/preset-catalog.ts:16-18` 的 `BrokerEngine` 只有 `ccxt | alpaca | ibkr | leverup | longbridge | mock`；`BrokerPresetDef` 的静态字段、Zod config、`toEngineConfig` 与 fingerprint fields 见 `:37-98`。`deriveUtaId` 只对 preset identity config 做排序与 SHA-256，见同文件 `:545-579`；它不是 capability schema fingerprint。

[支持] factory 读取 preset config、cast 为 string-keyed record、加载 engine、再将 `brokerConfig` 交给通用 create 函数，见 `services/uta/src/domain/trading/brokers/factory.ts:26-47`。registry 通过 `pathToFileURL` 动态 import installed/workspace pack，见 `services/uta/src/domain/trading/brokers/registry.ts:44-50,58-110`，只在 `:113-123` 验证 `BROKER_PACK_API_VERSION`、`BROKER_ENGINE`、`configSchema` 与 `createBroker`。

[支持] 当前五个 live pack 的入口仍是同一形状（例如 `packages/uta-broker-ccxt/src/index.ts:1-9`、`packages/uta-broker-alpaca/src/index.ts:1-9`、`packages/uta-broker-ibkr/src/index.ts:1-9`、`packages/uta-broker-leverup/src/index.ts:1-9`、`packages/uta-broker-longbridge/src/index.ts:1-9`），并返回 `IBroker` 对象。该加载路径是**同一 Node 进程内动态模块**，不是 foreign process boundary；它没有进程崩溃、协议协商、request correlation、stream cancellation、descriptor revision 或 wire schema validation。

[目标后果] K01/K07 可保留“optional pack + provider 自己的 SDK/REST/gateway”，但 pack v2/foreign process 的 UTA-facing 入口应是 descriptor/connection/capability service，而非要求所有 provider 生成同一个 `IBroker`。已有 `BROKER_PACK_API_VERSION` 可作为 migration version，但不能冒充 capability protocol version。

## 3. 现有 `IBroker` 与 provider capability 事实

### 3.1 闭合接口和 stub 问题

[支持] `IBroker` 从 `packages/uta-protocol/src/types/broker.ts:475-498` 开始同时承载 identity、`init/close` 和 callback listener；交易写入在 `:524-529` 强制要求 `placeOrder/modifyOrder/cancelOrder/closePosition`；账户、持仓、订单、quote、market clock 在 `:553-586` 强制/半强制要求；历史数据才在 `:588-595` 可选。`AccountCapabilities` 只有 `supportedSecTypes`、`supportedOrderTypes` 和可选 historicalBars，见 `:428-450`，没有每个 command 的 input/output/error schema。

[支持] LeverUp 的实际能力只有市场单：`services/uta/src/domain/trading/brokers/others/leverup/LeverupBroker.ts:213-227` 拒绝非 MKT；同一类的 `modifyOrder`、`cancelOrder` 永远返回失败字符串，见 `:319-325`。这不是 transient availability，而是 capability absence，却被 mandatory interface 迫使成为“存在的 method + Unsupported text”。

[支持] CCXT 也把多种 absence/availability 压成空结果：keyless `getPositions`/`getOrders` 返回 `[]`，见 `services/uta/src/domain/trading/brokers/ccxt/CcxtBroker.ts:1033-1100`；`getOpenOrders` 在 permissive mode 遇到 exchange 不支持时记录 warning 后返回 `[]`，见 `:1171-1204`。这无法区分“账户没有订单”“命名空间不支持”“权限/限流/断连导致暂时不可读”。

[支持] 其他 adapter 也有“最佳努力但值看似完整”的边界：Longbridge 账户无 FX 时只选一个 bucket，见 `services/uta/src/domain/trading/brokers/longbridge/LongbridgeBroker.ts:381-408`；position enrichment 失败时 `marketPrice` 回退 cost、multiplier 回退 1、realized PnL 固定 0，见 `:450-540`；LeverUp unknown pair 被 `continue` 静默丢弃，且 marketPrice 取 entry、marketValue 取 margin、PnL 取 0，见 `services/uta/src/domain/trading/brokers/others/leverup/LeverupBroker.ts:416-444`。这些是 adapter evidence/quality 问题，不应在 capability metadata 中伪造 provider richness 或 complete listing。

**相关既有 MAP：** `MAP-25118F5AFA`（IBroker lifecycle）、`MAP-255335BC1C`（mandatory trading mutations/native Order）、`MAP-7056B295D1`（market-data/historical methods）、`MAP-46669371C2`（AccountCapabilities）、`MAP-609FF636E8`（HistoricalBarsCapability）、`MAP-04032EFDC4`（LeverUp modify/cancel unsupported）、`MAP-B1984D4EF6`（CCXT getOpenOrders degradation）、`MAP-0233341AE8`（LeverUp position listing）。这些 MAP 的 source evidence 保留，但目标应按 K02/K05/K07 重新裁决，不继承 closed interface/stub 结论。

### 3.2 Provider-native richness（不得压平）

| Provider / source shape | 源码证据 | 当前行为 | UTA 目标后果 |
|---|---|---|---|
| **IBKR Order** | `packages/ibkr/src/order.ts:37-75` 定义 action、Decimal totalQuantity、orderType、lmt/aux price、TIF、OCA、parent、outsideRth、good-after/till、trail 等；`:122-185,191-245` 继续定义 combo/scale/hedge/algo/condition/attached-order/native cash 等。 | 这是 SDK mutable class，sentinel/optional semantics 依赖 server version。 | Order semantic unit 只取可互操作最小字段；IBKR extension schema 精确保留其 native fields。不能写出 Market×Limit×Stop×TIF×venue 的 Cartesian union。相关 MAP：`MAP-255335BC1C`、`MAP-1141592A9E`。 |
| **IBKR Contract / bars** | `packages/ibkr/src/contract.ts:118-145` 有 conId、secType、expiry/strike/right/multiplier/exchange/currency/localSymbol/tradingClass、combo/delta-neutral；`packages/ibkr/src/common.ts:169-224` 的 `BarData`/`RealTimeBar` 同时有 float OHLC、Decimal volume/WAP、barCount、time/endTime；decoder `packages/ibkr/src/decoder/historical.ts:55-65,123-182` 从 text/protobuf 解码并以 end marker 结束。 | native object 与 protocol `Bar`/`Contract` 混用；decoder 可在字段缺失时保留 class defaults。 | `Instrument`、`Candle<IBKRExtension>`、stream lifecycle/finality 必须在 adapter 处解码；不能把 end marker、WAP、barCount 或 unknown finality 丢成普通 OHLC。 |
| **IBKR wire dispatch** | `packages/ibkr/src/client/orders.ts:324-385` 序列化 contract/order identity、action、quantity、type、prices、TIF、OCA/account/parent/outsideRth；`:387-405` 再序列化 combo legs。 | server version gate 会拒绝某些 fields；本地 object presence 不证明远端接受。 | controlled handler 记录实际 capability/server generation 与 prepared payload；native version guarantees 不能由 TypeScript interface 推导。 |
| **Alpaca** | `services/uta/src/domain/trading/brokers/alpaca/AlpacaBroker.ts:273-345` 组装 symbol/side/type/TIF、qty 或 notional、prices/trailing、extended hours；TP+SL → bracket，单 leg → OTO，response legs 返回 child IDs。bars `:531-590` 通过 async generator、SIP→IEX fallback；caps `:593-600` 静态宣称 STK/五类 order/iex。 | SDK 调用通过 `Record<string, unknown>`/casts；UUID 只能放 top-level string orderId，IBKR inner number 置 0，见 `:630-653`。 | Alpaca order/leg response 应是精确 provider extension；UUID 保持 opaque；SIP/IEX 是 feed/quality evidence，不得从静态 capability 直接推实时/完整保证。相关 MAP：`MAP-3372FF782B`、`MAP-21C40C002D`、`MAP-0A1AF127FE`、`MAP-2C63E4B337`。 |
| **CCXT** | config 允许动态 exchange 与标准 credential fields，`CcxtBroker.ts:163-181`；constructor 动态选 exchange class，`:243-260`。order decode `:1132-1168` 保留 native id/symbol/amount/price/filled/average/TP/SL，但同时 `parseInt(o.id,10)||0` 写 IBKR number。OHLCV `:1234-1278` 检查 exchange.timeframes、fetchOHLCV、latest-window slicing。 | CCXT unified API 是 many-venue facade；exchange-specific params/has/timeframes/namespace behavior 仍在 runtime。 | provider schema 要把 `id` 当 opaque string、native symbol/namespace、params/extension 和 unknown status 保留；`has`/timeframes 只能作为实例 availability evidence，不是 core interface。相关 MAP：`MAP-03894C09ED`、`MAP-00DA721165`、`MAP-724573CD02`、`MAP-1FEC8E666F`。 |
| **Longbridge** | order map `LongbridgeBroker.ts:71-120,271-312` 将 IBKR type/TIF 映射 Longbridge enum，IOC/FOK/OPG 返回 null 并拒绝；native submit opts 有 symbol/orderType/side/timeInForce/submittedQuantity/submittedPrice/triggerPrice/trailingPercent。SDK order response 再映射 `:696-712`。 | 多区域证券、multi-currency、option/warrant enrichment；部分 SDK APIs 以 `unknown as` 调用，TIF/市场差异不能从普通 IBKR order 推断。 | 只在 provider extension 中声明确有证据的 order/TIF/market variants；不支持的参数 variant 不进入相关 command schema；只有整个 capability 缺失时才不生成 command leaf。相关 MAP：`MAP-06A331A1E5`、`MAP-8E4DBDDD86`、`MAP-224C7730A0`。 |
| **LeverUp / Pyth / relayer** | `services/uta/src/domain/trading/brokers/others/leverup/relayer-client.ts:13-52` 的 open/close request 包含 pairBase、tokenIn/lvToken、wei strings、qty/price/SL/TP、trader/salt/deadline/signature/Pyth update data；status response 有 executed/success/txnHash/reason。EIP-712 sign+relayer flow 在 `LeverupBroker.ts:229-315`。Reader raw position 是 `reader-client.ts:31-57` 的 fixed REST shape，`:81-90` 直接 cast JSON。 | read path（REST/RPC）与 controlled path（EIP-712 + POST + poll）是不同效果；relayer `inputHash` 不是成交证明。 | `withTransaction` 只包 open/close；read positions、Pyth quote、USDC balance 是 query/evidence capabilities。status decode 失败/GET timeout after POST 必须 OutcomeUnknown，不是 KnownRejected。相关 MAP：`MAP-351C6A94E7`、`MAP-4996C21AA2`、`MAP-25EDC2AA39`、`MAP-04032EFDC4`。 |

## 4. 目标最小 UTA-facing wire meta-contract

以下是给 Main 集成的**目标 shape / design proposal**，不是要求 provider 内部采用此语言、FP 或 SDK；它只定义 UTA 侧固定 envelope。`protocol.name = "uta-effect"`、`version = "1"` 以及下方字段命名都是目标提案，不是现有源码观察到的远端协议。具体 command schemas 由 provider/semantic-unit declaration 计算。

```text
CapabilityDescriptor = {
  protocol: { name: "uta-effect", version: "1" },
  capability: { providerId, instanceId, capabilityId, revision },
  command: { path: [namespace, name], description },
  schema: {
    dialect: "json-schema",
    version,
    fingerprint,
    input: JsonSchemaDocument,
    output: JsonSchemaDocument,
    errors: JsonSchemaDocument,
  },
  delivery: Pull | Push
  effect: Read | Stream | Controlled
  scope: Public | Account
  resources: ResourceRequirement[]
  permissions: PermissionRequirement[]
  source: { adapterId, adapterVersion, nativeProtocol? }
  availability: Available | TemporarilyUnavailable | AuthorizationHidden
}
```

要求与边界：

- `JsonSchemaDocument` 是在边界验证过的 JSON Schema 文档，不是 provider 内部 `Record<string, unknown>` 的逃生口；descriptor 不携带函数、credential secret、未解析 `$ref` 或不可导出的 runtime transform。不能导出的 schema 进入 `DescriptorLoadFailure`，不能降级为 `{}`/`any`。
- `schema.fingerprint` 必须覆盖实际执行的 input/output/error schema、schema version 与具名 semantic constraints；不要复用仅由 preset config 派生的 UTA id（现有 `deriveUtaId` 见 `preset-catalog.ts:545-579`）。canonical serialization/fingerprint 算法需要固定并单独版本化；当前手写 sorted-key + SHA-256 只证明配置 id 的做法，不能自动成为 capability fingerprint。
- `scope` 只表达该 capability 是否公共或账户相关：订单、余额、持仓、账户事实及其账户限定 stream 才能使用 `Account`；公共 `Candle`、`News`、`Instrument` 不凭空注入默认账户或 subaccount，使用 `Public`，或者把 provider 明确要求的选择器放进该命令自己的 schema。scope 不应把账户字段强行添加到所有 semantic units。
- descriptor 的每个 leaf 都有精确 `input/output/errors`。父 namespace 没有 leaf 时递归消除；**如果整个 command capability 缺失（例如 provider 没有 cancel），才没有对应 command leaf；如果只是参数 variant 不支持（例如某个 TIF），仅从该 command 的 input schema 中移除该 variant，仍保留支持其他 variant 的 submit leaf。**已装载但暂时断连、限流、credential expired 或 process down 时保留 identity/schema，`availability` 变成具名 unavailable；不可发现/无授权的 leaf 可以在授权视图隐藏，不能用“provider schema changed”伪装。
- `Pull` 是有限请求/响应，可带 cursor/page/incomplete evidence；`Push` 是带 start/data/correction/end/error/cancel/backpressure/replay 字段的生命周期流。两者可以复用 `Candle<Extension>`/`News` 等 semantic output，但不共享交易事务，也不自动承诺 freshness/finality/replay。
- `Read` 允许 query/cache/quota side effects，但不是 order transaction；`Stream` 管理持续资源与取消；`Controlled` 才由 transaction wrapper 关联 prepared payload、dispatch identity、ack、observation、domain error 和 OutcomeUnknown。行情 pull/push 绝不能因为用于决策就套订单 WAL；只有被选中的 evidence、消费身份与 execution decision 进入交易记录。
- controlled public handle 只能提交 intent/查看 receipt/observation，不能把 native dispatch function 交给 CLI/AI。凭证通过 opaque `CredentialRef`/窄权限 process channel 进入 adapter；descriptor、CLI manifest、AI metadata 都不能携带 secret value。若 SDK 无法拆分 read/write 权限，该 adapter 只能标注为受信执行边界并接受 conformance/audit，不能宣称插件沙箱安全。
- UTA-facing error envelope 至少需要区分 `DescriptorLoadFailure`、`InputRejected`、`DeclaredDomainError`、`DeliveryFailure`、`ProcessFailure`、`OutputSchemaViolation`、`StaleCapability`、`AvailabilityChanged`、`AuthorizationDenied` 和 `OutcomeUnknown`。远端 POST 后断进程/坏 response 不能转 `KnownRejected`。

### 4.1 Schema-first semantic units 与 HOF

接入作者的声明源应是语义 unit + provider extension + handler port，例如：

```ts
const placeOrderCapability = withControlledEffect(
  withNativeExtension(
    withProtection(
      withLimit(
        orderUnit(baseOrderSchema, baseResultSchema, baseErrorSchema),
        limitSchema,
      ),
      providerProtectionSchema,
    ),
    "ibkr",
    ibkrOrderExtensionSchema,
  ),
  dispatchPort,
  observationPort,
);
```

上面只是说明 composition algebra 的形状，不是一个 universal `ActionContractMap`。每个 HOF 必须：

1. 只添加自己拥有的 schema/semantic precondition/resource/effect metadata；
2. 从组合后的声明计算精确 input/output/error schema 和 handler type；
3. 拒绝不满足 provider 已声明的前置条件的组合（例如某一 provider 可声明 notional 只与 Market 合法；这不是跨 provider 的全局规则。某个不支持的 TIF 仅从该 command 的 input schema 移除；只有整个 capability 缺失时才不生成 command leaf）；
4. 保留既有 provider extension，不用 `Order => Order`、万能 `withX` 或覆盖字段的 cast；
5. 将等待/恢复/执行所需的 descriptor/version/parameters 持久化，而不序列化闭包。

Candle、Instrument、News 也按同样原则：基础事实字段 + provider 精确 extension schema；native identity 与 display symbol 分离；未知 multiplier/currency/finality 保持 unavailable/unknown，不能默认 1 或 `0`。公共数据能力使用 `Public` scope，不凭空添加账户或 subaccount；账户/订单事实使用 `Account` scope，具体账户选择器由该 capability 的 schema 声明。

### 4.2 Runtime discovery 与动态 TS 边界

动态外国进程的 schema 不可能在已编译 TS 中变成新的静态 union。足够精确且可实现的流程是：

1. **Handshake**：进程返回 `uta-effect` protocol version、provider/instance identity、transport features 与 credential/effect policy summary。
2. **Describe**：`discover` 返回 capability descriptors、catalog revision、schema documents、schema fingerprints；宿主先用固定 metadata schema 校验，再校验 JSON Schema vocabulary、禁止函数/未解析引用/不可导出约束。
3. **Bind**：宿主按 `(capabilityId, revision, fingerprint)` 建立 `CapabilityHandle` 与 input/output/error validator。静态 provider 可以保留静态 TS inference；动态 provider 只能在反序列化入口得到 validated runtime value，再进入命名 domain type，不能 `as` 冒充编译期 provider 类型。
4. **Invoke/stream**：请求带 capability identity、revision、fingerprint、correlation/attempt identity 和 validated input；response/frames 按声明 schema 验证。revision/fingerprint 不匹配返回 `StaleCapability`，不能悄悄调用同路径的新语义。
5. **CLI/AI**：manifest/help/command parsing 从已授权 capability tree 投影；复杂 nested union 作为 JSON 参数传递。AI 先 discover/describe，随后按该叶子的精确 schema 调用。
6. **Process lifecycle**：stream 必须有 start/data/correction/end/error/cancel；进程断开或 output violation 按 delivery/process error 处理。controlled effect 的 dispatch identity/unknown recovery 交给 durable writer，不由进程重启后盲重发。

## 5. 添加 capability 时不改 core switch / interface / command table

目标安装包只需声明一次：provider identity、capability path、schema-first semantic units、resource/effect metadata、native codecs、query/stream/controlled handler。registry 负责验证并把 descriptor 加入**实例化后的 capability catalog**；composition algebra 计算 capability tree、AI metadata、CLI describe/help 和 boundary validators。核心只处理固定 descriptor/envelope 与 effect categories，不了解 `alpaca/bracket`、`ccxt/fetchOHLCV`、`leverup/pyth` 或新 provider 名称。

现有 `CLI_EXPORTS` 手写 map（`src/server/cli-commands.ts:27-47,241-297`）是迁移前的事实，不是可保留的目标机制。shim 无需为新 capability 改动（`openalice-cli.cjs:1-7` 的边界可保留）；服务端应从 capability tree 生成 equivalent route/help/invoke catalog，且按 provider instance/authorization scope 过滤。名称冲突应在装载时拒绝，不能继续 `ToolCenter.register` 的 last-write-wins 语义。

## 6. Read / stream / controlled 与 data/trading 隔离

| effect | 最小行为 | 不应承诺/不应做 |
|---|---|---|
| `read` | 一次请求、有限/分页结果、output/error schema、freshness/completeness evidence | 不创建 order prepare/approval/lock/WAL；`getHistorical`/`getQuote` 失败不能触发交易补偿 |
| `stream` | 订阅/取消、frame schema、结束/错误、cursor/replay/backpressure/finality 元数据 | 不把每个 frame 写成交易 WAL；SIGINT 取消本次 stream 资源，不撤销已被 writer 接受的订单 |
| `controlled` | prepare/approval policy（若适用）、durable DispatchStarted、idempotency/attempt identity、ack/observation、OutcomeUnknown/reconcile | 不把 ack 当成交/取消完成；未知结果不得自动以 retry 次数决定重发；public handle 不暴露 native dispatch |

现有 `IBroker.getHistorical?`、`getQuote` 与交易方法混在同一 object（`broker.ts:524-595`），因此仅把方法名加到 capability list 不足以达到 K05/K08；效果和交付要成为 descriptor 可验证的 discriminated variants。

## 7. Credential/effect isolation limits

[支持] 现有 configs 仍在应用进程中直接接触 secrets：Alpaca `configSchema` 在 `AlpacaBroker.ts:101-124`，Longbridge 在 `LongbridgeBroker.ts:125-150`，CCXT 在 `CcxtBroker.ts:163-215`，LeverUp private key 在 `LeverupBroker.ts:80-96` 和 `types.ts:8-22`。factory 也把 validated/raw engine config 放进 generic `brokerConfig`（`factory.ts:26-40`）。

[目标] descriptor 只发布非 secret `CredentialRef`、scope、effect permission 和 process identity；credential resolution 在 adapter process/connection layer，wire request 只携带 opaque ref 或已授权 handle。类型/JSON schema 可以限制正常调用，却不能防止一个持有交易密钥的恶意/被攻陷 process 偷偷下单；安全边界必须靠 process OS permission、窄 channel、credential policy、audit/conformance。K07 的“任意插件沙箱”保证不能从 SDK interface 是否存在推导。

[未验证] 当前源码不能证明：

- 任一 vendor key 是否可拆分 read-only / trade-only / withdrawal-denied scope；
- Alpaca/CCXT/Longbridge/LeverUp/IBKR 的 client id、salt、request hash 是否提供远端去重、保留期限或 exactly-once；
- stream 是否有稳定 event identity、顺序、跨重启 replay、gap detection、backpressure；
- provider schema 是否有远端 version negotiation/compatibility guarantees；
- relayer `executed=false`、`success=false`、`txnHash` 的语义是否足以判定 rejected；
- native SDK 的 timeout/HTTP 断线是否代表“请求未发送”还是“结果未知”。

## 8. 需要用于 executable HOF specimen 的 primary API/doc questions

### 已由本地源码确认的 API

- Zod 4.3.6 是当前直接依赖（见 §2.1）；`tool()` 接收 `inputSchema`/`execute`（`src/tool/market.ts:19-43`）；服务端用 `z.toJSONSchema(..., { io: 'input', unrepresentable: 'any' })`（`src/server/cli.ts:227-233`）。样例应先证明 `z.input`/`z.output`、`z.discriminatedUnion`、`z.toJSONSchema` 对 transform/ref/unrepresentable 的 exact behavior，再决定如何把 semantic constraints 独立编码。
- 当前 local config fingerprint 使用递归 sorted keys + SHA-256（`packages/uta-protocol/src/brokers/preset-catalog.ts:545-579`），可作为“已有 canonicalization 习惯”的证据，但不是已批准 wire-schema canonicalization。
- root package `ai` 版本为 `^6.0.86`（`package.json:105-131`）；现有 tool registry 依赖 Vercel AI SDK `Tool` shape，而不是 Commander command declarations。

### 必须先取得的 library/API 证据

1. **JSON Schema validator/canonicalization**：pnpm lock 中出现 `ajv@8.18.0`，但核查的直接 manifests 未声明 AJV。需确认是否将 AJV 作为直接依赖、支持的 draft/format/$ref policy、compile error 类型及是否采用 RFC 8785/JCS 或自有 canonicalizer；不能把 transitive lock entry 当作协议依赖完成。
2. **Zod export policy**：确认 4.3.6 对 transform、coerce、defaults、metadata、recursive refs、`unrepresentable` 的行为；wire schema 必须 reject/explicitly annotate，不能靠当前 `any` fallback。
3. **AI tool output/errors**：确认 `ai@6.0.86` 的 Tool 类型是否有可声明 output schema/error metadata；若没有，UTA capability descriptor 不能直接复用 AI Tool object，应由 schema-first declaration 产生 AI adapter。
4. **CCXT 4.5.38**：需要 primary docs/source evidence for exchange `has`, `timeframes`, `fetchOHLCV`, `createOrder`, `editOrder`, `cancelOrder`, symbol-scoped order lookup, opaque ids, `params`, sandbox/demo and wallet namespaces. 当前 code 只证明本地 mapping/fallback，不证明每个 exchange 的 remote guarantees。
5. **Alpaca SDK 3.1.3**：需要 order/replace/cancel/close, client-order-id lookup, bracket/OTO leg lifecycle, status/fill semantics and SIP/IEX feed entitlements 的 primary API evidence。当前 adapter mapping 与 local package version 不能证明 idempotency、retention、atomicity 或 finality。
6. **IBKR custom package/TWS API**：需要 EClient/EWrapper server-version feature and callback completion/finality docs。当前 `packages/ibkr/src/client/orders.ts` 证明 fields are version-gated and `decoder/historical.ts` 证明 historical end callback，但不证明 remote acceptance/fill/cancel semantics。
7. **Longbridge SDK 4.0.5**：需要 order enum/TIF/session/replace/cancel, quote/staticInfo/optionQuote/warrantQuote, websocket lifecycle and response schema docs；目前多处 `unknown as` 是 local adapter boundary，不能变成 public contract。
8. **LeverUp gateway**：需要 relayer/reader/Pyth OpenAPI/contract source for request schema, salt/idempotency, inputHash status, pagination completeness, `executed/success` meaning, transaction finality and chain block/as-of. `RelayerClient` 当前只 cast JSON (`relayer-client.ts:65-72`)；`ReaderClient` 只 cast paginated JSON (`reader-client.ts:81-90`)。
9. **Foreign-process transport**：当前 repo 没有 provider process describe/invoke/stream protocol。需要先定 framing/auth/correlation/cancel/crash/receipt semantics（stdio, Unix socket, HTTP, or another transport）及 conformance fixtures；不能用 “SDK method exists” 代替这些 guarantees。

## 9. 当前支持、缺失、未验证清单

| 项目 | 状态 | 证据/后果 |
|---|---|---|
| Provider 可在不改主内核业务 switch 的情况下提供 native implementation | **部分支持** | optional pack dynamic import/engine entry 在 `registry.ts:58-123`；但仍必须返回 closed `IBroker`，且 CLI 要改 `CLI_EXPORTS`。目标需 descriptor catalog + dynamic CLI projection。 |
| Provider 可声明自己的 input schema | **支持（局部）** | preset/AI tools 使用 Zod（`preset-catalog.ts:67-91`, `src/tool/*.ts`）；未包含 output/error/effect metadata。 |
| 每个 command 的精确 input/output/error schema | **缺失** | CLI manifest 只输出 input JSON schema（`cli.ts:217-241`），MCP result 是 generic content（`mcp-export.ts:17-24,38-62`）。 |
| Unsupported namespace/command absent | **缺失** | `IBroker` mandatory methods + LeverUp false stubs (`LeverupBroker.ts:319-325`)；CCXT unsupported open orders→`[]` (`CcxtBroker.ts:1171-1204`)。 |
| Transient availability separate from capability absence | **部分支持** | `BrokerHealth/UTAReach` 区分 connection reach (`broker.ts:368-413`)，但 command-level descriptor/availability 和 empty-result distinction 缺失。 |
| Native order/instrument/bar richness preserved | **部分支持** | native classes/adapter fields存在；legacy projections 会丢/默认（CCXT `parseInt`、Longbridge/LeverUp fallbacks）。 |
| Foreign process arbitrary language/SDK/gateway | **未实现/未验证** | 当前 registry 是 in-process dynamic import；LeverUp/Longbridge/Alpaca/CCXT 是 same-process SDK/fetch clients。 |
| Durable controlled-effect uncertainty | **目标需接入** | prior investigations and K08 transaction contract require it；当前 `PlaceOrderResult` success bag/relayer poll 不能证明 dispatch/finality。 |
| CLI outer interpreter | **局部支持** | CJS shim 无业务逻辑并由 manifest 驱动（`openalice-cli.cjs:1-22,63-150`）；server command mapping 仍手写。 |

## 10. 给 Main 的集成要点

- 在总设计中把 `IBroker`、`AccountCapabilities`、`BrokerEngine`、AI `Tool`、CLI `CliExport` 明确标为**现有 legacy seams**；不要把它们当作 K01–K12 的最终 contract。
- 保留现有 provider-specific evidence 与 prior MAP：至少 `MAP-25118F5AFA`, `MAP-255335BC1C`, `MAP-7056B295D1`, `MAP-093F5766C9`, `MAP-00030A134A`, `MAP-03894C09ED`, `MAP-00DA721165`, `MAP-724573CD02`, `MAP-0A1AF127FE`, `MAP-21C40C002D`, `MAP-06A331A1E5`, `MAP-8E4DBDDD86`, `MAP-04032EFDC4`, `MAP-4996C21AA2`, `MAP-25EDC2AA39`。
- 目标 specimen 应展示一个 provider 添加字段后，静态 schema/validator、runtime descriptor、AI metadata、CLI describe 与 invocation validation 同时改变；另展示一个 capability 缺失时没有命令叶子，而 disconnected instance 仍有 descriptor + availability。
- Foreign process specimen 应至少模拟：describe fingerprint、input/output/error decode、stream cancellation、schema mismatch、POST 后进程断开→OutcomeUnknown；不能以 mock `PlaceOrderResult.success` 代替这些 runtime checks。
- 本调查未运行 build/typecheck/test/formatter，按任务要求跳过。
