import type { OHLCV } from '@/lib/types'
import { smaArray } from './sma'
import { minMax, sigmoid, clamp } from './normalization'

// ── Pi Cycle Top Indicator ───────────────────────────────────────────────────

export interface PiCycleData {
  time: number
  price: number
  ma111: number
  ma350x2: number
}

/**
 * Pi Cycle Top Indicator
 * 111-day MA and 350-day MA × 2
 */
export function calcPiCycle(data: OHLCV[]): PiCycleData[] {
  const closes = data.map((d) => d.close)
  const ma111 = smaArray(closes, 111)
  const ma350 = smaArray(closes, 350)

  const results: PiCycleData[] = []
  for (let i = 349; i < data.length; i++) {
    const v111 = ma111[i]
    const v350 = ma350[i]
    if (isNaN(v111) || isNaN(v350)) continue
    results.push({
      time: data[i].time,
      price: data[i].close,
      ma111: v111,
      ma350x2: v350 * 2,
    })
  }
  return results
}

/**
 * Get current Pi Cycle gap %
 * gap = (350DMAx2 - 111DMA) / 350DMAx2 * 100
 * Positive = 111DMA below 350DMAx2 (safe)
 * Negative or 0 = crossed (top signal)
 */
export function getPiCycleGap(data: OHLCV[]): { ma111: number; ma350x2: number; gapPct: number } | null {
  const closes = data.map((d) => d.close)
  const ma111 = smaArray(closes, 111)
  const ma350 = smaArray(closes, 350)

  const last111 = ma111[ma111.length - 1]
  const last350 = ma350[ma350.length - 1]
  if (isNaN(last111) || isNaN(last350)) return null

  const ma350x2 = last350 * 2
  const gapPct = ((ma350x2 - last111) / ma350x2) * 100
  return { ma111: last111, ma350x2, gapPct }
}

// ── 2-Year MA Multiplier ─────────────────────────────────────────────────────

export interface TwoYearMAData {
  time: number
  price: number
  ma730: number
  ma730x5: number
}

/**
 * 2-Year MA Multiplier
 * 730-day SMA floor and 730-day SMA × 5 ceiling
 */
export function calcTwoYearMA(data: OHLCV[]): TwoYearMAData[] {
  const closes = data.map((d) => d.close)
  const ma730 = smaArray(closes, 730)

  const results: TwoYearMAData[] = []
  for (let i = 729; i < data.length; i++) {
    const v = ma730[i]
    if (isNaN(v)) continue
    results.push({
      time: data[i].time,
      price: data[i].close,
      ma730: v,
      ma730x5: v * 5,
    })
  }
  return results
}

// ── Rainbow Chart ────────────────────────────────────────────────────────────

export interface RainbowBandData {
  time: number
  price: number
  top0: number // absolute ceiling of band 0: base × 0.25
  top1: number // absolute ceiling of band 1: base × 0.40
  top2: number // absolute ceiling of band 2: base × 0.60
  top3: number // absolute ceiling of band 3: base × 0.80
  top4: number // absolute ceiling of band 4: base × 1.00
  top5: number // absolute ceiling of band 5: base × 1.50
  top6: number // absolute ceiling of band 6: base × 2.20
  top7: number // absolute ceiling of band 7: base × 3.20
  top8: number // absolute ceiling of band 8: base × 5.00
}

// Log regression: ln(price) = SLOPE * ln(days_since_genesis) + INTERCEPT
// Based on LookIntoBitcoin model (log10 form: log10(price) = 5.84 * log10(days) - 17.01)
const GENESIS_DATE = new Date('2009-01-03').getTime()
const REGRESSION_SLOPE = 5.84
const REGRESSION_INTERCEPT = -17.01 * Math.LN10 // = -17.01 * ln(10) ≈ -39.16

function regressionPrice(timestamp: number): number {
  const days = (timestamp * 1000 - GENESIS_DATE) / (1000 * 60 * 60 * 24)
  if (days <= 0) return 0
  const lnDays = Math.log(days)
  const lnPrice = REGRESSION_SLOPE * lnDays + REGRESSION_INTERCEPT
  return Math.exp(lnPrice)
}

