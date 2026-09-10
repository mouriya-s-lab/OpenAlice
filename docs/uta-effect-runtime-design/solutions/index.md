<!-- Generated navigation only by scripts/uta-effect-runtime-solutions.mjs. Per-entry investigation remains in each group. -->

# UTA 新旧能力逐项调查

本目录保存旧实现与新 UTA 抽象之间的逐项对照，以及能力组合要求加入后的调整分析。它是完整设计书的调查输入，不是完整设计书，也不表示其中的候选解释已被维护者接受。

## 调查层次

| 材料 | 阅读用途 |
|---|---|
| 各组 `analyses.json` / `entries.md` | 调整后的逐项对照全文：源码依据、旧行为、问题、保留行为和未决问题 |
| [原始问题](question-inputs.json) | 每个问题的原文；候选设计作出的决定仍须在完整架构中复核 |
| [ownership.json](ownership.json) · [coverage.json](coverage.json) | 来源归属和结构核对；数量、`designed`、`accepted`、哈希一致均不证明架构正确 |

## 逐组完整对照

| 调查组 | 可读对照 | 原始分析 |
|---|---|---|
| CoreAccount | [entries.md](CoreAccount/entries.md) | [analyses.json](CoreAccount/analyses.json) |
| TradingJournal | [entries.md](TradingJournal/entries.md) | [analyses.json](TradingJournal/analyses.json) |
| ProtocolModels | [entries.md](ProtocolModels/entries.md) | [analyses.json](ProtocolModels/analyses.json) |
| AliceClients | [entries.md](AliceClients/entries.md) | [analyses.json](AliceClients/analyses.json) |
| Supervisor | [entries.md](Supervisor/entries.md) | [analyses.json](Supervisor/analyses.json) |
| RuntimeComposition | [entries.md](RuntimeComposition/entries.md) | [analyses.json](RuntimeComposition/analyses.json) |
| HttpRoutes | [entries.md](HttpRoutes/entries.md) | [analyses.json](HttpRoutes/analyses.json) |
| Alpaca | [entries.md](Alpaca/entries.md) | [analyses.json](Alpaca/analyses.json) |
| CcxtCore | [entries.md](CcxtCore/entries.md) | [analyses.json](CcxtCore/analyses.json) |
| CcxtVenues | [entries.md](CcxtVenues/entries.md) | [analyses.json](CcxtVenues/analyses.json) |
| Ibkr | [entries.md](Ibkr/entries.md) | [analyses.json](Ibkr/analyses.json) |
| IbkrBridge | [entries.md](IbkrBridge/entries.md) | [analyses.json](IbkrBridge/analyses.json) |
| Longbridge | [entries.md](Longbridge/entries.md) | [analyses.json](Longbridge/analyses.json) |
| MockBroker | [entries.md](MockBroker/entries.md) | [analyses.json](MockBroker/analyses.json) |
| Leverup | [entries.md](Leverup/entries.md) | [analyses.json](Leverup/analyses.json) |
| LeverupProtocols | [entries.md](LeverupProtocols/entries.md) | [analyses.json](LeverupProtocols/analyses.json) |
| Guards | [entries.md](Guards/entries.md) | [analyses.json](Guards/analyses.json) |
| Snapshots | [entries.md](Snapshots/entries.md) | [analyses.json](Snapshots/analyses.json) |
| Accounting | [entries.md](Accounting/entries.md) | [analyses.json](Accounting/analyses.json) |
| Identity | [entries.md](Identity/entries.md) | [analyses.json](Identity/analyses.json) |
| Catalog | [entries.md](Catalog/entries.md) | [analyses.json](Catalog/analyses.json) |
| LiveEvidence | [entries.md](LiveEvidence/entries.md) | [analyses.json](LiveEvidence/analyses.json) |
| Polling | [entries.md](Polling/entries.md) | [analyses.json](Polling/analyses.json) |
| TargetGaps | [entries.md](TargetGaps/entries.md) | [analyses.json](TargetGaps/analyses.json) |
## 补充调查与分析依据


## 问题与引用边界

- 原始问题记录完整保留在 question-inputs.json；450 个问题及其原始处置用于核对恢复完整性，不作为设计完成度。
- 各组 entries.md 的 openQuestions 与 preservedBehavior 必须一起阅读。
- 原始调查记录内引用的 `docs/uta-effect-runtime-detailed-design.md`、`plans/uta-effect-runtime-design.md` 及 `D13`—`D17` 等候选章节编号属于已撤销的总设计与会话计划。它们不作为当前设计入口，也不能把这些历史引用自动绑定到将来的同名文档或编号。恢复归档保留了被引用版本；本目录的调查原文不因恢复操作被重写。
- 调查对应的初版架构提交为 `a5f23756531cc552b7e12b6d655ae1ffbcd28b64`。原始中英正文保持不变；本索引不覆盖原设计。
- 生成器只据已有输入生成导航、可读对照和结构元数据，不生成实质解决方案。重新设计必须逐项处理已有调查，而不是用生成成功或评审标签代替判断。
