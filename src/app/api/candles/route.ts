import { NextRequest, NextResponse } from 'next/server'
import type { OHLCV } from '@/lib/types'

type ValidInterval = '1h' | '4h' | '1d' | '1w'
const VALID_INTERVALS: ValidInterval[] = ['1h', '4h', '1d', '1w']

const BINANCE_KLINES_BASE = 'https://api.binance.com/api/v3/klines'

// GET /api/candles?interval=1d&limit=500
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const rawInterval = searchParams.get('interval') ?? '1d'
  const rawLimit = searchParams.get('limit') ?? '500'

  const interval: ValidInterval = VALID_INTERVALS.includes(rawInterval as ValidInterval)
    ? (rawInterval as ValidInterval)
    : '1d'
  const limit = Math.min(Math.max(parseInt(rawLimit, 10) || 500, 1), 1000)

  try {
    let candles: OHLCV[]

    const url = `${BINANCE_KLINES_BASE}?symbol=BTCUSDT&interval=${interval}&limit=${limit}`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000), next: { revalidate: 60 } })
    if (!res.ok) throw new Error(`Binance klines error: ${res.status}`)
    const raw = (await res.json()) as unknown[][]
    candles = raw.map((k) => ({
      time: Math.floor((k[0] as number) / 1000),
      open: parseFloat(k[1] as string),
      high: parseFloat(k[2] as string),
      low: parseFloat(k[3] as string),
      close: parseFloat(k[4] as string),
      volume: parseFloat(k[5] as string),
    }))

    return NextResponse.json(
      { candles },
      {
        headers: {
          'Cache-Control': 's-maxage=60, stale-while-revalidate=120',
        },
      }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
