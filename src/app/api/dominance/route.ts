import { NextResponse } from 'next/server'
import { fetchGlobal } from '@/lib/api/coingecko'

export async function GET() {
  try {
    const global = await fetchGlobal()
    const dominance = global.data.market_cap_percentage.btc
    const totalMarketCap = global.data.total_market_cap.usd

    return NextResponse.json(
      { dominance, totalMarketCap },
      { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } }
    )
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
