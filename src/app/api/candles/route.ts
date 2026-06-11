import { NextRequest, NextResponse } from 'next/server'
import { fetchIntervalCandles } from '@/lib/server/candles'
import type { TimeInterval } from '@/lib/types'

// Binance blocks US datacenter IPs — pin to Frankfurt on Vercel
export const preferredRegion = 'fra1'

const VALID_INTERVALS: TimeInterval[] = ['1h', '4h', '1d', '1w']

// GET /api/candles?interval=1d&limit=500
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const rawInterval = searchParams.get('interval') ?? '1d'
  const rawLimit = searchParams.get('limit') ?? '500'

  const interval: TimeInterval = VALID_INTERVALS.includes(rawInterval as TimeInterval)
    ? (rawInterval as TimeInterval)
    : '1d'
  const limit = Math.min(Math.max(parseInt(rawLimit, 10) || 500, 1), 1000)

  try {
    const candles = await fetchIntervalCandles(interval, limit)
    if (candles.length === 0) throw new Error('No candle data from any source')
    return NextResponse.json(
      { candles },
      { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
