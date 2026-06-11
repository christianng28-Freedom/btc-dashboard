import type { OHLCV } from '@/lib/types'
import { calcRSI } from '@/lib/calc/rsi'
import { calcMACD } from '@/lib/calc/macd'
import { calcBollinger } from '@/lib/calc/bollinger'
import { calcStochRSI } from '@/lib/calc/stochastic-rsi'
import { calcSMA } from '@/lib/calc/sma'
import {
  calcTechnicalScore,
  getPiCycleGap,
  getRainbowBandIndex,
  type TechnicalScoreComponents,
} from '@/lib/calc/technical-scores'
import { calcFundamentalScore, type FundamentalScoreComponents } from '@/lib/calc/fundamental-scores'
import { calcOnChainScore, type OnChainScoreComponents } from '@/lib/calc/onchain-scores'
import { calcOverallScore, type OverallScoreComponents } from '@/lib/calc/overall-score'
import { evaluateAlerts, type Alert, type AlertInputs } from '@/lib/alerts'
import {
  fetchExtendedCandles,
  fetchFundamentalSnapshot,
  fetchFearGreedSnapshot,
  fetchDominance,
  fetchNuplSnapshot,
  fetchMacroSnapshot,
  type FundamentalSnapshot,
  type FearGreedSnapshot,
  type NuplSnapshot,
  type MacroSnapshot,
} from './market-data'

/**
 * The canonical machine-readable market state.
 *
 * This is THE single source of truth for the conviction scores: computed
 * server-side, from pinned daily candles, with every upstream source's
 * health reported explicitly. The dashboard UI and every analyst agent
 * consume this same structure — no silent divergence between what the user
 * sees and what the agents reason about.
 */

export interface SourceStatus {
  ok: boolean
  asOf: string | null
  error: string | null
}

export interface MarketState {
  generatedAt: string
  price: number | null
  scores: {
    technical: TechnicalScoreComponents | null
    fundamental: FundamentalScoreComponents | null
    onChain: OnChainScoreComponents | null
    overall: OverallScoreComponents | null
  }
  raw: {
    rsi: number | null
    fundingRate: number | null
    annualisedFundingRatePct: number | null
    oiDeviationPct: number | null
    fearGreed: number | null
    fearGreedLabel: string | null
    piCycleGapPct: number | null
    nupl: number | null
    mvrv: number | null
    dominancePct: number | null
    macro: MacroSnapshot | null
  }
  alerts: Alert[]
  sources: {
    candles: SourceStatus
    fundamental: SourceStatus
    fearGreed: SourceStatus
    dominance: SourceStatus
    nupl: SourceStatus
    macro: SourceStatus
  }
}

// Bitcoin halving 4: April 19, 2024 (mirrors useOnChainScore)
const HALVING_4_TIMESTAMP = new Date('2024-04-19').getTime()
const CYCLE_LENGTH_MS = 4 * 365.25 * 24 * 60 * 60 * 1000

function smaSeries(prices: number[], period: number): { price: number; sma: number }[] {
  if (prices.length < period) return []
  const out: { price: number; sma: number }[] = []
  let sum = 0
  for (let i = 0; i < period; i++) sum += prices[i]
  out.push({ price: prices[period - 1], sma: sum / period })
  for (let i = period; i < prices.length; i++) {
    sum += prices[i] - prices[i - period]
    out.push({ price: prices[i], sma: sum / period })
  }
  return out
}

