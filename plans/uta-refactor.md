# UTA 重写（独立 Rust 进程）

**状态**：设计完成，待实施前实验（§6 X1 Windows 传输、X2 存储实现）与首个垂直切片。
**相关 issue**：待建（按 `plans/uta-refactor/design/uta-design.md` §7 实施顺序拆分）。

## 主线

UTA 是 Alice 与其配置的各 broker 账户之间的独立守护进程：Alice 客户端经它读 broker 数据、订阅行情与账户变动、下委托 / 改单 / 撤单；集成把 broker 协议洗成内部契约；核心只做权限、转发、订阅分发、指令递送与回票关联；broker 掌握交易事实，UTA 手里只有自己开出的指令、递送进度和收回来的帐票；结果不明时查 broker 或转人工，不再发放调用许可。

## 范围

- 用独立 Rust 进程 + 二进制替换 `services/uta/`；跨进程只用序列化 RPC；核心不说 broker 协议。
- 非目标：账本 / 余额计算、行情组合与时间对齐、核心内运行用户程序（WASM 不在范围）、回测、打包、Alice SDK 迁移本身。

## 交付

`plans/uta-refactor/design/`：`uta-design.md`（唯一权威，§0 主线 / §1 驱动 Q1–Q21 / §2 模型 R1–R12 / §3 结构 / §5 走查 / §6 实验 / §7 记录）、`contracts/`（A-01…A-11、B-01…B-14 + IDL）、`adr/`（13 条，11 Accepted / 2 Provisional）、`walkthrough/`（两轮，末轮零卡点）、`investigation/`、`research/`。

## 检查表

- [x] 调查：broker 能力、Rust 可行性、既有缺陷 E1–E20、Alice 客户端需求 N1–N12
- [x] 主线与驱动（K1–K8、F1–F10、N1–N12、Q1–Q21）
- [x] 模型（帐票种类与引用、指令生命周期 R1–R12、结果不明处理、流 / 订阅 / 缺口、一次性读、能力声明、权限、持久与恢复）
- [x] 结构（核心 + 每账户集成进程；七个模块；存储原子性；传输）
- [x] 契约与 IDL；两轮独立走查（12 + 18 契约卡点 → 裁决 → 确认轮 0 卡点）
- [ ] 实验 X1（Windows 传输）、X2（存储崩溃矩阵）、X3（分发吞吐）
- [ ] 写路径切片 Q1–Q10（核心 + fixture 集成）
- [ ] 流与读切片 Q11–Q16
- [ ] 恢复切片 Q17–Q21
- [ ] 首个真实集成（能力声明经官方文档核验）+ Alice 客户端迁移

## 完成标准

新 UTA 在 macOS / Linux / Windows 通过 Q1–Q21；Alice 经生成客户端接入；`services/uta/` 删除；owner 指南更新；本计划删除。
