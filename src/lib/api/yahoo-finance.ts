// Yahoo Finance — unofficial public API, no key required.
// Used as a fallback for equity indices and crypto-adjacent stocks
// not available on FRED or Stooq.
// Ticker examples: ^GSPC, ^IXIC, ^RUT, ^VIX, MSTR, COIN, MARA, RIOT
// For international: ^STOXX50E, ^GDAXI, ^FTSE, ^N225, ^HSI

const YF_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart'

interface YahooChartResponse {
  chart: {
    result: Array<{
      meta: {
        regularMarketPrice: number
        previousClose: number
        currency: string
        symbol: string
        shortName?: string
      }
      timestamp: number[]
      indicators: {
        adjclose?: Array<{ adjclose: (number | null)[] }>
        quote: Array<{
          open: (number | null)[]
          high: (number | null)[]
          low: (number | null)[]
          close: (number | null)[]
          volume: (number | null)[]
        }>
      }
    }> | null
    error: { code: string; description: string } | null
  }
}

/**
 * Fetch daily close prices for a Yahoo Finance ticker.
 * Returns a Map<date (YYYY-MM-DD), closePrice>.
 *
 * @param ticker  Yahoo Finance ticker symbol (e.g. "^GSPC", "MSTR")
 * @param range   Lookback period: "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y" | "max"
 */
export async function fetchYahooFinanceDaily(
  ticker: string,
  range: '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | 'max' = '1y',
  revalidate = 3600,
): Promise<Map<string, number>> {
  const url = `${YF_BASE}/${encodeURIComponent(ticker)}?range=${range}&interval=1d&includeAdjustedClose=true`
  const res = await fetch(url, {
    next: { revalidate },
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })
  if (!res.ok) throw new Error(`Yahoo Finance ${ticker}: ${res.status}`)
  const json = (await res.json()) as YahooChartResponse
  if (json.chart.error) {
    throw new Error(`Yahoo Finance ${ticker}: ${json.chart.error.description}`)
  }
  const result = json.chart.result?.[0]
  if (!result) throw new Error(`Yahoo Finance ${ticker}: no data returned`)

  const timestamps = result.timestamp
  const closes =
    result.indicators.adjclose?.[0]?.adjclose ??
    result.indicators.quote[0]?.close ??
    []

  const map = new Map<string, number>()
  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i]
    if (close != null && !isNaN(close)) {
      const date = new Date(timestamps[i] * 1000).toISOString().split('T')[0]
      map.set(date, close)
    }
  }
  return map
}

/**
 * Fetch the current price and basic metadata for a ticker.
 */
export async function fetchYahooFinanceQuote(ticker: string): Promise<{
  price: number
  previousClose: number
  changePercent: number
  currency: string
  name: string
}> {
  const url = `${YF_BASE}/${encodeURIComponent(ticker)}?range=1d&interval=1d`
  const res = await fetch(url, {
    next: { revalidate: 300 },
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })
  if (!res.ok) throw new Error(`Yahoo Finance ${ticker}: ${res.status}`)
  const json = (await res.json()) as YahooChartResponse
  if (json.chart.error) {
    throw new Error(`Yahoo Finance ${ticker}: ${json.chart.error.description}`)
  }
  const meta = json.chart.result?.[0]?.meta
  if (!meta) throw new Error(`Yahoo Finance ${ticker}: no meta returned`)
  const price = meta.regularMarketPrice
  const prev = meta.previousClose
  return {
    price,
    previousClose: prev,
    changePercent: prev > 0 ? ((price - prev) / prev) * 100 : 0,
    currency: meta.currency,
    name: meta.shortName ?? ticker,
  }
}
