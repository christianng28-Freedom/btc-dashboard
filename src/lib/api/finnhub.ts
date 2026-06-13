// Finnhub — free-tier equity fundamentals. Requires FINNHUB_API_KEY.
// Used to show per-ticker detail (price, P/E, EPS, EPS growth, market cap,
// 52-week range) on the Analyst Desk watchlist. Yahoo's chart endpoint has no
// fundamentals and its quoteSummary endpoint is too brittle server-side.

const FINNHUB_BASE = 'https://finnhub.io/api/v1'

export interface EquityFundamental {
  symbol: string
  name: string | null
  price: number | null
  changePercent: number | null
  marketCap: number | null // USD (absolute)
  peTTM: number | null
  epsTTM: number | null
  epsGrowthYoY: number | null // percent
  week52High: number | null
  week52Low: number | null
}

interface FinnhubQuote {
  c?: number // current price
  dp?: number // daily percent change
  pc?: number // previous close
}

interface FinnhubMetricResponse {
  metric?: Record<string, number | null | undefined>
}

interface FinnhubProfile {
  name?: string
}

// Accept either name — FINNHUB_API_KEY (canonical, used locally) or FINNHUB_KEY
// (as configured on Vercel), mirroring the dual-name Upstash handling in store.ts
function apiKey(): string {
  const key = process.env.FINNHUB_API_KEY ?? process.env.FINNHUB_KEY
  if (!key) throw new Error('FINNHUB_API_KEY is not set')
  return key
}

async function getJson<T>(path: string): Promise<T> {
  const sep = path.includes('?') ? '&' : '?'
  const url = `${FINNHUB_BASE}${path}${sep}token=${apiKey()}`
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`Finnhub ${path}: ${res.status}`)
  return (await res.json()) as T
}

function num(v: number | null | undefined): number | null {
  return typeof v === 'number' && isFinite(v) ? v : null
}

/**
 * Fetch price + fundamentals for a single equity ticker.
 * Any field Finnhub doesn't return resolves to null (UI renders "N/A").
 */
export async function fetchEquityFundamentals(symbol: string): Promise<EquityFundamental> {
  const sym = symbol.toUpperCase()
  const [quote, metrics, profile] = await Promise.all([
    getJson<FinnhubQuote>(`/quote?symbol=${encodeURIComponent(sym)}`),
    getJson<FinnhubMetricResponse>(`/stock/metric?symbol=${encodeURIComponent(sym)}&metric=all`),
    getJson<FinnhubProfile>(`/stock/profile2?symbol=${encodeURIComponent(sym)}`),
  ])

  const m = metrics.metric ?? {}
  // Finnhub returns market cap in USD millions
  const mcapMillions = num(m.marketCapitalization)

  return {
    symbol: sym,
    name: profile.name?.trim() || null,
    price: num(quote.c),
    changePercent: num(quote.dp),
    marketCap: mcapMillions != null ? mcapMillions * 1_000_000 : null,
    peTTM: num(m.peTTM),
    epsTTM: num(m.epsTTM),
    epsGrowthYoY: num(m.epsGrowthTTMYoy),
    week52High: num(m['52WeekHigh']),
    week52Low: num(m['52WeekLow']),
  }
}
