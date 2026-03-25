'use client'
import { useMemo } from 'react'
import type { TechnicalScoreComponents } from '@/lib/calc/technical-scores'
import type { FundamentalScoreComponents } from '@/lib/calc/fundamental-scores'
import type { OnChainScoreComponents } from '@/lib/calc/onchain-scores'
import { calcOverallScore, type OverallScoreComponents } from '@/lib/calc/overall-score'

export function useCompositeScore(
  technicalScore: TechnicalScoreComponents | null,
  fundamentalScore: FundamentalScoreComponents | null,
  onChainScore?: OnChainScoreComponents | null,
): OverallScoreComponents | null {
  return useMemo(() => {
    if (!technicalScore || !fundamentalScore) return null
    return calcOverallScore({
      taScore: technicalScore.totalScore,
      fundamentalScore: fundamentalScore.totalScore,
      onChainScore: onChainScore?.totalScore ?? null,
    })
  }, [technicalScore, fundamentalScore, onChainScore])
}
