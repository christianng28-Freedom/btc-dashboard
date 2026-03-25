'use client'
import { useMemo } from 'react'
import type { OHLCV } from '@/lib/types'
import { calcRSI } from '@/lib/calc/rsi'
import { calcMACD } from '@/lib/calc/macd'
import { calcBollinger } from '@/lib/calc/bollinger'
import { calcStochRSI } from '@/lib/calc/stochastic-rsi'
import { calcSMA } from '@/lib/calc/sma'
import { getPiCycleGap, calcTechnicalScore } from '@/lib/calc/technical-scores'
import type { TechnicalScoreComponents } from '@/lib/calc/technical-scores'

export function useTechnicalIndicators(
  candles: OHLCV[],
  historyCandles: OHLCV[],
  dominancePct: number
): TechnicalScoreComponents | null {
  return useMemo(() => {
    if (candles.length < 200) return null

    const rsiData = calcRSI(candles)
    const macdData = calcMACD(candles)
    const bbData = calcBollinger(candles)
    const stochData = calcStochRSI(candles)
    const sma200Data = calcSMA(candles, 200)

    if (!rsiData.length || !macdData.length || !bbData.length || !stochData.length || !sma200Data.length) return null

    const rsi = rsiData[rsiData.length - 1].value
    const macdPoint = macdData[macdData.length - 1]
    const bbPoint = bbData[bbData.length - 1]
    const stochPoint = stochData[stochData.length - 1]
    const price = candles[candles.length - 1].close
    const ma200 = sma200Data[sma200Data.length - 1].value

    // Pi Cycle: use history data if available, fall back to candles
    const piData = historyCandles.length >= 350 ? historyCandles : candles
    const piCycle = getPiCycleGap(piData)

    // 2-Year MA: use history data
    let twoYearMA: number | null = null
    if (historyCandles.length >= 730) {
      const sma730 = calcSMA(historyCandles, 730)
      if (sma730.length > 0) {
        twoYearMA = sma730[sma730.length - 1].value
      }
    }

    return calcTechnicalScore({
      rsi,
      macdHistogram: macdPoint.histogram,
      price,
      ma200,
      bollingerPctB: bbPoint.percentB,
      stochRsiK: stochPoint.k,
      piCycleGapPct: piCycle?.gapPct ?? null,
      twoYearMA,
      dominancePct,
    })
  }, [candles, historyCandles, dominancePct])
}
