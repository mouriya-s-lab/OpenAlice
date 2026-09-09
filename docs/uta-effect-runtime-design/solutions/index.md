<!-- Generated navigation only by scripts/uta-effect-runtime-solutions.mjs. Per-entry investigation remains in each group. -->

# UTA 新旧能力逐项调查

本目录保存旧实现与新 UTA 抽象之间的逐项对照，以及能力组合要求加入后的调整分析。它是完整设计书的调查输入，不是完整设计书，也不表示其中的候选解释已被维护者接受。

## 调查层次

| 材料 | 阅读用途 |
|---|---|
| [初版架构](../../uta-effect-runtime-architecture.md) · [简体中文](../../uta-effect-runtime-architecture.zh-CN.md) | 受保护的第一版目标架构；不是当前实现 |
| [初步源码映射](../../uta-effect-runtime-mapping/coverage.md) · [mapping.json](../../uta-effect-runtime-mapping/mapping.json) | 源码范围、旧行为、初版架构章节和原始缺口 |
| 各组 `analyses.json` / `entries.md` | 调整后的逐项对照全文：源码依据、旧行为、问题、调整理由、候选模型、纯逻辑与副作用边界、保留行为、替代步骤、验证条件和未决问题 |
| 各组 `design.md` / `reviews.json` | 调查当时的分组解释及评审记录；保留其上下文和原始哈希，不等于当前设计裁决 |
| [原始问题](question-inputs.json)及各组 `questions-closure.json` | 每个问题的原文及当时处置；候选设计作出的决定仍须在完整架构中复核 |
| [ownership.json](ownership.json) · [coverage.json](coverage.json) | 来源归属和结构核对；数量、`designed`、`accepted`、哈希一致均不证明架构正确 |

## 逐组完整对照

| 调查组 | 可读对照 | 原始分析 | 当时分组解释 | 评审记录 |
|---|---|---|---|---|
| CoreAccount | [entries.md](CoreAccount/entries.md) | [analyses.json](CoreAccount/analyses.json) | [design.md](CoreAccount/design.md) | [reviews.json](CoreAccount/reviews.json) |
| TradingJournal | [entries.md](TradingJournal/entries.md) | [analyses.json](TradingJournal/analyses.json) | [design.md](TradingJournal/design.md) | [reviews.json](TradingJournal/reviews.json) |
| ProtocolModels | [entries.md](ProtocolModels/entries.md) | [analyses.json](ProtocolModels/analyses.json) | [design.md](ProtocolModels/design.md) | [reviews.json](ProtocolModels/reviews.json) |
| AliceClients | [entries.md](AliceClients/entries.md) | [analyses.json](AliceClients/analyses.json) | [design.md](AliceClients/design.md) | [reviews.json](AliceClients/reviews.json) |
| Supervisor | [entries.md](Supervisor/entries.md) | [analyses.json](Supervisor/analyses.json) | [design.md](Supervisor/design.md) | [reviews.json](Supervisor/reviews.json) |
| RuntimeComposition | [entries.md](RuntimeComposition/entries.md) | [analyses.json](RuntimeComposition/analyses.json) | [design.md](RuntimeComposition/design.md) | [reviews.json](RuntimeComposition/reviews.json) |
| HttpRoutes | [entries.md](HttpRoutes/entries.md) | [analyses.json](HttpRoutes/analyses.json) | [design.md](HttpRoutes/design.md) | [reviews.json](HttpRoutes/reviews.json) |
| Alpaca | [entries.md](Alpaca/entries.md) | [analyses.json](Alpaca/analyses.json) | [design.md](Alpaca/design.md) | [reviews.json](Alpaca/reviews.json) |
| CcxtCore | [entries.md](CcxtCore/entries.md) | [analyses.json](CcxtCore/analyses.json) | [design.md](CcxtCore/design.md) | [reviews.json](CcxtCore/reviews.json) |
| CcxtVenues | [entries.md](CcxtVenues/entries.md) | [analyses.json](CcxtVenues/analyses.json) | [design.md](CcxtVenues/design.md) | [reviews.json](CcxtVenues/reviews.json) |
| Ibkr | [entries.md](Ibkr/entries.md) | [analyses.json](Ibkr/analyses.json) | [design.md](Ibkr/design.md) | [reviews.json](Ibkr/reviews.json) |
| IbkrBridge | [entries.md](IbkrBridge/entries.md) | [analyses.json](IbkrBridge/analyses.json) | [design.md](IbkrBridge/design.md) | [reviews.json](IbkrBridge/reviews.json) |
| Longbridge | [entries.md](Longbridge/entries.md) | [analyses.json](Longbridge/analyses.json) | [design.md](Longbridge/design.md) | [reviews.json](Longbridge/reviews.json) |
| MockBroker | [entries.md](MockBroker/entries.md) | [analyses.json](MockBroker/analyses.json) | [design.md](MockBroker/design.md) | [reviews.json](MockBroker/reviews.json) |
| Leverup | [entries.md](Leverup/entries.md) | [analyses.json](Leverup/analyses.json) | [design.md](Leverup/design.md) | [reviews.json](Leverup/reviews.json) |
| LeverupProtocols | [entries.md](LeverupProtocols/entries.md) | [analyses.json](LeverupProtocols/analyses.json) | [design.md](LeverupProtocols/design.md) | [reviews.json](LeverupProtocols/reviews.json) |
| Guards | [entries.md](Guards/entries.md) | [analyses.json](Guards/analyses.json) | [design.md](Guards/design.md) | [reviews.json](Guards/reviews.json) |
| Snapshots | [entries.md](Snapshots/entries.md) | [analyses.json](Snapshots/analyses.json) | [design.md](Snapshots/design.md) | [reviews.json](Snapshots/reviews.json) |
| Accounting | [entries.md](Accounting/entries.md) | [analyses.json](Accounting/analyses.json) | [design.md](Accounting/design.md) | [reviews.json](Accounting/reviews.json) |
| Identity | [entries.md](Identity/entries.md) | [analyses.json](Identity/analyses.json) | [design.md](Identity/design.md) | [reviews.json](Identity/reviews.json) |
| Catalog | [entries.md](Catalog/entries.md) | [analyses.json](Catalog/analyses.json) | [design.md](Catalog/design.md) | [reviews.json](Catalog/reviews.json) |
| LiveEvidence | [entries.md](LiveEvidence/entries.md) | [analyses.json](LiveEvidence/analyses.json) | [design.md](LiveEvidence/design.md) | [reviews.json](LiveEvidence/reviews.json) |
| Polling | [entries.md](Polling/entries.md) | [analyses.json](Polling/analyses.json) | [design.md](Polling/design.md) | [reviews.json](Polling/reviews.json) |
| TargetGaps | [entries.md](TargetGaps/entries.md) | [analyses.json](TargetGaps/analyses.json) | [design.md](TargetGaps/design.md) | [reviews.json](TargetGaps/reviews.json) |

