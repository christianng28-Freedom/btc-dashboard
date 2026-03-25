import type { OHLCV } from '@/lib/types'

export interface BollingerPoint {
  time: number
  upper: number
  middle: number
  lower: number
  bandwidth: number
  percentB: number
  squeeze: boolean
}

/**
 * Bollinger Bands(20, 2)
 * Includes %B, bandwidth, and squeeze detection (bandwidth < 120-period low of bandwidth)
 */
export function calcBollinger(
  data: OHLCV[],
  period = 20,
  stdDevMult = 2,
  squeezeLookback = 120
): BollingerPoint[] {
  if (data.length < period) return []

  const closes = data.map((c) => c.close)
  const result: BollingerPoint[] = []
  const bandwidths: number[] = []

  for (let i = period - 1; i < data.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1)
    const mean = slice.reduce((a, b) => a + b, 0) / period
    const variance = slice.reduce((sum, v) => sum + (v - mean) ** 2, 0) / period
    const std = Math.sqrt(variance)

    const upper = mean + stdDevMult * std
    const lower = mean - stdDevMult * std
    const bandwidth = (upper - lower) / mean
    const percentB = (closes[i] - lower) / (upper - lower)

    bandwidths.push(bandwidth)

    // Squeeze: bandwidth is below its lowest value in the last `squeezeLookback` candles
    let squeeze = false
    if (bandwidths.length >= squeezeLookback) {
      const lookback = bandwidths.slice(-squeezeLookback)
      const minBW = Math.min(...lookback.slice(0, -1)) // exclude current point
      squeeze = bandwidth <= minBW
    }

    result.push({
      time: data[i].time,
      upper,
      middle: mean,
      lower,
      bandwidth,
      percentB,
      squeeze,
    })
  }

  return result
}
