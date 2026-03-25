import { NextResponse } from 'next/server'
import type { OHLCV } from '@/lib/types'

const BINANCE_KLINES = 'https://api.binance.com/api/v3/klines'

async function fetchBatch(endTime?: number): Promise<OHLCV[]> {
  const params = new URLSearchParams({ symbol: 'BTCUSDT', interval: '1d', limit: '1000' })
  if (endTime) params.set('endTime', String(endTime))

  const res = await fetch(`${BINANCE_KLINES}?${params}`, { next: { revalidate: 3600 } })
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
    // Fetch two batches of 1000 daily candles in parallel using pre-computed timestamps
    const DAY_MS = 86_400_000
    const now = Date.now()

    const [batch1, batch2] = await Promise.all([
      fetchBatch(),                        // most recent 1000 days
      fetchBatch(now - 1000 * DAY_MS),     // 1000–2000 days ago
    ])
    if (batch1.length === 0) throw new Error('No data returned from Binance')

    // Merge, deduplicate, sort ascending
    const seen = new Set<number>()
    const candles: OHLCV[] = [...batch2, ...batch1]
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
