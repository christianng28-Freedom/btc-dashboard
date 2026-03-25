const BASE_URL = 'https://api.binance.com/api/v3'

export interface BinanceTicker {
  symbol: string
  priceChange: string
  priceChangePercent: string
  lastPrice: string
  highPrice: string
  lowPrice: string
  volume: string
  quoteVolume: string
}

export interface BinanceKline {
  openTime: number
  open: string
  high: string
  low: string
  close: string
  volume: string
  closeTime: number
}

export async function fetchTicker(symbol = 'BTCUSDT'): Promise<BinanceTicker> {
  const res = await fetch(`${BASE_URL}/ticker/24hr?symbol=${symbol}`)
  if (!res.ok) throw new Error(`Binance ticker error: ${res.status}`)
  return res.json() as Promise<BinanceTicker>
}

export async function fetchKlines(
  symbol = 'BTCUSDT',
  interval = '1d',
  limit = 500
): Promise<BinanceKline[]> {
  const res = await fetch(
    `${BASE_URL}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
  )
  if (!res.ok) throw new Error(`Binance klines error: ${res.status}`)
  // Binance returns arrays: [openTime, open, high, low, close, volume, closeTime, ...]
  const raw = (await res.json()) as unknown[][]
  return raw.map((k) => ({
    openTime: k[0] as number,
    open: k[1] as string,
    high: k[2] as string,
    low: k[3] as string,
    close: k[4] as string,
    volume: k[5] as string,
    closeTime: k[6] as number,
  }))
}

export function createBinanceWS(
  symbol: string,
  onMessage: (data: Record<string, unknown>) => void,
  onError: (err: Event) => void
): WebSocket {
  const ws = new WebSocket(
    `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@ticker`
  )
  ws.onmessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data as string) as Record<string, unknown>
      onMessage(data)
    } catch {
      // ignore parse errors
    }
  }
  ws.onerror = onError
  return ws
}
