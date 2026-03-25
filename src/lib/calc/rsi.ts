import type { OHLCV } from '@/lib/types'

/**
 * RSI(14) using Wilder's smoothing (RMA / SMMA)
 * Returns array of { time, value } where value is 0–100
 */
export function calcRSI(
  data: OHLCV[],
  period = 14
): Array<{ time: number; value: number }> {
  if (data.length < period + 1) return []

  const closes = data.map((c) => c.close)
  const changes = closes.slice(1).map((c, i) => c - closes[i])

  // Seed: average gain/loss over first `period` changes
  let avgGain = 0
  let avgLoss = 0
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i]
    else avgLoss += Math.abs(changes[i])
  }
  avgGain /= period
  avgLoss /= period

  const result: Array<{ time: number; value: number }> = []
  const rsi0 = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)
  result.push({ time: data[period].time, value: rsi0 })

  // Wilder's smoothing for remaining values
  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period

    const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)
    result.push({ time: data[i + 1].time, value: rsi })
  }

  return result
}

/**
 * RSI on a plain number array (used by StochRSI)
 */
export function rsiArray(closes: number[], period = 14): number[] {
  if (closes.length < period + 1) return []

  const changes = closes.slice(1).map((c, i) => c - closes[i])
  const result: number[] = new Array(period).fill(NaN)

  let avgGain = 0
  let avgLoss = 0
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i]
    else avgLoss += Math.abs(changes[i])
  }
  avgGain /= period
  avgLoss /= period

  result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss))

  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
    result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss))
  }

  return result
}
