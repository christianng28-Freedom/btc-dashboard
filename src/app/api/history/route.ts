import { NextResponse } from 'next/server'
import type { OHLCV } from '@/lib/types'

const CC_HISTODAY = 'https://min-api.cryptocompare.com/data/v2/histoday'

interface CCCandle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volumeto: number
}

async function fetchBatch(toTs?: number): Promise<OHLCV[]> {
  const params = new URLSearchParams({ fsym: 'BTC', tsym: 'USD', limit: '2000' })
  if (toTs) params.set('toTs', String(toTs))
  const res = await fetch(`${CC_HISTODAY}?${params}`, {
    signal: AbortSignal.timeout(10000),
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error(`CryptoCompare error: ${res.status}`)
  const json = (await res.json()) as { Response: string; Data: { Data: CCCandle[] } }
  if (json.Response !== 'Success') throw new Error('CryptoCompare API error')
  return json.Data.Data
    .filter((k) => k.close > 0)
    .map((k) => ({
      time: k.time,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
      volume: k.volumeto,
    }))
}

export async function GET() {
  try {
    const candles = await fetchBatch()
    if (candles.length === 0) throw new Error('No data from CryptoCompare')
    candles.sort((a, b) => a.time - b.time)
    return NextResponse.json(
      { candles },
      { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' } }
    )
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
