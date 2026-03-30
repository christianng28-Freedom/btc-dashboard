import { NextResponse } from 'next/server'
import { fetchStooqDaily } from '@/lib/api/stooq'
import { fetchFREDSeries } from '@/lib/api/fred'
import { fetchKlines } from '@/lib/api/binance'
import { fetchYahooFinanceDaily } from '@/lib/api/yahoo-finance'
import type { CommodityPrice } from '@/lib/types'

export type DataPoint = { date: string; value: number }

export interface CommoditiesData {
  metals: {
    gold: CommodityPrice
    silver: CommodityPrice
    platinum: CommodityPrice
    goldSilverRatio: DataPoint[]
  }
  energy: {
    wti: CommodityPrice
    brent: CommodityPrice
    naturalGas: CommodityPrice
  }
  industrial: {
    copper: CommodityPrice
    lumber: CommodityPrice
  }
  ppiCommodities: {
    index: DataPoint[]
    yoy: DataPoint[]
    latest: { value: number; yoy: number; date: string }
  }
  btcHistory: DataPoint[]
  correlation90d: number | null
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

function buildCommodity(
  sorted: DataPoint[],
  name: string,
  symbol: string,
  unit: string,
): CommodityPrice {
  if (sorted.length === 0) {
    return { symbol, name, unit, price: 0, change1d: 0, change1m: 0, change1y: 0, history: [], lastUpdated: '' }
  }
  const latest = sorted[sorted.length - 1]
  const price = latest.value
  const d = new Date(latest.date)

  const d1m = new Date(d); d1m.setDate(d1m.getDate() - 30)
  const d1y = new Date(d); d1y.setFullYear(d1y.getFullYear() - 1)
  const d1yStr = d1y.toISOString().slice(0, 10)

  const prev1d = sorted.length >= 2 ? sorted[sorted.length - 2].value : price
  const val1m  = findFloor(sorted, d1m.toISOString().slice(0, 10))
  const val1y  = findFloor(sorted, d1yStr)

  const pct = (cur: number, base: number | null) =>
    base != null && base !== 0 ? Math.round(((cur - base) / Math.abs(base)) * 10000) / 100 : 0

  return {
    symbol,
    name,
    unit,
    price,
    change1d: pct(price, prev1d),
    change1m: pct(price, val1m),
    change1y: pct(price, val1y),
    history: sorted.filter((p) => p.date >= d1yStr),
    lastUpdated: latest.date,
  }
}

function computeYoY(sorted: DataPoint[]): DataPoint[] {
  const map = new Map(sorted.map((p) => [p.date, p.value]))
  return sorted.flatMap((p) => {
    const yr = parseInt(p.date.slice(0, 4))
    const prior = map.get(`${yr - 1}${p.date.slice(4)}`)
    if (prior == null || prior === 0) return []
    return [{ date: p.date, value: Math.round(((p.value - prior) / Math.abs(prior)) * 1000) / 10 }]
  })
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

// ── route ──────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const startStr = (() => {
      const d = new Date()
      d.setFullYear(d.getFullYear() - 5)
      return d.toISOString().slice(0, 10)
    })()

    const [
      goldR, silverR, platR,
      wtiStooqR, brentStooqR, ngStooqR, copperStooqR, lumberStooqR,
      btcR,
      goldYahooR, silverYahooR, platYahooR,
      wtiFredR, brentFredR, ngFredR, copperFredR, lumberYahooR,
    ] =
      await Promise.allSettled([
        fetchStooqDaily('xauusd'),
        fetchStooqDaily('xagusd'),
        fetchStooqDaily('xptusd'),
        fetchStooqDaily('cl.f'),
        fetchStooqDaily('bz.f'),
        fetchStooqDaily('ng.f'),
        fetchStooqDaily('hg.f'),
        fetchStooqDaily('ls.f'),
        fetchKlines('BTCUSDT', '1d', 400),
        // Yahoo Finance fallbacks for precious metals
        fetchYahooFinanceDaily('GC=F', '5y', 3600),   // Gold futures USD/troy oz
        fetchYahooFinanceDaily('SI=F', '5y', 3600),   // Silver futures USD/troy oz
        fetchYahooFinanceDaily('PL=F', '5y', 3600),   // Platinum futures USD/troy oz
        // FRED fallbacks for energy & industrial
        fetchFREDSeries('DCOILWTICO',   startStr, 3600),
        fetchFREDSeries('DCOILBRENTEU', startStr, 3600),
        fetchFREDSeries('DHHNGSP',      startStr, 3600),   // Henry Hub daily
        fetchFREDSeries('PCOPPUSDM',    startStr, 86400),
        // Yahoo Finance fallback for lumber futures
        fetchYahooFinanceDaily('LBS=F', '5y', 3600),
      ])

    let ppiArr: DataPoint[] = []
    try {
      ppiArr = mapToSorted(await fetchFREDSeries('PPIACO', startStr, 86400))
    } catch { /* fall through with empty array */ }

    const g = (r: PromiseSettledResult<Map<string, number>>) =>
      r.status === 'fulfilled' ? mapToSorted(r.value) : []

    // Prefer Stooq; fall back to FRED if Stooq returned nothing
    const withFallback = (
      stooqR: PromiseSettledResult<Map<string, number>>,
      fredR:  PromiseSettledResult<Map<string, number>>,
      transform?: (v: number) => number,
    ): DataPoint[] => {
      const arr = g(stooqR)
      if (arr.length > 0) return arr
      const fredArr = g(fredR)
      return transform ? fredArr.map((p) => ({ ...p, value: transform(p.value) })) : fredArr
    }

    const goldArr   = withFallback(goldR,   goldYahooR)
    const silverArr = withFallback(silverR, silverYahooR)
    const platArr   = withFallback(platR,   platYahooR)
    const wtiArr    = withFallback(wtiStooqR,   wtiFredR)
    const brentArr  = withFallback(brentStooqR, brentFredR)
    const ngArr     = withFallback(ngStooqR,    ngFredR)
    // PCOPPUSDM is USD/metric ton → convert to USD/lb (/2204.623)
    const copperArr = withFallback(copperStooqR, copperFredR, (v) => v / 2204.623)
    // Lumber: try Stooq ls.f first, then Yahoo Finance LBS=F (already in USD/MBF)
    const lumberArr = withFallback(lumberStooqR, lumberYahooR)

    const btcHistory: DataPoint[] =
      btcR.status === 'fulfilled'
        ? btcR.value.map((k) => ({
            date: new Date(k.openTime).toISOString().slice(0, 10),
            value: parseFloat(k.close),
          }))
        : []

    // Gold/Silver ratio (last 2 years)
    const silverMap = new Map(silverArr.map((p) => [p.date, p.value]))
    const cutoff2y = (() => {
      const d = new Date(); d.setFullYear(d.getFullYear() - 2); return d.toISOString().slice(0, 10)
    })()
    const goldSilverRatio: DataPoint[] = goldArr
      .filter((p) => p.date >= cutoff2y && (silverMap.get(p.date) ?? 0) > 0)
      .map((p) => ({ date: p.date, value: Math.round((p.value / silverMap.get(p.date)!) * 100) / 100 }))

    // 90d correlation of log returns (gold vs BTC)
    const btcMap = new Map(btcHistory.map((p) => [p.date, p.value]))
    const overlap = goldArr.filter((p) => btcMap.has(p.date)).slice(-91)
    let correlation90d: number | null = null
    if (overlap.length >= 30) {
      const gp = overlap.map((p) => p.value)
      const bp = overlap.map((p) => btcMap.get(p.date)!)
      const gr = gp.slice(1).map((v, i) => Math.log(v / gp[i]))
      const br = bp.slice(1).map((v, i) => Math.log(v / bp[i]))
      const r = pearson(gr, br)
      correlation90d = r !== null ? Math.round(r * 1000) / 1000 : null
    }

    const ppiYoY    = computeYoY(ppiArr)
    const latestPpi = ppiArr.at(-1)
    const latestYoY = ppiYoY.at(-1)

    const body: CommoditiesData = {
      metals: {
        gold:     buildCommodity(goldArr,   'Gold',     'XAUUSD', 'USD/troy oz'),
        silver:   buildCommodity(silverArr, 'Silver',   'XAGUSD', 'USD/troy oz'),
        platinum: buildCommodity(platArr,   'Platinum', 'XPTUSD', 'USD/troy oz'),
        goldSilverRatio,
      },
      energy: {
        wti:        buildCommodity(wtiArr,   'WTI Crude',   'CL.F', 'USD/bbl'),
        brent:      buildCommodity(brentArr, 'Brent Crude', 'BZ.F', 'USD/bbl'),
        naturalGas: buildCommodity(ngArr,    'Natural Gas', 'NG.F', 'USD/MMBtu'),
      },
      industrial: {
        copper: buildCommodity(copperArr, 'Copper', 'HG.F', 'USD/lb'),
        lumber: buildCommodity(lumberArr, 'Lumber', 'LS.F', 'USD/MBF'),
      },
      ppiCommodities: {
        index:  ppiArr,
        yoy:    ppiYoY,
        latest: {
          value: latestPpi?.value ?? 0,
          yoy:   latestYoY?.value ?? 0,
          date:  latestPpi?.date  ?? '',
        },
      },
      btcHistory,
      correlation90d,
    }

    return NextResponse.json(body, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
