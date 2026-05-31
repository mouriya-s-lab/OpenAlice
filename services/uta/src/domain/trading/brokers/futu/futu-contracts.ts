/**
 * Contract resolution + enum mapping for Futu.
 *
 * Futu identifies a security by a numeric market enum + a bare code
 * ("00700", "AAPL", "600519"). The market enum differs between the quote
 * channel (Qot_Common.QotMarket) and the trade channel
 * (Trd_Common.TrdSecMarket), so we carry a single human prefix
 * (HK/US/SH/SZ/SG) as the native key and translate to whichever enum the
 * call needs. Native key shape: `HK.00700`, `US.AAPL`, `SH.600519`.
 */

import { Contract, ContractDescription, OrderState } from '@traderalice/ibkr'
import '../../contract-ext.js'
import { buildContract } from '../contract-builder.js'
import type { FutuTrdMarketName } from './futu-types.js'

// ==================== Futu enum constants (SDK exports none) ====================

// Trd_Common.TrdEnv
export const TRD_ENV_SIMULATE = 0
export const TRD_ENV_REAL = 1

// Trd_Common.TrdMarket (account-level, goes in TrdHeader.trdMarket)
export const TRD_MARKET = { HK: 1, US: 2, CN: 3, SG: 6, JP: 15, AU: 8, MY: 111, CA: 112 } as const

// Trd_Common.TrdSide
export const TRD_SIDE_BUY = 1
export const TRD_SIDE_SELL = 2

// Trd_Common.OrderType
export const ORDER_TYPE = {
  Normal: 1, Market: 2, Stop: 10, StopLimit: 11,
  TrailingStop: 14, TrailingStopLimit: 15,
} as const

// Trd_Common.ModifyOrderOp
export const MODIFY_OP_NORMAL = 1
export const MODIFY_OP_CANCEL = 2

// Trd_Common.TimeInForce
export const TIF = { DAY: 0, GTC: 1, IOC: 2 } as const

// Trd_Common.PositionSide
export const POSITION_SIDE_SHORT = 1

// ==================== Market prefix table ====================

interface PrefixInfo {
  /** Qot_Common.QotMarket */
  qotMarket: number
  /** Trd_Common.TrdSecMarket */
  trdSecMarket: number
  exchange: string
  currency: string
}

const PREFIX_TABLE: Record<string, PrefixInfo> = {
  HK: { qotMarket: 1,  trdSecMarket: 1,  exchange: 'SEHK',  currency: 'HKD' },
  US: { qotMarket: 11, trdSecMarket: 2,  exchange: 'SMART', currency: 'USD' }, // SMART covers NYSE/NASDAQ/ARCA
  SH: { qotMarket: 21, trdSecMarket: 31, exchange: 'SSE',   currency: 'CNH' },
  SZ: { qotMarket: 22, trdSecMarket: 32, exchange: 'SZSE',  currency: 'CNH' },
  SG: { qotMarket: 31, trdSecMarket: 41, exchange: 'SGX',   currency: 'SGD' },
  JP: { qotMarket: 41, trdSecMarket: 51, exchange: 'TSEJ',  currency: 'JPY' },
  AU: { qotMarket: 51, trdSecMarket: 61, exchange: 'ASX',   currency: 'AUD' },
  MY: { qotMarket: 61, trdSecMarket: 71, exchange: 'MYX',   currency: 'MYR' },
  CA: { qotMarket: 71, trdSecMarket: 81, exchange: 'TSX',   currency: 'CAD' },
}

/** Account market name → Trd_Common.TrdMarket enum (TrdHeader.trdMarket). */
export function accountTrdMarket(market: FutuTrdMarketName): number {
  return TRD_MARKET[market]
}

// ==================== Symbol parse / build ====================

/**
 * Parse `"HK.00700"` → `{ prefix: "HK", code: "00700" }`.
 * Bare codes without a prefix default to US (Futu accepts US tickers
 * without a market qualifier on the quote side via best-effort).
 */
