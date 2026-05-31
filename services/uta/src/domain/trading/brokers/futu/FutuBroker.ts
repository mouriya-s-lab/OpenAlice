/**
 * FutuBroker — IBroker adapter for Futu OpenAPI (via a local OpenD gateway).
 *
 * Covers HK / US / CN (A-share) / SG securities. Unlike Longbridge's single
 * multi-market account, Futu binds one business account (accID) to one
 * trading market, so a FutuBroker instance is scoped to one market
 * (`cfg.market`); configure multiple accounts for multiple markets.
 *
 * Transport: futu-api speaks protobuf over a WebSocket to a local OpenD
 * process. This adapter assumes OpenD is already running and reachable at
 * `host:port` — provisioning/deploying OpenD is out of scope here.
 *
 * Auth model differs from Longbridge: there is no API key. OpenD itself is
 * already logged into the Futu account; the adapter only (a) connects to
 * OpenD, (b) picks the business account via GetAccList, and (c) unlocks
 * trading with the trade password before any write op in the real
 * environment (Simulate needs no unlock).
 */

import { z } from 'zod'
import Decimal from 'decimal.js'
import { createHash } from 'node:crypto'
import { Contract, ContractDescription, ContractDetails, Order, UNSET_DECIMAL } from '@traderalice/ibkr'
import {
  BrokerError,
  type IBroker,
  type AccountCapabilities,
  type AccountInfo,
  type Position,
  type PlaceOrderResult,
  type OpenOrder,
  type Quote,
  type MarketClock,
  type TpSlParams,
  type BrokerAccountInfo,
} from '../types.js'
import '../../contract-ext.js'
import { buildPosition } from '../contract-builder.js'
import { loadFutuApi } from './futu-sdk-loader.js'
import {
  TRD_ENV_REAL,
  TRD_ENV_SIMULATE,
  MODIFY_OP_NORMAL,
  MODIFY_OP_CANCEL,
  POSITION_SIDE_SHORT,
  accountTrdMarket,
  parseNativeKey,
  makeContract,
  resolveFutuSymbol,
  nativeKeyFromTrd,
  toFutuSecurity,
  toTrdSecMarket,
  ibkrOrderTypeToFutu,
  ibkrTifToFutu,
  ibkrActionToTrdSide,
  trdSideToIbkrAction,
  trdMarketToName,
  marketCurrencyEnum,
  futuAccTypeLabel,
  futuOrderTypeToIbkr,
  futuTifToIbkr,
  makeOrderState,
  currencyEnumToCode,
  defaultCurrencyForMarket,
  isMarketStateOpen,
  globalStateFieldFor,
  echoContractDescription,
} from './futu-contracts.js'
import type {
  FutuBrokerConfig,
  FutuWebsocket,
  FutuTrdHeader,
  FutuPacketID,
  FutuAccLike,
  FutuOrderLike,
  FutuPlaceOrderC2S,
  FutuModifyOrderC2S,
  U64,
} from './futu-types.js'

// Trd_Common.TrdCategory_Security
const TRD_CATEGORY_SECURITY = 1

export class FutuBroker implements IBroker {
  // ---- Self-registration ----

  static configSchema = z.object({
    host: z.string().min(1),
    port: z.number().int().positive(),
    ssl: z.boolean().default(false),
    connKey: z.string().optional(),
    unlockPwd: z.string().optional(),
    paper: z.boolean().default(false),
    market: z.enum(['HK', 'US', 'CN', 'SG', 'JP', 'AU', 'MY', 'CA']),
    accId: z.string().optional(),
  })

  static fromConfig(config: { id: string; label?: string; brokerConfig: Record<string, unknown> }): FutuBroker {
    const bc = FutuBroker.configSchema.parse(config.brokerConfig)
    return new FutuBroker({
      id: config.id,
      label: config.label,
      host: bc.host,
      port: bc.port,
      ssl: bc.ssl,
      connKey: bc.connKey,
      unlockPwd: bc.unlockPwd,
      paper: bc.paper,
      market: bc.market,
      accId: bc.accId,
    })
  }

  // ---- Instance ----

  readonly id: string
  readonly label: string
  private readonly cfg: FutuBrokerConfig
  private readonly trdEnv: number
  private readonly trdMarketEnum: number
  private ws!: FutuWebsocket
  private accID: U64 = 0
  private connID: U64 = 0
  private serialNo = 0
  private unlocked = false

