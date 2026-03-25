/**
 * Normalization helpers for composite score calculation
 */

/** Scale a value from [min, max] into [0, 1] */
export function minMax(value: number, min: number, max: number): number {
  if (max === min) return 0.5
  return Math.max(0, Math.min(1, (value - min) / (max - min)))
}

/** Sigmoid function — maps any real number to (0, 1) */
export function sigmoid(x: number, scale = 1): number {
  return 1 / (1 + Math.exp(-x * scale))
}

/**
 * Percentile rank of `value` within `population`
 * Returns 0–100 (percentage of population values below `value`)
 */
export function percentileRank(value: number, population: number[]): number {
  if (population.length === 0) return 50
  const below = population.filter((v) => v < value).length
  return (below / population.length) * 100
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Scale RSI (0–100) to a score (0–100) where:
 * 30 → 0 (oversold = strong buy signal → inverted for score context)
 * 50 → 50 (neutral)
 * 70 → 100 (overbought = strong sell signal)
 * Actually we want: low RSI = bearish = low score, high RSI = bullish = high score
 * RSI 14-30 = Strong Buy (score ~80-100), 30-45 = Buy, 45-55 = Neutral, 55-70 = Sell, 70-100 = Strong Sell
 */
export function normalizeRSI(rsi: number): number {
  // Invert: oversold is bullish (high score), overbought is bearish (low score)
  // Map: rsi=20 → 90, rsi=30 → 75, rsi=50 → 50, rsi=70 → 25, rsi=80 → 10
  return clamp(100 - rsi, 0, 100)
}

/**
 * Normalize MACD histogram to 0–100
 * Positive histogram = bullish, negative = bearish
 * Uses sigmoid to bound unbounded values
 */
export function normalizeMACD(histogram: number, scale = 0.1): number {
  return sigmoid(histogram * scale) * 100
}

/**
 * Normalize StochRSI %K (0–100) to score (0–100)
 * Low StochRSI = oversold = bullish = high score
 */
export function normalizeStochRSI(k: number): number {
  return clamp(100 - k, 0, 100)
}
