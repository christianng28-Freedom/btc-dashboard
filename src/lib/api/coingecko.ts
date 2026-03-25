const BASE_URL = 'https://api.coingecko.com/api/v3'

export interface CoinGeckoOHLC {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
}

export interface CoinGeckoMarketData {
  id: string
  symbol: string
  name: string
  market_data: {
    current_price: { usd: number }
    market_cap: { usd: number }
    total_volume: { usd: number }
    price_change_percentage_24h: number
    price_change_percentage_7d: number
    price_change_percentage_30d: number
    circulating_supply: number
    total_supply: number
    max_supply: number
    ath: { usd: number }
    atl: { usd: number }
  }
}

export interface CoinGeckoGlobal {
  data: {
    total_market_cap: { usd: number }
    total_volume: { usd: number }
    market_cap_percentage: { btc: number }
    active_cryptocurrencies: number
  }
}

/**
 * Fetch OHLC data for Bitcoin.
 * days: 1, 7, 14, 30, 90, 180, 365, or "max"
 * Returns array of [timestamp, open, high, low, close]
 */
export async function fetchOHLC(days: number | 'max'): Promise<CoinGeckoOHLC[]> {
  const res = await fetch(
    `${BASE_URL}/coins/bitcoin/ohlc?vs_currency=usd&days=${days}`,
    { signal: AbortSignal.timeout(10000) }
  )
  if (!res.ok) throw new Error(`CoinGecko OHLC error: ${res.status}`)
  const raw = (await res.json()) as number[][]
  return raw.map(([timestamp, open, high, low, close]) => ({
    timestamp,
    open,
    high,
    low,
    close,
  }))
}

/**
 * Fetch full market data for Bitcoin.
 */
export async function fetchMarketData(): Promise<CoinGeckoMarketData> {
  const res = await fetch(
    `${BASE_URL}/coins/bitcoin?localization=false&tickers=false&community_data=false`,
    { signal: AbortSignal.timeout(10000) }
  )
  if (!res.ok) throw new Error(`CoinGecko market data error: ${res.status}`)
  return res.json() as Promise<CoinGeckoMarketData>
}

/**
 * Fetch global crypto market data.
 */
export async function fetchGlobal(): Promise<CoinGeckoGlobal> {
  const res = await fetch(`${BASE_URL}/global`, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`CoinGecko global error: ${res.status}`)
  return res.json() as Promise<CoinGeckoGlobal>
}
