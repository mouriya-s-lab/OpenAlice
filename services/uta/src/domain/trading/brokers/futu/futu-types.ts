/**
 * Futu broker config + minimal SDK / protobuf shape adapters.
 *
 * futu-api ships no TypeScript types and talks to a local OpenD gateway
 * over WebSocket + protobuf. We model only the request objects we send
 * and the response subset we read. Numeric enum values are inlined as
 * named constants in futu-contracts.ts (the SDK does not export them).
 *
 * Unlike Longbridge's high-level Rust-NAPI calls, every Futu request is a
 * protobuf `{ c2s: {...} }` envelope and every response is a decoded
 * `{ retType, retMsg, errCode, s2c }`. `retType === 0` means success;
 * the SDK already rejects the promise otherwise (see main.js `_sendCmd`).
 */

/**
 * protobuf uint64 fields (accID / orderID / positionID / connID) decode to
 * a `long` instance, not a JS number — JS can't hold 2^53+ exactly. We
 * keep them opaque and stringify at the boundary. number/string accepted
 * because our own constructed requests pass them through unchanged.
 */
export type U64 = number | string | { toString(): string; toNumber(): number }

/** Trading market a Futu account is scoped to (header.trdMarket level). */
export type FutuTrdMarketName = 'HK' | 'US' | 'CN' | 'SG' | 'JP' | 'AU' | 'MY' | 'CA'

export interface FutuBrokerConfig {
  id?: string
  label?: string
  /** OpenD gateway host (e.g. "127.0.0.1"). */
  host: string
  /** OpenD gateway port (FutuOpenD default 11111). */
  port: number
  /** wss:// when OpenD is configured with TLS, else ws://. Default false. */
  ssl?: boolean
  /** OpenD connection key — only when OpenD enforces one (encrypt setting). */
  connKey?: string
  /**
   * Trade unlock password (plaintext). Real-environment write ops
   * (place / modify / cancel) require an unlocked session; OpenD verifies
   * an MD5 of this. Simulate (paper) environment never needs it.
   */
  unlockPwd?: string
  /** Simulate (paper) vs Real (live). */
  paper: boolean
  /**
   * Trading market this account trades. Futu binds one accID to one
   * trading market (unlike Longbridge's single multi-market account), so a
   * FutuBroker instance is scoped to one market — configure multiple
   * accounts for multiple markets.
   */
  market: FutuTrdMarketName
  /**
   * Optional explicit business account id. When omitted, init() picks the
   * first account from GetAccList matching {env, market}.
   */
  accId?: string
}

// ==================== SDK response subsets (s2c payloads) ====================

/** Subset of {@link Trd_Common.TrdAcc} we read to pick an account. */
export interface FutuAccLike {
  trdEnv: number
  accID: U64
  trdMarketAuthList: number[]
  accType?: number
  simAccType?: number
  securityFirm?: number
}

/** Subset of {@link Trd_Common.Funds} we read. */
export interface FutuFundsLike {
  power: number
  totalAssets: number
  cash: number
  marketVal: number
  frozenCash?: number
  avlWithdrawalCash?: number
  currency?: number
  unrealizedPL?: number
  realizedPL?: number
  initialMargin?: number
  maintenanceMargin?: number
}

/** Subset of {@link Trd_Common.Position} we read. */
export interface FutuPositionLike {
  positionID: U64
  positionSide: number
  code: string
  name: string
  qty: number
  canSellQty: number
  price: number
  costPrice?: number
  val: number
  plVal: number
  currency?: number
  secMarket?: number
  trdMarket?: number
  dilutedCostPrice?: number
  averageCostPrice?: number
  unrealizedPL?: number
  realizedPL?: number
}

/** Subset of {@link Trd_Common.Order} we read. */
export interface FutuOrderLike {
  trdSide: number
  orderType: number
  orderStatus: number
  orderID: U64
  orderIDEx: string
  code: string
  name: string
  qty: number
  price?: number
  fillQty?: number
  fillAvgPrice?: number
  lastErrMsg?: string
  timeInForce?: number
  secMarket?: number
  currency?: number
  trdMarket?: number
}

export interface FutuSecurity {
  market: number
  code: string
}

/** Subset of {@link Qot_Common.BasicQot} we read. */
export interface FutuBasicQotLike {
  security: FutuSecurity
  name?: string
  isSuspended?: boolean
  curPrice: number
  highPrice: number
  lowPrice: number
  openPrice: number
  lastClosePrice: number
  volume: U64
  updateTimestamp?: number
  optionExData?: { contractMultiplier?: number; contractSize?: number }
}

export interface FutuOrderBookItem {
  price: number
  volume: U64
  orederCount?: number
}

