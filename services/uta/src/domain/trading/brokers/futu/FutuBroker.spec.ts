import { describe, it, expect, vi, beforeEach } from 'vitest'
import Decimal from 'decimal.js'
import { Contract, Order } from '@traderalice/ibkr'
import { FutuBroker } from './FutuBroker.js'
import {
  ibkrOrderTypeToFutu,
  ibkrTifToFutu,
  mapFutuOrderStatus,
  parseNativeKey,
  toFutuSecurity,
  toTrdSecMarket,
  resolveFutuSymbol,
  makeContract,
} from './futu-contracts.js'
import '../../contract-ext.js'

// ==================== futu-api SDK mock ====================
// One shared fake ftWebsocket instance; `start` synchronously fires the
// login callback so init() resolves. Numeric enum values mirror the .proto
// constants in node_modules/futu-api/proto/Trd_Common.proto + Qot_Common.proto.

const mockWs = vi.hoisted(() => ({
  onlogin: null as ((ret: boolean, msg: unknown) => void) | null,
  start: vi.fn(),
  getConnID: vi.fn(() => 1),
  GetGlobalState: vi.fn(),
  GetAccList: vi.fn(),
  UnlockTrade: vi.fn(),
  GetFunds: vi.fn(),
  GetPositionList: vi.fn(),
  GetOrderList: vi.fn(),
  PlaceOrder: vi.fn(),
  ModifyOrder: vi.fn(),
  GetBasicQot: vi.fn(),
  GetSecuritySnapshot: vi.fn(),
  GetOrderBook: vi.fn(),
  GetStaticInfo: vi.fn(),
}))

// Must be a real (non-arrow) constructor: FutuBroker calls `new ftWebsocket()`,
// and returning an object from a function ctor makes `new` yield that object.
vi.mock('futu-api', () => ({ default: vi.fn(function () { return mockWs }) }))

