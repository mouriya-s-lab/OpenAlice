# OpenAlice

OpenAlice 是本地交易工作区：Alice 启动 Workspace 并注入交易上下文；UTA 是独立进程，拥有 broker 连接、账户、观察流与全部交易写入。

## UTA 已剥离为独立仓库

- UTA 的设计与实现在 **`mouriya-s-lab/uta`**（https://github.com/mouriya-s-lab/uta）。设计文档、研究报告、裁决归档全部在那里；本仓库不再保存 UTA 设计文件。
- 本仓库中 `services/uta/`、`packages/uta-protocol/`、`src/services/uta-client/` 是**旧 UTA**，不具备正确性，不得作为新设计的依据；只作"既有机器事实"被 `uta` 仓库的 `design/problem-domain.md` 按本仓库 commit 引用。不要为旧 UTA 修 bug 或加功能，除非维护者明确要求。
- 跨仓库契约只有 UTA 的 JSON-RPC IDL，由 `uta` 仓库拥有并随 release 发布；本仓库从 release artifact 消费。

## 仓库基本规则

- 改文件前 `git fetch origin`、`git status -sb`；保留他人未提交改动，不 reset/stash/覆盖。
- 当前工作分支 `RiriAgent/new-uta`；`dev` 为集成分支，`master` 为发布分支，两者不直接提交、不 force-push。
- Secrets 不进任何跟踪文件、日志、PR 正文。
- 其余仓库（`src/`、`ui/`、`packages/` 非 UTA 部分）的开发流程见 `docs/README.md` 与 `docs/development-workflow.md`。
