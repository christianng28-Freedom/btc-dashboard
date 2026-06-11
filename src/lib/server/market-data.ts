import type { OHLCV } from '@/lib/types'
import { fetchFearGreed } from '@/lib/api/alternative-me'
import { fetchGlobal } from '@/lib/api/coingecko'
import { fetchFREDLatest } from '@/lib/api/fred'
import { fetchDailyHistory } from './candles'

/**
 * Server-side market data fetchers for /api/market-state and the analyst
 * agents. Mirrors the per-route fetch logic so agents and the UI read the
 * same upstream sources (CryptoCompare, Bybit→Binance, FRED, CoinMetrics,
 * Alternative.me, CoinGecko).
 */

// ── Candles ──────────────────────────────────────────────────────────────────
// Daily history comes from the shared candle lib (Yahoo BTC-USD 2014→today,
// Binance fallback). CryptoCompare is dead — its anonymous API returns 401.

/** Most recent `limit` daily candles (default 500 — enough for RSI/MACD/SMA200) */
export async function fetchDailyCandles(limit = 500): Promise<OHLCV[]> {
  const all = await fetchDailyHistory()
  return all.slice(-limit)
}

/** ~12 years of daily candles for 200w MA, Pi Cycle, Mayer percentiles, ATH */
export function fetchExtendedCandles(): Promise<OHLCV[]> {
  return fetchDailyHistory()
}

// ── Futures OI + funding (Bybit → Binance, same as /api/fundamental) ─────────

export interface FundamentalSnapshot {
  currentOI: number
  oi90dMA: number
  oiDeviationPct: number
  currentFundingRate: number
  annualisedFundingRate: number
  lastUpdated: string
}

async function fundamentalFromBybit(): Promise<FundamentalSnapshot> {
  const base = 'https://api.bybit.com'
  const [oiRes, tickerRes] = await Promise.all([
    fetch(`${base}/v5/market/open-interest?category=linear&symbol=BTCUSDT&intervalTime=1d&limit=100`, {
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 3600 },
    }),
    fetch(`${base}/v5/market/tickers?category=linear&symbol=BTCUSDT`, {
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 300 },
    }),
  ])
  if (!oiRes.ok || !tickerRes.ok) throw new Error(`Bybit error: ${oiRes.status}/${tickerRes.status}`)

  const oiJson = (await oiRes.json()) as { result: { list: Array<{ openInterest: string; timestamp: string }> } }
  const tickerJson = (await tickerRes.json()) as {
    result: { list: Array<{ fundingRate: string; lastPrice: string }> }
  }
  const ticker = tickerJson.result.list[0]
  const btcPrice = parseFloat(ticker.lastPrice)
  const oiValues = oiJson.result.list
    .slice()
    .reverse()
    .map((d) => parseFloat(d.openInterest) * btcPrice)

  const recent90 = oiValues.slice(-90)
  const oi90dMA = recent90.reduce((s, v) => s + v, 0) / recent90.length
  const currentOI = oiValues[oiValues.length - 1] ?? 0
  const currentFundingRate = parseFloat(ticker.fundingRate)
  return {
    currentOI,
    oi90dMA,
    oiDeviationPct: oi90dMA > 0 ? ((currentOI - oi90dMA) / oi90dMA) * 100 : 0,
    currentFundingRate,
    annualisedFundingRate: currentFundingRate * 3 * 365 * 100,
    lastUpdated: new Date().toISOString(),
  }
}

async function fundamentalFromBinance(): Promise<FundamentalSnapshot> {
  const base = 'https://fapi.binance.com'
  const [oiRes, fundingRes] = await Promise.all([
    fetch(`${base}/futures/data/openInterestHist?symbol=BTCUSDT&period=1d&limit=100`, {
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 3600 },
    }),
    fetch(`${base}/fapi/v1/premiumIndex?symbol=BTCUSDT`, {
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 300 },
    }),
  ])
  if (!oiRes.ok || !fundingRes.ok) throw new Error(`Binance error: ${oiRes.status}/${fundingRes.status}`)

  const oiRaw = (await oiRes.json()) as Array<{ sumOpenInterestValue: string }>
  const fundingRaw = (await fundingRes.json()) as { lastFundingRate: string }
  const oiValues = oiRaw.map((d) => parseFloat(d.sumOpenInterestValue))
  const recent90 = oiValues.slice(-90)
  const oi90dMA = recent90.reduce((s, v) => s + v, 0) / recent90.length
  const currentOI = oiValues[oiValues.length - 1] ?? 0
  const currentFundingRate = parseFloat(fundingRaw.lastFundingRate)
  return {
    currentOI,
    oi90dMA,
    oiDeviationPct: oi90dMA > 0 ? ((currentOI - oi90dMA) / oi90dMA) * 100 : 0,
    currentFundingRate,
    annualisedFundingRate: currentFundingRate * 3 * 365 * 100,
    lastUpdated: new Date().toISOString(),
  }
}

