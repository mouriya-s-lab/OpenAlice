# 可组合能力设计：实际验证与边界

## 验证范围

验证覆盖文档中的接入代码、既有组合/状态实验和材料生成器。未迁移生产 UTA、接入真实券商、创建交易 writer 或运行真实 Alice 复核投递。

源码调查的身份、原始问题和逐项证据由 [index.md](index.md)、[question-inputs.json](question-inputs.json) 与 [coverage.json](coverage.json)保存。它们的完整性检查不证明设计质量或 native provider 行为。

## 实际运行环境

- 本地 macOS arm64；Node `v26.8.1`、TypeScript `5.9.3`、Zod `4.3.6`、tsx `4.21.0`。
- 复用仓库依赖和 Python 标准库；没有安装 Effect、数据库或新生产依赖。
- TypeScript 使用仓库 `tsconfig.json` 的 ESNext/bundler/esModuleInterop 模块规则，并额外启用下面的严格选项。最初的独立 NodeNext 检查与仓库 Decimal 默认导入规则不匹配，不将其作为仓库支持的模块配置宣称通过。
- Node/tsx 的 `DEP0205 module.register()` 警告出现在 stderr；实际 CLI JSON/NDJSON stdout 可解析。未隐藏警告或修改无关依赖。

## 详细设计中的完整接入示例

从[详细设计](../../uta-effect-runtime-detailed-design.md)直接提取 §2.2 Instrument 目录与 §2.3 订单组合代码块，在内存虚拟文件中运行 TypeScript compiler API，再经 Node/tsx 启动独立进程执行原代码。编译诊断为零，实际输出与断言如下：

| 路径 | 实际结果 |
|---|---|
| 查询 BTC | 返回 `local-btc`、`BTC/USD`、tickSize `0.01`；selection 为 BTC、coverage 为 complete、nextCursor 为 null |
| 查询无匹配项 | 返回 complete 空集合，未伪造 instrument |
| 输入虚构账户 scope | 在 handler 前返回 `boundary-error/invalid-input` |
| 调用不存在的 cancel | 返回 `boundary-error/unknown-capability`；describe 只包含已声明目录叶子 |
| 同一声明的帮助与 schema | 生成 `uta local-catalog instrument search`；输出 schema 包含 tickSize |
| 已取消请求 | 返回 `boundary-error/aborted` |
| 订单 HOF | 合法限价输入通过；缺 limitPrice 或 kind 改为 market 均拒绝 |

复现入口：将 §2.2 完整代码块保存为临时 `docs/uta-provider-example.ts`，执行 `pnpm exec tsx docs/uta-provider-example.ts`，即可观察原始 describe 和查询输出；该文件不是产品源码。校验器直接提取正文，未维护另一份接入实现。

既有 trigger driver 和 Python 子进程示例亦重新执行。driver 覆盖显式 Keep 后查询/重设/丢弃等本地转换；它的无回复和 gap 分支尚不实现规范中新增的持续 control 路径，不能用该 driver 宣称这两条目标协议已实现。Python 有限流实际输出 started、两个 data 和 completed；坏输出返回 remote-output-invalid；结束后没有 fixture worker 残留。

主设计、provider 和 trigger 文档内的 JSON/NDJSON 实例全部可解析。该检查不等同于目标 ReviewCommand、控制句柄或完整 foreign bridge 的生产执行。

## 声明、HOF 与实际 CLI

运行入口：[composition-example.ts](composition-example.ts)，声明实现及限制见 [domain-contracts.md](domain-contracts.md)。

