import { NextResponse } from 'next/server'
import { fetchDailyHistory } from '@/lib/server/candles'

// Binance fallback blocks US datacenter IPs — pin to Frankfurt on Vercel
export const preferredRegion = 'fra1'

// GET /api/history-extended — full daily history (2014 → today via Yahoo)
export async function GET() {
  try {
    const candles = await fetchDailyHistory()
    if (candles.length === 0) throw new Error('No daily history from any source')
    return NextResponse.json(
      { candles },
      { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' } }
    )
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
