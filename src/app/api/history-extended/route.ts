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
    // Fetch up to 4 batches of 1000 daily candles (~4000 days back to ~Sep 2017 Binance launch)
    const batches: OHLCV[][] = []

    let batch = await fetchBatch()
    if (batch.length === 0) throw new Error('No data from Binance')

    for (let i = 0; i < 4; i++) {
      batches.unshift(batch)
      const oldest = batch[0]
      batch = await fetchBatch(oldest.time * 1000 - 1)
      if (batch.length === 0) break
    }

    const candles: OHLCV[] = batches.flat()

    return NextResponse.json(
      { candles },
      { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' } }
    )
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
