import { NextResponse } from 'next/server'
import { computeMarketState } from '@/lib/server/market-state'

// Upstream fetches (CryptoCompare ×2, Bybit, FRED ×6, CoinMetrics, CoinGecko,
// Alternative.me) can take a while in aggregate
export const maxDuration = 60

/**
 * GET /api/market-state
 *
 * The canonical machine-readable snapshot: conviction scores with full
 * component breakdowns, raw indicator values, active alerts, and per-source
 * health. Consumed by the analyst agents and available for the UI.
 */
export async function GET() {
  try {
    const state = await computeMarketState()
    return NextResponse.json(state, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=120' },
    })
  } catch (err) {
    console.error('[/api/market-state]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
