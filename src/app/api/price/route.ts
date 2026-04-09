import { NextResponse } from 'next/server'

const YF_URL =
  'https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?range=1d&interval=1d'

const BINANCE_TICKER_URL =
  'https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT'

interface YFMeta {
  regularMarketPrice: number
  previousClose: number
  regularMarketDayHigh: number
  regularMarketDayLow: number
  regularMarketVolume: number
  regularMarketChangePercent: number
}

interface BinanceTickerResponse {
  lastPrice: string
  priceChange: string
  priceChangePercent: string
  highPrice: string
  lowPrice: string
  quoteVolume: string
}

async function fetchFromYahoo() {
  const res = await fetch(YF_URL, {
    next: { revalidate: 60 },
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })
  if (!res.ok) throw new Error(`Yahoo Finance BTC: ${res.status}`)
  const json = (await res.json()) as { chart: { result: Array<{ meta: YFMeta }> | null; error: unknown } }
  if (json.chart.error) throw new Error('Yahoo Finance error')
  const meta = json.chart.result?.[0]?.meta
  if (!meta) throw new Error('Yahoo Finance: no data')
  const price = meta.regularMarketPrice
  const prev  = meta.previousClose
  return {
    price,
    change: price - prev,
    changePercent: meta.regularMarketChangePercent ?? (prev > 0 ? ((price - prev) / prev) * 100 : 0),
    high: meta.regularMarketDayHigh,
    low:  meta.regularMarketDayLow,
    volume: meta.regularMarketVolume,
  }
}

async function fetchFromBinance() {
  const res = await fetch(BINANCE_TICKER_URL, { next: { revalidate: 60 } })
  if (!res.ok) throw new Error(`Binance ticker: ${res.status}`)
  const data = (await res.json()) as BinanceTickerResponse
  return {
    price: parseFloat(data.lastPrice),
    change: parseFloat(data.priceChange),
    changePercent: parseFloat(data.priceChangePercent),
    high: parseFloat(data.highPrice),
    low: parseFloat(data.lowPrice),
    volume: parseFloat(data.quoteVolume),
  }
}

// GET /api/price
// Returns: { price, change, changePercent, high, low, volume }
export async function GET() {
  try {
    let payload
    try {
      payload = await fetchFromYahoo()
    } catch {
      payload = await fetchFromBinance()
    }

    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
