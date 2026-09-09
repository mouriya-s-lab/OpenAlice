# UTA 数据契约：Candle、Instrument、News、NewsGroup

状态：目标设计。本文是 UTA 数据能力的规范性参考，供 capability 声明、schema 组合、数据交付和 AI/CLI 投影共同使用。

本文固定四个语义单位、共享 metadata、provider extension、pull/push 生命周期以及 closed-bar 数据准入。数据读取和订阅不是交易事务；只有被交易决定选中的 evidence 才进入交易关联记录。

源码调查表、native provider 证据和 investigation ID 保留在[数据调查](solutions/data-investigation.md)、[provider 调查](solutions/provider-investigation.md)及[solutions index](solutions/index.md)。那些文档是证据索引，不改变本文件的语义契约。

## 1. 范围、所有权与组合边界

| 边界 | 所有权 |
|---|---|
| Alice | `BarService`、reference board、RSS store、News archive、AI tool 和 CLI projection；这些是数据 owner 或展示投影，不是 UTA 交易 writer。 |
| UTA adapter | provider 进程、native decode、capability/availability 声明和 schema-bound handle；adapter 在进入语义边界前必须完成精确 schema 验证。 |
| 共享协议 | semantic-unit schema、descriptor/envelope、pull page 和 push control 的固定边界。 |

provider 可以使用自己的语言、REST、SDK、gateway 或进程内实现。能力按 leaf 声明；provider 没有某个 leaf 时不发布它，不为满足闭合接口创建 `Unsupported` 空方法。provider 的 native richness 只能通过该 leaf 的精确 extension object 保留。

数据 capability 可以消耗连接、配额、缓存、订阅费和归档存储，但不得创建 order prepare、approval、dispatch、compensation 或逐帧交易 WAL。订单决定使用数据时，单独保存所选 observation identity、consumer、decision、capability binding 和必要的 derivation evidence。

## 2. 共享 metadata 与来源证据

每个语义 item 都带有下列固定 metadata。字段的可空、可省略和 `unknown` 都是 schema variant，不是开放对象。

| 字段 | 精确类型/variant | 约束 |
|---|---|---|
| `source` | `PublicSource \| AccountSource` | `PublicSource` 至少包含 `providerId`、`providerInstance` 和 provider 声明的公共 namespace；`AccountSource` 另外包含显式 `AccountScope`。 |
| `capability` | `{ capabilityId, discoveryRevision, schemaVersion, schemaFingerprint }` | item 必须由该已发现 leaf 及其 schema binding 产生。 |
| `observedAt` | `Instant` | provider 或 adapter 观察时间；缺少 provider 时间时不得伪造 native time。 |
| `emittedAt` | `Instant` | adapter 向 UTA 语义边界发出 item 的时间。 |
| `sourceSequence` | `SourceSequence \| null` | provider 的 epoch/namespace/opaque offset；没有 native sequence 时为 `null`。 |
| `asOf` | `{ requested, effective, freshness }` | `freshness` 为 `fresh \| stale \| unknown`；effective 边界不能由本地数组 index 猜造。 |
| `evidence` | `provider \| local-observation \| trigger-derivation \| unavailable` | 保留实际可取得的来源证据；普通展示不强制生成 executable derivation proof。 |

`evidence` 的固定字段如下：

| variant | 必填内容 | 用途 |
|---|---|---|
| `provider` | provider/native identity、provider observed time、可取得的 source sequence/revision | native event 或 adapter 保留的 provider evidence。 |
| `local-observation` | operation label/version、`sourceEvidence`（可为 `unknown`） | 展示、规范化和归档投影；不把本地操作冒充 provider event。 |
| `trigger-derivation` | transform identity/version、参数摘要、implementation fingerprint、input evidence identities | 可能被 durable trigger/order decision 选中的 executable local derivation。 |
| `unavailable` | `reason` | 来源证据无法取得或不能证明。 |

来源身份规则：

- `InstrumentId` 是 provider/venue native identity（namespace + native key），不把账户写入 identity。`InstrumentRef` 用 `public` 或 `account` variant 绑定 source。
- symbol、search normalization、asset-class heuristic 或本地数组 ordinal 不能构造 native identity、source sequence、cursor 或 revision。
- 公共 Candle、Instrument、News、NewsGroup 使用 `PublicSource`；只有确实需要账户目录、账户行情或订单事实的 leaf 才使用 `AccountSource(AccountScope)`。不得创建 `default` account、subaccount 或虚构授权。

## 3. Schema-first 组合与 extension

schema 是声明源；接入端从 schema 推导静态类型（同进程时）、runtime validator、capability descriptor 和 CLI/AI metadata。本文不另造一套平行的 provider interface。