export function parseNativeKey(key: string): { prefix: string; code: string } {
  const idx = key.indexOf('.')
  if (idx < 0) return { prefix: 'US', code: key.toUpperCase() }
  return { prefix: key.slice(0, idx).toUpperCase(), code: key.slice(idx + 1) }
}

/** Build a fully-qualified IBKR Contract from a Futu native key. */
export function makeContract(nativeKey: string): Contract {
  const { prefix, code } = parseNativeKey(nativeKey)
  const info = PREFIX_TABLE[prefix] ?? PREFIX_TABLE.US
  return buildContract({
    symbol: code,
    localSymbol: `${PREFIX_TABLE[prefix] ? prefix : 'US'}.${code}`,
    secType: 'STK',
    exchange: info.exchange,
    currency: info.currency,
  })
}

/** Map a Trd_Common.TrdSecMarket enum back to a prefix (for positions/orders). */
export function trdSecMarketToPrefix(secMarket: number | undefined): string {
  switch (secMarket) {
    case 1:  return 'HK'
    case 2:  return 'US'
    case 31: return 'SH'
    case 32: return 'SZ'
    case 41: return 'SG'
    case 51: return 'JP'
    case 61: return 'AU'
    case 71: return 'MY'
    case 81: return 'CA'
    default: return 'US'
  }
}

/** Build a native key from a Futu code + TrdSecMarket enum. */
export function nativeKeyFromTrd(code: string, secMarket: number | undefined): string {
  return `${trdSecMarketToPrefix(secMarket)}.${code}`
}

/**
 * Resolve a Contract back to a Futu native key.
 *   1. localSymbol — set by makeContract; round-trips losslessly.
 *   2. aliceId after `|` — the UTA-stamped native key.
 *   3. symbol + currency-derived prefix — best-effort fallback.
 */
export function resolveFutuSymbol(contract: Contract): string | null {
  if (contract.localSymbol && contract.localSymbol.includes('.')) {
    return contract.localSymbol
  }
  if (contract.aliceId) {
    const idx = contract.aliceId.indexOf('|')
    if (idx >= 0) {
      const native = contract.aliceId.slice(idx + 1)
      if (native.includes('.')) return native
    }
  }
  if (!contract.symbol) return null
  return `${inferPrefixFromCurrency(contract.currency)}.${contract.symbol}`
}

function inferPrefixFromCurrency(currency: string | undefined): string {
  switch ((currency ?? '').toUpperCase()) {
    case 'HKD': return 'HK'
    case 'CNY':
    case 'CNH': return 'SH' // ambiguous — SH wins over SZ for stable inference
    case 'SGD': return 'SG'
    default:    return 'US'
  }
}

/** Native key → Futu quote Security `{ market, code }`. */
export function toFutuSecurity(nativeKey: string): { market: number; code: string } {
  const { prefix, code } = parseNativeKey(nativeKey)
  const info = PREFIX_TABLE[prefix] ?? PREFIX_TABLE.US
  return { market: info.qotMarket, code }
}

/** Native key → Trd_Common.TrdSecMarket enum (for PlaceOrder.secMarket). */
export function toTrdSecMarket(nativeKey: string): number {
  const { prefix } = parseNativeKey(nativeKey)
  return (PREFIX_TABLE[prefix] ?? PREFIX_TABLE.US).trdSecMarket
}

/** Qot_Common.QotMarket enum → prefix (for quote responses). */
export function qotMarketToPrefix(market: number): string {
  switch (market) {
    case 1:  return 'HK'
    case 11: return 'US'
    case 21: return 'SH'
    case 22: return 'SZ'
    case 31: return 'SG'
    case 41: return 'JP'
    case 51: return 'AU'
    case 61: return 'MY'
    case 71: return 'CA'
    default: return 'US'
  }
}

// ==================== Order-type / TIF translation ====================

/**
 * IBKR `Order.orderType` → Futu OrderType. Returns null when there is no
 * usable Futu analogue (caller rejects the order).
 *
 * Note: Futu market orders only cover stocks/warrants/CBBCs and are not
 * accepted on A-shares; we still map MKT → Market and let the server
 * reject an A-share market order rather than guess per-market here.
 */
