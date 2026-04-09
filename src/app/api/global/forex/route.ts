import { NextResponse } from 'next/server'
import { fetchFREDSeries } from '@/lib/api/fred'
import { fetchStooqDaily } from '@/lib/api/stooq'
import { fetchYahooFinanceDaily } from '@/lib/api/yahoo-finance'
import { fetchKlines } from '@/lib/api/binance'
import type { ForexPair } from '@/lib/types'

export type DataPoint = { date: string; value: number }

export interface ForexData {
  dxy: {
    latest: number
    history: DataPoint[]
    ma200: number | null
    lastUpdated: string
  }
  pairs: {
    eurusd: ForexPair
    usdjpy: ForexPair
    gbpusd: ForexPair
    audusd: ForexPair
  }
  btcHistory: DataPoint[]
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

function sma(arr: number[], period: number): number | null {
  if (arr.length < period) return null
  const slice = arr.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / period
}

function buildForexPair(
  sorted: DataPoint[],
  pair: string,
  base: string,
  quote: string,
): ForexPair {
  if (sorted.length === 0) {
    return { pair, base, quote, rate: 0, change1d: 0, change1m: 0, change1y: 0, history: [], lastUpdated: '' }
  }
  const latest = sorted[sorted.length - 1]
  const rate = latest.value
  const d = new Date(latest.date)

  const d1m = new Date(d); d1m.setDate(d1m.getDate() - 30)
  const d1y = new Date(d); d1y.setFullYear(d1y.getFullYear() - 1)
  const d1yStr = d1y.toISOString().slice(0, 10)

  const prev1d = sorted.length >= 2 ? sorted[sorted.length - 2].value : rate
  const val1m  = findFloor(sorted, d1m.toISOString().slice(0, 10))
  const val1y  = findFloor(sorted, d1yStr)

  const pct = (cur: number, base: number | null) =>
    base != null && base !== 0 ? Math.round(((cur - base) / Math.abs(base)) * 10000) / 100 : 0

  return {
    pair,
    base,
    quote,
    rate,
    change1d: pct(rate, prev1d),
    change1m: pct(rate, val1m),
    change1y: pct(rate, val1y),
    history: sorted.filter((p) => p.date >= d1yStr),
    lastUpdated: latest.date,
  }
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
      dxyR,
      eurR, jpyR, gbpR, audR,
      eurFredR, jpyFredR, gbpFredR, audFredR,
      btcR, btcYahooR,
    ] = await Promise.allSettled([
      // Yahoo Finance DX-Y.NYB = actual ICE DXY (~99), not FRED DTWEXBGS (~120)
      fetchYahooFinanceDaily('DX-Y.NYB', '2y', 3600),
      // Stooq — primary source for pairs
      fetchStooqDaily('eurusd', 3600),
      fetchStooqDaily('usdjpy', 3600),
      fetchStooqDaily('gbpusd', 3600),
      fetchStooqDaily('audusd', 3600),
      // FRED — fallback for pairs
      fetchFREDSeries('DEXUSEU', start2y, 3600),
      fetchFREDSeries('DEXJPUS', start2y, 3600),
      fetchFREDSeries('DEXUSUK', start2y, 3600),
      fetchFREDSeries('DEXUSAL', start2y, 3600),
      // BTC for overlay
      fetchKlines('BTCUSDT', '1d', 400),
      // Yahoo Finance fallback for BTC (used when Binance is geo-blocked)
      fetchYahooFinanceDaily('BTC-USD', '2y', 3600),
    ])

    function g(
      stooq: PromiseSettledResult<Map<string, number>>,
      fred: PromiseSettledResult<Map<string, number>>,
    ): DataPoint[] {
      // Prefer Stooq if it has data, fall back to FRED
      if (stooq.status === 'fulfilled' && stooq.value.size > 30) {
        return mapToSorted(stooq.value)
      }
      return fred.status === 'fulfilled' ? mapToSorted(fred.value) : []
    }

    const dxyArr = dxyR.status === 'fulfilled' ? mapToSorted(dxyR.value) : []
    const eurArr = g(eurR, eurFredR)
    const jpyArr = g(jpyR, jpyFredR)
    const gbpArr = g(gbpR, gbpFredR)
    const audArr = g(audR, audFredR)

    // DXY latest + 200-day MA
    const dxyLatest = dxyArr.at(-1)?.value ?? 0
    const dxyValues = dxyArr.map((p) => p.value)
    const dxyMa200  = sma(dxyValues, 200)

    // 2-year lookback for DXY chart
    const dxyHistory = dxyArr.filter((p) => p.date >= start2y)

    const btcFromBinance: DataPoint[] =
      btcR.status === 'fulfilled'
        ? btcR.value.map((k) => ({
            date:  new Date(k.openTime).toISOString().slice(0, 10),
            value: parseFloat(k.close),
          }))
        : []

    const btcHistory: DataPoint[] =
      btcFromBinance.length > 0
        ? btcFromBinance
        : (btcYahooR.status === 'fulfilled' ? mapToSorted(btcYahooR.value) : [])

    // FRED DEXJPUS is USD per JPY (inverted), Stooq usdjpy is JPY per USD
    // They differ — Stooq is standard convention; FRED DEXJPUS is ~0.0065
    // Detect which we're using by the magnitude of the rate
    // If jpyArr[last].value < 1, it's USD per JPY (FRED); multiply by ~151 is wrong
    // We'll trust Stooq (>1) or note the inversion for display
    // (handled in the UI by checking rate > 1 → standard, otherwise inverted)

    const body: ForexData = {
      dxy: {
        latest:      dxyLatest,
        history:     dxyHistory,
        ma200:       dxyMa200,
        lastUpdated: dxyArr.at(-1)?.date ?? '',
      },
      pairs: {
        eurusd: buildForexPair(eurArr, 'EURUSD', 'EUR', 'USD'),
        usdjpy: buildForexPair(jpyArr, 'USDJPY', 'USD', 'JPY'),
        gbpusd: buildForexPair(gbpArr, 'GBPUSD', 'GBP', 'USD'),
        audusd: buildForexPair(audArr, 'AUDUSD', 'AUD', 'USD'),
      },
      btcHistory,
    }

    return NextResponse.json(body, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}