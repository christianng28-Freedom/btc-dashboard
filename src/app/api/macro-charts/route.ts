import { NextResponse } from 'next/server'
import { fetchFREDSeries } from '@/lib/api/fred'

function startDate(yearsBack: number): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - yearsBack)
  return d.toISOString().split('T')[0]
}

function mapToSortedArray(m: Map<string, number>): { date: string; value: number }[] {
  return Array.from(m.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ date, value }))
}

/**
 * Given a sorted monthly series, compute year-over-year change.
 * For each entry, finds the observation 12 months prior by key lookup.
 */
function computeYoY(
  data: { date: string; value: number }[],
): { date: string; value: number; yoy: number | null }[] {
  const map = new Map(data.map((d) => [d.date, d.value]))
  return data.map(({ date, value }) => {
    const [y, m, day] = date.split('-')
    const priorKey = `${parseInt(y) - 1}-${m}-${day}`
    const prior = map.get(priorKey)
    const yoy = prior != null && prior > 0 ? ((value - prior) / prior) * 100 : null
    return { date, value, yoy }
  })
}

async function fetchBTCMonthly(): Promise<{ date: string; price: number }[]> {
  try {
    const url =
      'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1825&interval=daily'
    const res = await fetch(url, { next: { revalidate: 86400 } })
    if (!res.ok) return []
    const json = (await res.json()) as { prices: [number, number][] }
    // Keep only the last price per calendar month
    const monthly = new Map<string, number>()
    for (const [ts, price] of json.prices) {
      const d = new Date(ts)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
      monthly.set(key, price)
    }
    return Array.from(monthly.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, price]) => ({ date, price }))
  } catch {
    return []
  }
}

export interface MacroChartsData {
  fedFunds: { date: string; upper: number; lower: number }[]
  cpi: { date: string; value: number; yoy: number | null }[]
  pce: { date: string; value: number; yoy: number | null }[]
  m2: { date: string; value: number; yoy: number | null }[]
  tenYear: { date: string; value: number }[]
  btcMonthly: { date: string; price: number }[]
}

export async function GET() {
  try {
    if (!process.env.FRED_API_KEY) {
      return NextResponse.json({ error: 'FRED_API_KEY not configured' }, { status: 500 })
    }

    const start5y = startDate(5)
    const start6y = startDate(6) // extra year so YoY has comparison data

    const [fedUpperMap, fedLowerMap, cpiMap, pceMap, m2Map, tenYMap, btcMonthly] =
      await Promise.all([
        fetchFREDSeries('DFEDTARU', start5y, 21600),
        fetchFREDSeries('DFEDTARL', start5y, 21600),
        fetchFREDSeries('CPIAUCSL', start6y, 21600),
        fetchFREDSeries('PCEPI', start6y, 21600),
        fetchFREDSeries('M2SL', start6y, 21600),
        fetchFREDSeries('DGS10', start5y, 21600),
        fetchBTCMonthly(),
      ])

    // Fed funds step chart (daily)
    const allFedDates = new Set([...fedUpperMap.keys(), ...fedLowerMap.keys()])
    const fedFunds = Array.from(allFedDates)
      .sort()
      .map((date) => ({
        date,
        upper: fedUpperMap.get(date) ?? 0,
        lower: fedLowerMap.get(date) ?? 0,
      }))
      .filter((d) => d.upper > 0 || d.lower > 0)

    // CPI with YoY (trim to 5y window after computing)
    const cpiAll = computeYoY(mapToSortedArray(cpiMap))
    const cpi = cpiAll.filter((d) => d.date >= start5y)

    // PCE with YoY
    const pceAll = computeYoY(mapToSortedArray(pceMap))
    const pce = pceAll.filter((d) => d.date >= start5y)

    // M2 with YoY
    const m2All = computeYoY(mapToSortedArray(m2Map))
    const m2 = m2All.filter((d) => d.date >= start5y)

    // 10Y Yield
    const tenYear = mapToSortedArray(tenYMap)

    const data: MacroChartsData = {
      fedFunds,
      cpi,
      pce,
      m2,
      tenYear,
      btcMonthly,
    }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=21600, stale-while-revalidate=43200' },
    })
  } catch (err) {
    console.error('[/api/macro-charts]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