  constructor(cfg: FutuBrokerConfig) {
    this.cfg = cfg
    this.id = cfg.id ?? (cfg.paper ? 'futu-paper' : 'futu-live')
    this.label = cfg.label ?? (cfg.paper ? 'Futu Paper' : 'Futu')
    this.trdEnv = cfg.paper ? TRD_ENV_SIMULATE : TRD_ENV_REAL
    this.trdMarketEnum = accountTrdMarket(cfg.market)
  }

  // ---- Lifecycle ----

  private static readonly MAX_INIT_RETRIES = 5
  private static readonly MAX_AUTH_RETRIES = 2
  private static readonly INIT_RETRY_BASE_MS = 1000
  private static readonly LOGIN_TIMEOUT_MS = 10000

  async init(): Promise<void> {
    let lastErr: unknown
    for (let attempt = 1; attempt <= FutuBroker.MAX_INIT_RETRIES; attempt++) {
      try {
        await this.connect()
        await this.loadConnAndAccount()
        // Cheap probe — GetFunds exercises the picked account + trade path.
        await this.ws.GetFunds({ c2s: this.fundsC2S() })
        console.log(`FutuBroker[${this.id}]: connected (paper=${this.cfg.paper}, market=${this.cfg.market})`)
        return
      } catch (err) {
        lastErr = err
        const msg = err instanceof Error ? err.message : String(err)
        const isAuthError = /no account|unlock|password|forbidden|unauthorized/i.test(msg)
        if (isAuthError && attempt >= FutuBroker.MAX_AUTH_RETRIES) {
          throw new BrokerError(
            'AUTH',
            `Futu account/unlock failed — verify OpenD is logged in, the trade password is correct, and an account exists for market=${this.cfg.market}, env=${this.cfg.paper ? 'simulate' : 'real'}.`,
          )
        }
        if (attempt < FutuBroker.MAX_INIT_RETRIES) {
          const delay = FutuBroker.INIT_RETRY_BASE_MS * 2 ** (attempt - 1)
          console.warn(`FutuBroker[${this.id}]: init attempt ${attempt}/${FutuBroker.MAX_INIT_RETRIES} failed (${msg}), retrying in ${delay}ms...`)
          await new Promise(r => setTimeout(r, delay))
        }
      }
    }
    throw lastErr
  }

  /** Open the OpenD WebSocket and wait for the login callback. */
  private async connect(): Promise<void> {
    // Lazy + isolated import: futu-api's proto.js registers its schema into
    // protobufjs's shared roots["default"] at module load — a heavy side
    // effect we keep off the registry path, and which collides with ccxt's
    // protobuf use. loadFutuApi() isolates the root. See futu-sdk-loader.ts.
    const ftWebsocket = await loadFutuApi()
    return new Promise<void>((resolve, reject) => {
      const ws = new ftWebsocket() as FutuWebsocket
      this.ws = ws
      this.unlocked = false
      const timer = setTimeout(
        () => reject(new Error(`OpenD login timeout after ${FutuBroker.LOGIN_TIMEOUT_MS}ms (is OpenD running at ${this.cfg.host}:${this.cfg.port}?)`)),
        FutuBroker.LOGIN_TIMEOUT_MS,
      )
      ws.onlogin = (ret: boolean, msg: unknown) => {
        clearTimeout(timer)
        if (ret) resolve()
        else reject(new Error(`OpenD login failed: ${String(msg)}`))
      }
      ws.start(this.cfg.host, this.cfg.port, this.cfg.ssl ?? false, this.cfg.connKey)
    })
  }

  /** Read the connID (for write-op packet ids) and pick the business account. */
  private async loadConnAndAccount(): Promise<void> {
    const gs = await this.ws.GetGlobalState({ c2s: { userID: 0 } })
    this.connID = gs.s2c?.connID ?? this.ws.getConnID()

    const accResp = await this.ws.GetAccList({
      c2s: { userID: 0, trdCategory: TRD_CATEGORY_SECURITY, needGeneralSecAccount: true },
    })
    const accs = accResp.s2c?.accList ?? []
    const picked = this.pickAccount(accs)
    if (!picked) {
      throw new BrokerError(
        'CONFIG',
        `No Futu account found for market=${this.cfg.market}, env=${this.cfg.paper ? 'simulate' : 'real'}` +
          (this.cfg.accId ? `, accId=${this.cfg.accId}` : '') +
          `. Available: ${accs.map(a => `${String(a.accID)}(env=${a.trdEnv})`).join(', ') || 'none'}`,
      )
    }
    this.accID = picked.accID
  }

