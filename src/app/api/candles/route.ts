import { NextRequest, NextResponse } from 'next/server'
import type { OHLCV } from '@/lib/types'

type ValidInterval = '1h' | '4h' | '1d' | '1w'
const VALID_INTERVALS: ValidInterval[] = ['1h', '4h', '1d', '1w']

const CC_BASE = 'https://min-api.cryptocompare.com/data/v2'

// CryptoCompare endpoint & aggregate per interval
const CC_CONFIG: Record<ValidInterval, { endpoint: string; aggregate?: number }> = {
  '1h': { endpoint: 'histohour' },
  '4h': { endpoint: 'histohour', aggregate: 4 },
  '1d': { endpoint: 'histoday' },
  '1w': { endpoint: 'histoday', aggregate: 7 },
}

interface CCCandle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volumeto: number
}

// GET /api/candles?interval=1d&limit=500
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const rawInterval = searchParams.get('interval') ?? '1d'
  const rawLimit = searchParams.get('limit') ?? '500'

  const interval: ValidInterval = VALID_INTERVALS.includes(rawInterval as ValidInterval)
    ? (rawInterval as ValidInterval)
    : '1d'
  const limit = Math.min(Math.max(parseInt(rawLimit, 10) || 500, 1), 2000)

  const { endpoint, aggregate } = CC_CONFIG[interval]

  try {
    const params = new URLSearchParams({ fsym: 'BTC', tsym: 'USD', limit: String(limit) })
    if (aggregate) params.set('aggregate', String(aggregate))

    const res = await fetch(`${CC_BASE}/${endpoint}?${params}`, {
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 60 },
    })
    if (!res.ok) throw new Error(`CryptoCompare error: ${res.status}`)

    const json = (await res.json()) as { Response: string; Data: { Data: CCCandle[] } }
    if (json.Response !== 'Success') throw new Error('CryptoCompare API error')

    const candles: OHLCV[] = json.Data.Data
      .filter((k) => k.close > 0)
      .map((k) => ({
        time: k.time,
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
        volume: k.volumeto,
      }))

    return NextResponse.json(
      { candles },
      { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
