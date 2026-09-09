# 旧实现的局部故障注入证据

目的：检验源代码的实际分支，给具体设计提供反例。使用当前仓库的真实 `TradingGit` 和 guards，依赖输入是本地回调/数据，没有连接券商、数据库或真实账户。**不是新运行时的端到端验收，也没有修复生产代码。**

环境：Node `v26.8.1`、tsx `v4.21.0`。第一次使用 `pnpm exec tsx -e` 触发 CJS 导入失败：IBKR package 仅声明 import/openalice-source export。读取 `packages/ibkr/package.json:5-11` 后，改用已声明的 ESM source condition。没有修改 package exports 或安装依赖。下面命令按此路径实际执行成功；运行器另输出 DEP0205 deprecation warning，不影响这些断言结果。

## E01 执行后快照/持久化失败与重试

对应：`TradingGit.ts:119-185`（MAP-2DD4753D43）、`:187-239`（MAP-951F07F5BA）、`:929-977`（MAP-973EB4700E）。

| 注入点 | 首次失败后 | 同 pending hash 重试后 |
|---|---|---|
| getGitState | 执行器调用 1 次；pending 保留；commits=0 | 执行器调用累计 2 次；commits=1 |
| onCommit | 执行器调用 1 次；pending 保留；commits=1 | 执行器调用累计 2 次；commits=2 |

另观察到：executeOperation 抛出异常后结果被记作 `rejected`；reject 在 getGitState 不可用时失败并保留 pending。

**具体设计约束**：

- approval/dispatch 的 durable identity 必须先于 remote mutation；不能只把 onCommit 换成 SQL API 而保留当前调用顺序。
- command receipt 与结果查询需要覆盖 commit 成功但响应失败；同命令重试不重新执行所有 staged operations。
- post-execution account snapshot 是独立观察/投影，不得成为“这笔交易是否已执行”的唯一保存前提。
- 执行异常必须结合已跨派发边界的 durable facts 分类；exception 不自动证明 broker rejected。
- 无已派发动作的用户 reject 是本地授权状态转移，不应依赖 broker snapshot 才能完成。

可复现命令：

```bash
node --import tsx --conditions=openalice-source --input-type=module <<'NODE'
import { TradingGit } from './services/uta/src/domain/trading/git/TradingGit.ts';
import assert from 'node:assert/strict';
const snapshot=()=>({netLiquidation:'1000',totalCashValue:'1000',unrealizedPnL:'0',realizedPnL:'0',positions:[],pendingOrders:[]});
async function failureCase(cut){
 let dispatches=0,failOnce=true;
 const git=new TradingGit({
  executeOperation:async()=>{dispatches++;return {success:true,orderId:'test-order',orderState:{status:'Cancelled'}}},
  getGitState:async()=>{if(cut==='snapshot'&&failOnce){failOnce=false;throw new Error('injected snapshot failure')}return snapshot()},
  onCommit:async()=>{if(cut==='persist'&&failOnce){failOnce=false;throw new Error('injected persistence failure')}}
 });
 git.add({action:'cancelOrder',orderId:'test-order'});
 const prepared=git.commit('isolated source experiment');
 await assert.rejects(git.push(prepared.hash));
 const afterFailure={dispatches,pending:git.status().pendingHash===prepared.hash,commits:git.exportState().commits.length};
 await git.push(prepared.hash);assert.equal(dispatches,2);
 return {cut,afterFailure,afterRetry:{dispatches,commits:git.exportState().commits.length}};
}
const failures=[await failureCase('snapshot'),await failureCase('persist')];
const git=new TradingGit({executeOperation:async()=>{throw new Error('injected failure after possible send')},getGitState:async()=>snapshot()});
git.add({action:'cancelOrder',orderId:'test-order'});
const pending=git.commit('unknown outcome classification');
const result=await git.push(pending.hash);assert.equal(result.rejected[0]?.status,'rejected');
const offline=new TradingGit({executeOperation:async()=>{throw new Error('must not dispatch')},getGitState:async()=>{throw new Error('broker read unavailable')}});
offline.add({action:'cancelOrder',orderId:'test-order'});
const rejectPending=offline.commit('local rejection');
await assert.rejects(offline.reject('user rejects',rejectPending.hash));
assert.equal(offline.status().pendingHash,rejectPending.hash);
console.log(JSON.stringify({failures,thrownExecutionOutcome:result.rejected[0]?.status,rejectDependsOnBrokerSnapshot:true},null,2));
NODE
```