  private pickAccount(accs: FutuAccLike[]): FutuAccLike | undefined {
    if (this.cfg.accId) {
      return accs.find(a => String(a.accID) === this.cfg.accId)
    }
    return (
      accs.find(a => a.trdEnv === this.trdEnv && (a.trdMarketAuthList ?? []).includes(this.trdMarketEnum)) ??
      accs.find(a => a.trdEnv === this.trdEnv)
    )
  }

  async close(): Promise<void> {
    // ftWebsocket has no public close; reach the internal base socket
    // best-effort. The Rust-free JS WS is GC'd with the handle anyway.
    try {
      ;(this.ws as unknown as { websock?: { close?: () => void } }).websock?.close?.()
    } catch {
      // ignore — closing a dead socket is not an error worth surfacing
    }
  }

  // ---- Shared helpers ----

  private header(): FutuTrdHeader {
    return { trdEnv: this.trdEnv, accID: this.accID, trdMarket: this.trdMarketEnum }
  }

  /**
   * GetFunds c2s. `currency` is mandatory for multi-currency (US / 综合)
   * accounts — OpenD rejects without it ("缺少必要参数币种"). Single-market
   * accounts accept it too, so we always send the market's base currency.
   */
  private fundsC2S(): { header: FutuTrdHeader; currency: number } {
    return { header: this.header(), currency: marketCurrencyEnum(this.cfg.market) }
  }

  private nextPacketID(): FutuPacketID {
    this.serialNo += 1
    return { connID: this.connID, serialNo: this.serialNo }
  }

  /** Real-environment write ops require an unlocked session. Simulate skips. */
  private async ensureUnlocked(): Promise<void> {
    if (this.trdEnv !== TRD_ENV_REAL) return
    if (this.unlocked) return
    if (!this.cfg.unlockPwd) {
      throw new BrokerError('AUTH', 'Real-environment trading requires unlockPwd (trade password) in the account config.')
    }
    const pwdMD5 = createHash('md5').update(this.cfg.unlockPwd).digest('hex')
    await this.ws.UnlockTrade({ c2s: { unlock: true, pwdMD5 } })
    this.unlocked = true
  }

  private static dstr(n: number | undefined): string {
    return new Decimal(n ?? 0).toString()
  }

  /** Futu rejects with the decoded Response (carries retMsg) or a raw Error. */
  private static errMsg(err: unknown): string {
    if (err && typeof err === 'object' && 'retMsg' in err) {
      const r = err as { retMsg?: string; errCode?: number }
      return `${r.retMsg ?? 'Futu error'}${r.errCode != null ? ` (errCode ${r.errCode})` : ''}`
    }
    return err instanceof Error ? err.message : String(err)
  }

  // ---- Contract search (SearchingCatalog model — no full enumerate) ----

  async searchContracts(pattern: string): Promise<ContractDescription[]> {
    if (!pattern) return []
    // Futu has no fuzzy name search across general securities; echo the
    // pattern as a contract guess (prefixed if supplied, else US).
    return [echoContractDescription(pattern)]
  }

  async getContractDetails(query: Contract): Promise<ContractDetails | null> {
    const nativeKey = resolveFutuSymbol(query)
    if (!nativeKey) return null
    try {
      const resp = await this.ws.GetStaticInfo({ c2s: { securityList: [toFutuSecurity(nativeKey)] } })
      const info = resp.s2c?.staticInfoList?.[0]
      if (!info) return null
      const details = new ContractDetails()
      details.contract = makeContract(nativeKey)
      details.minSize = new Decimal(info.basic.lotSize || 1)
      details.orderTypes = 'MKT,LMT,STP,STP LMT,TRAIL'
      details.stockType = 'COMMON'
      return details
    } catch {
      return null
    }
  }

  // ---- Trading operations ----