/**
 * Subset of {@link Qot_Common.Snapshot}.basic we read. GetSecuritySnapshot is
 * subscription-free (unlike GetBasicQot, which needs a prior Sub), so it's the
 * right call for one-shot quotes. It carries no order book.
 */
export interface FutuSnapshotBasicLike {
  curPrice: number
  highPrice: number
  lowPrice: number
  openPrice: number
  lastClosePrice: number
  volume: U64
  updateTimestamp?: number
  isSuspended?: boolean
}
export interface FutuSnapshotLike {
  basic: FutuSnapshotBasicLike
}

/** Subset of {@link Qot_Common.SecurityStaticInfo} we read for lot size. */
export interface FutuStaticInfoLike {
  basic: {
    security: FutuSecurity
    lotSize: number
    secType: number
    name: string
  }
}

/** Global market clock — one QotMarketState per market. */
export interface FutuGlobalStateS2C {
  marketHK: number
  marketUS: number
  marketSH: number
  marketSZ: number
  qotLogined: boolean
  trdLogined: boolean
  connID?: U64
  time?: U64
}

// ==================== SDK wire envelope + client surface ====================

export interface FutuResponse<S2C> {
  retType: number
  retMsg?: string
  errCode?: number
  s2c?: S2C
}

/** Trade protocol header — every trade c2s carries it. */
export interface FutuTrdHeader {
  trdEnv: number
  accID: U64
  trdMarket: number
}

/** Anti-replay packet id for trade write ops. */
export interface FutuPacketID {
  connID: U64
  serialNo: number
}

/**
 * The subset of futu-api's `ftWebsocket` we call. Each method wraps a
 * protobuf cmd and resolves the decoded Response (or rejects it).
 */
export interface FutuWebsocket {
  onlogin: ((ret: boolean, msg: unknown) => void) | null
  start(ip: string, port: number, ssl: boolean, key?: string): void
  getConnID(): number

  GetGlobalState(req: { c2s: { userID: number } }): Promise<FutuResponse<FutuGlobalStateS2C>>
  GetAccList(req: { c2s: { userID: number; trdCategory?: number; needGeneralSecAccount?: boolean } }): Promise<FutuResponse<{ accList?: FutuAccLike[] }>>
  UnlockTrade(req: { c2s: { unlock: boolean; pwdMD5?: string; securityFirm?: number } }): Promise<FutuResponse<unknown>>
  GetFunds(req: { c2s: { header: FutuTrdHeader; refreshCache?: boolean; currency?: number } }): Promise<FutuResponse<{ funds?: FutuFundsLike }>>
  GetPositionList(req: { c2s: { header: FutuTrdHeader; refreshCache?: boolean } }): Promise<FutuResponse<{ positionList?: FutuPositionLike[] }>>
  GetOrderList(req: { c2s: { header: FutuTrdHeader; filterConditions?: { idList?: U64[] }; refreshCache?: boolean } }): Promise<FutuResponse<{ orderList?: FutuOrderLike[] }>>
  PlaceOrder(req: { c2s: FutuPlaceOrderC2S }): Promise<FutuResponse<{ orderID?: U64; orderIDEx?: string }>>
  ModifyOrder(req: { c2s: FutuModifyOrderC2S }): Promise<FutuResponse<{ orderID: U64 }>>
  GetBasicQot(req: { c2s: { securityList: FutuSecurity[] } }): Promise<FutuResponse<{ basicQotList?: FutuBasicQotLike[] }>>
  GetSecuritySnapshot(req: { c2s: { securityList: FutuSecurity[] } }): Promise<FutuResponse<{ snapshotList?: FutuSnapshotLike[] }>>
  GetOrderBook(req: { c2s: { security: FutuSecurity; num: number } }): Promise<FutuResponse<{ orderBookAskList?: FutuOrderBookItem[]; orderBookBidList?: FutuOrderBookItem[] }>>
  GetStaticInfo(req: { c2s: { securityList: FutuSecurity[] } }): Promise<FutuResponse<{ staticInfoList?: FutuStaticInfoLike[] }>>
}

export interface FutuPlaceOrderC2S {
  packetID: FutuPacketID
  header: FutuTrdHeader
  trdSide: number
  orderType: number
  code: string
  qty: number
  price?: number
  secMarket?: number
  timeInForce?: number
  auxPrice?: number
  trailType?: number
  trailValue?: number
  fillOutsideRTH?: boolean
}

export interface FutuModifyOrderC2S {
  packetID: FutuPacketID
  header: FutuTrdHeader
  orderID: U64
  modifyOrderOp: number
  qty?: number
  price?: number
  auxPrice?: number
}

export type FutuWebsocketCtor = new () => FutuWebsocket
