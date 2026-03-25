import { NextResponse } from 'next/server'

const FAPI_BASE = 'https://fapi.binance.com'
const BYBIT_BASE = 'https://api.bybit.com'

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

async function fetchFromBinance(): Promise<FundamentalData> {
  const [oiRes, fundingRes] = await Promise.all([
    fetch(`${FAPI_BASE}/futures/data/openInterestHist?symbol=BTCUSDT&period=1d&limit=100`, {
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 3600 },
    }),
    fetch(`${FAPI_BASE}/fapi/v1/premiumIndex?symbol=BTCUSDT`, {
      signal: AbortSignal.timeout(8000),
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

  const recent90 = oiHistory.slice(-90)
  const oi90dMA = recent90.reduce((sum, d) => sum + d.oiValue, 0) / recent90.length
  const currentOI = oiHistory.length > 0 ? oiHistory[oiHistory.length - 1].oiValue : 0
  const oiDeviationPct = oi90dMA > 0 ? ((currentOI - oi90dMA) / oi90dMA) * 100 : 0
  const currentFundingRate = parseFloat(fundingRaw.lastFundingRate)
  const annualisedFundingRate = currentFundingRate * 3 * 365 * 100

  return {
    oiHistory,
    currentOI,
    oi90dMA,
    oiDeviationPct,
    currentFundingRate,
    nextFundingTime: fundingRaw.nextFundingTime,
    annualisedFundingRate,
    lastUpdated: new Date().toISOString(),
  }
}

async function fetchFromBybit(): Promise<FundamentalData> {
  const [oiRes, tickerRes] = await Promise.all([
    fetch(
      `${BYBIT_BASE}/v5/market/open-interest?category=linear&symbol=BTCUSDT&intervalTime=1d&limit=100`,
      { signal: AbortSignal.timeout(8000), next: { revalidate: 3600 } }
    ),
    fetch(
      `${BYBIT_BASE}/v5/market/tickers?category=linear&symbol=BTCUSDT`,
      { signal: AbortSignal.timeout(8000), next: { revalidate: 300 } }
    ),
  ])

  if (!oiRes.ok) throw new Error(`Bybit OI error: ${oiRes.status}`)
  if (!tickerRes.ok) throw new Error(`Bybit ticker error: ${tickerRes.status}`)

  const oiJson = (await oiRes.json()) as {
    result: { list: Array<{ openInterest: string; timestamp: string }> }
  }
  const tickerJson = (await tickerRes.json()) as {
    result: {
      list: Array<{
        fundingRate: string
        nextFundingTime: string
        openInterestValue: string
        lastPrice: string
      }>
    }
  }

  const ticker = tickerJson.result.list[0]
  const btcPrice = parseFloat(ticker.lastPrice)

  // Bybit OI list is newest-first; reverse to chronological order
  const oiHistory: OIDataPoint[] = oiJson.result.list
    .slice()
    .reverse()
    .map((d) => {
      const oiBtc = parseFloat(d.openInterest)
      return {
        timestamp: parseInt(d.timestamp, 10),
        oi: oiBtc,
        oiValue: oiBtc * btcPrice,
      }
    })

  const recent90 = oiHistory.slice(-90)
  const oi90dMA = recent90.reduce((sum, d) => sum + d.oiValue, 0) / recent90.length
  const currentOI = oiHistory.length > 0 ? oiHistory[oiHistory.length - 1].oiValue : 0
  const oiDeviationPct = oi90dMA > 0 ? ((currentOI - oi90dMA) / oi90dMA) * 100 : 0
  const currentFundingRate = parseFloat(ticker.fundingRate)
  const annualisedFundingRate = currentFundingRate * 3 * 365 * 100
  const nextFundingTime = parseInt(ticker.nextFundingTime, 10)

  return {
    oiHistory,
    currentOI,
    oi90dMA,
    oiDeviationPct,
    currentFundingRate,
    nextFundingTime,
    annualisedFundingRate,
    lastUpdated: new Date().toISOString(),
  }
}

export async function GET() {
  try {
    let data: FundamentalData
    try {
      data = await fetchFromBinance()
    } catch (binanceErr) {
      console.warn('Binance fundamental fetch failed, falling back to Bybit:', binanceErr)
      data = await fetchFromBybit()
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
