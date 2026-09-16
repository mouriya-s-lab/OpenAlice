# OpenAlice

OpenAlice 是本地交易工作区：Alice 启动 Workspace 并注入交易上下文；UTA 是独立进程，拥有 broker 连接、账户、观察流与全部交易写入。

## 现状：UTA 整体重写，当前处于设计阶段

- UTA 正在**从零重写**为独立 Rust 二进制。`services/uta/`、`packages/uta-protocol/` 及 Alice 侧 `src/services/uta-client/` 等现有代码是**旧设计**，不具备正确性，**不得作为新设计的依据**，只能作为"既有机器事实"（`problem-domain.md` 的 O 表）被引用。
- 当前阶段是**设计**，不是实现。不要开始写 UTA 实现代码；不要为旧 UTA 修 bug 或加功能，除非维护者明确要求。

## 设计文档（唯一权威）

| 文件 | 作用 |
|---|---|
| `plans/uta-refactor/design/uta-core-design.md` | 核心设计：设计中心、边界、验收标准、未决 spike。所有类型、模块、协议必须能从这里的代数组合出来 |
| `plans/uta-refactor/design/problem-domain.md` | 问题域事实（F/O/S/H/P/C 编号）与维护者原话（B/C）。域事实只从这里取 |
| `plans/uta-refactor/design/research/fp-00..05-*.md` | 一手案例调查（Haskell/Scala/FP），核心设计每条 [证据] 的出处 |
| `plans/uta-refactor/design/investigation/*.md` | 问题域 §1 引用的旧系统与 venue 能力调查 |
| `plans/uta-refactor/design/native-computation-design-handoff.md` | 自定义原生计算的场景与约束交接稿；核心 §5.3 为其落点 |
| `plans/uta-refactor/TRIAGE.md` | 遗留文档裁决记录 |

## 设计阶段纪律

- **设计中心优先**：任何新文档、类型、协议先回答"它是核心设计哪个代数的组合/解释结果"。答不上来就不写。
- **禁止业务对齐大对象**：不写把字段列全的 `Order`/`Account`/`Position` 权威对象；订单、持仓、审批是日志 fold 或解释结果。
- **证据纪律**：论断标 [证据]（研究报告编号）/ [设计] / [spike]；条件式命题不得写成无条件结论；运行期未知不得冒充静态保证。
- **不偏离位置**：新设计文档放在 `plans/uta-refactor/design/` 下并在 `uta-core-design.md` §15 登记；不得在旧位置（ADR/contracts/walkthrough 已删除）复活旧结构。
- 研究类工作只读一手来源（论文、官方文档、公开仓库 pin commit），不凭回忆写。

## 仓库基本规则

- 改文件前 `git fetch origin`、`git status -sb`；保留他人未提交改动，不 reset/stash/覆盖。
- 当前工作分支 `RiriAgent/new-uta`；`dev` 为集成分支，`master` 为发布分支，两者不直接提交、不 force-push。
- Secrets 不进任何跟踪文件、日志、PR 正文。
- 其余仓库（`src/`、`ui/`、`packages/` 非 UTA 部分）的开发流程见 `docs/README.md` 与 `docs/development-workflow.md`；本阶段不涉及。