export function ibkrOrderTypeToFutu(ibkrType: string): number | null {
  switch (ibkrType) {
    case 'MKT':         return ORDER_TYPE.Market
    case 'LMT':         return ORDER_TYPE.Normal
    case 'STP':         return ORDER_TYPE.Stop
    case 'STP LMT':     return ORDER_TYPE.StopLimit
    case 'TRAIL':       return ORDER_TYPE.TrailingStop
    case 'TRAIL LIMIT': return ORDER_TYPE.TrailingStopLimit
    default:            return null
  }
}

/**
 * IBKR TIF → Futu TimeInForce. Futu supports DAY/GTC/IOC only — GTD/FOK/OPG
 * are rejected (the reverse of Longbridge, which takes GTD but not IOC).
 */
export function ibkrTifToFutu(tif: string): number | null {
  switch (tif) {
    case 'DAY':
    case '':    return TIF.DAY
    case 'GTC': return TIF.GTC
    case 'IOC': return TIF.IOC
    case 'GTD':
    case 'FOK':
    case 'OPG': return null
    default:    return TIF.DAY
  }
}

/** Futu OrderType → IBKR string (for echoing open orders). */
export function futuOrderTypeToIbkr(t: number): string {
  switch (t) {
    case ORDER_TYPE.Normal:            return 'LMT'
    case ORDER_TYPE.Market:            return 'MKT'
    case ORDER_TYPE.Stop:              return 'STP'
    case ORDER_TYPE.StopLimit:         return 'STP LMT'
    case ORDER_TYPE.TrailingStop:      return 'TRAIL'
    case ORDER_TYPE.TrailingStopLimit: return 'TRAIL LIMIT'
    default:                           return 'LMT'
  }
}

/** Futu TimeInForce → IBKR string. */
export function futuTifToIbkr(t: number): string {
  switch (t) {
    case TIF.GTC: return 'GTC'
    case TIF.IOC: return 'IOC'
    default:      return 'DAY'
  }
}

// ==================== Order status ====================

/**
 * Map Trd_Common.OrderStatus → IBKR-style status string.
 * IBKR statuses we emit: Submitted, Filled, Cancelled, Inactive.
 */
export function mapFutuOrderStatus(status: number): string {
  switch (status) {
    case 11:                          // Filled_All
      return 'Filled'
    case 12: case 13: case 14: case 15: // Cancelling_*/Cancelled_*
      return 'Cancelled'
    case 3:  case 4:  case 21: case 22: case 23: // SubmitFailed/TimeOut/Failed/Disabled/Deleted
      return 'Inactive'
    default:                          // WaitingSubmit/Submitting/Submitted/Filled_Part
      return 'Submitted'
  }
}

/** Make an OrderState from a Futu status enum + optional error message. */
export function makeOrderState(status: number, msg?: string): OrderState {
  const s = new OrderState()
  s.status = mapFutuOrderStatus(status)
  // SubmitFailed(3) / Failed(21) carry a reject reason.
  if (msg && (status === 3 || status === 21)) s.rejectReason = msg
  return s
}

// ==================== Currency / market clock ====================

/** Trd_Common.Currency enum → ISO-ish code. */
export function currencyEnumToCode(n: number | undefined): string {
  switch (n) {
    case 1: return 'HKD'
    case 2: return 'USD'
    case 3: return 'CNH'
    case 4: return 'JPY'
    case 5: return 'SGD'
    case 6: return 'AUD'
    case 7: return 'CAD'
    case 8: return 'MYR'
    default: return ''
  }
}

/**
 * Trd_Common.Currency enum for an account market's base currency.
 * GetFunds requires `currency` in c2s for multi-currency (US / 综合) accounts —
 * OpenD rejects with "获取账户资金数据缺少必要参数币种" when it's missing.
 */
export function marketCurrencyEnum(market: FutuTrdMarketName): number {
  switch (market) {
    case 'HK': return 1 // HKD
    case 'US': return 2 // USD
    case 'CN': return 3 // CNH
    case 'JP': return 4 // JPY
    case 'SG': return 5 // SGD
    case 'AU': return 6 // AUD
    case 'CA': return 7 // CAD
    case 'MY': return 8 // MYR
  }
}