```bash
pnpm exec tsx docs/uta-effect-runtime-design/solutions/composition-example.ts help fixture
pnpm exec tsx docs/uta-effect-runtime-design/solutions/composition-example.ts describe fixture
pnpm exec tsx docs/uta-effect-runtime-design/solutions/composition-example.ts describe foreign
pnpm exec tsx docs/uta-effect-runtime-design/solutions/composition-example.ts pull fixture fixture/market/candles '{"scope":{"tag":"public"},"instrument":"BTC/USD","interval":"5m","limit":2,"cursor":null}'
pnpm exec tsx docs/uta-effect-runtime-design/solutions/composition-example.ts push fixture fixture/market/candle-stream '{"scope":{"tag":"public"},"instrument":"BTC/USD","interval":"5m","count":2,"delayMs":1}'
pnpm exec tsx docs/uta-effect-runtime-design/solutions/composition-example.ts pull fixture fixture/order/limit-intent '{"scope":{"accountId":"fixture-account","subAccountId":"main"},"instrument":{"nativeId":"fixture-btc","symbol":"BTC/USD"},"kind":"limit","side":"buy","timeInForce":"gtc","quantity":"2.5","limitPrice":"100.25","providerOrderType":"fixture-limit","postOnly":true}'
pnpm exec tsx docs/uta-effect-runtime-design/solutions/composition-example.ts invalid-output
pnpm exec tsx docs/uta-effect-runtime-design/solutions/composition-example.ts foreign-invalid-output
```

完整 CLI 探针实际启动这些命令并解析 stdout，核对：

| 路径 | 实际观察 |
|---|---|
| describe 两个 provider | fixture 5 个叶子、foreign 1 个；订单意图来自同一声明树；没有 option/cancel 叶子或空 namespace |
| Candle pull | 一个有限 output，2 个 Candle；tradeCount 等精确扩展保留，volume 的计量口径与 measured zero 保留，未证明的 finality 明确 unknown |
| 有限 push | started、2 个 data、completed，共 4 帧 |
| 生成的订单 CLI | 精确 limit/provider 输入进入受控包装器，输出 `admission-pending` 意图；不调用 broker，不表示订单已执行 |
| 缺少 limitPrice / 非法查询 limit | `boundary-error/invalid-input` |
| provider 返回违约结果 | `boundary-error/invalid-output`，不把坏响应当成功 |
| 调用不存在的 cancel | `boundary-error/unknown-capability`，不是已发布的 Unsupported handler |
| 实际 Python 子进程 | 标准库 worker 经 stdin/stdout 输出数据，TS 校验得到 2 个 data 及 completed |
| Python 违约输出 | `remote-output-invalid` 声明错误，不透传未校验 JSON |

另行通过真实 public builder 创建新 provider leaf，增加 `providerWindow: "auction"`：不改 core/CLI，help 和 input JSON Schema 出现该字段；缺字段被拒绝，合法调用得到计算结果 6。字段冲突被拒绝；在 `withLimitPrice` 后继续增加 provider 字段仍保留原先的 limit-kind 语义校验。

### 持续 push 与真实 SIGINT

```bash
node --import tsx docs/uta-effect-runtime-design/solutions/composition-example.ts push foreign foreign/market/candle-feed '{"scope":{"tag":"public"},"instrument":"BTC/USD","count":null,"mode":"valid"}'
# 观察 started 和持续 data 后按 Ctrl-C
```

用受监督进程运行上述真实命令。最终运行约 27 秒：观察 `started`、持续数据与实际 Python worker；发送 SIGINT 后输出 `cancelled/abort-signal`，父进程 exit 0，`pgrep -fl 'composition-fixture-worker.py'` 确认无残留子进程。

执行中曾发现 foreign stream 缺失 started、订单包装器没有进入生成树、unknown CLI 输入调用了静态入口等问题；修复后重跑完整编译、CLI 场景及持续流。该 Python seam 不是 [foreign bridge v1](../provider-contract.md) 的完整实现，更不证明 native provider 的订阅、背压或恢复保证。

## Trigger 与保留后继续管理

```bash
node --import tsx docs/uta-effect-runtime-design/solutions/trigger-state-example.ts
```

