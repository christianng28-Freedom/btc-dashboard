import { NextResponse } from 'next/server'
import type { OHLCV } from '@/lib/types'

const BINANCE_KLINES = 'https://api.binance.com/api/v3/klines'

async function fetchBatch(endTime?: number): Promise<OHLCV[]> {
  const params = new URLSearchParams({ symbol: 'BTCUSDT', interval: '1d', limit: '1000' })
  if (endTime) params.set('endTime', String(endTime))
  const res = await fetch(`${BINANCE_KLINES}?${params}`, { signal: AbortSignal.timeout(10000), next: { revalidate: 3600 } })
  if (!res.ok) throw new Error(`Binance klines error: ${res.status}`)
  const raw = (await res.json()) as unknown[][]
  return raw.map((k) => ({
    time: Math.floor((k[0] as number) / 1000),
    open: parseFloat(k[1] as string),
    high: parseFloat(k[2] as string),
    low: parseFloat(k[3] as string),
    close: parseFloat(k[4] as string),
    volume: parseFloat(k[5] as string),
  }))
}

export async function GET() {
  try {
    // Fetch 4 batches of 1000 daily candles in parallel using pre-computed timestamps
    // Each batch covers ~1000 days; offsets calculated from now
    const DAY_MS = 86_400_000
    const now = Date.now()
    const endTimes = [
      undefined,                     // most recent 1000 days
      now - 1000 * DAY_MS,           // 1000–2000 days ago
      now - 2000 * DAY_MS,           // 2000–3000 days ago
      now - 3000 * DAY_MS,           // 3000–4000 days ago
    ]

    const results = await Promise.all(endTimes.map((t) => fetchBatch(t)))
    if (results[0].length === 0) throw new Error('No data from Binance')

    // Merge, deduplicate by timestamp, and sort ascending
    const seen = new Set<number>()
    const candles: OHLCV[] = results
      .flat()
      .filter((c) => {
        if (seen.has(c.time)) return false
        seen.add(c.time)
        return true
      })
      .sort((a, b) => a.time - b.time)

    return NextResponse.json(
      { candles },
      { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' } }
    )
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
