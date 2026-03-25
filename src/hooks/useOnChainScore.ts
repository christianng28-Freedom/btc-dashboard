'use client'
import { useMemo } from 'react'
import { useHistoricalData } from '@/hooks/useHistoricalData'
import { useExtendedHistory } from '@/hooks/useExtendedHistory'
import { useNuplData } from '@/hooks/useNuplData'
import { calcOnChainScore } from '@/lib/calc/onchain-scores'
import { getPiCycleGap, getRainbowBandIndex } from '@/lib/calc/technical-scores'
import type { OnChainScoreComponents } from '@/lib/calc/onchain-scores'

/** Sliding-window SMA — returns one value per index from `period-1` onwards */
function computeSMASeries(prices: number[], period: number): { price: number; sma: number }[] {
  if (prices.length < period) return []
  const result: { price: number; sma: number }[] = []
  let sum = 0
  for (let i = 0; i < period; i++) sum += prices[i]
  result.push({ price: prices[period - 1], sma: sum / period })
  for (let i = period; i < prices.length; i++) {
    sum += prices[i] - prices[i - period]
    result.push({ price: prices[i], sma: sum / period })
  }
  return result
}

// Bitcoin halving 4: April 19, 2024
const HALVING_4_TIMESTAMP = new Date('2024-04-19').getTime()
const CYCLE_LENGTH_MS = 4 * 365.25 * 24 * 60 * 60 * 1000

export function useOnChainScore(): OnChainScoreComponents | null {
  const { candles: historyCandles } = useHistoricalData()
  const { candles: extendedCandles } = useExtendedHistory()
  const { data: nuplData } = useNuplData()

  return useMemo(() => {
    // Need at least 200 candles for Mayer Multiple
    if (historyCandles.length < 200) return null

    const histPrices = historyCandles.map((c) => c.close)

    // ── 1. Mayer Multiple = Price / 200d SMA ──
    const mmSeries = computeSMASeries(histPrices, 200)
    if (mmSeries.length === 0) return null
    const mayerMultiples = mmSeries.map((p) => p.price / p.sma)
    const currentMM = mayerMultiples[mayerMultiples.length - 1]

    // ── 2. 200w MA Ratio = Price / 1400d SMA ──
    const extPrices = extendedCandles.length >= 1400
      ? extendedCandles.map((c) => c.close)
      : histPrices
    const wmaSeries = computeSMASeries(extPrices, 1400)
    if (wmaSeries.length === 0) return null
    const wmaRatios = wmaSeries.map((p) => p.price / p.sma)
    const currentWMA = wmaRatios[wmaRatios.length - 1]

    // ── 3 & 4. NUPL + MVRV from CoinMetrics ──
    const latestNupl = nuplData && nuplData.length > 0
      ? nuplData[nuplData.length - 1]
      : null
    const currentNUPL = latestNupl?.nupl ?? null
    const currentMVRV = latestNupl?.mvrv ?? null

    // ── 5. Pi Cycle Gap ──
    const allCandles = extendedCandles.length >= 350 ? extendedCandles : historyCandles
    const piGap = getPiCycleGap(allCandles)
    const piCycleGapPct = piGap?.gapPct ?? null

    // ── 6. Rainbow Band Index ──
    const latestCandle = historyCandles[historyCandles.length - 1]
    const rainbowBandIndex = latestCandle
      ? getRainbowBandIndex(latestCandle.close, latestCandle.time)
      : null

    // ── 7. Halving Cycle Position (0–1) ──
    const now = Date.now()
    const halvingCyclePos = Math.min(1, (now - HALVING_4_TIMESTAMP) / CYCLE_LENGTH_MS)

    // ── 8. Price vs ATH ──
    const allPrices = extendedCandles.length > historyCandles.length
      ? extendedCandles.map((c) => c.close)
      : histPrices
    const ath = Math.max(...allPrices)
    const currentPrice = histPrices[histPrices.length - 1]
    const priceVsAth = ath > 0 ? currentPrice / ath : null

    return calcOnChainScore({
      currentMayerMultiple: currentMM,
      historicalMayerMultiples: mayerMultiples,
      currentWMARatio: currentWMA,
      historicalWMARatios: wmaRatios,
      currentNUPL,
      currentMVRV,
      piCycleGapPct,
      rainbowBandIndex,
      halvingCyclePos,
      priceVsAth,
    })
  }, [historyCandles, extendedCandles, nuplData])
}
