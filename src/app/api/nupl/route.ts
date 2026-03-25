import { NextResponse } from 'next/server'

const CM_BASE = 'https://community-api.coinmetrics.io/v4'

export type NuplPhase =
  | 'euphoria'
  | 'belief'
  | 'optimism'
  | 'hope'
  | 'capitulation'

export interface NuplDataPoint {
  time: number   // Unix seconds
  price: number
  nupl: number
  mvrv: number   // CapMrktCurUSD / CapRealUSD
  phase: NuplPhase
}

function getPhase(nupl: number): NuplPhase {
  if (nupl >= 0.75) return 'euphoria'
  if (nupl >= 0.5)  return 'belief'
  if (nupl >= 0.25) return 'optimism'
  if (nupl >= 0)    return 'hope'
  return 'capitulation'
}

interface CmRow {
  asset: string
  time: string
  CapMrktCurUSD?: string | null
  CapRealUSD?: string | null
  PriceUSD?: string | null
}

export async function GET() {
  try {
    // 'community' is CoinMetrics' documented free-tier key.
    // Override with COINMETRICS_API_KEY env var for a paid/pro key.
    const apiKey = process.env.COINMETRICS_API_KEY ?? 'community'

    const allRows: CmRow[] = []
    let nextPageToken: string | null = null

    do {
      const url = new URL(`${CM_BASE}/timeseries/asset-metrics`)
      url.searchParams.set('assets', 'btc')
      url.searchParams.set('metrics', 'CapRealUSD,CapMrktCurUSD,PriceUSD')
      url.searchParams.set('frequency', '1d')
      url.searchParams.set('start_time', '2011-01-01')
      url.searchParams.set('page_size', '10000')
      url.searchParams.set('api_key', apiKey)
      if (nextPageToken) url.searchParams.set('next_page_token', nextPageToken)

      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
        next: { revalidate: 21600 }, // 6 hours
      })
      if (!res.ok) throw new Error(`CoinMetrics error: ${res.status}`)

      const json = (await res.json()) as { data: CmRow[]; next_page_token?: string }
      allRows.push(...json.data)
      nextPageToken = json.next_page_token ?? null
    } while (nextPageToken)

    const points: NuplDataPoint[] = allRows
      .filter(
        (d) =>
          d.CapMrktCurUSD != null &&
          d.CapRealUSD != null &&
          d.PriceUSD != null
      )
      .map((d) => {
        const mcap  = parseFloat(d.CapMrktCurUSD!)
        const rcap  = parseFloat(d.CapRealUSD!)
        const price = parseFloat(d.PriceUSD!)
        const nupl  = mcap > 0 ? (mcap - rcap) / mcap : 0
        const mvrv  = rcap > 0 ? mcap / rcap : 1
        return {
          time:  Math.floor(new Date(d.time).getTime() / 1000),
          price,
          nupl,
          mvrv,
          phase: getPhase(nupl),
        }
      })

    return NextResponse.json(
      { data: points },
      { headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=3600' } }
    )
  } catch (err) {
    console.error('NUPL route error:', err)
    return NextResponse.json({ error: 'Failed to fetch NUPL data' }, { status: 502 })
  }
}