## 补充调查与分析依据

- [Candle、Instrument、News、NewsGroup 调查](data-investigation.md)
- [Provider 与跨进程边界调查](provider-investigation.md)
- [外部触发与返回 Agent 调查](trigger-investigation.md)
- [旧实现故障实验](source-experiments.md)
- 调整分析使用的候选约束：[组合约束](composition-contract.md)、[集成决定](integration-decisions.md)、[数据契约](../data-contract.md)、[Provider 契约](../provider-contract.md)、[触发契约](../trigger-contract.md)、[交易契约](../transaction-contract.md)。保留这些文件是为了理解调查为何作出相应判断，不把它们重新提升为已接受的总体架构。
- [交叉评审记录](shared-review.md) · [当时的执行记录](verification.md)
- 对照中引用的局部实验：[声明与组合](domain-contracts.md)、[声明源码](domain-contracts.ts)、[类型反例](domain-contracts.type-cases.ts)、[进程交互](composition-example.ts)、[外部进程](composition-fixture-worker.py)、[触发实验](trigger-state-example.md)。它们只支持各自实际执行的局部结论，不替代总体抽象设计或生产运行时验收。

## 问题与引用边界

- 原始问题记录完整保留在 question-inputs.json；450 个问题及其原始处置用于核对恢复完整性，不作为设计完成度。
- 各组 entries.md 的 openQuestions、Cross-group contracts、Additional findings 必须一起阅读，不能只取 targetModel。
- 原始调查记录内引用的 `docs/uta-effect-runtime-detailed-design.md`、`plans/uta-effect-runtime-design.md` 及 `D13`—`D17` 等候选章节编号属于已撤销的总设计与会话计划。它们不作为当前设计入口，也不能把这些历史引用自动绑定到将来的同名文档或编号。恢复归档保留了被引用版本；本目录的调查原文不因恢复操作被重写。
- 调查对应的初版架构提交为 `a5f23756531cc552b7e12b6d655ae1ffbcd28b64`。原始中英正文保持不变；本索引不覆盖原设计。
- 生成器只据已有输入生成导航、可读对照和结构元数据，不生成实质解决方案。重新设计必须逐项处理已有调查，而不是用生成成功或评审标签代替判断。
