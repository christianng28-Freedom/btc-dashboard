import { NextResponse } from 'next/server'
import { fetchFREDSeries } from '@/lib/api/fred'
import { fetchStooqDaily } from '@/lib/api/stooq'

const CG_BASE = 'https://api.coingecko.com/api/v3'

export interface RatioPoint {
  date: string
  ratio: number
  btc: number
  asset: number
}

interface RelativeStrengthResponse {
  gold: RatioPoint[]
  spx: RatioPoint[]
  dxy: RatioPoint[]
}

async function fetchBTCDaily(): Promise<Map<string, number>> {
  const url = `${CG_BASE}/coins/bitcoin/market_chart?vs_currency=usd&days=365`
  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`CoinGecko market chart: ${res.status} ${body.slice(0, 200)}`)
  }
  const json = await res.json() as { prices: [number, number][] }
  const map = new Map<string, number>()
  for (const [ts, price] of json.prices) {
    const date = new Date(ts).toISOString().split('T')[0]
    map.set(date, price)
  }
  return map
}

function buildRatios(btc: Map<string, number>, asset: Map<string, number>): RatioPoint[] {
  const dates = Array.from(btc.keys()).sort()
  const result: RatioPoint[] = []
  for (const date of dates) {
    const b = btc.get(date)
    const a = asset.get(date)
    if (b != null && a != null && a > 0) {
      result.push({ date, ratio: b / a, btc: b, asset: a })
    }
  }
  return result
}

async function tryFetch(fn: () => Promise<Map<string, number>>, label: string): Promise<Map<string, number>> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[relative-strength] ${label} failed:`, err)
    return new Map()
  }
}

export async function GET() {
  try {
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    const start = oneYearAgo.toISOString().split('T')[0]

    const [btcPrices, goldPrices, spxPrices, dxyPrices] = await Promise.all([
      fetchBTCDaily(),
      tryFetch(() => fetchStooqDaily('xauusd'), 'gold/stooq'),
      tryFetch(() => fetchFREDSeries('SP500', start), 'SP500/FRED'),
      tryFetch(() => fetchFREDSeries('DTWEXBGS', start), 'DXY/FRED'),
    ])

    const data: RelativeStrengthResponse = {
      gold: buildRatios(btcPrices, goldPrices),
      spx: buildRatios(btcPrices, spxPrices),
      dxy: buildRatios(btcPrices, dxyPrices),
    }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' },
    })
  } catch (err) {
    console.error('[/api/relative-strength]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