  async placeOrder(contract: Contract, order: Order, _tpsl?: TpSlParams): Promise<PlaceOrderResult> {
    const nativeKey = resolveFutuSymbol(contract)
    if (!nativeKey) {
      return { success: false, error: 'Cannot resolve contract to Futu symbol' }
    }
    const futuType = ibkrOrderTypeToFutu(order.orderType)
    if (futuType == null) {
      return { success: false, error: `Order type "${order.orderType}" is not supported by Futu` }
    }
    const futuTif = ibkrTifToFutu(order.tif)
    if (futuTif == null) {
      return { success: false, error: `Time-in-force "${order.tif}" is not supported by Futu (only DAY/GTC/IOC)` }
    }
    if (order.totalQuantity.equals(UNSET_DECIMAL) || order.totalQuantity.lte(0)) {
      return { success: false, error: 'totalQuantity must be > 0 for Futu orders' }
    }

    try {
      await this.ensureUnlocked()
      const c2s: FutuPlaceOrderC2S = {
        packetID: this.nextPacketID(),
        header: this.header(),
        trdSide: ibkrActionToTrdSide(order.action),
        orderType: futuType,
        code: parseNativeKey(nativeKey).code,
        qty: order.totalQuantity.toNumber(),
        secMarket: toTrdSecMarket(nativeKey),
        timeInForce: futuTif,
      }
      if (!order.lmtPrice.equals(UNSET_DECIMAL)) c2s.price = order.lmtPrice.toNumber()
      if (!order.auxPrice.equals(UNSET_DECIMAL)) c2s.auxPrice = order.auxPrice.toNumber()
      if (!order.trailingPercent.equals(UNSET_DECIMAL)) {
        c2s.trailType = 1 // TrailType_Ratio
        c2s.trailValue = order.trailingPercent.toNumber()
      }
      const resp = await this.ws.PlaceOrder({ c2s })
      const orderId = resp.s2c?.orderID != null ? String(resp.s2c.orderID) : resp.s2c?.orderIDEx
      return {
        success: true,
        orderId,
        orderState: makeOrderState(5 /* Submitted */),
      }
    } catch (err) {
      return { success: false, error: FutuBroker.errMsg(err) }
    }
  }

  async modifyOrder(orderId: string, changes: Partial<Order>): Promise<PlaceOrderResult> {
    if (changes.totalQuantity == null || changes.totalQuantity.equals(UNSET_DECIMAL)) {
      return { success: false, error: 'modifyOrder requires totalQuantity for Futu' }
    }
    try {
      await this.ensureUnlocked()
      const c2s: FutuModifyOrderC2S = {
        packetID: this.nextPacketID(),
        header: this.header(),
        orderID: orderId,
        modifyOrderOp: MODIFY_OP_NORMAL,
        qty: changes.totalQuantity.toNumber(),
      }
      if (changes.lmtPrice != null && !changes.lmtPrice.equals(UNSET_DECIMAL)) {
        c2s.price = changes.lmtPrice.toNumber()
      }
      if (changes.auxPrice != null && !changes.auxPrice.equals(UNSET_DECIMAL)) {
        c2s.auxPrice = changes.auxPrice.toNumber()
      }
      await this.ws.ModifyOrder({ c2s })
      return { success: true, orderId, orderState: makeOrderState(5 /* Submitted */) }
    } catch (err) {
      return { success: false, error: FutuBroker.errMsg(err) }
    }
  }

  async cancelOrder(orderId: string): Promise<PlaceOrderResult> {
    try {
      await this.ensureUnlocked()
      await this.ws.ModifyOrder({
        c2s: {
          packetID: this.nextPacketID(),
          header: this.header(),
          orderID: orderId,
          modifyOrderOp: MODIFY_OP_CANCEL,
        },
      })
      return { success: true, orderId, orderState: makeOrderState(15 /* Cancelled_All */) }
    } catch (err) {
      return { success: false, error: FutuBroker.errMsg(err) }
    }
  }