最终 driver exit 0，实际执行 24 个决策场景，输出状态和 work description。包含 open/closed、重复、错误来源、过期、Keep/查询/Rearm、旧回复、边界旧事件、新事件、Discard、Revise、RequestSubmission、无回复、gap、sent 与 outcome-unknown。详细标签和限制见 [trigger-state-example.md](trigger-state-example.md)。

公开 pure API 的连续状态探针另验证：

1. closed 事件产生 ReviewRequest，`dispatch: "none"`。
2. Keep 到 1500，原 trigger validUntil 为 1000，旧 approval expiresAt 仍为 200；保留不续订触发或批准。
3. 通过认证主体读取 HeldIntentControl；错误主体与到期查询被拒绝。
4. 用当前 control 在原 trigger 已到期之后 Rearm 或 Discard；不是从原始 review 分叉伪装“保留后可继续”。
5. Rearm 清除旧 approval；epoch 加一且 source boundary 有效。边界上的旧事件被拒绝，严格之后的新事件被接受。
6. 同 commandId/相同 payload 在状态推进后仍返回原决定；修改 payload 返回 idempotency-conflict；错误主体在 lookup 前被拒绝。
7. 旧 review 在 Keep 后返回 stale-control；未发送意图 Discard 只产生 local-retirement，不需要 provider cancel。

独立反例曾真实失败：不同 source instance 复用已消费 eventId，返回了 duplicate。修复 consumption source identity 与 lookup 顺序后，同一反例返回 source-mismatch 且不暴露原 outcome；完整 driver 和独立连续控制探针均重跑通过，driver 保留该回归场景。

这些只是纯状态转换：没有真实 WAL、原子提交、账户权限验证、Alice Session、消息投递或 broker ledger。`dispatch: "none"` 是返回的工作意图，不是对尚未实现交易系统的安全证明。correction/retraction writer ordering、edge baseline、真实 provider source boundary 等仍由目标契约及后续实现验收负责。

## 编译器实际检验

```bash
pnpm exec tsc --noEmit --strict --exactOptionalPropertyTypes \
  --noUncheckedIndexedAccess --useUnknownInCatchVariables \
  --noFallthroughCasesInSwitch --target ES2023 \
  --module ESNext --moduleResolution bundler --esModuleInterop --skipLibCheck \
  docs/uta-effect-runtime-design/solutions/domain-contracts.ts \
  docs/uta-effect-runtime-design/solutions/domain-contracts.type-cases.ts \
  docs/uta-effect-runtime-design/solutions/composition-example.ts \
  docs/uta-effect-runtime-design/solutions/trigger-state-example.ts
```

四个文件正常编译 0 diagnostics。另用同一 TypeScript compiler API 在内存删除 consumer 的 12 条 `@ts-expect-error` 指令，不改磁盘；得到 12 个对应行的实际诊断，分别约束必需字段、精确 extension、input/output/error 关联、resource/error 保留、pull/push 区分和公共面无 raw dispatch。

删除了 `tree.options` / `cli.options` 两个无效“缺失能力”负例：所有树都会在这种属性访问上报错，它们不能证明具体 provider 不支持 option。结构性缺失改由实际 describe/CLI 探针证明。

## 文档中的 wire fixture 也实际执行

从 [provider-contract.md](../provider-contract.md) 直接解析 JSON/NDJSON examples，验证 16 个 JSON frame、input/output/errors/streamControl 四个 schema、4 个实际 stream frame 和 8 个非法输入/输出/控制反例。使用安装的 Zod 4.3.6 `fromJSONSchema`，并按声明的二阶段 envelope projection 校验 control。

实际重新计算 §4 execution projection 的 fixture digest，结果与所有引用一致：

```text
jcs-sha256-v1:429a167cfb117559a2499f9ac2377d13f8711edbb6e2f3cc86b9d17e98dcc5c4
```