function newBroker(overrides: Record<string, unknown> = {}): FutuBroker {
  return FutuBroker.fromConfig({
    id: 'futu-test',
    brokerConfig: { host: '127.0.0.1', port: 11111, paper: true, market: 'HK', ...overrides },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockWs.onlogin = null
  mockWs.start.mockImplementation(() => { mockWs.onlogin?.(true, '') })
  mockWs.getConnID.mockReturnValue(1)
  mockWs.GetGlobalState.mockResolvedValue({
    retType: 0,
    s2c: { marketHK: 3, marketUS: 6, marketSH: 6, marketSZ: 6, qotLogined: true, trdLogined: true, connID: 1 },
  })
  mockWs.GetAccList.mockResolvedValue({
    retType: 0,
    s2c: { accList: [{ trdEnv: 0, accID: 111, trdMarketAuthList: [1] }] },
  })
  mockWs.GetFunds.mockResolvedValue({
    retType: 0,
    s2c: { funds: { power: 200000, totalAssets: 151000, cash: 100000, marketVal: 51000, currency: 1, unrealizedPL: 1000 } },
  })
  mockWs.UnlockTrade.mockResolvedValue({ retType: 0, s2c: {} })
  mockWs.PlaceOrder.mockResolvedValue({ retType: 0, s2c: { orderID: 9001 } })
  mockWs.ModifyOrder.mockResolvedValue({ retType: 0, s2c: { orderID: 9001 } })
  mockWs.GetPositionList.mockResolvedValue({ retType: 0, s2c: { positionList: [] } })
  mockWs.GetOrderList.mockResolvedValue({ retType: 0, s2c: { orderList: [] } })
  mockWs.GetBasicQot.mockResolvedValue({ retType: 0, s2c: { basicQotList: [] } })
  mockWs.GetOrderBook.mockResolvedValue({ retType: 0, s2c: { orderBookBidList: [], orderBookAskList: [] } })
  mockWs.GetStaticInfo.mockResolvedValue({ retType: 0, s2c: { staticInfoList: [] } })
})

// ==================== Pure mapping functions ====================

describe('futu-contracts mapping', () => {
  it('maps IBKR order types to Futu OrderType enum', () => {
    expect(ibkrOrderTypeToFutu('MKT')).toBe(2)       // Market
    expect(ibkrOrderTypeToFutu('LMT')).toBe(1)       // Normal
    expect(ibkrOrderTypeToFutu('STP')).toBe(10)      // Stop
    expect(ibkrOrderTypeToFutu('STP LMT')).toBe(11)  // StopLimit
    expect(ibkrOrderTypeToFutu('TRAIL')).toBe(14)    // TrailingStop
    expect(ibkrOrderTypeToFutu('REL')).toBeNull()
  })

  it('maps TIF — DAY/GTC/IOC supported, GTD/FOK rejected', () => {
    expect(ibkrTifToFutu('DAY')).toBe(0)
    expect(ibkrTifToFutu('GTC')).toBe(1)
    expect(ibkrTifToFutu('IOC')).toBe(2)
    expect(ibkrTifToFutu('GTD')).toBeNull()
    expect(ibkrTifToFutu('FOK')).toBeNull()
  })

  it('maps Futu order status to IBKR string', () => {
    expect(mapFutuOrderStatus(11)).toBe('Filled')     // Filled_All
    expect(mapFutuOrderStatus(15)).toBe('Cancelled')  // Cancelled_All
    expect(mapFutuOrderStatus(21)).toBe('Inactive')   // Failed
    expect(mapFutuOrderStatus(5)).toBe('Submitted')   // Submitted
  })

  it('parses native keys and maps to quote / trade market enums', () => {
    expect(parseNativeKey('HK.00700')).toEqual({ prefix: 'HK', code: '00700' })
    expect(parseNativeKey('AAPL')).toEqual({ prefix: 'US', code: 'AAPL' })
    expect(toFutuSecurity('HK.00700')).toEqual({ market: 1, code: '00700' })  // QotMarket_HK_Security
    expect(toFutuSecurity('SH.600519')).toEqual({ market: 21, code: '600519' }) // QotMarket_CNSH
    expect(toTrdSecMarket('HK.00700')).toBe(1)   // TrdSecMarket_HK
    expect(toTrdSecMarket('SZ.000001')).toBe(32) // TrdSecMarket_CN_SZ
  })

  it('round-trips a contract through localSymbol', () => {
    const c = makeContract('HK.00700')
    expect(c.symbol).toBe('00700')
    expect(c.currency).toBe('HKD')
    expect(c.exchange).toBe('SEHK')
    expect(resolveFutuSymbol(c)).toBe('HK.00700')
  })
})

// ==================== Broker lifecycle + ops ====================

describe('FutuBroker', () => {
  it('init connects and picks the matching account', async () => {
    const b = newBroker()
    await b.init()
    expect(mockWs.start).toHaveBeenCalledWith('127.0.0.1', 11111, false, undefined)
    expect(mockWs.GetAccList).toHaveBeenCalled()
    // probe
    expect(mockWs.GetFunds).toHaveBeenCalled()
  })

  it('places a limit buy with the right Futu payload', async () => {
    const b = newBroker()
    await b.init()
    const o = new Order()
    o.action = 'BUY'
    o.orderType = 'LMT'
    o.tif = 'DAY'
    o.totalQuantity = new Decimal(100)
    o.lmtPrice = new Decimal(500)
    const r = await b.placeOrder(makeContract('HK.00700'), o)
    expect(r.success).toBe(true)
    expect(r.orderId).toBe('9001')
    const c2s = mockWs.PlaceOrder.mock.calls[0][0].c2s
    expect(c2s.code).toBe('00700')
    expect(c2s.trdSide).toBe(1)        // Buy
    expect(c2s.orderType).toBe(1)      // Normal (limit)
    expect(c2s.price).toBe(500)
    expect(c2s.secMarket).toBe(1)      // TrdSecMarket_HK
    expect(c2s.timeInForce).toBe(0)    // DAY
    expect(c2s.packetID.serialNo).toBe(1)
  })

  it('rejects unsupported order types and TIFs before hitting the SDK', async () => {
    const b = newBroker()
    await b.init()
    const mkBad = (type: string, tif: string) => {
      const o = new Order()
      o.action = 'BUY'; o.orderType = type; o.tif = tif
      o.totalQuantity = new Decimal(1)
      return o
    }
    const r1 = await b.placeOrder(makeContract('HK.00700'), mkBad('REL', 'DAY'))
    const r2 = await b.placeOrder(makeContract('HK.00700'), mkBad('LMT', 'GTD'))
    expect(r1.success).toBe(false)
    expect(r2.success).toBe(false)
    expect(mockWs.PlaceOrder).not.toHaveBeenCalled()
  })

  it('does not unlock trade in the simulate (paper) environment', async () => {
    const b = newBroker({ paper: true })
    await b.init()
    const o = new Order()
    o.action = 'BUY'; o.orderType = 'LMT'; o.tif = 'DAY'
    o.totalQuantity = new Decimal(100); o.lmtPrice = new Decimal(500)
    await b.placeOrder(makeContract('HK.00700'), o)
    expect(mockWs.UnlockTrade).not.toHaveBeenCalled()
  })

  it('unlocks trade once before the first real-environment write', async () => {
    mockWs.GetAccList.mockResolvedValue({
      retType: 0,
      s2c: { accList: [{ trdEnv: 1, accID: 222, trdMarketAuthList: [1] }] },
    })
    const b = newBroker({ paper: false, unlockPwd: 'pw1234' })
    await b.init()
    const o = new Order()
    o.action = 'BUY'; o.orderType = 'LMT'; o.tif = 'DAY'
    o.totalQuantity = new Decimal(100); o.lmtPrice = new Decimal(500)
    await b.placeOrder(makeContract('HK.00700'), o)
    await b.placeOrder(makeContract('HK.00700'), o)
    expect(mockWs.UnlockTrade).toHaveBeenCalledTimes(1)
  })

  it('cancels via ModifyOrder with the cancel op', async () => {
    const b = newBroker()
    await b.init()
    const r = await b.cancelOrder('9001')
    expect(r.success).toBe(true)
    expect(mockWs.ModifyOrder.mock.calls[0][0].c2s.modifyOrderOp).toBe(2) // Cancel
    expect(mockWs.ModifyOrder.mock.calls[0][0].c2s.orderID).toBe('9001')
  })

  it('maps account funds to AccountInfo', async () => {
    const b = newBroker()
    await b.init()
    const a = await b.getAccount()
    expect(a.baseCurrency).toBe('HKD')
    expect(a.netLiquidation).toBe('151000')
    expect(a.totalCashValue).toBe('100000')
    expect(a.buyingPower).toBe('200000')
    expect(a.unrealizedPnL).toBe('1000')
  })

  it('passes through Futu pre-computed marketValue / unrealizedPnL on positions', async () => {
    mockWs.GetPositionList.mockResolvedValue({
      retType: 0,
      s2c: {
        positionList: [{
          positionID: 1, positionSide: 0, code: '00700', name: 'TENCENT',
          qty: 100, canSellQty: 100, price: 510, averageCostPrice: 500,
          val: 51000, plVal: 1000, currency: 1, secMarket: 1,
        }],
      },
    })
    const b = newBroker()
    await b.init()
    const ps = await b.getPositions()
    expect(ps).toHaveLength(1)
    expect(ps[0].side).toBe('long')
    expect(ps[0].currency).toBe('HKD')
    expect(ps[0].avgCost).toBe('500')
    expect(ps[0].marketPrice).toBe('510')
    expect(ps[0].marketValue).toBe('51000')
    expect(ps[0].unrealizedPnL).toBe('1000')
    expect(resolveFutuSymbol(ps[0].contract)).toBe('HK.00700')
  })

  it('builds a quote from a subscription-free snapshot (bid/ask fall back to last)', async () => {
    // GetSecuritySnapshot is used instead of GetBasicQot — the latter needs a
    // prior Qot_Sub. Snapshots carry no order book, so bid/ask mirror last.
    mockWs.GetSecuritySnapshot.mockResolvedValue({
      retType: 0,
      s2c: { snapshotList: [{ basic: { curPrice: 510, highPrice: 520, lowPrice: 500, openPrice: 505, lastClosePrice: 508, volume: 1000000, updateTimestamp: 1700000000 } }] },
    })
    const b = newBroker()
    await b.init()
    const q = await b.getQuote(makeContract('HK.00700'))
    expect(q.last).toBe('510')
    expect(q.bid).toBe('510')
    expect(q.ask).toBe('510')
    expect(q.volume).toBe('1000000')
    expect(q.high).toBe('520')
    expect(q.low).toBe('500')
  })

  it('reports market open from the global state', async () => {
    const b = newBroker({ market: 'HK' })
    await b.init()
    const mc = await b.getMarketClock()
    expect(mc.isOpen).toBe(true) // marketHK = 3 (Morning)

    mockWs.GetGlobalState.mockResolvedValue({
      retType: 0,
      s2c: { marketHK: 6, marketUS: 6, marketSH: 6, marketSZ: 6, qotLogined: true, trdLogined: true, connID: 1 },
    })
    const mc2 = await b.getMarketClock()
    expect(mc2.isOpen).toBe(false) // 6 = Closed
  })

  it('lists discoverable accounts without requiring a pre-picked account', async () => {
    mockWs.GetAccList.mockResolvedValue({
      retType: 0,
      s2c: {
        accList: [
          { trdEnv: 0, accID: 111, trdMarketAuthList: [1], simAccType: 1 },       // sim stock, HK
          { trdEnv: 1, accID: 222, trdMarketAuthList: [2], accType: 2 },           // real margin, US
          { trdEnv: 1, accID: 333, trdMarketAuthList: [15, 8], accType: 1 },       // real cash, JP+AU
        ],
      },
    })
    const b = newBroker({ paper: true, market: 'HK' })
    // listAccounts must work WITHOUT init()/account selection.
    const accts = await b.listAccounts()
    expect(mockWs.start).toHaveBeenCalled() // connected to OpenD
    expect(accts).toHaveLength(3)
    expect(accts[0]).toMatchObject({ accId: '111', env: 'simulate', markets: ['HK'], accType: 'sim-stock' })
    expect(accts[1]).toMatchObject({ accId: '222', env: 'real', markets: ['US'], accType: 'margin' })
    expect(accts[2]).toMatchObject({ accId: '333', env: 'real', markets: ['JP', 'AU'], accType: 'cash' })
  })
})
