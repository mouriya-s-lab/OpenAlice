# UTA 重写（独立 Rust 进程）

**状态**：核心设计 v1 完成（`plans/uta-refactor/design/uta-core-design.md`，已过两位讨论者压力测试与一次外部阅读评审）；待实施前 spike（核心设计 §14）与首个垂直切片。
**相关 issue**：待建（按 `plans/uta-refactor/design/uta-core-design.md` §14 未决 spike 与 §13 验收标准拆分）。

## 主线

UTA 是 Alice 与其配置的各 broker 账户之间的独立守护进程：Alice 客户端经它读 broker 数据、订阅行情与账户变动、下委托 / 改单 / 撤单；集成把 broker 协议洗成内部契约；核心只做权限、转发、订阅分发、指令递送与回票关联；broker 掌握交易事实，UTA 手里只有自己开出的指令、递送进度和收回来的帐票；结果不明时查 broker 或转人工，不再发放调用许可。

## 范围

- 用独立 Rust 进程 + 二进制替换 `services/uta/`；跨进程只用序列化 RPC；核心不说 broker 协议。
- 非目标：账本 / 余额计算、行情组合与时间对齐、核心内运行用户程序（WASM 不在范围）、回测、打包、Alice SDK 迁移本身。

## 交付

`plans/uta-refactor/design/`：

- `uta-core-design.md` — 唯一权威：中心思维、四步机制（观察载体 / 程序值代数 / 决策 STS / 受控执行 + 证据 gate）、基础类型、Rust 映射、未决 spike（§14）、验收标准（§13）。
- `problem-domain.md` — 问题域（F/H/C/P 事实）与维护者原话，迁移自原 uta-design.md §1 + 附录 B，依核心设计 §15 继续有效。
- `research/` — `fp-00-synthesis.md` 综合索引 + `fp-01`…`fp-05` 一手证据链（Haskell / Scala FP 的多 provider 适配 + 组合式副作用消费案例）。
- `investigation/` — venue 原生能力、Rust 生态可行性、既有缺陷、Alice 消费面四份调查（问题域事实的源码级出处）。

## 检查表

- [x] 问题域与四类事实（`problem-domain.md` §1 + 附录 B）
- [x] FP 证据链（`research/fp-00`…`fp-05`）与四份既有调查（`investigation/`）
- [x] 核心设计（载体 / 三种进度 / 决策代数 / 程序 / 写与 unknown / 保留协议 / 能力 / 基础类型）
- [ ] 实施前 spike（核心设计 §14 S1–S10）
- [ ] 首个垂直切片（写路径：核心 + fixture 集成）
- [ ] 首个真实集成（能力声明经官方文档核验）+ Alice 客户端迁移

## 完成标准

新 UTA 满足核心设计 §13 验收标准；Alice 经生成客户端接入；`services/uta/` 删除；owner 指南更新；本计划删除。
