
# TradingJournal — source investigation and migration evidence


## Entries

### MAP-0043603515

- mapping source: [services/uta/src/domain/trading/git/TradingGit.ts:1-36](../../../../services/uta/src/domain/trading/git/TradingGit.ts#L1-L36)
- symbol: TradingGit imports and DERIVATIVE_SECTYPES
- id: MAP-0043603515
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.ts:1-36: 直接导入 crypto、Decimal、IBKR Contract/Order/sentinels、OrderHelper，并在类中硬编码 DERIVATIVE_SECTYPES。
- currentBehavior: TradingGit 同时负责 broker SDK-shaped operation、sentinel redaction、交易日志和 derivative simulation；同一 class 的 imports 证明模块边界混合。
- problem: domain/Git authority 依赖具体 IBKR SDK，使 broker-specific defaults 和 market instrument rules 无法通过 broker-spi/market boundaries 验证或替换；其他 adapter 只能被迫伪装 Contract/Order。
- preservedBehavior:
  - IBKR sentinel 在 adapter boundary 被清理，public order summaries 仍可用。
  - derivative-aware simulation 行为保留在 market service，而非删除业务能力。
- openQuestions: —

### MAP-02A55B62AE

- mapping source: [services/uta/src/domain/trading/git/index.ts:1-25](../../../../services/uta/src/domain/trading/git/index.ts#L1-L25)
- symbol: Git barrel exports
- id: MAP-02A55B62AE
- sourceEvidence:
  - services/uta/src/domain/trading/git/index.ts:1-25: barrel 默认导出 TradingGit、ITradingGit/config 及全部 legacy Git operation/commit/state/sync/simulation types。
- currentBehavior: 相对 import 通过一个入口即可取得 legacy execution kernel 和 broker-facing types，调用者自然把 TradingGit 当默认 authority。
- problem: barrel path 保留旧依赖方向，即便新增 target modules 也会被旧 re-export 继续拉回；无法区分 transaction command、journal read、audit view、simulation query。
- preservedBehavior:
  - read-only Git audit compatibility 可继续由显式命名模块提供。
  - 模块 consumers 的依赖仍可有稳定入口，但入口不再授予 broker mutation。
- openQuestions: —

### MAP-0CBE2FB0D9

- mapping source: [services/uta/src/domain/trading/git/TradingGit.ts:54-59](../../../../services/uta/src/domain/trading/git/TradingGit.ts#L54-L59)
- symbol: isPendingHashConflict
- id: MAP-0CBE2FB0D9
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.ts:54-59: isPendingHashConflict 接受 unknown，按 instanceof 或任意 object 的 code/name 字符串判断。
- currentBehavior: 错误来源被丢失；任何恰好带 code=PENDING_HASH_CONFLICT 或 name=PendingHashConflictError 的 object 都会被当成并发冲突。
- problem: string classification 可误报并允许任意 unknown 穿透；它无法处理 typed storage/dispatch/approval failures，也阻止 exhaustive protocol mapping。
- preservedBehavior:
  - HTTP 409 仍可用于 VersionConflict，但根据 tag 而非字符串。
  - 其他业务失败不会被误分类为并发冲突。
- openQuestions: —

### MAP-0D11241FE8

- mapping source: [services/uta/src/domain/trading/git-persistence.ts:18-23](../../../../services/uta/src/domain/trading/git-persistence.ts#L18-L23)
- symbol: LEGACY_GIT_PATHS
- id: MAP-0D11241FE8
- sourceEvidence:
  - services/uta/src/domain/trading/git-persistence.ts:18-23: LEGACY_GIT_PATHS 将 bybit-main/alpaca-paper/alpaca-live 指向旧 crypto-trading/securities-trading 文件，并注明待删除。
- currentBehavior: 初始化时 primary 文件失败会按 accountId 选择旧路径；多个 Alpaca id 共享 securities-trading/commit.json。路径 fallback 是运行时恢复逻辑，并且无法告诉调用者 primary 是缺失、损坏、无权限还是旧数据。
- problem: 多份 JSON authority 使恢复结果依赖路径优先级；共享旧文件还可能混入多个 account 的历史。silent fallback 会把 corruption 伪装成新账户，或把没有 dispatch identity 的旧 commit 当成可继续执行的交易。
- preservedBehavior:
  - 旧提交仍可在 Git audit 中被检索，且来源路径和迁移时间可追溯。
  - 已证明纯审计的 order/fill 文本可保留；未证明的状态只标记 evidence，不升级为 Confirmed。
- openQuestions:
  - 迁移前必须枚举历史文件中的 account scope；若单文件包含多个 account、scope 缺失或归属无法证明，整条记录保留 provenance 并按 OperatorRequired/LegacyAuthorityAmbiguous 只读处理，不分配交易 authority。

### MAP-110B9E5ED3

- mapping source: [services/uta/src/domain/trading/git/types.ts:1-6](../../../../services/uta/src/domain/trading/git/types.ts#L1-L6)
- symbol: Git protocol compatibility shim
- id: MAP-110B9E5ED3
- sourceEvidence:
  - services/uta/src/domain/trading/git/types.ts:1-6: 文件只是从 @traderalice/uta-protocol wildcard re-export 全部 Git/operation types，注释称为 physical move 前 compat shim。
- currentBehavior: 相对 imports 通过 shim 获得 legacy Operation/Result/GitState 等 protocol types；shim 不表达 ownership、schema version 或 domain/public view 的边界。
- problem: wildcard re-export 让旧 union 持续渗入 domain/journal/projection，SDK-bearing operation 与 public wire type 无法被编译器区分；删除文件前若不迁移所有 caller 会产生隐式依赖。
- preservedBehavior:
  - 需要的 Git audit read shapes 可作为 named projection types 保留。
  - legacy historical evidence 可导入/只读展示，但不保留 generic Operation execution authority。
- openQuestions: —

### MAP-1A49DD8DEE

- mapping source: [services/uta/src/domain/trading/git/TradingGit.spec.ts:291-387](../../../../services/uta/src/domain/trading/git/TradingGit.spec.ts#L291-L387)
- symbol: TradingGit order-state projection tests
- id: MAP-1A49DD8DEE
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.spec.ts:291-387: success callback 按 orderState 映射 filled/cancelled/rejected/submitted；Inactive 虽 status=rejected 仍进入 submitted。
- currentBehavior: OperationResult.success 决定数组归属，status 另由 Filled/Cancelled/Inactive/default 映射；因此 success=true + status=rejected 是可表示状态，submitted 不代表 fill。
- problem: legacy submitted/filled/cancelled/rejected 同时混合 dispatch success、venue order state、transaction terminality，允许互相矛盾；没有 Ack、Observation、CommitCriterion 的分层。
- preservedBehavior:
  - 订单刚被 venue 接受但仍工作时仍显示 submitted/working 语义；不要把 accepted 改成 filled。
  - Inactive 作为 venue rejection 的事实保留，但不再因为 success flag 把它放入‘submitted success’集合；没有 key/authorization 的 read-only account 只可查看该 fact，不能 re-dispatch。
- openQuestions: —

### MAP-1E81D2713F

- mapping source: [services/uta/src/domain/trading/git/TradingGit.spec.ts:249-261](../../../../services/uta/src/domain/trading/git/TradingGit.spec.ts#L249-L261)
- symbol: TradingGit onCommit callback test
- id: MAP-1E81D2713F
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.spec.ts:249-261: onCommit 被期望调用一次并收到 exported commits/head。
- currentBehavior: 测试把 callback 收到的内存 GitExportState 当作 commit 完成证据，未区分 authority journal 和 read projection。
- problem: callback 的一次调用既不可证明 broker 结果，也不能在 projection 写失败后恢复；若 callback 触发重试，可能重复 broker work。
- preservedBehavior:
  - push/reject 后最终可以查询一条审计记录。
  - 一次 durable command 的 audit row 具有稳定 transaction identity，而不是每次 retry 新 callback。
- openQuestions: —

### MAP-24879D4410

- mapping source: [services/uta/src/domain/trading/git/TradingGit.ts:588-604](../../../../services/uta/src/domain/trading/git/TradingGit.ts#L588-L604)
- symbol: rehydrateOperation
- id: MAP-24879D4410
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.ts:588-604: rehydrateOperation switch 只修 place/observed order、close quantity，default 原样返回未知 operation。
- currentBehavior: unknown action tag 通过 default 静默保留；close quantity 只按 String 重建 Decimal；place/observed 依赖 SDK Order rehydrate。
- problem: 开放 union 与静默 default 违反 closed ADT；malformed persisted operation 可能重新进入 execution/history；action/result/observation/compensation 关联未验证。
- preservedBehavior:
  - 合法 close Decimal precision 与 order terms 保留。
  - 未知历史可作为不可执行 evidence 显示/导出，不能丢失或假装 success。
- openQuestions: —

### MAP-25866E7F22

- mapping source: [services/uta/src/domain/trading/git/TradingGit.spec.ts:175-208](../../../../services/uta/src/domain/trading/git/TradingGit.spec.ts#L175-L208)
- symbol: TradingGit push empty and expected-hash guards
- id: MAP-25866E7F22
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.spec.ts:175-208: 空/未 commit push 和 mismatch/missing pending hash 不执行 callback，matching hash 才执行。
- currentBehavior: expectedPendingHash 只和当前对象的 pendingHash 做字符串相等比较；测试没有 transactionId、revision、digest、actor、expiry 或 writer CAS。
- problem: 短 hash 可碰撞且不能跨进程验证审批；客户端拿到旧 pending hash 不能知道 plan 已编辑、policy 已改变或 approval 已过期。
- preservedBehavior:
  - mismatch/missing approval proof 仍保证 broker dispatch=0。
  - matching approval 仍能进入执行，但只有 journal receipt 后才允许 worker。
- openQuestions: —

### MAP-26E3CBF3C8

- mapping source: [services/uta/src/domain/trading/git-persistence.ts:1-10](../../../../services/uta/src/domain/trading/git-persistence.ts#L1-L10)
- symbol: Git persistence module boundary
- id: MAP-26E3CBF3C8
- sourceEvidence:
  - services/uta/src/domain/trading/git-persistence.ts:1-10: 模块把 fs/promises、path、GitExportState 与 dataPath 一起引入；注释称其为纯函数加文件 IO。
- currentBehavior: git-persistence.ts 把一个看似领域内的模块同时当作路径选择器、JSON 持久化器和 TradingGit 的回调边界。GitExportState 只是 TypeScript 类型，运行时 JSON 没有 schema 解码，因而文件 IO、序列化形状和执行初始化互相耦合。
- problem: 目标要求 SQLite journal 是唯一权威写入口，而这里可以在任意回调时直接产生第二份状态文件；文件里的 completed commits 不能表达准备中、已审批、dispatch attempt、lease、unknown 或 command receipt。把 IO 放在 domain/trading 也会让 SDK/旧 union 的形状继续穿透。
- preservedBehavior:
  - 审计查询仍可按提交/交易顺序读取人类可读历史，但历史只来自 journal-derived projection。
  - Decimal 和 order terms 的精确展示继续保留，改由 named codecs 和 redaction 保证，而不是依赖 JSON.stringify。
- openQuestions:
  - 实施前必须盘点所有已发布 commit.json 的 schema/version、入口和缺失字段；未识别版本只能进入 MigrationRequired/OperatorRequired，不能合成为当前 Commit、dispatch identity 或 journal sequence。

### MAP-2CCB3134A8

- mapping source: [services/uta/src/domain/trading/git/TradingGit.spec.ts:135-173](../../../../services/uta/src/domain/trading/git/TradingGit.spec.ts#L135-L173)
- symbol: TradingGit push execution and clearing tests
- id: MAP-2CCB3134A8
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.spec.ts:135-173: push 逐 operation 执行、读取 state、返回 submitted，并在成功 callback 后清理 staging。
- currentBehavior: 测试只覆盖一个内存对象中 executeOperation 全部 resolve 的顺序；旧 push 在 broker callback 之前没有 durable intent/job，onCommit 失败时状态清理不发生。
- problem: remote mutation 先于 authority journal；partial group、Ack≠fill、network unknown、lease expiry、重启和 compensation 没有可表达状态。Main 的 node 探针已观察 snapshot failure 时 dispatch=1/pending retained/commits=0、retry dispatch=2/commit=1；onCommit failure 时 dispatch=1/pending retained/commits=1、retry dispatch=2/commits=2。该行为不是 broker crash-recovery proof，却确认了旧 retry 会重复 mutation。
- preservedBehavior:
  - 批量中已知 rejected operation 仍可按旧 ContinueOnKnownRejection 语义结算，且每 step outcome 独立可见。
  - 成功提交后 staging/proposal 可清理，但清理不是 broker completion criterion。
- openQuestions:
  - 各 venue 的 idempotency identity scope、retention horizon、absence lookup 和 old-sender fencing 必须由 adapter evidence 证明；未证明时 DispatchStarted 后只允许 ObserveUnknown/RecoveryRequired，禁止自动重发或 cancel。

### MAP-2DD4753D43

- mapping source: [services/uta/src/domain/trading/git/TradingGit.ts:119-185](../../../../services/uta/src/domain/trading/git/TradingGit.ts#L119-L185)
- symbol: push and executePush
- id: MAP-2DD4753D43
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.ts:119-185: push 在 executeOperation 前无 journal；异常转 rejected，getGitState 后 append commits/onCommit，callback 成功后才清 staging。
- currentBehavior: push 逐 operation 远程执行，随后 snapshot state、append in-memory commit、await onCommit；任何后置步骤失败都使 pending 清理时序不可靠。Main 的 node probe 具体观察到 snapshot failure: dispatches=1, pending retained, commits=0, retry dispatches=2/commits=1；onCommit failure: dispatches=1, pending retained, commits=1, retry dispatches=2/commits=2。这是旧 callback sequencing 的重现，不是 broker crash-recovery proof。
- problem: remote mutation 可能发生在 durable intent 之前，callback/snapshot failure 会把同一 plan 留成可再次 dispatch；部分结果被 success boolean 和 rejected string 收拢，没有 Unknown/observe/compensation。
- preservedBehavior:
  - 多 action batch 仍逐 step 可观测；known rejection 可继续其他 step，符合集成决策。
  - successful accepted/working order 仍可以先显示 submitted/working，不伪造 fill。
- openQuestions: —

### MAP-2E86D75B27

- mapping source: [services/uta/src/domain/trading/git/TradingGit.spec.ts:520-537](../../../../services/uta/src/domain/trading/git/TradingGit.spec.ts#L520-L537)
- symbol: show query tests
- id: MAP-2E86D75B27
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.spec.ts:520-537: unknown hash 返回 null，已 push hash 返回含 operations/results 的 projected commit。
- currentBehavior: show(hash) 在线性内存 commits 中按 8 字符 hash 查找；hash 既不是 durable TransactionId 也不是全局 sequence。
- problem: 重启/投影重建后 hash 可能不可用；null 同时代表 not found、projection unavailable、invalid hash 或 stale history，调用者无法区分。
- preservedBehavior:
  - 已知历史仍可获取完整安全投影，包括 operations/results 的结构化结果。
  - 未知 key 仍不会抛未处理异常，但由 named not-found 表达。
- openQuestions:
  - 迁移前必须验证短 hash 与 auditId 的历史 collision；未能证明一一对应时，短 hash 只能作 display alias，show 返回 AuditIdentityAmbiguous，不能选择 authority 或恢复对象。

### MAP-2F871AAB45

- mapping source: [services/uta/src/domain/trading/git/TradingGit.ts:379-389](../../../../services/uta/src/domain/trading/git/TradingGit.ts#L379-L389)
- symbol: getKnownOrderIds
- id: MAP-2F871AAB45
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.ts:379-389: getKnownOrderIds 遍历所有 commits.results 及 result.legs 建 Set。
- currentBehavior: known identity 只存在内存 commit array；parent/legs 与 external/local origin 未分类，restart 需靠 export restore。
- problem: Git log scan 不能区分 DispatchAttempt、RemoteObservation、external order，也不能提供 scope/version/absence evidence；丢 projection 时没有 durable source。
- preservedBehavior:
  - 已见 parent/leg orderId 仍阻止外部 observation 重复记录。
  - 重启后 known identity 集合与关机前一致。
- openQuestions: —

### MAP-31E8F89464

- mapping source: [services/uta/src/domain/trading/git/TradingGit.ts:654-690](../../../../services/uta/src/domain/trading/git/TradingGit.ts#L654-L690)
- symbol: sync
- id: MAP-31E8F89464
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.ts:654-690: sync empty updates no-op；非空 updates 生成一个 synthetic syncOrders commit、stateAfter、head/hash 并调用 onCommit。
- currentBehavior: sync 直接信任 externally supplied updates/currentState，所有结果 success=true；new head/hash 和 onCommit 代表‘同步完成’。
- problem: 没有 observation provenance/completeness/native identity/version/unknown；synthetic commit 会把 broker fact 当 local write，accounting/history 只能从错误 source 推断。
- preservedBehavior:
  - 同步到 Filled/Cancelled 后订单 projection 可查询，summary 仍显示 fill qty/price。
  - 无变化的 poll 可快速 no-op。
- openQuestions:
  - 每个 adapter observation batch 必须声明 scope/namespace completeness、ordering/source sequence 和 cursor boundary；缺证据时只 fold 已知事实并保持 Partial/Unknown，不能当作终态 absence。

### MAP-3A7B50FFCA

- mapping source: [services/uta/src/domain/trading/git/TradingGit.spec.ts:969-1020](../../../../services/uta/src/domain/trading/git/TradingGit.spec.ts#L969-L1020)
- symbol: derivative simulation tests
- id: MAP-3A7B50FFCA
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.spec.ts:969-1020: symbol-level change 排除 OPT 并输出 warning；all change 使用 derivative 自有 mark、multiplier 及 short PnL。
- currentBehavior: 测试从 IBKR Contract.secType 判断衍生品；symbol-level AAPL 不重标同 symbol option，all 则对每个 position 自己的 marketPrice 应用比例。
- problem: DERIVATIVE_SECTYPES 和 Contract fields 在 TradingGit execution/history class 内；硬编码 secType 不能表达 canonical InstrumentId、multiplier provenance、option price model 或 unknown instrument。
- preservedBehavior:
  - symbol-level change 不把 option price 替换成 stock price，避免虚假巨大 PnL；all 仍按 derivative 自有 mark 与 multiplier。
  - short position PnL sign 和 multiplier-aware market value 保持。
- openQuestions: —

### MAP-3CAB2FACBC

- mapping source: [services/uta/src/domain/trading/git/TradingGit.ts:531-534](../../../../services/uta/src/domain/trading/git/TradingGit.ts#L531-L534)
- symbol: show
- id: MAP-3CAB2FACBC
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.ts:531-534: show 在线性 commits 中按 hash 查找并返回 projectCommit 或 null。
- currentBehavior: show 是同步内存读；projectCommit 只做 operation redaction；hash 没有 transaction/audit identity 语义。
- problem: null 无法区分 not found/projection unavailable，重启依赖 restore，且 show 返回的 projected commit 可能仍带 legacy SDK-shaped union。
- preservedBehavior:
  - 已知 history 仍返回 operations/results view；未知 key 仍是可处理的 read failure。
  - show 不产生 side effect。
- openQuestions: —

### MAP-3D5359223F

- mapping source: [services/uta/src/domain/trading/git/TradingGit.spec.ts:943-965](../../../../services/uta/src/domain/trading/git/TradingGit.spec.ts#L943-L965)
- symbol: sync log attribution tests
- id: MAP-3D5359223F
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.spec.ts:943-965: 一个 sync commit 含两个 updates，log 必须生成两行并按各自 symbol 归属。
- currentBehavior: buildOperationSummaries 以 max(operations.length, results.length) 迭代，sync 的单 operation 被复用到每个 result，并从 result.symbol 归属。该兼容逻辑修复了数组 shape 的 boot-loop。
- problem: 结果 attribution 依赖 parallel arrays 和隐式 index，不能表达每项 event/observation identity、sequence 或 action association；未来异步 event 到达会破坏数组位置。
- preservedBehavior:
  - 一次 poll 返回多个不同 symbol 的 updates 仍显示为多行且各自 attribution 正确。
  - sync history 的 human-readable status/filled price 继续可见。
- openQuestions: —

### MAP-470C74976B

- mapping source: [services/uta/src/domain/trading/git/interfaces.ts:67-70](../../../../services/uta/src/domain/trading/git/interfaces.ts#L67-L70)
- symbol: ITradingGit serialization and round tagging
- id: MAP-470C74976B
- sourceEvidence:
  - services/uta/src/domain/trading/git/interfaces.ts:67-70: exportState 返回 legacy Git state，setCurrentRound 改 process-local numeric round。
- currentBehavior: 接口把 serializable completed history 与 mutable round tagging 作为 TradingGit public surface；没有 schema version/checkpoint/recovery context。
- problem: exportState 不能恢复 durable in-flight state，round 不能表达 revision/sequence/correlation；调用者可能把 exported JSON 作为 authority。
- preservedBehavior:
  - history export may remain available as named audit operation。
  - observability still lets UI correlate strategy/session actions, but with explicit durable IDs。
- openQuestions: —

### MAP-49CD3DC4C6

- mapping source: [services/uta/src/domain/trading/git/TradingGit.ts:632-645](../../../../services/uta/src/domain/trading/git/TradingGit.ts#L632-L645)
- symbol: rehydrateGitState
- id: MAP-49CD3DC4C6
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.ts:632-645: rehydrateGitState 对 positions.quantity 重建 Decimal，并为缺 multiplier 填 '1'。
- currentBehavior: Git commit.stateAfter 里缺 multiplier 被静默补 1；positions/accounting state 继续由 Git history 持有，未校验 currency/instrument/sequence。
- problem: 默认 multiplier 可能把未知合约误算成 1；Git commit snapshot 不是 broker/accounting authority，无法表达 FX、correction、observation provenance。
- preservedBehavior:
  - 合法 multiplier-aware PnL 和 quantity Decimal precision 保留。
  - 历史缺 multiplier 可在明确 legacy migration 中按证据分类，不让整个 audit disappear。
- openQuestions:
  - 历史 Position.multiplier 缺失时必须盘点真实 instrument type；无法确认则只保留 LegacyEvidence/read-only valuation，绝不默认 multiplier=1 或用当前 catalog 反推历史。

### MAP-515C919214

- mapping source: [services/uta/src/domain/trading/git/TradingGit.ts:38-43](../../../../services/uta/src/domain/trading/git/TradingGit.ts#L38-L43)
- symbol: generateCommitHash
- id: MAP-515C919214
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.ts:38-43: generateCommitHash 对任意 object 做 JSON.stringify、SHA-256 后截取八个 hex。
- currentBehavior: hash 输入可含 SDK 实例、undefined/字段顺序和 timestamp，输出 8 字符 CommitHash；既当 pending approval identity 又当 Git commit head。
- problem: JSON.stringify 不是版本化 canonical encoding，短 digest 可能碰撞，且 hash 不表达 TransactionId/revision/sequence。它不能证明 plan 可重建或与 actor/policy/expiry 绑定。
- preservedBehavior:
  - 审计 UI 可继续显示简短 hash，但不能将其当 authority。
  - 同一 canonical prepared plan 重试仍得到稳定 digest。
- openQuestions: —

### MAP-5478B3A377

- mapping source: [services/uta/src/domain/trading/git/TradingGit.ts:579-585](../../../../services/uta/src/domain/trading/git/TradingGit.ts#L579-L585)
- symbol: rehydrateCommit
- id: MAP-5478B3A377
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.ts:579-585: rehydrateCommit 只对 operations 与 stateAfter 调 helper 后恢复 commit。
- currentBehavior: rehydrateCommit 信任外部 GitCommit shape，只修 operation Decimal 与 GitState quantity/multiplier；不验证 event version/sequence/state transition。
- problem: ad hoc repair 会把 malformed/unknown historical state 变成看似合法，且只覆盖 completed commit，不能表达 durable transaction protocol。
- preservedBehavior:
  - 已知 legacy numeric fields 通过 explicit migration 支持；不默默丢精度。
  - 历史 audit 可以继续生成，只要 event evidence 合法。
- openQuestions: —

### MAP-56BCFFC93E

- mapping source: [services/uta/src/domain/trading/git/TradingGit.ts:61-73](../../../../services/uta/src/domain/trading/git/TradingGit.ts#L61-L73)
- symbol: TradingGit state fields and constructor
- id: MAP-56BCFFC93E
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.ts:61-73: class 保存 stagingArea、pending message/hash、inflightWrite、commits/head、currentRound 和三类 callback config。
- currentBehavior: 同一对象同时拥有 editable proposal、审批 identity、写锁、completed history、round metadata 和 broker/persistence callbacks；所有 post-prepare authority 都是内存。
- problem: crash/restart 会丢 prepared/approved/queued/recovery state；对象级 inflightWrite 不能跨进程 fencing；commits/head 既是 audit view 又被 pending scanner 当 scheduler authority。
- preservedBehavior:
  - 未 prepare 的编辑可以继续在内存 draft 中进行；这是唯一允许丢失的 tier。
  - 历史查询和 pending order awareness 保留为 projections。
- openQuestions: —

### MAP-5923C9DD53

- mapping source: [services/uta/src/domain/trading/git/TradingGit.spec.ts:210-247](../../../../services/uta/src/domain/trading/git/TradingGit.spec.ts#L210-L247)
- symbol: TradingGit concurrent-write guards
- id: MAP-5923C9DD53
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.spec.ts:210-247: inflightWrite 是对象级 boolean，第二 push、add、commit 都被 PendingHashConflictError 拒绝。
- currentBehavior: 任何一个 broker write 在途时，整个 TradingGit 的所有 staging/commit/write 被阻塞；Promise 结束前状态只在内存，重启后没有锁。
- problem: 对象级 mutex 既不能跨进程，也把独立 instrument/account 的工作不必要地串行化；它不能表达 lease owner/epoch、过期 worker fencing 或 RecoveryRequired 的 key 持有。
- preservedBehavior:
  - 同一 pending proposal 仍不允许同时被改写/执行。
  - 独立账户/instrument 的 work 可并行，这是对旧全局串行的有意改善。
- openQuestions: —

### MAP-595E9F79F1

- mapping source: [services/uta/src/domain/trading/git/TradingGit.ts:330-378](../../../../services/uta/src/domain/trading/git/TradingGit.ts#L330-L378)
- symbol: recordObservedOrders
- id: MAP-595E9F79F1
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.ts:330-378: recordObservedOrders 将 external orders 压成一个 observeExternalOrder commit/results submitted，并使后续 scanner 把其当作自有 order。
- currentBehavior: observeExternalOrders 先 listing/diff getKnownOrderIds，再读取 stateAfter，写 synthetic commit；外部 order 从此进入 pending scanner，但没有 native observation record/dispatch relation。
- problem: external broker truth 被伪装成 Alice commit，Git log 变成 polling authority；观察时间、listing completeness、scope、native version 和 order ownership 不能持久化。
- preservedBehavior:
  - 用户仍能在 history 看到未由 Alice 放置的订单，且之后 fill/cancel 会更新。
  - listing 为空或全部已知时返回 no-op，不生成虚拟 commit。
- openQuestions: —

### MAP-63DDC83FC9

- mapping source: [services/uta/src/domain/trading/git/TradingGit.ts:526-529](../../../../services/uta/src/domain/trading/git/TradingGit.ts#L526-L529)
- symbol: formatOptionalDecimal
- id: MAP-63DDC83FC9
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.ts:526-529: formatOptionalDecimal 忽略 undefined/UNSET_DECIMAL，否则用 Decimal.toFixed 加 prefix。
- currentBehavior: helper 只知道 IBKR UNSET_DECIMAL 与 Decimal 实例；如果 JSON/SDK field 是错误 number/string 或 currency 未绑定，类型无法阻止错误格式化。
- problem: sentinel workaround 不是金融值对象；optional price/quantity/cash fields 的单位关系、非负性、precision 和 public schema 未在这里验证。
- preservedBehavior:
  - 未设置 price/cash 字段在 public text 中省略；设置的 Decimal 保持 toFixed 精度。
  - prefix（如 @、stop @）可作为 presentation 参数保留。
- openQuestions: —

### MAP-6897B55067

- mapping source: [services/uta/src/domain/trading/git/TradingGit.spec.ts:651-754](../../../../services/uta/src/domain/trading/git/TradingGit.spec.ts#L651-L754)
- symbol: export/restore tests
- id: MAP-6897B55067
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.spec.ts:651-754: 测试 JSON export/restore、Decimal 当前/旧 number rehydrate、reconcileBalance string persistence 与 log 稳定性。
- currentBehavior: 测试通过 JSON.stringify(exportState()) 再 TradingGit.restore 修复 Decimal；旧 number 字段被接受；reconcile state 依赖 operation string 才避免 log 调用 Decimal method 崩溃。
- problem: export/restore 只保存 completed Git commits，无法恢复 in-flight transaction/jobs/leases/unknown；rehydration 是隐式兼容修补而非 versioned migration，文件损坏会被 loadGitState 吞掉。
- preservedBehavior:
  - Decimal 精度（包括 sub-satoshi）必须保留。
  - 历史 reconcile operation 若仅能作为 audit evidence，则其 string values 仍可被展示，但不再创建 successful trade。
- openQuestions:
  - 迁移前数据盘点必须枚举 shipped commit.json 的全部 schema versions/形状；未知或缺失 version 只能 LegacyEvidence/MigrationRequired，不能假定 numeric v1/v2 或用测试 fixture 补齐。

### MAP-6A0302D45C

- mapping source: [services/uta/src/domain/trading/git/TradingGit.ts:455-524](../../../../services/uta/src/domain/trading/git/TradingGit.ts#L455-L524)
- symbol: formatOperationChange
- id: MAP-6A0302D45C
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.ts:455-524: formatOperationChange switch 覆盖 place/close/modify/cancel/sync/external/reconcile，并读取 status、quantity、prices、fills。
- currentBehavior: 展示逻辑把 SDK Order/Contract fields 与 legacy status/result 拼成人类文本；reconcile/sync/external 是 synthetic operation tags，不是实际交易 event。
- problem: formatting 位于 execution authority，易把 Unknown/absent 变成 unknown/rejected 文本；原始 SDK/sentinel 和未经单位验证的 Decimal 可能进入用户输出。
- preservedBehavior:
  - BUY size/order terms、close partial/fill、cancel/modify、external observed 等用户可读信息保留。
  - reconcile 以 balance adjustment/observation 词汇显示，不再叫 filled trade。
- openQuestions: —

### MAP-78D27998B6

- mapping source: [services/uta/src/domain/trading/git/interfaces.ts:46-50](../../../../services/uta/src/domain/trading/git/interfaces.ts#L46-L50)
- symbol: ITradingGit audit query methods
- id: MAP-78D27998B6
- sourceEvidence:
  - services/uta/src/domain/trading/git/interfaces.ts:46-50: log/show/status 是同步 Git-shaped reads。
- currentBehavior: 三个读取方法绑定 TradingGit 内存数组/status；show 使用 short hash，status 同时暴露 staging/pending/history。
- problem: 读取 authority 与执行对象同居，不能表达 projection checkpoint/freshness、typed not-found 或 12-state transaction view；读 API 也会被误用作 scheduler admission。
- preservedBehavior:
  - log/show/status user concepts remain as separate views, but names no longer imply Git authority。
  - read APIs remain side-effect free。
- openQuestions: —

### MAP-83170A39D2

- mapping source: [services/uta/src/domain/trading/git/TradingGit.spec.ts:72-107](../../../../services/uta/src/domain/trading/git/TradingGit.spec.ts#L72-L107)
- symbol: add behavior tests
- id: MAP-83170A39D2
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.spec.ts:72-107: add 后可继续 staging；commit 后 pending hash/message 阻止 add；matching hash 的 push 执行一次。
- currentBehavior: 旧测试证明 pending hash 在本对象内锁住 reviewed payload，但 add/commit/push 都依赖 stagingArea、pendingHash 和 inflightWrite 内存字段；没有 revision 或 approval actor。
- problem: 同一 hash 只在一个实例里有意义，跨进程/重启无法防止旧审批作用于新 draft；hash 也没有绑定 policy、expiry、scope 或 prepared plan。
- preservedBehavior:
  - 审核期间禁止改变操作集合的语义保留，但由 durable revision/digest 实现。
  - 同一 command 重试保持幂等；对不同 payload 复用 commandId 返回 IdempotencyConflict。
- openQuestions: —

### MAP-87101B3109

- mapping source: [services/uta/src/domain/trading/git/TradingGit.ts:692-749](../../../../services/uta/src/domain/trading/git/TradingGit.ts#L692-L749)
- symbol: getPendingOrderIds
- id: MAP-87101B3109
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.ts:692-749: getPendingOrderIds newest-first 收 status，遍历 results/legs，使用 operation fallback 推导 symbol/localSymbol/aliceId。
- currentBehavior: pending work 是从 Git commits 的 status='submitted' 推导；bracket legs 通过 result.legs 赋 submitted；operations/results 数组位置决定 symbol hints。
- problem: 无法表达 Ready/Leased/Completed/Failed job、attempt epoch、Unknown、partition conflict；getPending 既是读 API 又隐式 scheduler admission。
- preservedBehavior:
  - submitted parent/leg remains visible until conclusive terminal observation。
  - localSymbol/aliceId hints survive restarts for symbol-scoped brokers。
- openQuestions: —

### MAP-951F07F5BA

- mapping source: [services/uta/src/domain/trading/git/TradingGit.ts:187-239](../../../../services/uta/src/domain/trading/git/TradingGit.ts#L187-L239)
- symbol: reject and executeReject
- id: MAP-951F07F5BA
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.ts:187-239: reject 以 pending hash guard，读取 stateAfter，append synthetic user-rejected commit，onCommit 成功后才清 staging。
- currentBehavior: reject 不调用 broker，但 callback/snapshot 失败会留下 pending proposal；重复 reject 可追加相似 synthetic commit。Main probe 确认 reject 在 unavailable snapshot 时抛出且 pending remains。
- problem: 拒绝是 pre-dispatch domain transition，却被实现成需要 broker state snapshot 和 Git file callback 的异步执行；其 durability 与 execution authority 混淆。
- preservedBehavior:
  - matching review rejection 清除可编辑 proposal 的用户语义保留。
  - snapshot failure 不应阻止 pre-dispatch reject，这是对旧行为的故意修正。
- openQuestions: —

### MAP-9540E06E03

- mapping source: [services/uta/src/domain/trading/git/TradingGit.ts:260-328](../../../../services/uta/src/domain/trading/git/TradingGit.ts#L260-L328)
- symbol: recordReconcile
- id: MAP-9540E06E03
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.ts:260-328: recordReconcile 把 quantityDelta/markPrice 合成 reconcileBalance operation/result filled，直接 append commit/onCommit。
- currentBehavior: UnifiedTradingAccount 在 wallet position drift 时调用该方法；delta 被记录成 success=true/status=filled 的虚拟交易，stateAfter 只是伴随 snapshot，Git cost-basis 会把它折入。
- problem: broker/account observation 被冒充 TradeAction fill，mark price 不等于执行价，无法区分 transfer/reward/external trade/fee dust；没有 observation provenance、confidence、reconciliation job 或 accounting discrepancy。
- preservedBehavior:
  - wallet quantity drift 最终可进入 cost-basis/accounting projection，避免屏幕永久错。
  - in-flight pending order 的 race guard 仍保留，但改为 durable observation classification。
- openQuestions:
  - 各 broker avgCost/transfer source 的 evidence strength 仍由 adapter 声明；markPrice-only adjustment 只能是带 ResidualUncertainty 的 BalanceAdjustment，不能升级为 Fill 或 exact cost basis。

### MAP-973EB4700E

- mapping source: [services/uta/src/domain/trading/git/TradingGit.ts:929-977](../../../../services/uta/src/domain/trading/git/TradingGit.ts#L929-L977)
- symbol: parseOperationResult and mapOrderStatus
- id: MAP-973EB4700E
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.ts:929-977: parseOperationResult 将 raw unknown cast 为 Record，按 success/error/orderId/orderState/legs 组装 OperationResult，mapOrderStatus switch IBKR status 字符串。
- currentBehavior: unknown callback output 直接 cast；非 object/false success 变 rejected string；true success 的 orderState/legs 未 schema 校验，Filled/Cancelled/Inactive/default 归旧 status。
- problem: unchecked cast 让 malformed/SDK-native/raw secret 进入 history；status string 丢 action association、ack vs observation 和 Unknown outcome。
- preservedBehavior:
  - 合法 Filled/Cancelled/Working 状态仍能生成相应 observation/read label。
  - invalid broker response 仍让用户看到失败，但失败类型可指导恢复。
- openQuestions:
  - 各 adapter native status/fill identity 必须分别枚举并版本化；未知 tag/fill identity 转 Unknown/ProtocolViolation，不能以 IBKR status set 作为全局 default 或生成 Filled。

### MAP-9CD95A7E38

- mapping source: [services/uta/src/domain/trading/git/TradingGit.spec.ts:802-941](../../../../services/uta/src/domain/trading/git/TradingGit.spec.ts#L802-L941)
- symbol: pending-order scan tests
- id: MAP-9CD95A7E38
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.spec.ts:802-941: 测试 pending discovery、filled 后移除、bracket TP/SL legs 从出生即追踪、多结果 sync 安全及 push-time fill 排除。
- currentBehavior: pending order ids 从 commits/results newest-first 推导；bracket legs 通过 result.legs 继承父 operation contract；multi-result sync 用 operations[j]??operations[0] 避免越界；filled-at-push 直接不进 pending。
- problem: Git array 同时承担 scheduler admission、order identity registry 和 observation history；不能表示 Planned/Claimed/Unknown/lease，也无法在 restart 区分自有 dispatch 与 external observation。
- preservedBehavior:
  - parent 与 TP/SL leg 都从创建/ack 起被追踪；同步一个 leg 只移除该 leg，其他仍 pending。
  - push-time 已确认 filled 的 order 不额外生成 observe job。
  - multi-result observation 不会因单数组长度差异崩溃。
- openQuestions:
  - Alpaca held stop leg 的 listing 可见性以及各 broker parent/leg native identity 仍需 adapter evidence；未证明时保留 durable parent/leg refs，返回 CapabilityUnavailable/ObserveUnknown，不清理或假定 absence。

### MAP-9D6D33CC94

- mapping source: [services/uta/src/domain/trading/git/TradingGit.ts:606-630](../../../../services/uta/src/domain/trading/git/TradingGit.ts#L606-L630)
- symbol: rehydrateOrder
- id: MAP-9D6D33CC94
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.ts:606-630: rehydrateOrder Object.assign(new Order(), order)，再把六个字段按 String 包成 Decimal。
- currentBehavior: persisted JSON 被复制到新的 mutable IBKR Order，只有 totalQuantity/lmtPrice/auxPrice/trailStopPrice/trailingPercent/cashQty 被修复；任意额外字段和 SDK defaults 被接受。
- problem: SDK class constructor/defaults 与 Partial shape 不是稳定 persistence schema；order type/field relations、unit、TP/SL/GTD/trailing semantics 无校验，且 SDK 实例不应跨 journal/public boundary。
- preservedBehavior:
  - legacy numeric Decimal fields can be explicitly migrated without precision loss。
  - existing supported order terms remain visible and executable through adapter-specific compiler。
- openQuestions:
  - 各 broker attached order/OCA/native protection semantics 仍需 capability evidence；不支持或未证明时 compiler 返回 Unavailable/CapabilityUnavailable 并拒绝整条 action，不能只发送 naked entry。

### MAP-9E51B81D73

- mapping source: [services/uta/src/domain/trading/git-persistence.ts:27-40](../../../../services/uta/src/domain/trading/git-persistence.ts#L27-L40)
- symbol: loadGitState
- id: MAP-9E51B81D73
- sourceEvidence:
  - services/uta/src/domain/trading/git-persistence.ts:27-40: loadGitState 对 JSON.parse 与 readFile 的所有异常都 catch，primary 失败后尝试 legacy，最终返回 undefined。
- currentBehavior: 不存在、权限错误、JSON 语法错误、字段损坏和未知 commit 形状最终都表现为 undefined；下游可能把它当成全新 TradingGit。没有 event sequence、schema version、state invariant 或 corrupt evidence。
- problem: 把 corruption/IO failure 当成 no saved state 会丢失故障可见性；fallback 还可能切换 authority。恢复 completed commits 也无法恢复 Prepared/Queued/Unknown jobs，因而不能决定是否安全 dispatch。
- preservedBehavior:
  - 新安装无 DB 时仍可 bootstrap 空 authority，但这是显式初始化结果，不是 catch-all fallback。
  - 合法旧 Decimal/legacy numeric 字段可经版本迁移后保留精度。
- openQuestions:
  - 第一 executable SQLite slice 必须实测 native migration API、schema/integrity checks 和损坏诊断；在该证据出现前，未知 migration/diagnostic 只能映射 Blocked(StorageFailure|CorruptJournal|MigrationRequired)，不得以空库或旧 fs 分类继续启动。

### MAP-9EF5070764

- mapping source: [services/uta/src/domain/trading/git/TradingGit.ts:899-925](../../../../services/uta/src/domain/trading/git/TradingGit.ts#L899-L925)
- symbol: parsePriceChange and applyPriceChange
- id: MAP-9EF5070764
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.ts:899-925: parsePriceChange 用 trim/startsWith('@')/endsWith('%') 与 parseFloat；applyPriceChange 接受 number 并转 Decimal。
- currentBehavior: `@150` 绝对价格和 `+10%` 相对百分比被 parseFloat 接受；非正 absolute/缺 suffix 返回 false；trailing garbage 可能被 parseFloat 截断。
- problem: 裸 string parser 没有严格 Decimal grammar、单位/instrument、finite/range policy；helper 与 TradingGit/Git authority 共存。
- preservedBehavior:
  - 合法 @absolute、±relative semantics 和 Decimal multiplication 保留。
  - invalid format 仍得到用户可理解的 typed validation response。
- openQuestions: —

### MAP-A899CFD901

- mapping source: [services/uta/src/domain/trading/git/TradingGit.ts:753-897](../../../../services/uta/src/domain/trading/git/TradingGit.ts#L753-L897)
- symbol: simulatePriceChange
- id: MAP-A899CFD901
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.ts:753-897: simulatePriceChange 从 getGitState 读取 state，计算 equity/PnL，按 symbol/all 变价、排除 derivatives、应用 multiplier 并生成 worstCase。
- currentBehavior: 计算本身 read-only，但输入由 TradingGitConfig.getGitState callback 提供，positions 使用 IBKR Contract/Decimal；结果 success/error bag 同时充当协议返回。
- problem: simulation 与 mutable trading authority/Git state 耦合；没有 input snapshot version/asOf/freshness，不能复现实验或知道 stale valuation。
- preservedBehavior:
  - empty positions zero summary、relative/absolute/all changes、short sign/multiplier math、derivative warning 继续。
  - worstCase 文本可作为 view adapter，而不是状态 source。
- openQuestions: —

### MAP-AA480A4C40

- mapping source: [services/uta/src/domain/trading/git/TradingGit.ts:648-650](../../../../services/uta/src/domain/trading/git/TradingGit.ts#L648-L650)
- symbol: setCurrentRound
- id: MAP-AA480A4C40
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.ts:648-650: setCurrentRound 只把任意 number 存到 currentRound，之后复制到 Git commits。
- currentBehavior: round 无范围/单调性/身份语义，setter 可在任意时间改变未来 commit；重启不恢复 setter state。
- problem: 它既不是 TransactionRevision、journal sequence，也不是 session correlation；用它排序/审核会混淆多个 transaction。
- preservedBehavior:
  - 若 UI 仍需要 round 视觉标签可从显式 run metadata 显示。
  - 历史排序以 journal sequence。
- openQuestions: —

### MAP-B9BBBF4697

- mapping source: [services/uta/src/domain/trading/git/TradingGit.ts:77-117](../../../../services/uta/src/domain/trading/git/TradingGit.ts#L77-L117)
- symbol: add and commit
- id: MAP-B9BBBF4697
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.ts:77-117: add 只 push 到 stagingArea；commit 用 timestamp/operations/parentHash 生成短 hash/message，未读取 before-image/compensation/locks/expiry。
- currentBehavior: add 提供方便的 staging UX；commit 只是把当前数组冻结到 pendingHash/message，并不解析 SDK action 或验证 broker/account facts。
- problem: reviewed payload 没有 durable revision，operations 可以包含 Partial/SDK fields；没有 conflict keys、preconditions、criterion、compensation assessment 或 plan serialization。
- preservedBehavior:
  - 用户仍能分步 stage 多 action 后一次 prepare。
  - message 保留为 display/audit metadata，但不能影响事实绑定。
- openQuestions:
  - 跨 broker 的完整 OrderSpec capability evidence 仍需各 broker group 提供；任何字段/保护组合无证据时 Prepare 返回 CapabilityUnavailable/PlanNotRecoverable，不能丢字段或把 legacy IBKR fields 当通用能力。

### MAP-BD4401DF5F

- mapping source: [services/uta/src/domain/trading/git/TradingGit.ts:393-414](../../../../services/uta/src/domain/trading/git/TradingGit.ts#L393-L414)
- symbol: log
- id: MAP-BD4401DF5F
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.ts:393-414: log 反转 this.commits，按 getOperationSymbol 过滤并 slice limit，再生成 CommitLogEntry。
- currentBehavior: log 是同步纯内存 query；默认只看 10 条；symbol 过滤依赖 legacy Operation action/Contract fields。
- problem: 它不能在多进程/重启、projection lag 或 journal sequence 下稳定分页，也没有明确 read freshness；symbol display 不等于 canonical instrument。
- preservedBehavior:
  - 倒序、limit、symbol filter 和 summary shape 可保留为 compatibility response。
  - 查询仍为 read-only，不授予执行权。
- openQuestions: —

### MAP-BE3B808F2D

- mapping source: [services/uta/src/domain/trading/git-persistence.ts:14-16](../../../../services/uta/src/domain/trading/git-persistence.ts#L14-L16)
- symbol: gitFilePath
- id: MAP-BE3B808F2D
- sourceEvidence:
  - services/uta/src/domain/trading/git-persistence.ts:14-16: gitFilePath(accountId) 固定为 data/trading/&lt;accountId&gt;/commit.json。
- currentBehavior: 每个 accountId 有一个独立 commit.json，TradingGit 的整个 completed commit array/head 通过它恢复；文件路径本身因此间接决定了 account 的恢复状态。
- problem: 每账户文件不能原子协调跨账户的 TransactionEvents、EffectJobs、locks、observations 和 command receipts，也没有 sequence/checkpoint 证明。accountId 是裸 string，无法表达显式 AccountScope{subAccountId}，同一账户多个 wallet 的写入可能落到同一个不分区文件。
- preservedBehavior:
  - 按 UTA 查看历史的用户语义保留，但查询键改为 AccountScope 加可选 transaction/audit identity。
  - 多账户之间的历史仍可聚合，前提是 application 明确按 currency/scope 聚合并标注 freshness。
- openQuestions: —

### MAP-C2C9449357

- mapping source: [services/uta/src/domain/trading/git/interfaces.ts:28-34](../../../../services/uta/src/domain/trading/git/interfaces.ts#L28-L34)
- symbol: ITradingGit proposal and execution methods
- id: MAP-C2C9449357
- sourceEvidence:
  - services/uta/src/domain/trading/git/interfaces.ts:28-35: ITradingGit 将 add、commit、push、reject 合为 Git-styled execution contract。
- currentBehavior: 同一接口的 proposal editing、approval identity、broker execution 和 rejection 都由方法名/expected hash 关联；push 是实际 mutation authority。
- problem: Git command vocabulary 不足以表达 Prepare/Approve/Queue/Dispatch/Observe/Compensate，且 synchronous add 与 async broker callback 的 durability boundary 不清。
- preservedBehavior:
  - add→review→execute user flow remains via explicit draft/prepare/approve commands。
  - Reject remains zero-broker mutation pre-dispatch。
- openQuestions: —

### MAP-C2D03D14BB

- mapping source: [services/uta/src/domain/trading/git/TradingGit.spec.ts:541-559](../../../../services/uta/src/domain/trading/git/TradingGit.spec.ts#L541-L559)
- symbol: status query tests
- id: MAP-C2D03D14BB
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.spec.ts:541-559: 初始 status 暴露 staged/pending/head/commitCount，push 后 head 为 8 字符且 count=1。
- currentBehavior: status 把 staging、pending message/hash 和内存 Git head/count 作为当前账户状态；没有 transaction state/version/sequence/jobs/leases/unknown。
- problem: UI 看到 clean/head 不能判断 prepared、queued、executing、reconciling 或 recovery；重启丢失 in-flight state，Git count 也不是 journal position。
- preservedBehavior:
  - 初始无 proposal/transaction 可呈现 clean，但必须说明 authority sequence。
  - 历史 count/head 可以作为审计统计兼容字段，不能再作为执行状态。
- openQuestions: —

### MAP-C3E41E2B51

- mapping source: [services/uta/src/domain/trading/git/TradingGit.ts:241-258](../../../../services/uta/src/domain/trading/git/TradingGit.ts#L241-L258)
- symbol: beginWrite and assertPrepared
- id: MAP-C3E41E2B51
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.ts:241-258: beginWrite 检查 inflightWrite 与 expected pending hash；assertPrepared 检查 staging、pendingMessage、pendingHash。
- currentBehavior: guard 只证明当前对象有 staging/pending 和 caller 提供的 hash 一致；所有 failure 用 Error，不能判断跨进程 version/expiry/authorization。
- problem: 内存检查与实际持久状态之间存在 TOCTOU；hash 不绑定 actor/policy/plan digest，inflightWrite 不能 fence stale worker。
- preservedBehavior:
  - 无 prepared plan 时 push/reject 仍不能 dispatch/写 reject。
  - 同一审批 revision 的串行写仍受到 guard。
- openQuestions: —

### MAP-C65E9CB2ED

- mapping source: [services/uta/src/domain/trading/git/interfaces.ts:1-26](../../../../services/uta/src/domain/trading/git/interfaces.ts#L1-L26)
- symbol: legacy Git boundary imports
- id: MAP-C65E9CB2ED
- sourceEvidence:
  - services/uta/src/domain/trading/git/interfaces.ts:1-26: imports Decimal、IBKR Contract/Order 及 legacy Git operation/result/commit/state/sync/simulation types。
- currentBehavior: ITradingGit 的边界类型把 SDK Contract/Order/Decimal 与 execution, persistence, sync, simulation 混在同一接口；相对 types shim 继续导出 protocol legacy union。
- problem: domain contract 被具体 SDK 与 raw optional fields 污染；没有 Action-&gt;Ack-&gt;Observation-&gt;Failure 关联、AccountScope、serializable plan 或 typed protocol failures。
- preservedBehavior:
  - place/modify/cancel/close 的业务能力保留；simulation/read history 有独立 query。
  - Decimal precision 保留但变为 unit-qualified value object。
- openQuestions: —

### MAP-CA6C7E648F

- mapping source: [services/uta/src/domain/trading/git/TradingGit.ts:45-52](../../../../services/uta/src/domain/trading/git/TradingGit.ts#L45-L52)
- symbol: PendingHashConflictError
- id: MAP-CA6C7E648F
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.ts:45-52: PendingHashConflictError 是带 string code/name 的 Error subclass。
- currentBehavior: stale/concurrent pending writes 通过 throw Error 表示；message 可变，调用者须靠 instanceof/name/code 才能识别。
- problem: expected optimistic concurrency failure 被 exception 和字符串 code 表示，缺 expected/actual version、transaction identity、retry action；跨 process 也不受此 Error 约束。
- preservedBehavior:
  - 旧 PendingHashConflictError 所防止的 stale write 仍被阻止。
  - programmer invariant 仍可 defect/terminate，不把所有 Error 都当业务 failure。
- openQuestions: —

### MAP-D1C7BFF02C

- mapping source: [services/uta/src/domain/trading/git-persistence.ts:42-49](../../../../services/uta/src/domain/trading/git-persistence.ts#L42-L49)
- symbol: createGitPersister
- id: MAP-D1C7BFF02C
- sourceEvidence:
  - services/uta/src/domain/trading/git-persistence.ts:42-49: createGitPersister 返回回调，每次 commit 创建目录并 pretty-print JSON 到 commit.json。
- currentBehavior: onCommit 在 TradingGit 已 append 内存 commit 后被 await；回调写文件失败会让 push/reject 抛错，但内存 pending 清除在回调之后，导致 authority 与文件写入时序分裂。
- problem: 文件 callback 不是 write-ahead，不能原子写 event/outbox/lock，也没有 commit receipt、projection checkpoint 或失败重试语义。若 broker 已发生效果而 callback 失败，重试旧 pending 可能再次 dispatch；若导出成功，仍不代表远端已 fill。
- preservedBehavior:
  - 用户仍可看到提交/拒绝的 Git-like audit row，但 row 的来源是 TransactionRejected/TransactionCommitted 等 event。
  - 回调失败不再重复 broker mutation；这是对旧重试副作用的有意修正。
- openQuestions: —

### MAP-D40EA86F40

- mapping source: [services/uta/src/domain/trading/git/interfaces.ts:72-74](../../../../services/uta/src/domain/trading/git/interfaces.ts#L72-L74)
- symbol: ITradingGit price simulation
- id: MAP-D40EA86F40
- sourceEvidence:
  - services/uta/src/domain/trading/git/interfaces.ts:72-75: simulatePriceChange 作为 ITradingGit method 返回 Promise&lt;SimulatePriceChangeResult&gt;。
- currentBehavior: simulation 与 Git execution/history interface 共存，借 getGitState callback 读取 broker/account state；结果是 success/error bag。
- problem: 读查询被误认为 transaction capability；接口让 Git kernel 依赖 pricing/accounting input，无法提供 snapshot/asOf/freshness 或 typed valuation failures。
- preservedBehavior:
  - legacy simulation numerical behavior and derivative warning preserved。
  - simulation remains read-only and cannot dispatch broker。
- openQuestions: —

### MAP-D4E27E6A2A

- mapping source: [services/uta/src/domain/trading/git/TradingGit.spec.ts:772-798](../../../../services/uta/src/domain/trading/git/TradingGit.spec.ts#L772-L798)
- symbol: sync tests
- id: MAP-D4E27E6A2A
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.spec.ts:772-798: 非空 order updates 产生一个 sync commit/hash/count，空 updates 返回 no-op metadata。
- currentBehavior: sync 把外部 status updates 伪装成 syncOrders Git commit，携带 currentState；空 updates 不写 commit。它没有 dispatch identity、observation provenance、lease 或 unknown。
- problem: 外部事实和本地 intent 混在 commit/results；status 变更是否来自同一 order/version、listing completeness、late event、transport failure 均不可追踪。
- preservedBehavior:
  - 有实际状态变化时审计视图仍能展示一行 per update；无变化可返回 no-change observation result。
  - filledQty/filledPrice 保留 DecimalString 精度，缺失时显式标 incomplete。
- openQuestions:
  - 每个 broker adapter 必须分别声明 listing completeness、namespace/cursor coverage 和 order-version semantics；未有声明时仅 Partial/Unavailable/Unknown，不能由旧 updates shape 推断完整 absence 或版本 CAS。

### MAP-D6856F9117

- mapping source: [services/uta/src/domain/trading/git/TradingGit.spec.ts:263-289](../../../../services/uta/src/domain/trading/git/TradingGit.spec.ts#L263-L289)
- symbol: TradingGit rejection and exception conversion tests
- id: MAP-D6856F9117
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.spec.ts:263-289: resolved success=false 与 thrown Error 都进入 rejected array；throw 的 message 被保存为 error。
- currentBehavior: callback false 被映射为 rejected，网络 Error 也被 catch 后作为 rejected string；Main 的 node 探针同样确认 execution throw 变成 status rejected。
- problem: 异常发生在可能 remote mutation 之后时不能证明 rejection；transport failure、venue rejection、invalid response 和 Unknown 被一条 error string 合并，无法决定 observe/retry/compensate。
- preservedBehavior:
  - 明确 success=false/venue rejection 仍对用户显示 rejected。
  - 抛出网络异常仍让调用者看到失败，但分类和下一步改为 Unknown/observe，而不是错误地完成 rejected commit。
- openQuestions:
  - 各 adapter transport error 是否携带可验证 native identity 仍需 SPI evidence；没有 identity 时将 outcome 持久化为 OutcomeUnknown/RecoveryRequired，由 operator reconciliation 接管，不从 error message 推断。

### MAP-D89349A0F1

- mapping source: [services/uta/src/domain/trading/git/TradingGit.ts:536-544](../../../../services/uta/src/domain/trading/git/TradingGit.ts#L536-L544)
- symbol: status
- id: MAP-D89349A0F1
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.ts:536-544: status 返回 staging、pendingMessage/hash、head 和 commits.length。
- currentBehavior: status 把 proposal/approval/history 混成 Git status，所有值来自 process-local fields。
- problem: 缺少 transaction state/version/sequence、job lease、unknown/recovery owner；status clean 不能证明没有 durable work，head 不能证明 execution completion。
- preservedBehavior:
  - 用户可查询当前 staged proposal 和历史 summary，但名称/响应拆分。
  - clean initial state 仍可呈现。
- openQuestions: —

### MAP-D8B8506C6C

- mapping source: [services/uta/src/domain/trading/git/TradingGit.ts:563-577](../../../../services/uta/src/domain/trading/git/TradingGit.ts#L563-L577)
- symbol: exportState and restore
- id: MAP-D8B8506C6C
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.ts:563-577: exportState 输出 commits/head；restore 新建 TradingGit 后直接赋 commits/head，staging/pending 为空。
- currentBehavior: completed Git history 可 JSON export/restore；任何 Prepared/approval/inflight/job/reconcile state 不在 export，restore 配置 callback 可重新连接 broker。
- problem: restore 只恢复可读历史，不能决定未完成 remote attempt；把 exported head 当 authority 会丢 crash cuts。
- preservedBehavior:
  - 用户仍可导出历史审计数据。
  - 合法 history rehydrate 的 Decimal precision 保留在 migration/replay。
- openQuestions: —

### MAP-DB23AFEBB2

- mapping source: [services/uta/src/domain/trading/git/TradingGit.spec.ts:1022-1132](../../../../services/uta/src/domain/trading/git/TradingGit.spec.ts#L1022-L1132)
- symbol: general simulation tests
- id: MAP-DB23AFEBB2
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.spec.ts:1022-1132: 测试覆盖空 positions、relative/absolute/all changes、multiplier-aware output 与 invalid format error。
- currentBehavior: simulatePriceChange 通过 getGitState callback 读取 position/cash/equity；字符串 parseFloat 后用 Decimal 计算，失败时返回 success=false 与错误文本。
- problem: read callback 既是 broker/authority 依赖又无 snapshot version；PriceChange 输入是裸 strings/numbers 语义，parseFloat 接受尾随垃圾/浮点近似；failure 与 stale/valuation errors 没有 typed distinction。
- preservedBehavior:
  - 无 positions 返回 current/simulated zero PnL；绝对 @200、相对 -10%、all 多 positions 的数值算法保持 Decimal 语义。
  - invalid `bad` 仍是用户可读 validation failure，但不靠 error string 做分类。
- openQuestions:
  - currency/multiplier 的实际 provenance 仍由 valuation/adapters 提供；缺 provenance 时维持 position core 并返回 Incomplete/ValuationUnavailable，不猜 multiplier=1 或 currency，已有 relative/absolute parser policy 保持固定。

### MAP-E516D05AD7

- mapping source: [services/uta/src/domain/trading/git/TradingGit.ts:416-453](../../../../services/uta/src/domain/trading/git/TradingGit.ts#L416-L453)
- symbol: buildOperationSummaries
- id: MAP-E516D05AD7
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.ts:416-453: buildOperationSummaries 以 max(operation/result) 生成行，sync 结果按 result.symbol 归属，placeOrder 另含结构化 terms。
- currentBehavior: summary builder 兼容 parallel arrays 和一个 syncOrders op/N results 特殊布局；result 缺失时仍按 operation[0] 与 rejected default 生成摘要。
- problem: 隐式数组 fallback 会把缺失/错配结果伪装成 rejected；SDK Operation 与 OperationResult action 可能错配；summary 无 schema/provenance/freshness。
- preservedBehavior:
  - 一个 sync batch 的每条状态更新仍单独显示。
  - place order 结构化 side/type/quantity/price/tif 与 text change 同时提供。
- openQuestions: —

### MAP-E5FDCD5D01

- mapping source: [services/uta/src/domain/trading/git/interfaces.ts:52-65](../../../../services/uta/src/domain/trading/git/interfaces.ts#L52-L65)
- symbol: ITradingGit order synchronization and observation
- id: MAP-E5FDCD5D01
- sourceEvidence:
  - services/uta/src/domain/trading/git/interfaces.ts:52-65: sync 接受外部 OrderStatusUpdate/currentState，getPendingOrderIds/getKnownOrderIds 暴露内存 identity；recordObservedOrders 接受 Contract/Order。
- currentBehavior: 接口同时暴露 polling input、identity memory、synthetic external observation commit；没有 durable lease/attempt/completeness/unknown protocol。
- problem: caller 可直接注入 status/currentState，绕过 broker observation provenance；pending/known IDs 在 restart/parallel poller 无权威，sync updates 与 operations/results 平行数组易错配。
- preservedBehavior:
  - poller can cheaply skip no pending work via projection; external order discovery eventually feeds same order lifecycle。
  - symbol/localSymbol hints remain available as read data with explicit scope。
- openQuestions: —

### MAP-E712DEE4C8

- mapping source: [services/uta/src/domain/trading/git/interfaces.ts:36-44](../../../../services/uta/src/domain/trading/git/interfaces.ts#L36-L44)
- symbol: ITradingGit synthetic balance reconciliation
- id: MAP-E712DEE4C8
- sourceEvidence:
  - services/uta/src/domain/trading/git/interfaces.ts:36-44: recordReconcile 接收 aliceId、Decimal quantityDelta/markPrice、完整 stateAfter 和 optional message，返回 CommitHash。
- currentBehavior: 接口明确允许 caller 直接提交 computed stateAfter 并得到 synthetic commit hash；没有 observation source/time/evidence 或 reconciliation job。
- problem: caller supplied stateAfter 成为 cost-basis/history authority；delta/mark 被冒充 successful reconcileBalance operation，无法区分 external transfer、fill race、fee dust。
- preservedBehavior:
  - external balance drift can be represented and reflected in accounting/cost basis after evidence classification。
  - message remains audit metadata if supplied, not execution identity。
- openQuestions: —

### MAP-E7902EB737

- mapping source: [services/uta/src/domain/trading/git/TradingGit.spec.ts:758-768](../../../../services/uta/src/domain/trading/git/TradingGit.spec.ts#L758-L768)
- symbol: current-round tests
- id: MAP-E7902EB737
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.spec.ts:758-768: setCurrentRound(42) 后新 Git commit 的 round 为 42。
- currentBehavior: round 是 TradingGit 对象上的可变 number，随后复制到 commit；无 actor/session、transaction revision、event sequence 或 durable update。
- problem: 同一 round 可以跨多个 transaction/restart 重复，不能作为 approval binding、ordering 或 audit correlation；process-local setter 也可在执行中改变未来记录语义。
- preservedBehavior:
  - UI 若按 round 分组仍可从 audit metadata 得到对应 grouping。
  - 审计顺序使用 durable journal sequence，优先级高于 round。
- openQuestions: —

### MAP-EEB474FAFB

- mapping source: [services/uta/src/domain/trading/git/TradingGit.spec.ts:61-68](../../../../services/uta/src/domain/trading/git/TradingGit.spec.ts#L61-L68)
- symbol: TradingGit suite setup
- id: MAP-EEB474FAFB
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.spec.ts:61-68: beforeEach 每次只以 callback config 创建新的 TradingGit。
- currentBehavior: 每个测试都得到一个空的进程内 commits/staging/inflight 状态；重启、并发实例、SQLite transaction 和 projection rebuild 都不在 setup 中存在。
- problem: 这样的隔离会让内存 boolean 通过而 durable lease/receipt 失败；也无法证明 commit 后 response 丢失或 callback failure 不会重复 dispatch。
- preservedBehavior:
  - 每例仍从干净 draft 开始，避免旧测试之间共享状态。
  - 纯 formatter/simulation 场景可以只用 domain fixture，不为无 IO 计算强行启动 scheduler。
- openQuestions: —

### MAP-F1A04A6551

- mapping source: [services/uta/src/domain/trading/git/TradingGit.spec.ts:490-516](../../../../services/uta/src/domain/trading/git/TradingGit.spec.ts#L490-L516)
- symbol: reject expected-hash tests
- id: MAP-F1A04A6551
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.spec.ts:490-516: stale/missing expected hash 不写 rejection commit；matching hash 写 user-rejected commit 并清 pending。
- currentBehavior: reject 与 push 共用 pending hash guard；matching reject 会先读取 stateAfter，再 append synthetic commit/onCommit，callback 失败则 pending 不清。
- problem: Reject 没有 broker mutation，但依赖内存 commit/callback，因此拒绝可能重复写、重启消失；旧 hash 还把 approval identity 和 optimistic version 混为一谈。
- preservedBehavior:
  - stale/missing approval proof 仍不产生 rejection event。
  - 匹配拒绝仍清理 proposal 的可编辑状态，但清理由 durable TransactionRejected 投影驱动。
- openQuestions: —

### MAP-F54308897B

- mapping source: [services/uta/src/domain/trading/git/TradingGit.spec.ts:1-59](../../../../services/uta/src/domain/trading/git/TradingGit.spec.ts#L1-L59)
- symbol: TradingGit test fixtures
- id: MAP-F54308897B
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.spec.ts:1-59: fixtures 直接构造 IBKR Contract/Order/OrderState、GitState、unknown executeOperation/getGitState callbacks，并用 Operation 作为测试输入。
- currentBehavior: 测试 fixture 把 SDK 实例和任意 callback 视为领域输入，默认 raw response 只需包含 success/orderId/execution。它覆盖旧 Git happy path，但没有 durable identity、AccountScope、ack 与 observation 的关联。
- problem: 这种 fixture 会把“callback 返回对象可 cast”为协议契约，掩盖 native sentinel、unknown outcome、partial fill、sub-account 和 plan serialization 缺口。测试只验证内存数组，不验证 journal-before-dispatch。
- preservedBehavior:
  - 保留现有 place/close/cancel、sentinel、sync、bracket leg、simulation 场景作为行为证据。
  - 不保留仅因旧 API 把抛出的 Error 归入 rejected 的错误语义；改测 typed unknown。
- openQuestions: —

### MAP-F5950919AF

- mapping source: [services/uta/src/domain/trading/git/TradingGit.spec.ts:410-488](../../../../services/uta/src/domain/trading/git/TradingGit.spec.ts#L410-L488)
- symbol: Git log behavior tests
- id: MAP-F5950919AF
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.spec.ts:410-488: log 测试覆盖空结果、逆时间、symbol filter、limit、operation summaries 以及 limit order 的结构化/text terms。
- currentBehavior: log() 只反转 process-local commits，默认 limit=10，按 operation symbol 过滤，再格式化摘要；没有 journal sequence/asOf/freshness，也没有 cursor。
- problem: 重启、projection lag 和多进程写入时内存数组不是可复现读源；limit 只是数组截断，无法知道是否还有更早事件。
- preservedBehavior:
  - 默认倒序历史、symbol filter、limit、operation summaries 和 limit-order terms 均保留。
  - 空历史仍返回空 page，但需带 checkpoint/asOf 以区分 projection 尚未建立。
- openQuestions: —

### MAP-F6932D3C99

- mapping source: [services/uta/src/domain/trading/git/TradingGit.ts:546-561](../../../../services/uta/src/domain/trading/git/TradingGit.ts#L546-L561)
- symbol: projectOperation and projectCommit
- id: MAP-F6932D3C99
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.ts:546-561: projectOperation/projectCommit 复制 outward operations，并以 OrderHelper.toWire 去除 IBKR sentinel 后 cast 回 Partial&lt;Order&gt;/Order。
- currentBehavior: public observers 得到 spread 的 legacy Operation，place/observed/modify 的 OrderHelper.toWire 结果通过 unknown cast 回 SDK 类型；其他 action 原样返回。
- problem: redaction useful but cast hides schema; raw SDK fields、unknown future operation、secret/native payload 仍可穿透。projection code also remains execution class。
- preservedBehavior:
  - sentinel 不进入 UI/MCP/on-disk public projection。
  - projection mutation 不回写 authority。
- openQuestions: —

### MAP-F70A1BBFEE

- mapping source: [services/uta/src/domain/trading/git/interfaces.ts:77-81](../../../../services/uta/src/domain/trading/git/interfaces.ts#L77-L81)
- symbol: TradingGitConfig
- id: MAP-F70A1BBFEE
- sourceEvidence:
  - services/uta/src/domain/trading/git/interfaces.ts:77-81: TradingGitConfig 的 executeOperation 返回 unknown，getGitState async，onCommit 接收 GitExportState。
- currentBehavior: config callback 可以直接调用 broker mutation；raw return 进入 unchecked parser；getGitState 负责 state snapshot；onCommit 作为文件/外部 persistence callback。没有 scope, dispatch identity, lease, typed failure 或 ack。
- problem: callbacks 把 IO ownership 反向注入 domain，并让任何 caller 提供不受 schema 约束的执行函数；onCommit failure 与 broker outcome 时序冲突，getGitState failure 可能影响后置清理。
- preservedBehavior:
  - Mock/test adapters still can inject deterministic interpreter behavior, now through named ports and independent ledger。
  - post-commit notifications remain possible but cannot block state cleanup or authorize retry。
- openQuestions: —

### MAP-F746052C23

- mapping source: [services/uta/src/domain/trading/git/TradingGit.spec.ts:111-131](../../../../services/uta/src/domain/trading/git/TradingGit.spec.ts#L111-L131)
- symbol: commit preparation tests
- id: MAP-F746052C23
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.spec.ts:111-131: commit 只产生八字符 hash/message/count，空 staging 抛错，并在 status 暴露 pendingMessage。
- currentBehavior: commit 的测试只验证 staging 非空和短 hash 的形状；timestamp、operations、parentHash 被 JSON.stringify 后截断为 hash，不读取 broker before-image、compensation 或 expiry。
- problem: 一个审计 hash 不是 PreparedPlan：它无法证明 action 已解析、单位正确、冲突 keys/locks、preconditions、commit criterion 或每 step 的补偿 capability。
- preservedBehavior:
  - message 可作为审计元数据保留，但不再影响计划 identity 或授权。
  - 空 staging 仍应是明确业务拒绝而非崩溃 defect。
- openQuestions:
  - 每个 adapter 必须提供 NativePlanRecord 的 schema/compiler version、无 secret 的可重建证据和 capability fingerprint；未提供时 Prepare 返回 PlanNotRecoverable/CapabilityUnavailable，绝不把 action 送入 approval。

### MAP-FA38762FE7

- mapping source: [services/uta/src/domain/trading/git/TradingGit.spec.ts:563-647](../../../../services/uta/src/domain/trading/git/TradingGit.spec.ts#L563-L647)
- symbol: sentinel projection tests
- id: MAP-FA38762FE7
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.spec.ts:563-647: 测试要求 status/show/export 不含 IBKR UNSET_DECIMAL，真实 Decimal round-trip，projection mutation 不泄漏。
- currentBehavior: OrderHelper.toWire 在 public observer 前移除 sentinel；测试还验证 Decimal 保留和 projection spread 防止引用泄漏。但返回值仍是 cast 后的 SDK-shaped Operation。
- problem: sentinel stripping 只修复一类 IBKR 表示问题，不是 public schema；cast Partial&lt;Order&gt;/Order 仍允许 SDK 默认字段、raw payload 或未来未知字段跨边界。
- preservedBehavior:
  - MKT order 不显示 lmt/aux/trailing/cash 的 sentinel；真实 quantity/limit decimal 精度保留。
  - 修改 projection 返回值不会改变内部 staging/authority。
- openQuestions:
  - 每个 adapter 必须列出 native sentinel/null/status boundary codec；已知 sentinel 转 Option/Unavailable，未知值转 ProtocolViolation/Unknown，不得以 IBKR 集合或 raw string 作为全局 default。

### MAP-FE5C1D68F9

- mapping source: [services/uta/src/domain/trading/git/TradingGit.spec.ts:389-406](../../../../services/uta/src/domain/trading/git/TradingGit.spec.ts#L389-L406)
- symbol: TradingGit failed-cancel result test
- id: MAP-FE5C1D68F9
- sourceEvidence:
  - services/uta/src/domain/trading/git/TradingGit.spec.ts:389-406: cancelOrder success=false 的 callback 结果进入 rejected 并暴露 error string。
- currentBehavior: 取消失败只有 action 字符串和错误文本；没有 cancellation target version、已有 fills、dispatch identity 或 unknown outcome。
- problem: cancel request 可能已被 venue 接收但响应丢失；NotFound 也不等价于未取消（订单可能已成交/不存在于当前命名空间）。字符串无法驱动安全 recovery。
- preservedBehavior:
  - 明确 venue refusal 仍显示 cancel failed。
  - 成功 cancel request 未确认最终 order state 时不报告 completed cancellation，这是有意更正。
- openQuestions:
  - 只有 adapter 证明完整 namespace/scope、分页 cursor、最终一致性边界和 absence horizon 后 NotFound 才可终止；否则统一 NotFoundAmbiguous/ObserveUnknown，保留 recovery，不把空列表当 absence。