## E02 Guard 评估会改变后续准入

对应：`guards/cooldown.ts:15-31`、`guard-pipeline.ts:20-35`、`max-position-size.ts:15-47`、`symbol-whitelist.ts:16-23`。

实际观察：

- `[Cooldown, later rejecting guard]` 第一次由后续 guard 拒绝；第二次却被 cooldown 拒绝；执行器调用总数仍为 0。
- 对没有现存仓位的新 instrument，巨大 Units order 无法估值时 MaxPositionSize 返回 null（放行）。
- `cashQty=100`、`netLiquidation=0` 时 MaxPositionSize 同样返回 null。
- whitelist 不含目标标的，但 modifyOrder 没有可解析 symbol 时返回 null。

**具体设计约束**：Cooldown 的评估与 reservation 提交分开；估值结果 Unknown、非正净值和 canonical instrument 解析失败不得变成许可。降低风险的撤单/平仓豁免应是明确 ActionRiskClass policy，不是缺字段造成的绕过。

可复现命令：

```bash
node --import tsx --conditions=openalice-source --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import Decimal from 'decimal.js';
import { Contract, Order } from '@traderalice/ibkr';
import { CooldownGuard } from './services/uta/src/domain/trading/guards/cooldown.ts';
import { MaxPositionSizeGuard } from './services/uta/src/domain/trading/guards/max-position-size.ts';
import { SymbolWhitelistGuard } from './services/uta/src/domain/trading/guards/symbol-whitelist.ts';
import { createGuardPipeline } from './services/uta/src/domain/trading/guards/guard-pipeline.ts';
const contract=new Contract();contract.symbol='TST';
const order=new Order();order.action='BUY';order.orderType='MKT';order.totalQuantity=new Decimal('100000');
const operation={action:'placeOrder',contract,order};const account={netLiquidation:'1000'};let dispatches=0;
const pipeline=createGuardPipeline(async()=>{dispatches++;return {success:true}},
 {getPositions:async()=>[],getAccount:async()=>account},
 [new CooldownGuard({minIntervalMs:60000}),{name:'downstream-reject',check:()=> 'injected later guard rejection'}]);
const first=await pipeline(operation),second=await pipeline(operation);
assert.match(first.error,/downstream-reject/);assert.match(second.error,/cooldown/);assert.equal(dispatches,0);
const max=new MaxPositionSizeGuard({maxPercentOfEquity:25});
const unpriced=max.check({operation,positions:[],account});assert.equal(unpriced,null);
const cashOrder=new Order();cashOrder.action='BUY';cashOrder.orderType='MKT';cashOrder.cashQty=new Decimal('100');
const zeroEquity=max.check({operation:{action:'placeOrder',contract,order:cashOrder},positions:[],account:{netLiquidation:'0'}});
assert.equal(zeroEquity,null);
const unknownIdentity=new SymbolWhitelistGuard({symbols:['ALLOWED']}).check({operation:{action:'modifyOrder',orderId:'existing',changes:{}},positions:[],account});
assert.equal(unknownIdentity,null);
console.log(JSON.stringify({cooldownAfterLaterGuardReject:{first:first.error,second:second.error,dispatches},unpricedNewPositionAllowed:unpriced===null,zeroEquityNotionalAllowed:zeroEquity===null,modifyUnknownSymbolAllowed:unknownIdentity===null},null,2));
NODE
```