每个 leaf 直接声明一个精确 extension object：

- extension 的属性名、版本、namespace fingerprint 和 value schema 同属该 leaf declaration；value 可以包含多个精确命名的 provider subobject，但不得是开放 map、`Record<string, unknown>` 或 open index signature。
- `unknown` 只存在于 foreign response/decode 入口。通过 output validator 后进入语义单位的值必须是声明的精确 schema；extension 解码失败是 output/extension schema violation，不是原文透传。
- extension fingerprint 必须与当前 capability binding 中同 namespace/version 的 declaration 匹配，不要求等于 enclosing capability fingerprint。交换 namespace/value、使用未绑定 revision 都是 output-schema violation。
- schema fingerprint 覆盖实际 payload schema、语义约束和 extension revision，不只覆盖帮助文字。

接入实现可以使用现有组合词汇：`addFields(base, extension)` 在 declaration 时拒绝字段冲突；`withCandleExtension(extension)` 把一个精确 provider object 组合到 Candle base；`definePull({ capabilityId, path, description, schemaVersion, inputSchema, outputSchema, errorSchema, effect, semanticConstraints, requirements, source, availability, handler })` 声明有限 leaf。`definePush` 使用同一 declaration 元数据，并由目标 descriptor 携带该 leaf 的精确 `streamControl`/frame schema；同进程 specimen 的固定 control schema 只用于其本地 conformance runtime。

`solutions/domain-contracts.ts` 是组合/conformance specimen，不是本文件的 canonical wire schema。该 specimen 中的 number OHLC、numeric epoch 和简化 descriptor 只展示组合器行为；规范性的 Candle 使用本文件的 `DecimalString`、`Instant`、metadata 和 variant。provider wire fixture 的 `ProviderCandleFrame` 同样是 provider-native output，不等于共享 `Candle`。

## 4. 语义单位

### 4.1 Candle

下表是共享 Candle 的字段；`barSpec`、price stream 和 provider extension 属于 leaf-local schema，不建立覆盖所有 provider 的全局 interval enum。

| 字段 | 精确 schema/variant | 约束 |
|---|---|---|
| `unit` | literal `"candle"` | 语义单位 discriminator。 |
| `instrument` | `InstrumentRef` | source 必须与 metadata.source 一致。 |
| `temporalProjection` | `exact \| unknown \| unsupported` | `exact` 带经过验证的 start/end/alignment；`unknown` 带 reason；`unsupported` 保留 native spec/evidence reference，不能硬套固定 duration。 |
| `open/high/low/close` | 有限 `DecimalString` | wire 和语义边界都使用十进制字符串；值必须有限且满足 `low ≤ min(open, close) ≤ max(open, close) ≤ high`；拒绝 NaN、Infinity、越界 OHLC 和静默数值转换。 |
| `volume` | `present { amount: DecimalString, measure } \| unavailable \| unknown` | `measure` 至少声明 basis、unit 和必要 evidence；unknown/unavailable 不能变成零。 |
| `finality` | `open \| closed \| unknown` | `closed` 必须带 closed time 和可核验 proof；收到 push item 不代表收盘。 |
| `revision` | `original \| correction \| retraction` | correction/retraction 必须指向 superseded evidence/revision。 |
| `metadata` | 第 2 节固定 schema | source sequence、as-of 和 freshness 只按实际证据填写。 |
| `extensions` | leaf 精确声明的 object，或不存在 | WAP、barCount、feed、session、adjustment、entitlement 等保留在 provider extension，不变成全局 optional fields。 |

`volume.measure` 的数值只有在 basis/unit/evidence fingerprint 相容时才能比较或聚合。`temporalProjection=exact` 才能参与需要明确时间边界的分页、coverage 或 closed-bar predicate。

### 4.2 Instrument

| 字段 | 精确 schema/variant | 约束 |
|---|---|---|
| `unit` | literal `"instrument"` | 语义单位 discriminator。 |
| `ref` / `identity` | `InstrumentRef` + `InstrumentId` | identity 必须来自 provider/venue native evidence；裸 symbol 不足以构造 identity。 |
| `facts` | typed object；每项为 `present \| unavailable \| unknown` | displayName、venue、currency、multiplier、assetClass 等事实必须保留其可用性；未知 multiplier/currency 不得默认 `1`/`USD`。 |
| `assetClass` | `venue-decided \| heuristic \| unknown` | 记录决定来源；heuristic 不能授权交易。 |
| `catalogRevision` | provider catalog revision \| `null` | details/search 的 revision mismatch 必须显式报错。 |
| `metadata` / `extensions` | 第 2、3 节 schema | conId、expiry、strike/right、tradingClass、tradingHours、market rules 及其他 native richness 只在对应 extension 中出现。 |

