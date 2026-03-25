import type { OHLCV } from '@/lib/types'

/**
 * Simple Moving Average
 * @param data - array of OHLCV candles
 * @param period - SMA period
 * @returns array of { time, value } aligned to input data
 */
export function calcSMA(
  data: OHLCV[],
  period: number
): Array<{ time: number; value: number }> {
  if (data.length < period) return []

  const result: Array<{ time: number; value: number }> = []

  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((acc, c) => acc + c.close, 0)
    result.push({ time: data[i].time, value: sum / period })
  }

  return result
}

/**
 * SMA on a plain number array (used internally by Bollinger, StochRSI)
 */
export function smaArray(values: number[], period: number): number[] {
  if (values.length < period) return []
  const result: number[] = new Array(period - 1).fill(NaN)

  for (let i = period - 1; i < values.length; i++) {
    const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
    result.push(sum / period)
  }

  return result
}