export async function fetchFundamentalSnapshot(): Promise<FundamentalSnapshot> {
  try {
    return await fundamentalFromBybit()
  } catch {
    return await fundamentalFromBinance()
  }
}

// ── Fear & Greed ─────────────────────────────────────────────────────────────

export interface FearGreedSnapshot {
  value: number
  classification: string
  asOf: string
}

export async function fetchFearGreedSnapshot(): Promise<FearGreedSnapshot> {
  const data = await fetchFearGreed(1)
  const latest = data.data?.[0]
  if (!latest) throw new Error('Fear & Greed returned no data')
  return {
    value: parseInt(latest.value, 10),
    classification: latest.value_classification,
    asOf: new Date(parseInt(latest.timestamp, 10) * 1000).toISOString(),
  }
}

// ── Dominance (CoinGecko) ────────────────────────────────────────────────────

export async function fetchDominance(): Promise<number> {
  const global = await fetchGlobal()
  return global.data.market_cap_percentage.btc
}

// ── NUPL / MVRV (CoinMetrics community — latest values only) ─────────────────

export interface NuplSnapshot {
  nupl: number
  mvrv: number
  asOf: string
}

export async function fetchNuplSnapshot(): Promise<NuplSnapshot | null> {
  const apiKey = process.env.COINMETRICS_API_KEY ?? 'community'
  const start = new Date(Date.now() - 14 * 86400_000).toISOString().slice(0, 10)
  const url = new URL('https://community-api.coinmetrics.io/v4/timeseries/asset-metrics')
  url.searchParams.set('assets', 'btc')
  url.searchParams.set('metrics', 'CapRealUSD,CapMrktCurUSD')
  url.searchParams.set('frequency', '1d')
  url.searchParams.set('start_time', start)
  url.searchParams.set('page_size', '20')
  url.searchParams.set('api_key', apiKey)

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
    next: { revalidate: 21600 },
  })
  // Community key can be blocked — degrade to "no on-chain profitability data"
  if (res.status === 403) return null
  if (!res.ok) throw new Error(`CoinMetrics error: ${res.status}`)

  const json = (await res.json()) as {
    data: Array<{ time: string; CapMrktCurUSD?: string | null; CapRealUSD?: string | null }>
  }
  const rows = json.data.filter((d) => d.CapMrktCurUSD != null && d.CapRealUSD != null)
  const last = rows[rows.length - 1]
  if (!last) return null
  const mcap = parseFloat(last.CapMrktCurUSD!)
  const rcap = parseFloat(last.CapRealUSD!)
  return {
    nupl: mcap > 0 ? (mcap - rcap) / mcap : 0,
    mvrv: rcap > 0 ? mcap / rcap : 1,
    asOf: last.time,
  }
}

// ── Macro (FRED — same series as /api/macro) ─────────────────────────────────

export interface MacroSnapshot {
  fedFundsUpper: number | null
  cpiYoY: number | null
  pceYoY: number | null
  m2YoY: number | null
  tenYearYield: number | null
  dxy: number | null
  asOf: string
}

export async function fetchMacroSnapshot(): Promise<MacroSnapshot> {
  if (!process.env.FRED_API_KEY) throw new Error('FRED_API_KEY not configured')

  const [fedUpper, cpiObs, m2Obs, tenYObs, pceObs, dxyObs] = await Promise.all([
    fetchFREDLatest('DFEDTARU', 1),
    fetchFREDLatest('CPIAUCSL', 14),
    fetchFREDLatest('M2SL', 14),
    fetchFREDLatest('DGS10', 5),
    fetchFREDLatest('PCEPI', 14),
    fetchFREDLatest('DTWEXBGS', 5),
  ])

  const yoy = (obs: Array<{ value: number }>): number | null =>
    obs[0] && obs[12] ? ((obs[0].value - obs[12].value) / obs[12].value) * 100 : null

  return {
    fedFundsUpper: fedUpper[0]?.value ?? null,
    cpiYoY: yoy(cpiObs),
    pceYoY: yoy(pceObs),
    m2YoY: yoy(m2Obs),
    tenYearYield: tenYObs[0]?.value ?? null,
    dxy: dxyObs[0]?.value ?? null,
    asOf: new Date().toISOString(),
  }
}
