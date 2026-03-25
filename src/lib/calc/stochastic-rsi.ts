import type { OHLCV } from '@/lib/types'
import { rsiArray } from './rsi'
import { smaArray } from './sma'

export interface StochRSIPoint {
  time: number
  k: number
  d: number
}

/**
 * Stochastic RSI — %K and %D
 * Uses RSI(14), stoch window 14, %K smooth 3, %D smooth 3
 */
export function calcStochRSI(
  data: OHLCV[],
  rsiPeriod = 14,
  stochPeriod = 14,
  kSmooth = 3,
  dSmooth = 3
): StochRSIPoint[] {
  if (data.length < rsiPeriod + stochPeriod + kSmooth + dSmooth) return []

  const closes = data.map((c) => c.close)
  const rsiValues = rsiArray(closes, rsiPeriod)

  // Remove leading NaNs
  const firstValid = rsiValues.findIndex((v) => !isNaN(v))
  if (firstValid < 0) return []

  const validRSI = rsiValues.slice(firstValid)
  const validData = data.slice(firstValid)

  // Raw %K — stochastic of RSI values
  const rawK: number[] = []
  for (let i = stochPeriod - 1; i < validRSI.length; i++) {
    const window = validRSI.slice(i - stochPeriod + 1, i + 1)
    const minRSI = Math.min(...window)
    const maxRSI = Math.max(...window)
    const range = maxRSI - minRSI
    rawK.push(range === 0 ? 0 : ((validRSI[i] - minRSI) / range) * 100)
  }

  const kTimes = validData.slice(stochPeriod - 1).map((d) => d.time)

  // Smooth %K
  const smoothedK = smaArray(rawK, kSmooth)
  // %D = SMA of smoothed %K
  const smoothedD = smaArray(smoothedK.filter((v) => !isNaN(v)), dSmooth)

  // Align output — smoothedK starts at index kSmooth-1, D starts kSmooth+dSmooth-2
  const offset = kSmooth - 1
  const dOffset = offset + (dSmooth - 1)

  const result: StochRSIPoint[] = []
  for (let i = dOffset; i < smoothedK.length; i++) {
    const dIndex = i - dOffset
    if (dIndex >= smoothedD.length) break
    if (isNaN(smoothedK[i]) || isNaN(smoothedD[dIndex])) continue
    result.push({
      time: kTimes[i],
      k: smoothedK[i],
      d: smoothedD[dIndex],
    })
  }

  return result
}