/** Default base currency for an account market when Funds.currency is unset. */
export function defaultCurrencyForMarket(market: FutuTrdMarketName): string {
  switch (market) {
    case 'HK': return 'HKD'
    case 'US': return 'USD'
    case 'CN': return 'CNH'
    case 'SG': return 'SGD'
    case 'JP': return 'JPY'
    case 'AU': return 'AUD'
    case 'MY': return 'MYR'
    case 'CA': return 'CAD'
  }
}

/** Trd_Common.TrdMarket enum → market name (securities markets). */
export function trdMarketToName(market: number): string {
  switch (market) {
    case 1:   return 'HK'
    case 2:   return 'US'
    case 3:   return 'CN'
    case 6:   return 'SG'
    case 8:   return 'AU'
    case 15:  return 'JP'
    case 111: return 'MY'
    case 112: return 'CA'
    default:  return `M${market}`
  }
}

/**
 * Human label for an account's type. Real accounts report TrdAccType
 * (cash/margin/...); simulate accounts report SimAccType (product class).
 */
export function futuAccTypeLabel(trdEnv: number, accType?: number, simAccType?: number): string {
  if (trdEnv === TRD_ENV_SIMULATE) {
    switch (simAccType) {
      case 1: return 'sim-stock'
      case 2: return 'sim-option'
      case 3: return 'sim-futures'
      case 4: return 'sim-stock+option'
      case 5: return 'sim-competition'
      default: return 'sim'
    }
  }
  switch (accType) {
    case 1: return 'cash'
    case 2: return 'margin'
    case 3: return 'TFSA'
    case 4: return 'RRSP'
    case 5: return 'SRRSP'
    case 6: return 'derivatives'
    default: return ''
  }
}

/**
 * QotMarketState values that mean "actively trading" (continuous session,
 * night session, or trade-at-last). Auctions and pre/post windows are
 * treated as closed for the coarse isOpen signal IBroker asks for.
 */
const OPEN_MARKET_STATES = new Set<number>([
  3,  // Morning
  5,  // Afternoon
  32, // NIGHT (trading)
  35, // TRADE_AT_LAST
])

export function isMarketStateOpen(state: number): boolean {
  return OPEN_MARKET_STATES.has(state)
}

/**
 * Pick the relevant market-state field for an account market.
 *
 * GetGlobalState only natively reports HK / US / SH / SZ. The other Futu
 * markets (SG/JP/AU/MY/CA) have no dedicated field, so we approximate by
 * timezone bucket — this is a coarse isOpen hint only; the authoritative
 * open/closed answer surfaces as an order rejection at trade time.
 */
export function globalStateFieldFor(
  market: FutuTrdMarketName,
  s: { marketHK: number; marketUS: number; marketSH: number; marketSZ: number },
): number {
  switch (market) {
    case 'HK': return s.marketHK
    case 'US': return s.marketUS
    case 'CN': return s.marketSH // A-share clock; SH and SZ share a session calendar
    case 'CA': return s.marketUS // North-America session approximation
    case 'SG':
    case 'JP':
    case 'AU':
    case 'MY': return s.marketHK // Asia-Pacific session approximation
  }
}

// ==================== Misc ====================

/** Side helpers. */
export function ibkrActionToTrdSide(action: string): number {
  return action === 'BUY' ? TRD_SIDE_BUY : TRD_SIDE_SELL
}

export function trdSideToIbkrAction(side: number): 'BUY' | 'SELL' {
  // Sell(2) / SellShort(3) → SELL; Buy(1) / BuyBack(4) → BUY.
  return side === 2 || side === 3 ? 'SELL' : 'BUY'
}

/** Produce a single-result ContractDescription for echo fallback. */
export function echoContractDescription(nativeKey: string): ContractDescription {
  const desc = new ContractDescription()
  desc.contract = makeContract(nativeKey)
  return desc
}
