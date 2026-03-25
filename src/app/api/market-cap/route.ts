import { NextResponse } from 'next/server'

export interface MarketCapData {
  price: number
  marketCap: number
  circulatingSupply: number
  change24h: number
  change7d: number
  ath: number
  lastUpdated: string
  ethMarketCap: number
}

export async function GET() {
  try {
    const [btcRes, ethRes] = await Promise.all([
      fetch(
        'https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false',
        { next: { revalidate: 300 } }
      ),
      fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_market_cap=true',
        { next: { revalidate: 300 } }
      ),
    ])

    if (!btcRes.ok) throw new Error(`CoinGecko error: ${btcRes.status}`)

    const json = await btcRes.json()
    const md = json.market_data
    const ethJson = ethRes.ok ? await ethRes.json() : null
    const ethMarketCap = ethJson?.ethereum?.usd_market_cap ?? 380_000_000_000

    const data: MarketCapData = {
      price: md.current_price.usd,
      marketCap: md.market_cap.usd,
      circulatingSupply: md.circulating_supply,
      change24h: md.price_change_percentage_24h ?? 0,
      change7d: md.price_change_percentage_7d ?? 0,
      ath: md.ath.usd,
      lastUpdated: json.last_updated ?? new Date().toISOString(),
      ethMarketCap,
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    })
  } catch (err) {
    console.error('market-cap route error:', err)
    return NextResponse.json({ error: 'Failed to fetch market cap data' }, { status: 502 })
  }
}
