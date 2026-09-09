# OpenAlice

OpenAlice is a local trading workspace for native coding-agent CLIs. Alice
launches Workspaces and injects trading context; the separate UTA process owns
broker credentials, connections, state, and every trading write. Persisted state
is file-backed rather than database-backed.

This file contains only rules that apply at the start of every task. Current
code, tests, rendered behavior, and GitHub state override stale prose. Before
editing a subsystem, select and read its owner guide from [[docs/README.md]].
Detailed delivery and release procedure lives in
[[docs/development-workflow.md]], test selection and side effects live in
[[docs/testing.md]], and active multi-step work lives in [[PLANS.md]].

## 当前阶段

现在是核心抽象设计阶段。主会话禁止编写代码；必要代码工作可以交给 subagent。第二档、第三档 subagent 可以在抽象研究中编写测试，但测试只允许验证抽象是否可行，禁止指派纯粹的代码测试任务。代码与测试许可不改变主线，不得擅自转入生产实现，不得用容易实现的样例决定抽象或以测试通过代替设计论证。
现在的目标是设计完整、完善的 UTA 核心抽象。

# 一、方法论

**允许抽象先行，但把抽象当作需要论证、可以修正的设计假设；围绕新 UTA 的预设场景和旧 UTA 的实际契约，用类型、组合与事件流逐步检验它，而不是直接把某一版模型实现出来。**

它不是“从旧代码归纳新系统”，也不是“先造一个万能模型，再把所有需求塞进去”。

## 1. 先有目标和候选设计，不要求第一稿已经容纳一切

新 UTA 有希望支持的使用方式、组合场景和扩展目标，所以可以先提出核心概念及其关系。

**不知道最终抽象是什么，不意味着不能提出初版抽象。** 设计就是在目标约束下提出表达方式，再发现它哪里不足。

因此，现存设计稿是你此前安排产生的阶段成果。它不一定正确，但包含已有的问题理解、目标场景、候选关系和取舍，不能因为还存在问题就把设计重新退回空白。

## 2. 新旧契约映射用于研究表达能力，不是给旧对象安排新位置

映射把现实能力带入设计讨论，但“每项都有一个对应名称”远远不够。

需要研究的是：

- 不同能力之间共同的行为结构是什么；
- 表面不同的能力能否由同一种结构实例化、组合出来；
- 哪些差异只是参数、值或业务函数不同；
- 哪些差异确实要求特有的描述和消费；
- 候选抽象是否因为某个场景而暴露了遗漏、过度约束或错误边界。

**共同点和差异要同时研究。** 既不能为统一而删掉差异，也不能把没有分析清楚的差异全部变成核心特判。

旧契约是其中一组研究材料；新 UTA 的预设场景同样参与这项研究，而且会提出旧系统根本没有的要求。

## 3. 用 FP 约束核心与业务特化的关系

你强调 FP，不是为了让稿子出现更多泛型、ADT 或 Effect 名词，而是希望在写生产代码之前，就形成良好的表达和组合习惯。

你给出的编程语言类比是关键：

> **通用核心与业务特例的关系，应当接近语言的表达规则与具体业务程序的关系。**

规则不必预先认识所有业务，业务却可以在规则内被描述、组合和解释。

所以类型不能只描述对象里有哪些字段，还要描述函数、构造、依赖、计算及其组合关系。特例可以作为具体计算和业务表达进入系统；不能每增加一个特例，就要求公共机制增加一个认识它的分支。

**要避免的是共同机制扩散成特判，不是禁止业务特化。**

## 4. 用事件流展开并检验动态语义

有了候选类型和组合关系，还必须说明它们如何发生作用：

- 计算怎样被解释，何处执行 IO；
- 结果怎样被观察和消费；
- 事件怎样参与后继计算、派生和组合；
- 状态在不同结果、顺序和时间条件下怎样演化；
- 哪些责任属于哪个限界上下文。

Provider 可以是实现不可知、契约明确的黑箱，不妨碍描述这些关系；具体载荷能够扩展，也不妨碍推演基础行为。

**事件流不是类型设计完成后的配图，而是继续发现、检验和修正类型与边界的设计手段。** FP 侧能解释计算，业务侧就应当能理解给定事件和状态之后的合法流向。

## 5. 归纳与演绎反复校正，而不是单向流水线

你既不是只做自下而上的归纳，也不是只做自上而下的演绎：

