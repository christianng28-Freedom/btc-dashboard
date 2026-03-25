import type { OHLCV } from '@/lib/types'

/**
 * Exponential Moving Average
 * @param data - array of OHLCV candles
 * @param period - EMA period
 * @returns array of { time, value } aligned to input data
 */
export function calcEMA(
  data: OHLCV[],
  period: number
): Array<{ time: number; value: number }> {
  if (data.length < period) return []

  const k = 2 / (period + 1)
  const result: Array<{ time: number; value: number }> = []

  // Seed with SMA of first `period` closes
  let ema = data.slice(0, period).reduce((sum, c) => sum + c.close, 0) / period
  result.push({ time: data[period - 1].time, value: ema })

  for (let i = period; i < data.length; i++) {
    ema = data[i].close * k + ema * (1 - k)
    result.push({ time: data[i].time, value: ema })
  }

  return result
}

/**
 * EMA on a plain number array (used internally by MACD, StochRSI)
 */
export function emaArray(values: number[], period: number): number[] {
  if (values.length < period) return []
  const k = 2 / (period + 1)
  const result: number[] = new Array(period - 1).fill(NaN)

  let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period
  result.push(ema)

  for (let i = period; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k)
    result.push(ema)
  }

  return result
}