Search output 必须为每个请求 scope 保留 `complete(empty) \| partial \| unavailable`，并携带 revision/as-of/continuation；空数组不能掩盖 scope 故障或完整性未知。

### 4.3 News

| 字段 | 精确 schema/variant | 约束 |
|---|---|---|
| `unit` | literal `"news"` | 语义单位 discriminator。 |
| `identity` | `PublicSource` 或明确 `AccountSource` + provider native id/evidence | AI 消费 News 不会把公共 feed 变成账户数据。 |
| `headline` | non-empty string | headline 是必填字段；provider 无法提供有效 headline 时拒绝该 output 或使用该 leaf 明确声明的错误，不以未声明的 unavailable variant 代替。 |
| `content` | `full \| summary \| unavailable` | 缺失不得用空字符串掩盖。 |
| `publishedAt` | `Instant \| unavailable \| unknown` | publisher 时间不能用 ingestion time 代替。 |
| `observedAt` / `ingestedAt` | typed `Instant` | 区分 provider observation 与本地归档。 |
| `canonicalUri` | `present \| unavailable \| unknown` | URI 不自动证明 publisher identity。 |
| `change` | `original \| correction \| retraction \| unknown` | correction/retraction 指向 superseded evidence/identity；GUID/link/hash 去重不等于 correction guarantee。 |
| `extensions` | leaf 精确 object | author、native category、article type、feed/guid 等 richness 由 provider schema 保留。 |

### 4.4 NewsGroup

| 字段 | 精确 schema/variant | 约束 |
|---|---|---|
| `unit` | literal `"news-group"` | 语义单位 discriminator。 |
| `groupId` | source + native/group identity | 公共 group 使用 `PublicSource`；账户 grouping 需要明确授权。 |
| `selection` | `explicit-members \| declared-rule` | rule schema 与成员 identity 同属该 leaf，不使用任意 JSON。 |
| `membership` | members + `complete \| partial \| unknown \| unavailable` + `evaluatedAt` | group 存在不证明成员完整、同步或可交易触发。 |
| `membershipRevision` | provider/local revision | replacement、gap、revision conflict 后不能继续假定旧成员有效。 |
| `metadata` / `extensions` | 第 2、3 节 schema | grouping provider richness 保留。 |

标签、CLI namespace 或未声明的 category 不是 NewsGroup identity、selection 或 membership revision。

## 5. Pull：有限结果、coverage 与 as-of

每个 pull leaf 的 input/output/error schema 都由该 leaf 声明；内核不建立覆盖所有 provider 的 bar、feed、group 或 interval enum。

| 部分 | schema 语义 |
|---|---|
| `window` | leaf 可声明 range/lookback；`from`、`through`、through-mode 和 lookback ending time 按该 leaf schema 校验。 |
| `page` | `first(limit)` 或 `continuation(cursor, limit)`；cursor opaque，不能由本地 index 猜造。 |
| `as-of` | `latest` 或明确 instant；effective freshness 进入 output metadata。 |
| `output` | `items`、next cursor、coverage、as-of、可取得 watermark/sequence 和固定 metadata。 |
| `errors` | leaf 的精确 union，至少区分 invalid input、availability、coverage unknown、output schema violation 和 provider error。 |

Coverage variant：

| kind | 意义 |
|---|---|
| `complete` | provider/声明的边界已覆盖；`items=[]` 可表示该边界内无匹配。 |
| `partial` | 已知只覆盖部分范围或 scope，带原因或 next action。 |
| `unknown` | provider 没有足够 evidence 证明完整性。 |
| `unavailable` | leaf 已声明但当前无法取得结果；不同于 discover 阶段 absent。 |

`limit` 只限制本页；`nextCursor=null` 只有在 provider 证明终点时才可与 `complete` 同时出现。provider 没有 sequence 时 `sourceSequence=null`；本地数组 index 不得冒充 cursor/offset。

