# UTA foreign-provider bridge contract

规范状态：目标设计。本文件固定 UTA 与 foreign bridge 之间的 descriptor、调用、错误和 stream wire 边界。

bridge 内部可以使用任意语言、REST、OpenAPI client、native SDK、gateway 或进程内 adapter；不得要求内部实现采用 UTA 的类型、FP 风格或 universal broker interface。同进程 provider 可直接使用 schema-first declaration 与 handler；跨进程时，该 declaration 投影为本文件的 wire contract。

UTA/Alice transport authentication is defined in [the main design §4.3](../uta-effect-runtime-detailed-design.md#43-alice-身份与错误) and uses the fixed service-credential and `X-Request-ID` profile. This bridge contract only defines host-injected provider credential policy; provider secrets never enter descriptor, request, or response frames.

文中 **MUST / MUST NOT / SHOULD / MAY** 按 RFC 2119 使用。

## 1. 固定边界与运行配置

- Transport 固定为 **stdio NDJSON v1**：stdin/stdout 是一条 JSON object 一行的协议流；每行一个完整 UTF-8 JSON object，不允许多行 JSON、二进制帧或 stdout 日志。
- bridge 的诊断、SDK 日志和堆栈 MUST 写 stderr；stdout 只能写协议帧。宿主遇到非 JSON stdout 行 MUST 视为 `PROTOCOL_VIOLATION`。
- 宿主 UTA 负责启动、停止、凭证注入、writer 记录和 capability catalog。bridge 不负责决定宿主是否允许某次交易。
- 启动时宿主可请求以下边界上限；bridge 在 `ready` 中返回实际采用的值，不能静默放宽：

```json
{
  "maxFrameBytes": 1048576,
  "maxInFlightRequests": 32,
  "maxBufferedStreamFrames": 256,
  "maxStreamCredit": 256,
  "idleTimeoutMs": 30000
}
```

这些是 v1 的默认 profile，不是对 native provider 吞吐或延迟的保证。超过上限 MUST 返回结构化错误或终止该 stream，不能截断 payload、静默丢 frame 或把资源无限缓存。

- `protocol.name` 和 `protocol.version` 必须精确匹配 `uta-effect-ndjson` / `1`。不支持的版本 MUST 返回 `UNSUPPORTED_PROTOCOL` 并关闭；不得自动降级到另一版本、把 v1 当作兼容的实验版本，或忽略版本字段。
- JSON Schema 固定为 Draft 2020-12。descriptor 中的 `$ref` 只能指向同一 document 的 `$defs` 或本次 descriptor 内可解析的本地 URI；宿主和 bridge MUST NOT 通过网络取 schema。
- 数量、价格、金额、余额、时间相关的精确 Decimal 值在 wire 上使用十进制字符串；不得在 bridge contract 中用 IEEE-754 number 代替。

## 2. Handshake 与 discovery

宿主首先发送一个 `hello`，bridge 只返回一个 `ready` 或 `fatal`。两者都带 `requestId`，但握手失败时不得进入 invoke。

```json
{"type":"hello","requestId":"h-01","protocol":{"name":"uta-effect-ndjson","version":"1"},"host":{"id":"uta-local","version":"1.0.0"},"requestedLimits":{"maxFrameBytes":1048576,"maxInFlightRequests":32},"requestedFeatures":["discover","stream","cancel","credit"]}
```

```json
{
  "type":"ready","requestId":"h-01","protocol":{"name":"uta-effect-ndjson","version":"1"},"sessionId":"bridge-session-01","bridge":{"id":"fixture-market.bridge","version":"1.0.0"},
  "limits":{"maxFrameBytes":1048576,"maxInFlightRequests":32,"maxBufferedStreamFrames":256,"maxStreamCredit":256,"idleTimeoutMs":30000},
  "features":{"discover":true,"stream":true,"cancel":true,"credit":true},"credentialPolicy":{"mode":"host-injected","secretValuesInFrames":false}
}
```

`credentialPolicy` 只说明边界策略，不携带 key、token、private key、cookie 或环境变量值。凭证由现有 UTA config/secret owner 通过受控环境、文件描述符或等价窄通道注入；descriptor、请求记录和错误记录都不得保存 secret。

宿主在 `ready` 后发送 discovery：

```json
{"type":"discover","requestId":"d-01","knownCatalogRevision":null}
```

bridge 返回一个 catalog revision 和完整 descriptor 快照；本文件的完整 local fixture response 见 §7。

`catalogRevision` 在 capability leaf、schema、semantic declaration、effect、resource、permission 或 stream policy 改变时必须改变。授权不可见的 capability 不出现在数组中；能力存在但暂时断连、限流或 credential expired 时保留 descriptor，并将 `availability.status` 设为 `temporarily_unavailable`，同时填写结构化 `reason`、`observedAt`，必要时填写 `retryAfterMs`。能力不存在与暂时不可用不得用空数组、`Unsupported` stub 或相同错误文本混淆。

## 3. Descriptor 与 schema-first declaration

以下字段是 UTA-facing 固定元数据；provider 只能通过 schema-first semantic-unit/HOF declaration 生成它们，不能维护另一份手写 command inventory。`description`、显示标题等 UI wording 可以存在，但不参与 fingerprint。

```text
CapabilityDescriptor = {
  capability: {
    providerId: string,
    instanceId: string,
    capabilityId: string,
    revision: string
  },
  command: { path: string[], description?: string },
  scope: "public" | "account",
  effect: "read" | "resource" | "controlled",
  delivery: "pull" | "push",
  schemas: {
    dialect: "https://json-schema.org/draft/2020-12/schema",
    validationProfile: "draft-2020-12-assertion+rfc3339-date-time-v1",
    version: string,
    input: JsonSchemaDocument,
    output: JsonSchemaDocument,
    errors: JsonSchemaDocument,
    streamControl?: JsonSchemaDocument
  },
  semantics: {
    declarationRevision: string,
    unitIds: string[],
    constraints: { id: string, version: string, validation: "json-schema" | "profile" | "adapter" }[]
  },
  resources: { id: string, kind: string, scope: string }[],
  permissions: { id: string, action: string }[],
  source: { adapterId: string, adapterVersion: string, nativeProtocol?: string },
  streamPolicy?: {
    credit: boolean,
    gap: boolean,
    replay: "none" | "provider-declared",
    sourceEventIdentity: "required" | "optional",
    sourceCursor: "required" | "optional"
  },
  schemaFingerprint: string,
  availability: {
    status: "available" | "temporarily_unavailable",
    reason: null | "provider_disconnected" | "rate_limited" | "credential_expired" | "process_down",
    observedAt: string,
    retryAfterMs?: integer
  }
}
```

`JsonSchemaDocument` MUST 自洽、可本地编译，并包含执行所需的 `$defs`。不能导出的 transform、函数、外部 `$ref`、未声明的 coercion 或 provider 内部 opaque object MUST 使 descriptor 被拒绝，不能降级成 `{}`、`any` 或“无 flags”。输出和 declared domain error 必须使用各自 exact schema 验证。
`validationProfile` 是执行契约的一部分：v1 使用 Draft 2020-12 validation vocabulary，并对 `format: "date-time"` 执行 RFC 3339 date-time assertion。不能执行该 profile 的 bridge MUST 拒绝 descriptor；`semantics.constraints[].validation` 指明约束由 JSON Schema、profile 或 adapter 哪一边负责。

- `scope: "account"` 只用于订单、余额、持仓、账户事实及账户限定 stream。公共 Candle、News、Instrument 使用 `public`，不得凭空添加 account 或 subaccount；若 provider 确实要求选择器，将其放在该 command 自己的 input schema。
- capability 缺失时不生成 command leaf。仅某个参数 variant 不支持时，只从该 leaf 的 input schema 移除该 variant；例如某个 provider 不支持某个 TIF，不等于整个 submit leaf 消失。
- 合法 effect/delivery wrapper 只有：`read + pull`（有限查询）、`read + push`（无持久资源语义的数据 feed）、`resource + push`（有 start/data/gap/end/cancel lifecycle 的持续资源）和 `controlled + pull`（dispatch/receipt）。`resource + pull` 在 v1 不建模：需要状态快照时使用 `read + pull`；需要持久 subscription lifecycle 时使用 `resource + push`。controlled 的异步 observation 通过另一个 `resource + push` leaf 关联 dispatch identity，不定义 `controlled + push`。其它组合拒绝；push 是 delivery，不是第三种业务 effect。
- `delivery: "push"` requires `schemas.streamControl` and `streamPolicy`; `delivery: "pull"` MUST omit both. This keeps the fixed metadata shape while making the legal effect/delivery combinations explicit.
- read/resource data pull/push 不是 trading transaction；controlled 才需要 writer dispatch identity、授权 handle、ack/observation 和 unknown-outcome recovery。
- native order、instrument、candle、news 字段通过 provider extension schema 保留。公共 semantic unit 只规定可互操作事实，不把 provider-specific order Cartesian product 变成 core union。

动态 foreign descriptor 在已编译 TypeScript 中不能变成新的静态 union。宿主只能在反序列化边界以 runtime JSON Schema 验证 `unknown`，再构造命名 domain value；不得用 `as` 假装编译期 provider 类型。静态 in-process declaration 可以保留 `z.input`/`z.output` inference，但这不改变 foreign wire 的 runtime-only 边界。

## 4. Fingerprint 与 stale capability

fingerprint 算法固定为版本化 **RFC 8785 JCS + SHA-256**：

```text
schemaFingerprint = "jcs-sha256-v1:" + hex(SHA256(JCS(executionProjection)))
```

`executionProjection` 的字段顺序由 JCS 处理，内容固定为：capability identity/revision、command path、scope、effect、delivery、完整 `schemas`（包括 `$defs`、`$ref`、validationProfile 和所有 schema keywords）、`semantics`、resources、permissions、source adapter identity/version 和 `streamPolicy`。只排除外层 command 的 description/title、外层 UI wording、current availability、日志、secret、process id 和连接瞬时状态；schema 内的 annotation 也随完整 schema 文档参与 fingerprint，避免未定义的递归清洗改变执行声明。改变任一执行相关声明都必须改变 fingerprint。

每次 call/subscribe 都携带 discovery 时获得的 `capabilityId`、`revision` 和 `schemaFingerprint`。bridge 若发现 revision 或 fingerprint 不匹配，必须返回：

```json
{
  "type": "error",
  "requestId": "r-stale",
  "code": "STALE_CAPABILITY",
  "phase": "bind",
  "retryable": true,
  "payload": {
    "reason": "fingerprint",
    "current": { "catalogRevision": "catalog-r1", "capabilityRevision": "r1", "schemaFingerprint": "jcs-sha256-v1:429a167cfb117559a2499f9ac2377d13f8711edbb6e2f3cc86b9d17e98dcc5c4" }
  }
}
```

宿主必须重新 discover、重新验证 descriptor 后才可再次调用；不得按相同 command path 悄悄调用新语义。

## 5. Request/response 与 controlled effects

`call` 的固定字段是 `type: "call"`、`requestId`、`capability: { capabilityId, revision, schemaFingerprint }` 和经 input schema 验证的 `input`；有限 read 或 controlled 使用此 envelope。成功响应固定为 `type: "result"`、同一 `requestId` 和经 output schema 验证的 `output`。resource/push 的具体 `subscribe` envelope 和 data/control frames 见 §6，并使用 §7 的完整 fixture descriptor。

controlled/mutating call 还 MUST 携带 UTA writer 已生成的 `writer: { dispatchId, authorizationHandle }`。`authorizationHandle` 是 opaque handle，不是 secret；bridge MUST NOT 从 `requestId`、订单事件、symbol、client id 或任意可猜值推导授权，也不得替 writer 生成 dispatch identity。bridge 可以验证 handle 的格式/签名并向 provider 执行，但是否允许 dispatch 由 UTA writer/policy owner 决定。

错误 wrapper 固定使用 `type: "error"`、`requestId`、`code`、`phase`、`retryable` 和可选的 schema-validated `payload`。`phase` 取 `handshake | discover | bind | input | invoke | output | stream | process`；所有 error/fatal/stream-error 变体都必须带 `phase` 与 `retryable`。至少支持 `INPUT_REJECTED`、`DECLARED_DOMAIN_ERROR`、`DELIVERY_FAILURE`、`PROCESS_FAILURE`、`OUTPUT_SCHEMA_VIOLATION`、`STALE_CAPABILITY`、`AVAILABILITY_CHANGED`、`AUTHORIZATION_DENIED`、`OUTCOME_UNKNOWN`、`PROTOCOL_VIOLATION` 和 `UNSUPPORTED_PROTOCOL`。`DECLARED_DOMAIN_ERROR.payload` 必须符合 descriptor 的 errors schema；其它 code 使用固定错误元数据，不能将任意 native exception 当成 declared domain error。
`stream-error` 是上述 wrapper 的固定 local variant：只额外允许 `streamId`，并仍必须携带同一 `requestId`、`phase: "stream"`、`retryable`；`fatal` 只在 handshake/discovery/process 级别使用同一 phase/retryable 规则并终止 session。

bridge 返回坏 output、坏 error payload、非法 frame 或不符合 schema 的 success 时，宿主必须拒绝该结果。正常 controlled request 在 bridge 可能已发送 native effect 后遇到 EOF、进程崩溃、超时或无法验证 response，必须记录 `OUTCOME_UNKNOWN`（带原 dispatchId），绝不能伪造 `KnownRejected` 或按 retry 次数盲目重发。若 controlled `result` 已通过 output schema 并确认 ack，之后独立 observation `resource + push` 断流不得抹掉该 ack、把已知 dispatch 改写为 `OUTCOME_UNKNOWN`；只记录 observation delivery failure。
EOF/崩溃只在尚未获得可验证 controlled response 时触发上述 unknown 规则；它不能回溯覆盖已持久化的 writer receipt。


## 6. Push stream、credit、cancel 与 EOF

`read + push` 与 `resource + push` 共用 `subscribe`、credit、start/data/gap/end/error/cancelled frame 和取消语义；两者都必须按 descriptor schema 验证。`read + push` 是不承诺持久资源 identity 的数据 feed；`resource + push` 可由 UTA-owned `HostSubscription` 持有 durable binding，但 bridge 的 session/streamId 始终是 transient。HostSubscription 将 durable binding、capability/input/replay boundary 映射到本次 bridge stream 和 observer set；通用 `subscribe` wire 不携带 TriggerBinding 或 generic owner identity。完整 fixture 的可发送示例：

```json
{
  "type": "subscribe",
  "requestId": "s-01",
  "capability": { "capabilityId": "market.candle", "revision": "r1", "schemaFingerprint": "jcs-sha256-v1:429a167cfb117559a2499f9ac2377d13f8711edbb6e2f3cc86b9d17e98dcc5c4" },
  "input": { "symbol": "AAPL", "interval": "1m", "limit": 1 },
  "credit": 64
}
```

bridge 只能在 credit 内发送 data frame；宿主用 `credit` frame 增加额度。达到 `maxBufferedStreamFrames` 后 bridge MUST 停止读取/发送、返回 backpressure error 或发出明确 `gap` frame，不能静默丢数据。`gap` 的 `fromDeliveryOrdinal`/`toDeliveryOrdinal` 是本次 session 的 delivery ordinal，**不是 provider cursor、provider event order 或 replay proof**；source cursor/event identity 必须留在 payload/control 的 `sourceCursor`/`sourceEventId` 中。若 descriptor 不声明 gap 可恢复，宿主不得把后续 frame 当连续无缺口事实。

正常 stream 生命周期发送 `start`、零个或多个 `data`/`gap`，以及**恰好一个** terminal `end`、`error` 或 `cancelled`：
frame validation is two-stage and fixed: the outer `type`/correlation envelope rejects unknown keys; for `start`/`gap`/`end`/`cancelled`, the bridge and host pass the frame after removing only outer `type` and `requestId` to `schemas.streamControl`, whose `additionalProperties: false` then rejects any other undeclared field. For `data`, the outer frame validates `type`, `event`, `requestId`, `streamId`, `deliveryOrdinal`, and `payload`; only `payload` is validated by `schemas.output`. `streamControl` therefore does not silently ignore `type`/correlation fields, and the examples below are valid under the stated projection.

```json
{ "type": "stream", "event": "start", "requestId": "s-01", "streamId": "stream-01", "sessionId": "bridge-session-01", "sourceReplay": "live" }
{ "type": "stream", "event": "data", "requestId": "s-01", "streamId": "stream-01", "deliveryOrdinal": 1, "payload": { "sourceEventId": "fixture-event-01", "sourceReplay": "live", "symbol": "AAPL", "interval": "1m", "observedAt": "2026-01-01T00:00:00Z", "open": "187.000000", "high": "187.100000", "low": "186.900000", "close": "187.010000", "volume": "100.000000" } }
{ "type": "stream", "event": "gap", "requestId": "s-01", "streamId": "stream-01", "fromDeliveryOrdinal": 2, "toDeliveryOrdinal": 3, "reason": "backpressure", "sourceCursor": "fixture-cursor-03" }
{ "type": "stream", "event": "end", "requestId": "s-01", "streamId": "stream-01", "reason": "completed" }
```

stream error 是同一 correlation 的 terminal error，并使用 §5 的 `phase`/`retryable` envelope：

```json
{ "type": "error", "requestId": "s-01", "streamId": "stream-01", "code": "PROCESS_FAILURE", "phase": "stream", "retryable": true }
```

宿主使用独立 frame 增加 credit 或请求取消；两者也带 request correlation：

```json
{ "type": "credit", "requestId": "c-01", "streamId": "stream-01", "credit": 64 }
{ "type": "cancel", "requestId": "c-02", "streamId": "stream-01" }
```

宿主取消时发送 `cancel`，bridge 必须尽力停止 native subscription，并以 `cancelled` terminal 收口；竞态下只允许一个 terminal。正常 bridge path 不得省略 terminal。**Abrupt EOF/crash 可能来不及发送 terminal；宿主必须把缺失 terminal 视为 process/delivery failure，并对可能已发送的 controlled effect 记录 `OUTCOME_UNKNOWN`，而不是声称 bridge 发出了 end/error。**CLI detach 只移除 observer；Host 仅在该 logical owner 结束或不再需要资源时发送 cancel，不取消仍被其他 observer 使用的 HostSubscription 或已被 writer 接受的 controlled dispatch。Host restart 使用 leaf 声明的 replay input 重新订阅，并验证 gap、replay status 和允许的 future boundary；不得隐式 native reattach、宣称 exact replay 或凭相同 symbol 自动重连。

## 7. Concrete fixture and compatibility boundary

`fixture-market/local-fixture` is a local illustrative provider. The following is one complete descriptor, including exact input/output/domain-error/stream-control schemas. Its output is deliberately a provider-native candle frame (`ProviderCandleFrame`), not the shared `Candle` semantic unit; it therefore does not claim shared temporal projection, finality, revision, or volume-measure semantics. Its fingerprint was computed from the execution projection defined in §4; availability and command description are not in that projection.

```json
{
  "type":"discoverResult","requestId":"d-01","catalogRevision":"catalog-r1",
  "descriptors":[{
    "capability":{"providerId":"fixture-market","instanceId":"local-fixture","capabilityId":"market.candle","revision":"r1"},
    "command":{"path":["market","candle"],"description":"Fixture candle stream; illustrative provider"},"scope":"public","effect":"resource","delivery":"push",
    "schemas":{
      "dialect":"https://json-schema.org/draft/2020-12/schema","validationProfile":"draft-2020-12-assertion+rfc3339-date-time-v1","version":"fixture-market-candle-v1",
      "input":{"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"urn:uta:fixture-market:market-candle:input:v1","type":"object","additionalProperties":false,"required":["symbol","interval"],"properties":{"symbol":{"type":"string","pattern":"^[A-Z][A-Z0-9.]{0,9}$"},"interval":{"enum":["1m","5m"]},"from":{"type":"string","format":"date-time"},"limit":{"type":"integer","minimum":1,"maximum":100}}},
      "output":{"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"urn:uta:fixture-market:market-candle:output:v1","type":"object","additionalProperties":false,"required":["sourceEventId","symbol","interval","observedAt","open","high","low","close","volume"],"properties":{"sourceEventId":{"type":"string","minLength":1},"sourceCursor":{"type":"string","minLength":1},"sourceReplay":{"enum":["live","replay","unknown"]},"symbol":{"type":"string","pattern":"^[A-Z][A-Z0-9.]{0,9}$"},"interval":{"enum":["1m","5m"]},"observedAt":{"type":"string","format":"date-time"},"open":{"type":"string","pattern":"^-?[0-9]+(\\.[0-9]+)?$"},"high":{"type":"string","pattern":"^-?[0-9]+(\\.[0-9]+)?$"},"low":{"type":"string","pattern":"^-?[0-9]+(\\.[0-9]+)?$"},"close":{"type":"string","pattern":"^-?[0-9]+(\\.[0-9]+)?$"},"volume":{"type":"string","pattern":"^-?[0-9]+(\\.[0-9]+)?$"}}},
      "errors":{"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"urn:uta:fixture-market:market-candle:errors:v1","oneOf":[{"$ref":"#/$defs/invalidInput"},{"$ref":"#/$defs/providerUnavailable"},{"$ref":"#/$defs/rateLimited"}],"$defs":{"invalidInput":{"type":"object","additionalProperties":false,"required":["code","message","field"],"properties":{"code":{"const":"invalid_input"},"message":{"type":"string"},"field":{"type":"string"}}},"providerUnavailable":{"type":"object","additionalProperties":false,"required":["code","message","retryAfterMs"],"properties":{"code":{"const":"provider_unavailable"},"message":{"type":"string"},"retryAfterMs":{"type":"integer","minimum":0}}},"rateLimited":{"type":"object","additionalProperties":false,"required":["code","message","retryAfterMs"],"properties":{"code":{"const":"rate_limited"},"message":{"type":"string"},"retryAfterMs":{"type":"integer","minimum":0}}}}},
      "streamControl":{"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"urn:uta:fixture-market:market-candle:stream-control:v1","oneOf":[{"$ref":"#/$defs/start"},{"$ref":"#/$defs/gap"},{"$ref":"#/$defs/end"},{"$ref":"#/$defs/cancelled"}],"$defs":{"start":{"type":"object","additionalProperties":false,"required":["event","streamId","sessionId","sourceReplay"],"properties":{"event":{"const":"start"},"streamId":{"type":"string","minLength":1},"sessionId":{"type":"string","minLength":1},"sourceReplay":{"enum":["live","replay","unknown"]}}},"gap":{"type":"object","additionalProperties":false,"required":["event","streamId","fromDeliveryOrdinal","toDeliveryOrdinal","reason"],"properties":{"event":{"const":"gap"},"streamId":{"type":"string","minLength":1},"fromDeliveryOrdinal":{"type":"integer","minimum":1},"toDeliveryOrdinal":{"type":"integer","minimum":1},"reason":{"enum":["backpressure","provider_gap","unknown"]},"sourceCursor":{"type":"string","minLength":1}}},"end":{"type":"object","additionalProperties":false,"required":["event","streamId","reason"],"properties":{"event":{"const":"end"},"streamId":{"type":"string","minLength":1},"reason":{"enum":["completed","provider_closed","eof"]}}},"cancelled":{"type":"object","additionalProperties":false,"required":["event","streamId","reason"],"properties":{"event":{"const":"cancelled"},"streamId":{"type":"string","minLength":1},"reason":{"enum":["requested","provider_closed","eof"]}}}}}
    },
    "semantics":{"declarationRevision":"fixture-market-candle-v1","unitIds":["ProviderCandleFrame","PublicMarketData"],"constraints":[{"id":"decimal-string-v1","version":"1","validation":"json-schema"},{"id":"rfc3339-date-time-v1","version":"1","validation":"profile"}]},
    "resources":[{"id":"market-data-stream","kind":"subscription","scope":"session"}],
    "permissions":[{"id":"market.read","action":"read"}],
    "source":{"adapterId":"fixture-market.bridge","adapterVersion":"1.0.0","nativeProtocol":"fixture-json-v1"},
    "streamPolicy":{"credit":true,"gap":true,"replay":"provider-declared","sourceEventIdentity":"required","sourceCursor":"optional"},
    "schemaFingerprint":"jcs-sha256-v1:429a167cfb117559a2499f9ac2377d13f8711edbb6e2f3cc86b9d17e98dcc5c4",
    "availability":{"status":"available","reason":null,"observedAt":"2026-01-01T00:00:00Z"}
  }]
}
```

The digest above is concrete for this exact fixture projection; a production provider MUST compute its own digest and MUST NOT reuse this identity. The following is a deliberately **non-compatible experiment**, not a v1 implementation:

```json
{ "type": "hello", "requestId": "experiment-0", "protocol": { "name": "uta-effect-ndjson", "version": "0-experiment" } }
{ "type": "fatal", "requestId": "experiment-0", "code": "UNSUPPORTED_PROTOCOL", "phase": "handshake", "retryable": false }
```

No descriptor example proves a provider's remote exactly-once, finality, replay, or malicious-process isolation. Those require separate conformance and live evidence; the bridge contract only defines the boundary and its validation behavior.
