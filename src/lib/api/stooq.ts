// Stooq — free daily OHLCV data, no API key required
// Symbol examples: xauusd, xagusd, xptusd, cl.f, bz.f, ng.f, hg.f, eurusd, usdjpy
// CSV format: Date,Open,High,Low,Close,Volume

const STOOQ_BASE = 'https://stooq.com/q/d/l'

/**
 * Fetch daily close prices for a Stooq symbol.
 * Returns a Map<date, closePrice> sorted ascending by date.
 */
export async function fetchStooqDaily(
  symbol: string,
  revalidate = 3600,
): Promise<Map<string, number>> {
  const url = `${STOOQ_BASE}/?s=${symbol}&i=d`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) throw new Error(`Stooq ${symbol}: ${res.status}`)
  const text = await res.text()
  const lines = text.trim().split('\n')
  const map = new Map<string, number>()
  // Skip header row: Date,Open,High,Low,Close,Volume
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',')
    const date = parts[0]?.trim()
    const close = parts[4]?.trim()
    if (date && close) {
      const val = parseFloat(close)
      if (!isNaN(val)) map.set(date, val)
    }
  }
  return map
}