| Leaf | Input schema | Output schema | Error union 最低固定部分 |
|---|---|---|---|
| `candle.pull` | `PullRequest` + `InstrumentRef` + provider-declared `barSpec`/price stream | `PullPage<Candle<E>>` | `invalid-input \| availability \| coverage-unknown \| output-schema-violation \| provider-error` |
| `instrument.search` | `PageRequest` + typed `SearchPattern` + `PublicSource` 或 `AccountSource` | `PullPage<Instrument<E>>`，逐 scope 保留 coverage | 上述固定部分 + `identity-revision-mismatch` |
| `instrument.details` | `InstrumentRef` + catalog revision（若 leaf 要求） | single-details schema 或 leaf 声明的有限 page | 上述固定部分 + `identity-revision-mismatch` |
| `news.pull` | `PullRequest` + `PublicSource` + typed feed/selection | `PullPage<News<E>>` | `invalid-input \| availability \| coverage-unknown \| output-schema-violation \| provider-error` |
| `newsgroup.materialize` | `PullRequest` + typed `GroupSelection<R>` + source | `PullPage<NewsGroup<E,R>>` | 上述固定部分 + grouping/revision error |

没有对应 capability leaf 时没有命令；声明存在但暂时断连、限流、未授权或 credential expired 时保留 capability binding 并返回 named availability/authorization error，不伪装成 empty success。

## 6. Push：资源生命周期、控制帧、重放与背压

### 6.1 Owner 与生命周期

| 操作/字段 | schema 语义 |
|---|---|
| `HostSubscription` | UTA 持有的逻辑订阅，owner 为 `Subscriber(callId)` 或 `Persistent(bindingId)`；只有 Persistent 的控制配置需要持久化。它绑定 capability、已校验 input、replay boundary 和 observer set；bridge `subscribe` 不携带 generic owner 字段。 |
| `start` | 携带已绑定 capability/schema、source、provider input 和 replay start（now/cursor/from）；成功后先发 `started`，不把 durable owner 写入通用 wire frame。 |
| `abort` | 仅允许在 started 之前取消创建中的资源，带 transient stream identity 和 expected state。 |
| `stop` | started/degraded stream 的显式停止；返回 ended/failed/cancelled 结果，不伪装自然 complete。 |
| `SIGINT`/管道关闭 | CLI detach 只移除 observer；Host 仅在该 logical owner 结束或不再需要资源时发送 cancel，不取消仍被其他 observer 使用的 HostSubscription、TriggerBinding 或已被交易 writer 接受的订单。 |

Push 生命周期先由 UTA HostSubscription 创建并绑定，再映射为 transient bridge session/stream。bridge 发送 `started` 后，可以发送零个或多个 `item`、`watermark`、`correction`、`gap` 和 `backpressure`，最后必须发送恰好一个 `ended`、`failed` 或 `cancelled` terminal；创建失败可直接返回 typed failure，创建阶段取消不得产生 item。

### 6.2 Frame 与恢复

| frame | 必填语义 |
|---|---|
| `started` | stream id、source、schema fingerprint、replay status、初始 watermark（若有）。 |
| `item` | `Candle<E>`、`News<E>` 或 `NewsGroup<E,R>`；delivery ordinal 只用于本次传输。 |
| `watermark` | source sequence/observed-through 与 `closed-through`、`observed-through` 或 `unknown`；最后收到一帧不能制造 closed-through。 |
| `correction` | superseded identity/revision 与 replacement evidence；不替代 replacement item。 |
| `gap` | from/through（若有）、source/disconnect/overflow/cursor-expired reason、replay status；不得静默丢帧。 |
| `backpressure` | block、drop-with-gap 或 terminate；drop 必须带 gap，terminate 必须随后 ended/failed。 |
| `ended` | stream id、stopped/source-ended/owner-closed/shutdown reason、final watermark/replay status；结束不表示最后 item closed。 |
| `failed` | typed `DataError`、是否可恢复、replay status；丢失的 provider event 不能变成已知拒绝。 |
| `cancelled` | stream id、logical cancellation reason；取消尽力停止 native subscription，并且不能撤销已被 writer 接受的 controlled dispatch。 |

Host restart 通过 leaf 声明的 replay input 重新订阅，而不是隐式 native reattach 或宣称 exact replay。Host/trigger layer 在恢复 observer 或向求值器交付前，必须验证 gap、replay status 和允许的 future boundary；bridge 的 session/streamId 只在本次连接内有效。

terminal frame 之前的 Abrupt EOF 或 process crash 属于 delivery/process failure，不是自然完成；Host 必须记录 stream failure，不能宣称 `ended` 或 `complete`。

`sourceSequence` 的 epoch 跨连接/重启；同一 offset 只有在相同 provider epoch/namespace 下可比较。replay unsupported/partial/unknown 时，依赖连续性的消费必须暂停；gap 解决前不能宣称 complete。

