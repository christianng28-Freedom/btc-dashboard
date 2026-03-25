import { NextResponse } from 'next/server'

const FAPI_BASE = 'https://fapi.binance.com'

export interface OIDataPoint {
  timestamp: number
  oi: number       // sumOpenInterest (in BTC)
  oiValue: number  // sumOpenInterestValue (in USD)
}

export interface FundamentalData {
  oiHistory: OIDataPoint[]         // last 100 days of daily OI
  currentOI: number                // current OI in USD
  oi90dMA: number                  // 90-day MA of OI in USD
  oiDeviationPct: number           // (current - 90dMA) / 90dMA * 100
  currentFundingRate: number       // e.g. 0.0001 = 0.01%
  nextFundingTime: number          // ms timestamp
  annualisedFundingRate: number    // currentFundingRate * 3 * 365 * 100 (%)
  lastUpdated: string
}

export async function GET() {
  try {
    const [oiRes, fundingRes] = await Promise.all([
      fetch(`${FAPI_BASE}/futures/data/openInterestHist?symbol=BTCUSDT&period=1d&limit=100`, {
        next: { revalidate: 3600 },
      }),
      fetch(`${FAPI_BASE}/fapi/v1/premiumIndex?symbol=BTCUSDT`, {
        next: { revalidate: 300 },
      }),
    ])

    if (!oiRes.ok) throw new Error(`Binance OI error: ${oiRes.status}`)
    if (!fundingRes.ok) throw new Error(`Binance funding error: ${fundingRes.status}`)

    const oiRaw = (await oiRes.json()) as Array<{
      symbol: string
      sumOpenInterest: string
      sumOpenInterestValue: string
      timestamp: number
    }>

    const fundingRaw = (await fundingRes.json()) as {
      lastFundingRate: string
      nextFundingTime: number
    }

    const oiHistory: OIDataPoint[] = oiRaw.map((d) => ({
      timestamp: d.timestamp,
      oi: parseFloat(d.sumOpenInterest),
      oiValue: parseFloat(d.sumOpenInterestValue),
    }))

    // 90-day MA of OI value (last 90 data points)
    const recent90 = oiHistory.slice(-90)
    const oi90dMA = recent90.reduce((sum, d) => sum + d.oiValue, 0) / recent90.length

    const currentOI = oiHistory.length > 0 ? oiHistory[oiHistory.length - 1].oiValue : 0
    const oiDeviationPct = oi90dMA > 0 ? ((currentOI - oi90dMA) / oi90dMA) * 100 : 0

    const currentFundingRate = parseFloat(fundingRaw.lastFundingRate)
    // Funding happens 3x/day; annualised = rate * 3 * 365 * 100
    const annualisedFundingRate = currentFundingRate * 3 * 365 * 100

    const data: FundamentalData = {
      oiHistory,
      currentOI,
      oi90dMA,
      oiDeviationPct,
      currentFundingRate,
      nextFundingTime: fundingRaw.nextFundingTime,
      annualisedFundingRate,
      lastUpdated: new Date().toISOString(),
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    })
  } catch (err) {
    console.error('fundamental route error:', err)
    return NextResponse.json({ error: 'Failed to fetch fundamental data' }, { status: 502 })
  }
}