- 从目标提出候选抽象；
- 从已有能力与新场景分析共同结构和差异；
- 用抽象构造业务表达；
- 用事件流推演它；
- 表达不了、组合断裂或状态说不清时，回头修正相应假设。

这不是要求开头就证明全部正确，而是要求**每一轮设计都增加解释力，而不是只增加篇幅、映射数量和术语。**

## 6. 现存设计稿的位置与最终成果

现存设计稿是**当前需要继续论证和推进的候选设计**，不是无需检验的权威，也不是可以忽略的旧材料。

应沿着已有设计的目的，辨明哪些关系成立、哪些缺乏推导、哪些需要修改，并说明修改依据。不能一会儿把它固定成不再检验的前提，一会儿又把“存在预设抽象”本身判为错误，随后转向只提炼旧 UTA。

**成果应当是一套能解释为什么这样抽象、怎样容纳业务特化、如何组合并在时间中运行的核心设计；不是一份看起来覆盖全面的对象和协议目录。**

# 二、方法论的边界

## 1. 类型关系成立，不等于业务语义成立

类型、组合律和契约能约束**已经被准确表达的性质**，不能替我们判断表达本身是否正确。

例如，把远端 ACK 定义成“交易完成”，类型可以闭合，事件流也可以画得自洽，但业务含义仍然错误。

必须分别检查：

- **表达是否成立**：类型关联、构造和组合是否合法；
- **表达是否正确**：表达的是否真是目标业务的承诺、状态和后果。

这不要求展开 Provider 内部实现，而是要求正确规定黑箱边界上的契约，区分“要求它保证什么”与“它实际能够保证什么”。

## 2. 共性必须分层

行情订阅和订单提交都是 IO，这个共同层成立；但不能因此推出它们应当共享同一套批准、补偿或持久化协议。

“都能装进某个泛型”只能说明这个泛型能承载它们，不能独自证明领域抽象提取得恰当。

要判断的是：**在哪一层共享构造、组合和消费规律，在哪一层保留不同的业务语义。**

语言具有广泛表达能力，不意味着每个业务系统都值得发展成一套通用语言。UTA 的核心仍应由目标场景约束，不能为了理论上的通用性不断增加表达机制。

## 3. 有限场景不能证明无限扩展

旧能力、新预设场景、异常时序，可以暴露候选抽象的缺陷；它们全部能表达，也不能推出未来任何业务都不需要调整核心。

更强的依据，是同时写清：

- 一个组合成立的前提；
- 它保留哪些性质；
- 哪些改变会超出这项保证；
- 扩展实现需要满足哪些契约。

**“目前这些例子能跑通”和“这条组合规律在给定条件下成立”，是不同强度的结论。** 后者不能只靠增加例子数量获得。

## 4. 设计阶段需要停止条件，但不是拿局部完成冒充整体完成

合理的条件是：

- 关键目标场景有清楚的表达方式；
- 已调查的旧能力有明确的保留、修正或特化解释；
- 关键组合、事件消费和状态转换能够推演；
- 重要的不确定性已被定位，能区分设计问题与需要实验或实现阶段验证的问题；
- 没有为了容纳当前场景而偷偷绕开公共契约。

少量代码实验可以回答具体不确定性，**但不能反过来让实验容易实现的模型决定整个设计**。

这些边界不是把你的方法曲解成“纯靠类型证明一切”“绝不允许修改核心”，再批评你没有主张过的东西。

# 三、工作方式

你在那次 compact 后紧接着给出的**完整原话**是：

> 方法论对齐了，检查手里现有的设计稿后安排粗略的不偏离路线的研究计划，为什么是粗略的是因为过早的安排计划的细节只会重复过早进入特定模式的失败形态，先进行一小部分调查后检查是否偏离方法论，是否可进行下一步，确认无误后再大批量研究，不要妄想一种固定的prompt和todolist就能做完这种复杂设计，第二档和第三档的subagent是不同的模型，要多灵活使用，而且第三档也可以给一些思考性任务而不是只当工具，两种不同档次的subagent是不同的模型，可以同一个事情的不同见解也可以做ab对照，在确定足够好的实践经验后固化落盘，让整个研究在产出前不偏离且高质量

其中明确要求的工作方式是：

