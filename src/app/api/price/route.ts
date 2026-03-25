import { NextResponse } from 'next/server'

const BINANCE_TICKER_URL =
  'https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT'

interface BinanceTickerResponse {
  lastPrice: string
  priceChange: string
  priceChangePercent: string
  highPrice: string
  lowPrice: string
  quoteVolume: string
}

// GET /api/price
// Proxies Binance 24hr ticker for BTC/USDT
// Returns: { price, change, changePercent, high, low, volume }
export async function GET() {
  try {
    const res = await fetch(BINANCE_TICKER_URL, {
      next: { revalidate: 10 },
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch price from Binance' },
        { status: 502 }
      )
    }

    const data = (await res.json()) as BinanceTickerResponse

    const payload = {
      price: parseFloat(data.lastPrice),
      change: parseFloat(data.priceChange),
      changePercent: parseFloat(data.priceChangePercent),
      high: parseFloat(data.highPrice),
      low: parseFloat(data.lowPrice),
      volume: parseFloat(data.quoteVolume),
    }

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 's-maxage=10, stale-while-revalidate=20',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