const BAND_MULTIPLIERS = [0.25, 0.4, 0.6, 0.8, 1.0, 1.5, 2.2, 3.2, 5.0]

export function calcRainbowBands(data: OHLCV[]): RainbowBandData[] {
  return data.map((d) => {
    const base = regressionPrice(d.time)
    return {
      time: d.time,
      price: d.close,
      top0: base * BAND_MULTIPLIERS[0],
      top1: base * BAND_MULTIPLIERS[1],
      top2: base * BAND_MULTIPLIERS[2],
      top3: base * BAND_MULTIPLIERS[3],
      top4: base * BAND_MULTIPLIERS[4],
      top5: base * BAND_MULTIPLIERS[5],
      top6: base * BAND_MULTIPLIERS[6],
      top7: base * BAND_MULTIPLIERS[7],
      top8: base * BAND_MULTIPLIERS[8],
    }
  })
}

/**
 * Get current rainbow zone label for a given price
 */
export function getRainbowZone(price: number, timestamp: number): string {
  const base = regressionPrice(timestamp)
  if (price < base * BAND_MULTIPLIERS[1]) return 'Fire Sale'
  if (price < base * BAND_MULTIPLIERS[2]) return 'BUY!'
  if (price < base * BAND_MULTIPLIERS[3]) return 'Accumulate'
  if (price < base * BAND_MULTIPLIERS[4]) return 'Still Cheap'
  if (price < base * BAND_MULTIPLIERS[5]) return 'Is This a Bubble?'
  if (price < base * BAND_MULTIPLIERS[6]) return 'FOMO Intensifies'
  if (price < base * BAND_MULTIPLIERS[7]) return 'Sell. Seriously.'
  if (price < base * BAND_MULTIPLIERS[8]) return 'Maximum Bubble Territory'
  return 'Bitcoin is Dead (not)'
}

/**
 * Get rainbow band index (0–8) for a given price and timestamp
 * 0 = Fire Sale (extreme buy), 8 = Bitcoin is Dead (extreme sell)
 */
export function getRainbowBandIndex(price: number, timestamp: number): number {
  const base = regressionPrice(timestamp)
  if (price < base * BAND_MULTIPLIERS[1]) return 0
  if (price < base * BAND_MULTIPLIERS[2]) return 1
  if (price < base * BAND_MULTIPLIERS[3]) return 2
  if (price < base * BAND_MULTIPLIERS[4]) return 3
  if (price < base * BAND_MULTIPLIERS[5]) return 4
  if (price < base * BAND_MULTIPLIERS[6]) return 5
  if (price < base * BAND_MULTIPLIERS[7]) return 6
  if (price < base * BAND_MULTIPLIERS[8]) return 7
  return 8
}

// ── 200-Week MA Heatmap ──────────────────────────────────────────────────────

export interface MAHeatmapPoint {
  time: number
  price: number
  ma200w: number
  deviationPct: number
  color: string
}

function deviationToColor(deviationPct: number): string {
  // deviationPct: (price - 200wma) / 200wma * 100
  if (deviationPct < -30) return '#1d4ed8' // deep blue — far below
  if (deviationPct < -10) return '#2563eb'
  if (deviationPct < 0)   return '#3b82f6'
  if (deviationPct < 20)  return '#22c55e' // green — near MA
  if (deviationPct < 50)  return '#84cc16'
  if (deviationPct < 100) return '#eab308' // yellow
  if (deviationPct < 200) return '#f97316' // orange
  if (deviationPct < 400) return '#ef4444' // red
  return '#b91c1c' // dark red — extreme bubble
}

/**
 * 200-Week MA Heatmap
 * Price colored by distance from 200-week (1400-day) SMA
 */
export function calcMAHeatmap(data: OHLCV[]): MAHeatmapPoint[] {
  const closes = data.map((d) => d.close)
  const ma200w = smaArray(closes, 1400)

  const results: MAHeatmapPoint[] = []
  for (let i = 1399; i < data.length; i++) {
    const v = ma200w[i]
    if (isNaN(v)) continue
    const deviationPct = ((data[i].close - v) / v) * 100
    results.push({
      time: data[i].time,
      price: data[i].close,
      ma200w: v,
      deviationPct,
      color: deviationToColor(deviationPct),
    })
  }
  return results
}

