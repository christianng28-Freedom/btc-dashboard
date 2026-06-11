import type { OHLCV, TimeInterval } from '@/lib/types'

/**
 * BTC candle sources.
 *
 * CryptoCompare's anonymous min-api started returning 401 for everything in
 * 2026 — it is gone as a free source. Replacements:
 *  - Deep daily history: Yahoo Finance BTC-USD (2014 → today, full OHLCV, one
 *    request) with Binance pagination as fallback (2017 → today).
 *  - Intraday/interval candles: Binance klines (native 1h/4h/1d/1w) with
 *    Bybit as fallback. Routes calling Binance should set
 *    `preferredRegion = 'fra1'` on Vercel to avoid the US geo-block.
 */

const YF_CHART = 'https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD'
const BINANCE_KLINES = 'https://api.binance.com/api/v3/klines'
const BYBIT_KLINES = 'https://api.bybit.com/v5/market/kline'

// Yahoo's BTC-USD series starts 2014-09-17
const YAHOO_BTC_EPOCH = Math.floor(new Date('2014-09-17').getTime() / 1000)

interface YahooChart {
  chart: {
    result: Array<{
      timestamp: number[]
      indicators: {
        quote: Array<{
          open: (number | null)[]
          high: (number | null)[]
          low: (number | null)[]
          close: (number | null)[]
          volume: (number | null)[]
        }>
      }
    }> | null
    error: { description: string } | null
  }
}

async function fetchYahooBtcDaily(revalidate = 3600): Promise<OHLCV[]> {
  const p2 = Math.floor(Date.now() / 1000)
  const url = `${YF_CHART}?period1=${YAHOO_BTC_EPOCH}&period2=${p2}&interval=1d`
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    next: { revalidate },
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })
  if (!res.ok) throw new Error(`Yahoo BTC-USD: ${res.status}`)
  const json = (await res.json()) as YahooChart
  if (json.chart.error) throw new Error(`Yahoo BTC-USD: ${json.chart.error.description}`)
  const result = json.chart.result?.[0]
  const q = result?.indicators.quote[0]
  if (!result || !q) throw new Error('Yahoo BTC-USD: empty response')

  const out: OHLCV[] = []
  for (let i = 0; i < result.timestamp.length; i++) {
    const close = q.close[i]
    if (close == null || close <= 0) continue
    out.push({
      time: result.timestamp[i],
      open: q.open[i] ?? close,
      high: q.high[i] ?? close,
      low: q.low[i] ?? close,
      close,
      volume: q.volume[i] ?? 0,
    })
  }
  return out
}

type BinanceRow = [number, string, string, string, string, string, ...unknown[]]

async function fetchBinanceBatch(
  interval: string,
  limit: number,
  endTime?: number,
): Promise<OHLCV[]> {
  const params = new URLSearchParams({ symbol: 'BTCUSDT', interval, limit: String(limit) })
  if (endTime) params.set('endTime', String(endTime))
  const res = await fetch(`${BINANCE_KLINES}?${params}`, {
    signal: AbortSignal.timeout(10000),
    next: { revalidate: 60 },
  })
  if (!res.ok) throw new Error(`Binance klines: ${res.status}`)
  const raw = (await res.json()) as BinanceRow[]
  return raw.map((k) => ({
    time: Math.floor(k[0] / 1000),
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }))
}

/** Paginate Binance daily klines backwards until `days` are collected (max 2017→) */
async function fetchBinanceDailyHistory(days: number): Promise<OHLCV[]> {
  const all: OHLCV[] = []
  let endTime: number | undefined
  while (all.length < days) {
    const batch = await fetchBinanceBatch('1d', 1000, endTime)
    if (batch.length === 0) break
    all.unshift(...batch)
    if (batch.length < 1000) break // reached the start of the series
    endTime = batch[0].time * 1000 - 1
  }
  const seen = new Set<number>()
  return all
    .filter((c) => (seen.has(c.time) ? false : (seen.add(c.time), true)))
    .sort((a, b) => a.time - b.time)
    .slice(-days)
}

const BYBIT_INTERVALS: Record<TimeInterval, string> = {
  '1h': '60',
  '4h': '240',
  '1d': 'D',
  '1w': 'W',
}

async function fetchBybitCandles(interval: TimeInterval, limit: number): Promise<OHLCV[]> {
  const params = new URLSearchParams({
    category: 'spot',
    symbol: 'BTCUSDT',
    interval: BYBIT_INTERVALS[interval],
    limit: String(Math.min(limit, 1000)),
  })
  const res = await fetch(`${BYBIT_KLINES}?${params}`, {
    signal: AbortSignal.timeout(10000),
    next: { revalidate: 60 },
  })
  if (!res.ok) throw new Error(`Bybit klines: ${res.status}`)
  const json = (await res.json()) as { result: { list: string[][] } }
  // Bybit returns newest-first: [startTime(ms), open, high, low, close, volume, turnover]
  return (json.result.list ?? [])
    .map((k) => ({
      time: Math.floor(parseInt(k[0], 10) / 1000),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }))
    .reverse()
}

/**
 * Full daily BTC history (2014 → today via Yahoo; 2017 → today via Binance
 * fallback). Used by /api/history, /api/history-extended, and market-state.
 */
export async function fetchDailyHistory(): Promise<OHLCV[]> {
  try {
    const candles = await fetchYahooBtcDaily()
    if (candles.length < 1000) throw new Error(`Yahoo returned only ${candles.length} days`)
    return candles
  } catch (err) {
    console.warn('[candles] Yahoo daily history failed, falling back to Binance:', err instanceof Error ? err.message : err)
    return fetchBinanceDailyHistory(4000)
  }
}

/** Aggregate daily candles into weekly (Monday-start) bars. */
export function aggregateWeekly(daily: OHLCV[]): OHLCV[] {
  const weeks = new Map<number, OHLCV>()
  for (const c of daily) {
    const d = new Date(c.time * 1000)
    // Monday 00:00 UTC of this candle's week
    const dow = (d.getUTCDay() + 6) % 7
    const weekStart = Math.floor(c.time / 86400) * 86400 - dow * 86400
    const w = weeks.get(weekStart)
    if (!w) {
      weeks.set(weekStart, { ...c, time: weekStart })
    } else {
      w.high = Math.max(w.high, c.high)
      w.low = Math.min(w.low, c.low)
      w.close = c.close
      w.volume += c.volume
    }
  }
  return Array.from(weeks.values()).sort((a, b) => a.time - b.time)
}

/**
 * Interval candles for the price chart.
 * 1d/1w come from the full daily history (2014 → today) so zooming out never
 * runs off the data; 1h/4h come from Binance (→ Bybit), capped at 1000 bars.
 */
export async function fetchIntervalCandles(interval: TimeInterval, limit: number): Promise<OHLCV[]> {
  if (interval === '1d') {
    return fetchDailyHistory()
  }
  if (interval === '1w') {
    return aggregateWeekly(await fetchDailyHistory())
  }
  try {
    return await fetchBinanceBatch(interval, Math.min(limit, 1000))
  } catch (err) {
    console.warn('[candles] Binance klines failed, falling back to Bybit:', err instanceof Error ? err.message : err)
    return fetchBybitCandles(interval, limit)
  }
}
