import { NextRequest, NextResponse } from 'next/server'
import { fetchEquityFundamentals, type EquityFundamental } from '@/lib/api/finnhub'

// Per-ticker fundamentals for the Analyst Desk watchlist (Finnhub-backed).
// Read-only/public — returns only public market data, no secret required.
// Edge-cached so many viewers cost little Finnhub quota.

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('symbols') ?? ''
  const symbols = Array.from(
    new Set(
      raw
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
    ),
  ).slice(0, 30)

  if (symbols.length === 0) {
    return NextResponse.json({ error: 'symbols query param is required' }, { status: 400 })
  }

  if (!process.env.FINNHUB_API_KEY) {
    return NextResponse.json(
      { error: 'FINNHUB_API_KEY is not configured', data: [] },
      { status: 503 },
    )
  }

  // Never let one bad ticker fail the whole batch — degrade to nulls
  const data: EquityFundamental[] = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        return await fetchEquityFundamentals(symbol)
      } catch (err) {
        console.warn(`[/api/equities/fundamentals] ${symbol} failed:`, err)
        return {
          symbol,
          name: null,
          price: null,
          changePercent: null,
          marketCap: null,
          peTTM: null,
          epsTTM: null,
          epsGrowthYoY: null,
          week52High: null,
          week52Low: null,
        }
      }
    }),
  )

  return NextResponse.json(
    { data },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
  )
}