| Leaf | Start input | Item/control output | 缺失能力与恢复 |
|---|---|---|---|
| `candle.push` | `PushStart` + `InstrumentRef` + provider `barSpec`/stream | `PushFrame<Candle<E>>` | 没有 push namespace 就 absent；gap/finality unknown 时暂停，按 replay status 决定恢复。 |
| `news.push` | `PushStart` + source + typed feed selection | `PushFrame<News<E>>` | correction/retraction 是 item + optional correction frame；feed disconnect 不等于全局无新闻。 |
| `newsgroup.push` | `PushStart` + typed `GroupSelection<R>` + membership revision | `PushFrame<NewsGroup<E,R>>` | revision conflict/gap 进入 paused/failed projection；不能假定旧成员有效。 |

## 7. Closed-bar predicate：触发器的数据准入

本文只定义 Candle 何时可作为 closed-bar input；订单触发、审批和 `ReturnToAgent` 由[触发与复核协议](trigger-contract.md)定义。

| 输入 | 精确内容 |
|---|---|
| `candle` | `candle.pull`/`candle.push` 输出的共享 Candle；provider extension 仍须通过当前 binding validator。 |
| `requirement` | instrument ref、leaf exact barSpec/temporal requirement、boundary end、freshness limit、coverage=`complete`、watermark=`closed-through`、gap/correction policy、expected capability binding。 |
| `coverageEvidence` | source identity、capability binding、window identity、coverage variant、covered-through、watermark、replay/gap checkpoint 和 selected evidence id；不得从隐藏外部状态读取。 |
| result | `accepted { selectedEvidence, sourceSequence, capabilityBinding, predicateVersion }` 或 `paused { namedReasons, requiredAction }`。 |

`accepted` 必须同时满足：

1. instrument/source/capability binding 完全匹配；公共 source 与 AccountSource 不相等，账户 source 必须含同一 explicit scope。
2. temporal projection 为 `exact`，boundary end 不晚于 requirement，且不接受未来 frame；无法 exact project 的 month/quarter/tick/event-count 等 native spec 必须暂停。
3. finality 为 `closed` 且 proof 可核验；open/unknown 一律暂停。
4. window identity 完全匹配，coverage=`complete`，covered-through 覆盖 candle end；partial/unknown 不能因收到一条 item 变 complete。
5. watermark 存在且为 `closed-through`，覆盖 candle end；delivery ordinal 或 `observed-through` 不够。
6. 没有未解决 source gap、disconnect/overflow gap、replay failure、correction/retraction；replacement 必须重新检查全部条件。
7. freshness 在限制内；freshness unknown、capability/instrument revision 变化或 extension namespace/version/fingerprint 不匹配时暂停并重新发现。

至少保留以下 paused reasons：`finality-open`、`finality-unknown`、`temporal-projection-unknown`、`temporal-projection-unsupported`、`watermark-missing`、`watermark-behind-boundary`、`coverage-partial`、`coverage-unknown`、`source-gap`、`replay-unavailable`、`correction-unresolved`、`retraction-observed`、`stale-observation`、`capability-revision-changed`、`instrument-revision-changed`、`extension-evidence-invalid`。

只有 trigger/agent 真正选中 `accepted` evidence 时，才持久化 selected evidence、consumer、decision、capability binding、as-of/freshness 和 predicate version。若 accepted 依赖 executable local derivation，再保存 transform id/version、参数摘要、implementation fingerprint 和 input evidence；普通展示/规范化不被强制写入这些字段。整条 Candle stream 不进入交易日志。

## 8. Capability 状态、投影与参考

| 状态 | discover/describe | invoke |
|---|---|---|
| capability absent | 不返回 leaf；不创建 `Unsupported` 命令。 | 不存在的命令不能调用。 |
| capability declared but temporarily unavailable | 保留 capability identity/schema，附具名 availability；授权视图可隐藏主体无权发现的 leaf。 | 返回 availability/authorization error，不伪装 schema absent。 |
| native capability observed but UTA path unverified | 只记录在 investigation evidence。 | 不把 native SDK method 名称当成 UTA capability。 |

`discover` 返回当前 instance/scope 下真正存在的 leaf；`describe` 返回该 leaf 的 exact input/output/error schema、extension/variant、coverage/finality/replay/backpressure、owner lifecycle 和 availability。`invoke` 必须携带 discovery 获得的 capability binding；revision 或 fingerprint 变化时返回 stale error，不按相同 path 执行新语义。CLI/AI 是该 capability tree 的 projection，不维护第二张命令表。

关联的 source-backed facts、native richness、legacy seam 和 evidence gaps 见[数据调查](solutions/data-investigation.md)与[provider 调查](solutions/provider-investigation.md)。外进程的固定 handshake、wire error、fingerprint、stream credit/cancel 和 authentication 见[foreign-provider bridge contract](provider-contract.md)。
