import type { OHLCV } from '@/lib/types'
import { emaArray } from './ema'

export interface MACDPoint {
  time: number
  macd: number
  signal: number
  histogram: number
}

/**
 * MACD(12, 26, 9)
 * Returns aligned array of { time, macd, signal, histogram }
 */
export function calcMACD(
  data: OHLCV[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MACDPoint[] {
  if (data.length < slowPeriod + signalPeriod) return []

  const closes = data.map((c) => c.close)
  const fastEMA = emaArray(closes, fastPeriod)
  const slowEMA = emaArray(closes, slowPeriod)

  // MACD line starts where slow EMA begins (index slowPeriod - 1)
  const macdLine: number[] = []
  const macdTimes: number[] = []

  for (let i = slowPeriod - 1; i < data.length; i++) {
    if (isNaN(fastEMA[i]) || isNaN(slowEMA[i])) continue
    macdLine.push(fastEMA[i] - slowEMA[i])
    macdTimes.push(data[i].time)
  }

  const signalLine = emaArray(macdLine, signalPeriod)

  const result: MACDPoint[] = []
  for (let i = signalPeriod - 1; i < macdLine.length; i++) {
    if (isNaN(signalLine[i])) continue
    result.push({
      time: macdTimes[i],
      macd: macdLine[i],
      signal: signalLine[i],
      histogram: macdLine[i] - signalLine[i],
    })
  }

  return result
}
