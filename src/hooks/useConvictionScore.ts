'use client'
import { useMemo } from 'react'
import { useCandles } from '@/hooks/useCandles'
import { useHistoricalData } from '@/hooks/useHistoricalData'
import { useDominance } from '@/hooks/useDominance'
import { useTechnicalIndicators } from '@/hooks/useTechnicalIndicators'
import { useFearGreed } from '@/hooks/useFearGreed'
import { useFundamentalData } from '@/hooks/useFundamentalData'
import { useOnChainScore } from '@/hooks/useOnChainScore'
import { useCompositeScore } from '@/hooks/useCompositeScore'
import { calcFundamentalScore } from '@/lib/calc/fundamental-scores'

/**
 * Thin façade that computes the overall conviction score (0–100) for use
 * in the notification engine. Uses the same hooks as the bitcoin page —
 * all data is served from React Query cache when the page is open, so
 * no additional network requests are made.
 */
export function useConvictionScore(): { score: number | null } {
  const { candles } = useCandles('1d', 500)
  const { candles: historyCandles } = useHistoricalData()
  const { data: dominanceData } = useDominance()
  const { current: fgCurrent } = useFearGreed()
  const { data: fundData } = useFundamentalData()

  const dominancePct = dominanceData?.dominance ?? 50

  const taScore = useTechnicalIndicators(candles, historyCandles, dominancePct)

  const fundamentalScore = useMemo(() => {
    if (!fgCurrent) return null
    return calcFundamentalScore({
      fearGreed: parseInt(fgCurrent.value, 10),
      oiValue: fundData?.currentOI ?? 0,
      oi90dMA: fundData?.oi90dMA ?? 0,
      fundingRate: fundData?.currentFundingRate ?? 0,
    })
  }, [fgCurrent, fundData])

  const onChainScore = useOnChainScore()
  const overallScore = useCompositeScore(taScore, fundamentalScore, onChainScore)

  return { score: overallScore?.totalScore ?? null }
}