// ── Technical Composite Score (PRD Section 8.2) ───────────────────────────────

export interface TechnicalScoreComponents {
  rsiScore: number
  macdScore: number
  priceVsMA200Score: number
  bollingerScore: number
  stochRsiScore: number
  piCycleScore: number
  twoYearMAScore: number
  dominanceScore: number
  totalScore: number
  label: string
  color: string
}

function scoreLabel(score: number): { label: string; color: string } {
  if (score <= 15) return { label: 'Strong Buy', color: '#22c55e' }
  if (score <= 35) return { label: 'Buy', color: '#86efac' }
  if (score <= 65) return { label: 'Neutral', color: '#f59e0b' }
  if (score <= 85) return { label: 'Sell', color: '#f87171' }
  return { label: 'Strong Sell', color: '#ef4444' }
}

export function calcTechnicalScore(params: {
  rsi: number
  macdHistogram: number
  price: number
  ma200: number
  bollingerPctB: number
  stochRsiK: number
  piCycleGapPct: number | null
  twoYearMA: number | null
  dominancePct: number
}): TechnicalScoreComponents {
  const { rsi, macdHistogram, price, ma200, bollingerPctB, stochRsiK, piCycleGapPct, twoYearMA, dominancePct } = params

  // 1. RSI score (weight 0.15): minMax(rsi, 20, 80) * 100
  const rsiScore = minMax(rsi, 20, 80) * 100

  // 2. MACD Histogram score (weight 0.10): sigmoid(hist/price*1000, 2) * 100
  const macdNorm = (macdHistogram / price) * 1000
  const macdScore = sigmoid(macdNorm, 2) * 100

  // 3. Price vs 200 SMA score (weight 0.15): sigmoid((price-ma200)/ma200 - 0.5, 3) * 100
  const priceDeviation = (price - ma200) / ma200
  const priceVsMA200Score = sigmoid(priceDeviation - 0.5, 3) * 100

  // 4. Bollinger %B score (weight 0.10): minMax(pctB, 0, 1) * 100
  const bollingerScore = clamp(bollingerPctB * 100, 0, 100)

  // 5. Stochastic RSI %K score (weight 0.10): direct 0-100
  const stochRsiScore = clamp(stochRsiK, 0, 100)

  // 6. Pi Cycle Proximity score (weight 0.15): bucket-based
  let piCycleScore = 50 // fallback neutral
  if (piCycleGapPct !== null) {
    const gap = piCycleGapPct / 100 // convert back to ratio
    if (gap > 0.30) piCycleScore = 10
    else if (gap > 0.10) piCycleScore = 30
    else if (gap > 0.02) piCycleScore = 60
    else if (gap > 0.00) piCycleScore = 85
    else piCycleScore = 98
  }

  // 7. 2-Year MA Position score (weight 0.10): minMax(price, ma730, ma730*5) * 100
  let twoYearMAScore = 50 // fallback neutral
  if (twoYearMA !== null && twoYearMA > 0) {
    twoYearMAScore = minMax(price, twoYearMA, twoYearMA * 5) * 100
  }

  // 8. BTC Dominance score (weight 0.15): (1 - minMax(dom, 40, 70)) * 100
  const dominanceScore = (1 - minMax(dominancePct, 40, 70)) * 100

  // Weighted sum
  const totalScore =
    rsiScore * 0.15 +
    macdScore * 0.10 +
    priceVsMA200Score * 0.15 +
    bollingerScore * 0.10 +
    stochRsiScore * 0.10 +
    piCycleScore * 0.15 +
    twoYearMAScore * 0.10 +
    dominanceScore * 0.15

  const { label, color } = scoreLabel(totalScore)

  return {
    rsiScore,
    macdScore,
    priceVsMA200Score,
    bollingerScore,
    stochRsiScore,
    piCycleScore,
    twoYearMAScore,
    dominanceScore,
    totalScore,
    label,
    color,
  }
}