1. **先检查已有设计稿，再安排粗略研究路线。** 不是从空白重来，也不是未经调查就把所有细节、分工和最终形态固定下来。
2. **先做一小部分调查，再检查方法是否偏离、是否具备进入下一步的条件。** 检查的是实际研究方式及其产出，不是只看任务有没有跑完。
3. **确认做法有效后才扩大研究。** 不能把未经验证的提问方式、前提和产出模板批量复制。
4. **不依赖一种固定 prompt 和一张固定 todolist。** 复杂设计需要根据调查结果持续调整问题、材料、视角和组织方式。
5. **灵活使用第二档和第三档模型。** 第三档也承担适合它的思考任务，不固定为摘录、执行或工具工种。
6. **允许同题不同见解和 A/B 对照。** 利用不同模型提供不同理解，而不是让它们沿同一个预设答案填表。
7. **经过实践确认足够好的做法，才固化落盘。** 固化的是有实际依据的经验，不是过早冻结研究流程。
8. **目标是让整个研究在形成产物之前持续不偏离、保持高质量。** 方法论约束设计怎样得到论证；工作方式约束研究本身怎样试做、校准、扩大和调整。

# 四、经会话证据确认的偏离禁令

本节由当前任务明确授权，依据[本轮研究记录](docs/uta-capability-runtime-design/current-research.md#历史会话偏离与禁令依据)中的原生会话定位制定；不冒充上面的方法论原文，不另立主线。原始主线始终是完整的新 UTA 核心抽象设计。

1. **禁止用业务方案替换抽象论证。** 模块、字段、订单流程、数据库表、迁移顺序、代码或测试通过，都不能代替构件、函数/类型关联、构造、组合与解释语义。业务场景仍应参与研究，并用来发现和修正这些关系；不因需要抽象而排除业务特化。
2. **禁止把未经调查的分组预装成答案。** 不先按业务栏目派工、再让子代理为其找依据；不全盘接受报告或把完成状态当作正确性。先据当前材料提出可被反驳的问题，对冲突和疑点实际沟通、回查并裁决，再扩大。允许粗略计划、并行、同题异见和不同档次承担思考，不规定固定模板、人数或轮数。
3. **禁止用静态目录冒充动态语义。** 列齐对象、消息、状态和提交点不等于解释了事件流。须说明计算怎样被解释、事实怎样派生和被后继消费，以及顺序、修订、失败怎样改变合法状态与责任；Provider 可保持契约明确的黑箱，不要求先枚举它的内部实现。
4. **禁止把映射降为覆盖计数，或清理方案时连同调查依据删除。** 新旧材料用于辨认共同结构、差异和特化消费，不是给固定模型安排对象的位置。已有候选可以保留、质疑和修改；不能借“尚未确定”重置为空白，也不能只提炼旧 UTA 而抹掉新系统预设场景。作废结论与原始调查证据须分开处理。
5. **禁止拿局部成功结束整项研究。** 一轮校准、落盘、提交、未发现反例或任务表勾完，都不是原主线的完成条件。检查点用于决定继续、调整问题或回查前提；尚可行动的设计关系继续研究。整体停止按方法论的目标条件及当前授权判断，不把未设计清楚的关系伪装成实现义务。
6. **禁止以文档形状证明契约完整。** 翻译、重组、精简和整合必须保留其承诺中的类型关系、前提、失败与状态后果；章节、行数、图数、覆盖率和样例数量只能辅助核对，不能掩盖语义被删减。
7. **禁止把历史任务或助手解释自动升级为当前授权。** 找回记录不等于重做记录中的待办；保存原文不等于加入自拟规则。依据当前明确任务区分原文、事实和候选推导。本轮已授权主线研究与历史支线，支线结束不使主线暂停；这些禁令也不得变成启动合法研究、必要可行性验证或继续推进的额外审批门槛。

## Start Here

```bash
pnpm install              # full local install, including Electron
pnpm dev                  # Guardian -> UTA + Alice + Vite
pnpm dev --takeover       # replace the recorded local Guardian owner tree
pnpm build                # packages + UI + UTA + Alice
pnpm test:changed         # hermetic changed-file closure against origin/dev
pnpm test:owner:ui        # complete hermetic UI owner suite
pnpm test:integration     # deterministic local product integration
pnpm test                 # complete hermetic monorepo Vitest suite
pnpm test:select --help   # owners, lanes, areas, packages, and side effects
```

Before changing files:

1. Run `git fetch origin`, `git status -sb`, and inspect the current diff.
2. Preserve unrelated user changes. Do not reset, overwrite, stash, or commit
   them merely to obtain a clean tree.
3. Routine work starts from current `dev` on a focused feature branch. If the
   checkout is on `master`, a merged branch, or a surprising historical branch,
   establish the intended base before editing.
4. Start from the real surface: reproduce UI/runtime behavior, inspect current
   code, and read the applicable owner guide before designing.
5. Before adding a migration, compatibility parser, or dual-read path, establish
   whether the persisted shape shipped. Replace unreleased `dev`-only shapes
   directly; do not turn them into permanent upgrade boundaries.

## UI Design Workflow

For frontend visual, layout, or interaction changes, separate product design
from implementation.

- In serial work, present viable approaches and tradeoffs, recommend one, and
  align with the maintainer before detailed design or implementation.
- State the selected interaction model, responsive behavior, accessibility
  implications, and shared primitive ownership before editing. Verify the real
  browser route afterward.
- Autonomous work follows the same sequence in its plan or PR, explicitly
  records its own choice, and never implies maintainer approval it did not get.
- Keep ceremony proportional for small fixes without skipping the design
  decision.

## Product and Architecture Boundaries

- `src/` is Alice: Workspace lifecycle, tools, data domains, HTTP/IPC surfaces,
  file-backed state, and the UTA client boundary.
- `services/uta/` owns brokers, accounts, approvals, snapshots, FX, and trading
  writes. Do not move broker state back into Alice.
- The model loop runs in native CLIs (`claude`, `codex`, `cursor-agent`, `agy`,
  `grok`, `omp`, `opencode`, `pi`). Alice owns credentials and injection, not an
  in-process agent loop.
- New agent-facing capabilities normally ship as Workspace templates, skills,
  or satellite repositories. Do not grow a parallel workflow engine in `src/`.
- UTA is optional for non-trading use. Startup, onboarding, and Chat must work
  in lite/read-only mode without a broker carrier.
- Chat and AutoQuant V2 Workspaces are durable and reusable. AutoQuant's
  internal projects and experiments remain owned by its coding agent.
- `OPENALICE_HOME` is the user-state root. Shipped persisted-state changes use
  the migration framework and generated [[src/migrations/INDEX.md]]; never hide
  one-off cleanup in startup code.
- Secrets never belong in tracked files, logs, fixtures, PR bodies, or agent
  instructions. Treat account, auth, provider, sealing, signing, and
  notarization paths as sensitive.

See [[docs/project-structure.md]] for current ownership and entry points.

## Delivery Authority

- `dev` is the routine integration lane and active preview channel. Routine PRs
  target `dev`.
- `master` is the release-source/user-facing lane. Promotion, beta/stable tags,
  version synchronization, feeds, and publication follow the manual contract in
  [[docs/development-workflow.md]]; merging to `master` does not itself publish.
- Do not commit directly to `master`. Avoid direct commits to `dev` unless the
  maintainer explicitly requests integration work. Never force-push or delete
  either branch.
- Prefer merge commits for ordinary PRs. Preserve a feature branch while its
  work is unmerged and delete it only after GitHub records a successful merge.

Choose delivery authority before implementation:

| Mode | Trigger | Delivery |
|---|---|---|
| Serial / interactive | Default when the user is actively steering concrete work | After proportional local verification, open and merge a PR to `dev` without treating pending remote CI as a synchronous lock |
| Autonomous / topic | Explicit `/goal` or autonomous contribution request | Keep one coherent Draft PR open for later acceptance; CI never grants merge authority |

An explicit feature-branch iteration request overrides PR timing in either
mode: keep all related increments on one owned branch and do not open or merge
its PR until the maintainer accepts it. One integrator owns that branch;
parallel workers hand off commits rather than racing to push or creating one PR
per finding.

Pending CI alone does not block serial progress, but a known product or contract
failure must be understood and repaired before adding scope. Beta promotion may
use recorded local acceptance plus the lightweight master PR gates. Stable
release, explicit review pauses, and untrusted contributions retain their full
synchronous gates.

## Verification Ladder

Use the smallest gate that can realistically falsify the change, then escalate
with ownership breadth and risk:

| Change shape | Minimum evidence |
|---|---|
| Leaf change inside one owner | `pnpm test:changed` or an explicit `test:select` intersection; owning typecheck; real affected surface |
| Shared change inside one owner | Matching `pnpm test:owner:*` suite or package-local test; owning typecheck; real affected surface |
| Cross-owner, shared test/build infrastructure, dependency/config change, or uncertain impact | Root and applicable package/UI typechecks; complete `pnpm test`; every touched surface's acceptance |
| Beta promotion | Recorded local full-suite/surface acceptance plus automatic master source gate and Windows dev-stack smoke |
| Manual backstop or stable release | Complete remote matrix and release gates from [[docs/development-workflow.md]] |

`pnpm test:changed` compares the feature branch and working tree with freshly
fetched `origin/dev`. It follows Vitest's static import graph; dynamic imports,
generated contracts, registries, implicit runtime coupling, and a zero-test
selection require an explicit owner/area/package selection or escalation. It
is development feedback, not a release gate. `pnpm test` retains the
deterministic full-suite meaning. See [[docs/testing.md]] for the complete
namespace, composition rules, and side-effect contracts.

Typecheck the owner that changed: root `npx tsc --noEmit` covers `src/`; UI uses
`cd ui && npx tsc -b`; a package uses its own `typecheck` command. Do not cite a
green typecheck that did not include the changed code.

Add the applicable surface gate:

| Surface | Required evidence |
|---|---|
| `ui/` | UI typecheck, changed specs or `pnpm test:owner:ui` as appropriate, and the real browser route |
| UI `/api/*` contract or demo | Update `ui/src/demo/` handlers and walk `pnpm -F open-alice-ui dev:demo` |
| `packages/<name>/` | Package typecheck; use its local `test` or `pnpm test:select --package <workspace-name>` when it owns specs, then escalate to the owner suite for shared behavior |
| UTA state, ledger, staging, or sync | `pnpm test:integration:uta` plus targeted specs from [[docs/uta-live-testing.md]] |
| Broker adapter, order write, or permission | Smallest explicit live-paper scenario; verify demo/paper mode and leave the account flat |
| Workspace issues, schedules, headless dispatch | Follow [[docs/workspace-issues-and-scheduling.md]] |
| Guardian lock, ownership, or takeover | `pnpm test:system:guardian` and the real launcher path |
| Desktop, IPC, PTY, managed runtime, or packaging | Matching unsigned Electron/package smoke from [[docs/managed-workspace-runtime.md]] |
| Root installer or distributed CLI | [[docs/cli-installer.md]], `pnpm test:system:installer`, and the interactive playground before release |
| Docker/server/remote deployment | [[docs/docker-deployment.md]], `pnpm docker:smoke`, or `pnpm test:system:remote` as applicable |
| Persisted state | Apply the shipped-boundary rule above; shipped shapes need an idempotent migration, spec, and regenerated index |
| Onboarding, first run, or auth | Isolated state plus dev and packaged paths where relevant |

`pnpm test` is hermetic: it must not open real SSH, read cloud credentials,
deploy, or publish.
Those system paths remain explicit `test:system:*` or artifact-owner commands.
`pnpm test:integration` is non-trading and must never load configured broker
accounts or contact public providers. External read-only and live-paper lanes
are opt-in; an all-skipped run is not acceptance. Live-paper tests require
explicit `OPENALICE_UTA_LIVE_PAPER=1`, a verified demo/paper account, and a
flat-account check even after failure.

Routine development and package smoke must not read release signing secrets.
If an applicable native, browser, package, or external gate cannot run, state
the exact residual risk; an unrelated green test is not substitute evidence.

## Repository Records

- Concrete deferred defects go to GitHub Issues with symptom, reproduction,
  suspected subsystem, reason for deferral, and evidence. Do not create repo
  TODO files or Linear tasks; handle findings already owned by the current
  change in that change.
- Substantial multi-session work uses one canonical `plans/<topic>.md` entry and
  follows [[PLANS.md]].
- Durable subsystem truth and the complete guide catalog live in
  [[docs/README.md]]. Keep that index current instead of copying it here.
- `README.md` is public positioning. Ask for product framing before rewriting
  its tagline, pillars, hero, or other marketing copy.

## Code Conventions

- ESM only; include `.js` extensions in TypeScript imports.
- Strict TypeScript, ES2023 target.
- Zod for config schemas; TypeBox for tool parameter schemas.
- `decimal.js` for financial arithmetic.
- Prefer shared shadcn/Base UI primitives under `ui/src/components/ui/`.
  Extend that layer before hand-rolling portals, positioning, focus, dismissal,
  keyboard behavior, or bespoke control styling inside a feature.
- Frontend reads of backend-owned data go through a domain hook. Keep
  presentation components prop-driven and test each hook's selection plus
  loading/error semantics.
- Prefer structured Workspace launcher logs; the main process currently uses
  `console` and has no universal pino sink.