  async closePosition(contract: Contract, quantity?: Decimal): Promise<PlaceOrderResult> {
    const nativeKey = resolveFutuSymbol(contract)
    if (!nativeKey) {
      return { success: false, error: 'Cannot resolve contract to Futu symbol' }
    }
    const positions = await this.getPositions()
    const pos = positions.find(p => resolveFutuSymbol(p.contract) === nativeKey)
    if (!pos) return { success: false, error: `No position for ${nativeKey}` }

    const qty = quantity ?? pos.quantity
    const reverse = new Order()
    reverse.action = pos.side === 'long' ? 'SELL' : 'BUY'
    reverse.orderType = 'MKT'
    reverse.totalQuantity = qty
    reverse.tif = 'DAY'
    return this.placeOrder(contract, reverse)
  }

  // ---- Queries ----

  async getAccount(): Promise<AccountInfo> {
    try {
      const resp = await this.ws.GetFunds({ c2s: this.fundsC2S() })
      const f = resp.s2c?.funds
      if (!f) {
        return {
          baseCurrency: defaultCurrencyForMarket(this.cfg.market),
          netLiquidation: '0',
          totalCashValue: '0',
          unrealizedPnL: '0',
        }
      }
      const baseCurrency = currencyEnumToCode(f.currency) || defaultCurrencyForMarket(this.cfg.market)
      return {
        baseCurrency,
        netLiquidation: FutuBroker.dstr(f.totalAssets),
        totalCashValue: FutuBroker.dstr(f.cash),
        unrealizedPnL: FutuBroker.dstr(f.unrealizedPL),
        buyingPower: FutuBroker.dstr(f.power),
        ...(f.initialMargin != null && { initMarginReq: FutuBroker.dstr(f.initialMargin) }),
        ...(f.maintenanceMargin != null && { maintMarginReq: FutuBroker.dstr(f.maintenanceMargin) }),
      }
    } catch (err) {
      throw BrokerError.from(err)
    }
  }

  async getPositions(): Promise<Position[]> {
    let list
    try {
      const resp = await this.ws.GetPositionList({ c2s: { header: this.header() } })
      list = resp.s2c?.positionList ?? []
    } catch (err) {
      throw BrokerError.from(err)
    }

    const out: Position[] = []
    for (const p of list) {
      const qty = new Decimal(p.qty)
      if (qty.isZero()) continue
      const nativeKey = nativeKeyFromTrd(p.code, p.secMarket)
      const contract = makeContract(nativeKey)
      if (p.name) contract.description = p.name
      const cost = p.averageCostPrice ?? p.dilutedCostPrice ?? p.costPrice ?? 0
      out.push(buildPosition({
        contract,
        currency: currencyEnumToCode(p.currency) || contract.currency,
        side: p.positionSide === POSITION_SIDE_SHORT ? 'short' : 'long',
        quantity: qty.abs(),
        avgCost: FutuBroker.dstr(cost),
        marketPrice: FutuBroker.dstr(p.price),
        // Futu pre-computes market value and P/L server-side — pass through.
        marketValue: FutuBroker.dstr(p.val),
        unrealizedPnL: FutuBroker.dstr(p.plVal),
        realizedPnL: FutuBroker.dstr(p.realizedPL),
        multiplier: '1',
      }))
    }
    return out
  }

  async getOrders(orderIds: string[]): Promise<OpenOrder[]> {
    if (orderIds.length === 0) return []
    try {
      const resp = await this.ws.GetOrderList({
        c2s: { header: this.header(), filterConditions: { idList: orderIds } },
      })
      return (resp.s2c?.orderList ?? []).map(o => this.mapOpenOrder(o))
    } catch (err) {
      throw BrokerError.from(err)
    }
  }

  async getOrder(orderId: string): Promise<OpenOrder | null> {
    try {
      const resp = await this.ws.GetOrderList({
        c2s: { header: this.header(), filterConditions: { idList: [orderId] } },
      })
      const o = resp.s2c?.orderList?.[0]
      return o ? this.mapOpenOrder(o) : null
    } catch {
      return null
    }
  }