async function settle<T>(p: Promise<T>): Promise<{ value: T | null; error: string | null }> {
  try {
    return { value: await p, error: null }
  } catch (err) {
    return { value: null, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function computeMarketState(): Promise<MarketState> {
  const [candlesR, fundR, fgR, domR, nuplR, macroR] = await Promise.all([
    settle(fetchExtendedCandles()),
    settle(fetchFundamentalSnapshot()),
    settle(fetchFearGreedSnapshot()),
    settle(fetchDominance()),
    settle(fetchNuplSnapshot()),
    settle(fetchMacroSnapshot()),
  ])

  const extended: OHLCV[] = candlesR.value ?? []
  const history = extended.slice(-2000)
  const daily = extended.slice(-500)
  const fund: FundamentalSnapshot | null = fundR.value
  const fg: FearGreedSnapshot | null = fgR.value
  const dominance: number | null = domR.value
  const nupl: NuplSnapshot | null = nuplR.value
  const macro: MacroSnapshot | null = macroR.value

  const price = daily.length > 0 ? daily[daily.length - 1].close : null

  // ── Technical score (always from daily candles) ────────────────────────────
  let technical: TechnicalScoreComponents | null = null
  let rsi: number | null = null
  let piCycleGapPct: number | null = null
  let stochRsiK: number | null = null
  let ma200: number | null = null

  if (daily.length >= 200 && price != null) {
    const rsiData = calcRSI(daily)
    const macdData = calcMACD(daily)
    const bbData = calcBollinger(daily)
    const stochData = calcStochRSI(daily)
    const sma200Data = calcSMA(daily, 200)

    if (rsiData.length && macdData.length && bbData.length && stochData.length && sma200Data.length) {
      rsi = rsiData[rsiData.length - 1].value
      stochRsiK = stochData[stochData.length - 1].k
      ma200 = sma200Data[sma200Data.length - 1].value
      const piData = history.length >= 350 ? history : daily
      piCycleGapPct = getPiCycleGap(piData)?.gapPct ?? null

      let twoYearMA: number | null = null
      if (history.length >= 730) {
        const sma730 = calcSMA(history, 730)
        if (sma730.length > 0) twoYearMA = sma730[sma730.length - 1].value
      }

      technical = calcTechnicalScore({
        rsi,
        macdHistogram: macdData[macdData.length - 1].histogram,
        price,
        ma200,
        bollingerPctB: bbData[bbData.length - 1].percentB,
        stochRsiK,
        piCycleGapPct,
        twoYearMA,
        dominancePct: dominance,
      })
    }
  }

  // ── Fundamental score (requires real leverage data) ─────────────────────────
  let fundamental: FundamentalScoreComponents | null = null
  if (fg && fund) {
    fundamental = calcFundamentalScore({
      fearGreed: fg.value,
      oiValue: fund.currentOI,
      oi90dMA: fund.oi90dMA,
      fundingRate: fund.currentFundingRate,
      fedFunds: macro?.fedFundsUpper ?? null,
      cpiYoY: macro?.cpiYoY ?? null,
      pceYoY: macro?.pceYoY ?? null,
      m2YoY: macro?.m2YoY ?? null,
      tenYearYield: macro?.tenYearYield ?? null,
      dxy: macro?.dxy ?? null,
    })
  }

  // ── On-chain score ───────────────────────────────────────────────────────────
  let onChain: OnChainScoreComponents | null = null
  if (history.length >= 200 && price != null) {
    const histPrices = history.map((c) => c.close)
    const mmSeries = smaSeries(histPrices, 200)
    const extPrices = extended.length >= 1400 ? extended.map((c) => c.close) : histPrices
    const wmaSeries = smaSeries(extPrices, 1400)

    if (mmSeries.length > 0 && wmaSeries.length > 0) {
      const mayerMultiples = mmSeries.map((p) => p.price / p.sma)
      const wmaRatios = wmaSeries.map((p) => p.price / p.sma)
      const latest = history[history.length - 1]
      const allPrices = extended.length > history.length ? extended.map((c) => c.close) : histPrices
      const ath = Math.max(...allPrices)

      onChain = calcOnChainScore({
        currentMayerMultiple: mayerMultiples[mayerMultiples.length - 1],
        historicalMayerMultiples: mayerMultiples,
        currentWMARatio: wmaRatios[wmaRatios.length - 1],
        historicalWMARatios: wmaRatios,
        currentNUPL: nupl?.nupl ?? null,
        currentMVRV: nupl?.mvrv ?? null,
        rainbowBandIndex: getRainbowBandIndex(latest.close, latest.time),
        halvingCyclePos: Math.min(1, (Date.now() - HALVING_4_TIMESTAMP) / CYCLE_LENGTH_MS),
        priceVsAth: ath > 0 ? price / ath : null,
      })
    }
  }

  // ── Overall ─────────────────────────────────────────────────────────────────
  const overall =
    technical && fundamental
      ? calcOverallScore({
          taScore: technical.totalScore,
          fundamentalScore: fundamental.totalScore,
          onChainScore: onChain?.totalScore ?? null,
        })
      : null

  // ── Alerts ──────────────────────────────────────────────────────────────────
  const alertInputs: AlertInputs = {}
  if (rsi != null) alertInputs.rsi = rsi
  if (stochRsiK != null) alertInputs.stochRsiK = stochRsiK
  if (price != null) alertInputs.price = price
  if (ma200 != null) alertInputs.ma200 = ma200
  if (piCycleGapPct != null) alertInputs.piCycleGapPct = piCycleGapPct
  if (fg) {
    alertInputs.fearGreed = fg.value
    alertInputs.fearGreedLabel = fg.classification
  }
  if (fund) {
    alertInputs.fundingRate = fund.currentFundingRate
    alertInputs.oiDeviationPct = fund.oiDeviationPct
  }
  const alerts = evaluateAlerts(alertInputs)

  const candleAsOf =
    daily.length > 0 ? new Date(daily[daily.length - 1].time * 1000).toISOString() : null

  return {
    generatedAt: new Date().toISOString(),
    price,
    scores: { technical, fundamental, onChain, overall },
    raw: {
      rsi,
      fundingRate: fund?.currentFundingRate ?? null,
      annualisedFundingRatePct: fund?.annualisedFundingRate ?? null,
      oiDeviationPct: fund?.oiDeviationPct ?? null,
      fearGreed: fg?.value ?? null,
      fearGreedLabel: fg?.classification ?? null,
      piCycleGapPct,
      nupl: nupl?.nupl ?? null,
      mvrv: nupl?.mvrv ?? null,
      dominancePct: dominance,
      macro,
    },
    alerts,
    sources: {
      candles: {
        ok: extended.length > 0,
        asOf: candleAsOf,
        error:
          candlesR.error ??
          (extended.length > 0 && extended.length < 1400
            ? `degraded: only ${extended.length} days of history (on-chain score needs 1400+)`
            : null),
      },
      fundamental: { ok: fund != null, asOf: fund?.lastUpdated ?? null, error: fundR.error },
      fearGreed: { ok: fg != null, asOf: fg?.asOf ?? null, error: fgR.error },
      dominance: { ok: dominance != null, asOf: dominance != null ? new Date().toISOString() : null, error: domR.error },
      nupl: { ok: nupl != null, asOf: nupl?.asOf ?? null, error: nuplR.error },
      macro: { ok: macro != null, asOf: macro?.asOf ?? null, error: macroR.error },
    },
  }
}