执行先发现完整 descriptor JSON 的尾逗号，修复后重跑全部案例。该 probe 只证明当前示例；Zod importer 在本地声明中标为 semi-experimental，不将其当作完整 Draft 2020-12/RFC 3339 conformance suite。fixture 的排序/数字取值也不证明所有跨语言 RFC 8785、Decimal 或时间 codec 向量。

## 原始材料与审查门禁

```bash
node scripts/uta-effect-runtime-map.mjs
node scripts/uta-effect-runtime-map.mjs --check
node scripts/uta-effect-runtime-solutions.mjs --reviewed
node scripts/uta-effect-runtime-solutions.mjs --check --reviewed
pnpm test:owner:repo-tooling
```

原始 map 生成与 check 已实际通过：20 章节、155 文件、31995/34238 物理行、93.45%、1435 duplicate groups。旧 EN/ZH architecture 从本地 Git 固定 revision `a5f23756531cc552b7e12b6d655ae1ffbcd28b64` 读取并验证 blob/SHA-256/行数；当前正文不保留相互否定的旧规范。

逐项材料门禁要求全部 MAP/NOTE 身份、ownership、required fields、K 锚点、独立 review IDs 与 analyses/design/contract 三个当前 hash 一致；450 个原始问题 exact-set 保留，closure 分类与每条 openQuestions 数量一致。它不根据章节或状态自动生成实质解法。最终机器统计在 [coverage.json](coverage.json)；结构齐全不等于 native 行为已证明。

最终 generation 与 `--check --reviewed` 均通过：

| 材料状态 | 实际结果 |
|---|---:|
| 完整源码/目标条目及当前 hash 绑定审查 | 1463 / 1463，24 组；pending 0 |
| 契约适用性 | retained 407，reframed 1056 |
| 作者目标评估 | designed 1445；blocked-on-evidence 18，未冒称实现完成 |
| 原始问题 | 450 / 450 精确保留与处置 |
| 问题收口 | source-resolved 13，integration-resolved 63，design-decided 71 |
| 未验证的经验性前提 | empirical-retained 303，分布于 300 个条目 |

实际负例分别将 Polling review 的 analyses、design、contract hash 改为全零，三次 CLI 均 exit 1 并指出对应 stale hash；另改动生成的 coverage 字节，CLI exit 1 并指出 stale output。每次恢复原字节，最终完整 gate 再次通过。未修改原始问题清单或放宽校验以得到绿色结果。

材料检查读取全部分组 JSON，核对重复 key、required-field shape、ownership 顺序及 review hash。source-range 审计核对 2826 个完整 repo-relative 引用、213 个 source 文件，没有缺失路径或越界引用；历史 architecture 范围使用固定审计基线。该审计不自动证明引用文字的语义。

重新生成调查导航后，全部本地文件与 heading/MAP/NOTE 链接检查通过；根索引链接到组内 canonical sections，不复制依赖另一个目录的相对链接正文。

实际 `pnpm test:owner:repo-tooling`：45 test files passed，288 tests passed，2 skipped；跳过来自 `scripts/pnpm-command.spec.ts`。这是修改过的材料工具所属 owner 回归，不是 UTA 交易或真实 AI 业务验收。

## 保留的实施门槛

- 真实公共数据能力的完整用户/API 路径、source finality/identity/coverage、gap/replay/correction。
- 全量 foreign bridge v1 和 HTTP client 的认证、resource/limit、wire/semantic validation、取消及诊断脱敏。
- 持久触发、Alice admission/outbox/Inbox 去重、实际负责 Session、结构化处置 receipt，及两侧重启。
- 交易 writer 与独立 broker ledger 的七 crash cuts、授权/租约/unknown/补偿/单 authority cutover。
- native provider 的幂等、完整 absence、环境、原子能力和 live-paper acceptance。

[source-experiments.md](source-experiments.md)保留旧实现的真实故障材料；这些故障实验没有作为新 runtime 验收重新执行。分支交付状态由[设计计划](../../../plans/uta-effect-runtime-design.md)维护。