  async getQuote(contract: Contract): Promise<Quote> {
    const nativeKey = resolveFutuSymbol(contract)
    if (!nativeKey) throw new BrokerError('EXCHANGE', 'Cannot resolve contract to Futu symbol')
    const sec = toFutuSecurity(nativeKey)
    try {
      // GetSecuritySnapshot is subscription-free; GetBasicQot requires a
      // prior Qot_Sub ("请求获取实时报价接口前，请先订阅Basic数据") which we
      // don't want to manage for one-shot quotes. Snapshots carry no order
      // book, so bid/ask fall back to last — Futu exposes depth only via
      // an OrderBook subscription, out of scope for a point quote.
      const resp = await this.ws.GetSecuritySnapshot({ c2s: { securityList: [sec] } })
      const snap = resp.s2c?.snapshotList?.[0]?.basic
      if (!snap) throw new BrokerError('EXCHANGE', `No quote for ${nativeKey}`)
      const last = FutuBroker.dstr(snap.curPrice)
      return {
        contract: makeContract(nativeKey),
        last,
        bid: last,
        ask: last,
        volume: String(snap.volume),
        high: FutuBroker.dstr(snap.highPrice),
        low: FutuBroker.dstr(snap.lowPrice),
        timestamp: snap.updateTimestamp ? new Date(snap.updateTimestamp * 1000) : new Date(),
      }
    } catch (err) {
      throw BrokerError.from(err)
    }
  }

  async getMarketClock(): Promise<MarketClock> {
    try {
      const gs = await this.ws.GetGlobalState({ c2s: { userID: 0 } })
      const s = gs.s2c
      const now = new Date()
      if (!s) return { isOpen: false, timestamp: now }
      const state = globalStateFieldFor(this.cfg.market, s)
      return { isOpen: isMarketStateOpen(state), timestamp: now }
    } catch (err) {
      throw BrokerError.from(err)
    }
  }

  // ---- Capabilities ----

  getCapabilities(): AccountCapabilities {
    return {
      supportedSecTypes: ['STK'],
      supportedOrderTypes: ['MKT', 'LMT', 'STP', 'STP LMT', 'TRAIL', 'TRAIL LIMIT'],
    }
  }

  // ---- Account discovery ----

  /**
   * Connect to OpenD and enumerate every business account under this login
   * (simulate + real, all markets, cash/margin/sim variants) WITHOUT
   * requiring an account to be picked. The setup wizard calls this with a
   * partial config (host/port only) so the user can choose one; `market`
   * defaults are irrelevant here since GetAccList is account-discovery, not
   * a market-scoped call.
   */
  async listAccounts(): Promise<BrokerAccountInfo[]> {
    await this.connect()
    try {
      const accResp = await this.ws.GetAccList({
        c2s: { userID: 0, trdCategory: TRD_CATEGORY_SECURITY, needGeneralSecAccount: true },
      })
      const accs = accResp.s2c?.accList ?? []
      return accs.map((a): BrokerAccountInfo => {
        const env = a.trdEnv === TRD_ENV_REAL ? 'real' : 'simulate'
        const markets = (a.trdMarketAuthList ?? []).map(trdMarketToName)
        const accType = futuAccTypeLabel(a.trdEnv, a.accType, a.simAccType)
        const label = `${env === 'real' ? 'Real' : 'Sim'} · ${markets.join('/') || '?'}${accType ? ` · ${accType}` : ''} · #${String(a.accID)}`
        return { accId: String(a.accID), env, markets, accType: accType || undefined, label }
      })
    } finally {
      await this.close()
    }
  }

  // ---- Contract identity ----

  getNativeKey(contract: Contract): string {
    return resolveFutuSymbol(contract) ?? contract.symbol ?? ''
  }

  resolveNativeKey(nativeKey: string): Contract {
    return makeContract(nativeKey)
  }

  // ---- Internal ----

  private mapOpenOrder(o: FutuOrderLike): OpenOrder {
    const contract = makeContract(nativeKeyFromTrd(o.code, o.secMarket))
    if (o.name) contract.description = o.name
    const order = new Order()
    order.action = trdSideToIbkrAction(o.trdSide)
    order.totalQuantity = new Decimal(o.qty)
    order.orderType = futuOrderTypeToIbkr(o.orderType)
    if (o.price != null) order.lmtPrice = new Decimal(o.price)
    order.tif = futuTifToIbkr(o.timeInForce ?? 0)
    order.orderId = 0 // Futu orderIds are uint64 strings; preserved via PlaceOrderResult.orderId

    const ret: OpenOrder = {
      contract,
      order,
      orderState: makeOrderState(o.orderStatus, o.lastErrMsg),
    }
    if (o.fillAvgPrice != null) ret.avgFillPrice = new Decimal(o.fillAvgPrice).toString()
    return ret
  }
}
