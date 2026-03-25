import { NextResponse } from 'next/server'
import { fetchFREDSeries } from '@/lib/api/fred'
import { fetchYahooFinanceDaily } from '@/lib/api/yahoo-finance'
import { fetchKlines } from '@/lib/api/binance'
import type { GlobalEquityIndex } from '@/lib/types'

export type DataPoint = { date: string; value: number }

export interface EquitiesData {
  usIndices: {
    sp500: GlobalEquityIndex
    nasdaq: GlobalEquityIndex
    russell2000: GlobalEquityIndex
    dowJones: GlobalEquityIndex
  }
  vix: {
    latest: number
    history: DataPoint[]
    zone: 'complacent' | 'normal' | 'elevated' | 'fear'
  }
  european: {
    stoxx50: GlobalEquityIndex
    dax: GlobalEquityIndex
    ftse100: GlobalEquityIndex
  }
  asiaPacific: {
    nikkei: GlobalEquityIndex
    hangSeng: GlobalEquityIndex
    shanghai: GlobalEquityIndex
    asx200: GlobalEquityIndex
  }
  cryptoAdjacent: {
    mstr: GlobalEquityIndex
    mara: GlobalEquityIndex
    riot: GlobalEquityIndex
    coin: GlobalEquityIndex
  }
  btcHistory: DataPoint[]
  correlations: {
    mstr: number | null
    mara: number | null
    riot: number | null
    coin: number | null
  }
}

// ── helpers ────────────────────────────────────────────────────────────────

function mapToSorted(map: Map<string, number>): DataPoint[] {
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }))
}

function findFloor(sorted: DataPoint[], targetDate: string): number | null {
  const pts = sorted.filter((p) => p.date <= targetDate)
  return pts.length > 0 ? pts[pts.length - 1].value : null
}

function buildEquityIndex(
  sorted: DataPoint[],
  name: string,
  symbol: string,
): GlobalEquityIndex {
  if (sorted.length === 0) {
    return {
      symbol, name, price: 0,
      change1d: 0, change1w: 0, change1m: 0, change3m: 0, changeYtd: 0, change1y: 0,
      history: [], lastUpdated: '',
    }
  }
  const latest  = sorted[sorted.length - 1]
  const price   = latest.value
  const d       = new Date(latest.date)

  const d1w  = new Date(d); d1w.setDate(d1w.getDate() - 7)
  const d1m  = new Date(d); d1m.setDate(d1m.getDate() - 30)
  const d3m  = new Date(d); d3m.setDate(d3m.getDate() - 91)
  const dytd = new Date(d.getFullYear(), 0, 1)
  const d1y  = new Date(d); d1y.setFullYear(d1y.getFullYear() - 1)
  const d1yStr = d1y.toISOString().slice(0, 10)

  const prev1d = sorted.length >= 2 ? sorted[sorted.length - 2].value : price
  const val1w  = findFloor(sorted, d1w.toISOString().slice(0, 10))
  const val1m  = findFloor(sorted, d1m.toISOString().slice(0, 10))
  const val3m  = findFloor(sorted, d3m.toISOString().slice(0, 10))
  const valYtd = findFloor(sorted, dytd.toISOString().slice(0, 10))
  const val1y  = findFloor(sorted, d1yStr)

  const pct = (cur: number, base: number | null) =>
    base != null && base !== 0 ? Math.round(((cur - base) / Math.abs(base)) * 10000) / 100 : 0

  return {
    symbol,
    name,
    price,
    change1d:   pct(price, prev1d),
    change1w:   pct(price, val1w),
    change1m:   pct(price, val1m),
    change3m:   pct(price, val3m),
    changeYtd:  pct(price, valYtd),
    change1y:   pct(price, val1y),
    history:    sorted.filter((p) => p.date >= d1yStr),
    lastUpdated: latest.date,
  }
}

function vixZone(v: number): 'complacent' | 'normal' | 'elevated' | 'fear' {
  if (v < 15) return 'complacent'
  if (v < 25) return 'normal'
  if (v < 35) return 'elevated'
  return 'fear'
}

function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length
  if (n < 5) return null
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let num = 0, dx2 = 0, dy2 = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my
    num += dx * dy; dx2 += dx * dx; dy2 += dy * dy
  }
  return dx2 === 0 || dy2 === 0 ? null : num / Math.sqrt(dx2 * dy2)
}

function compute90dCorr(stockArr: DataPoint[], btcMap: Map<string, number>): number | null {
  const overlap = stockArr.filter((p) => btcMap.has(p.date)).slice(-91)
  if (overlap.length < 30) return null
  const sp = overlap.map((p) => p.value)
  const bp = overlap.map((p) => btcMap.get(p.date)!)
  const sr = sp.slice(1).map((v, i) => Math.log(v / sp[i]))
  const br = bp.slice(1).map((v, i) => Math.log(v / bp[i]))
  const r  = pearson(sr, br)
  return r !== null ? Math.round(r * 1000) / 1000 : null
}

// ── route ──────────────────────────────────────────────────────────────────

export async function GET() {
  const start2y = (() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 2)
    return d.toISOString().slice(0, 10)
  })()

  try {
    const [
      sp500R, nasdaqR, vixR,
      rutR, djiR,
      stoxxR, daxR, ftseR,
      nkR, hsiR, shR, asxR,
      mstrR, maraR, riotR, coinR,
      btcR,
    ] = await Promise.allSettled([
      // FRED — US indices + VIX
      fetchFREDSeries('SP500',      start2y, 3600),
      fetchYahooFinanceDaily('^NDX', '2y'),
      fetchFREDSeries('VIXCLS',     start2y, 3600),
      // Yahoo Finance — US indices not on FRED
      fetchYahooFinanceDaily('^RUT',  '2y'),
      fetchYahooFinanceDaily('^DJI',  '2y'),
      // Yahoo Finance — European indices
      fetchYahooFinanceDaily('^STOXX50E', '2y'),
      fetchYahooFinanceDaily('^GDAXI',    '2y'),
      fetchYahooFinanceDaily('^FTSE',     '2y'),
      // Yahoo Finance — Asia-Pacific indices
      fetchYahooFinanceDaily('^N225',      '2y'),
      fetchYahooFinanceDaily('^HSI',       '2y'),
      fetchYahooFinanceDaily('000001.SS',  '2y'),
      fetchYahooFinanceDaily('^AXJO',      '2y'),
      // Yahoo Finance — crypto-adjacent equities
      fetchYahooFinanceDaily('MSTR', '2y'),
      fetchYahooFinanceDaily('MARA', '2y'),
      fetchYahooFinanceDaily('RIOT', '2y'),
      fetchYahooFinanceDaily('COIN', '2y'),
      // BTC price for correlation
      fetchKlines('BTCUSDT', '1d', 400),
    ])

    const g = (r: PromiseSettledResult<Map<string, number>>): DataPoint[] =>
      r.status === 'fulfilled' ? mapToSorted(r.value) : []

    const sp500Arr  = g(sp500R)
    const nasdaqArr = g(nasdaqR)
    const vixArr    = g(vixR)
    const rutArr    = g(rutR)
    const djiArr    = g(djiR)
    const stoxxArr  = g(stoxxR)
    const daxArr    = g(daxR)
    const ftseArr   = g(ftseR)
    const nkArr     = g(nkR)
    const hsiArr    = g(hsiR)
    const shArr     = g(shR)
    const asxArr    = g(asxR)
    const mstrArr   = g(mstrR)
    const maraArr   = g(maraR)
    const riotArr   = g(riotR)
    const coinArr   = g(coinR)

    const btcHistory: DataPoint[] =
      btcR.status === 'fulfilled'
        ? btcR.value.map((k) => ({
            date:  new Date(k.openTime).toISOString().slice(0, 10),
            value: parseFloat(k.close),
          }))
        : []

    const btcMap    = new Map(btcHistory.map((p) => [p.date, p.value]))
    const vixLatest = vixArr.at(-1)?.value ?? 0

    const body: EquitiesData = {
      usIndices: {
        sp500:       buildEquityIndex(sp500Arr,  'S&P 500',      'SP500'),
        nasdaq:      buildEquityIndex(nasdaqArr, 'Nasdaq 100',   '^NDX'),
        russell2000: buildEquityIndex(rutArr,    'Russell 2000', '^RUT'),
        dowJones:    buildEquityIndex(djiArr,    'Dow Jones',    '^DJI'),
      },
      vix: {
        latest:  vixLatest,
        history: vixArr,
        zone:    vixZone(vixLatest),
      },
      european: {
        stoxx50: buildEquityIndex(stoxxArr, 'Euro Stoxx 50', '^STOXX50E'),
        dax:     buildEquityIndex(daxArr,   'DAX',           '^GDAXI'),
        ftse100: buildEquityIndex(ftseArr,  'FTSE 100',      '^FTSE'),
      },
      asiaPacific: {
        nikkei:   buildEquityIndex(nkArr,  'Nikkei 225',         '^N225'),
        hangSeng: buildEquityIndex(hsiArr, 'Hang Seng',          '^HSI'),
        shanghai: buildEquityIndex(shArr,  'Shanghai Composite', '000001.SS'),
        asx200:   buildEquityIndex(asxArr, 'ASX 200',            '^AXJO'),
      },
      cryptoAdjacent: {
        mstr: buildEquityIndex(mstrArr, 'MicroStrategy', 'MSTR'),
        mara: buildEquityIndex(maraArr, 'Marathon Digital', 'MARA'),
        riot: buildEquityIndex(riotArr, 'Riot Platforms',  'RIOT'),
        coin: buildEquityIndex(coinArr, 'Coinbase',        'COIN'),
      },
      btcHistory,
      correlations: {
        mstr: compute90dCorr(mstrArr, btcMap),
        mara: compute90dCorr(maraArr, btcMap),
        riot: compute90dCorr(riotArr, btcMap),
        coin: compute90dCorr(coinArr, btcMap),
      },
    }

    return NextResponse.json(body, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}