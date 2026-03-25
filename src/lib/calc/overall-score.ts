export interface OverallScoreComponents {
  taScore: number
  fundamentalScore: number
  onChainScore: number   // 50 (neutral) when on-chain module not yet available
  totalScore: number
  label: string
  color: string
  hasOnChain: boolean    // false until V2 on-chain module
}

function scoreLabel(score: number): { label: string; color: string } {
  if (score <= 15) return { label: 'Strong Buy', color: '#22c55e' }
  if (score <= 35) return { label: 'Buy', color: '#86efac' }
  if (score <= 65) return { label: 'Neutral', color: '#f59e0b' }
  if (score <= 85) return { label: 'Sell', color: '#f87171' }
  return { label: 'Strong Sell', color: '#ef4444' }
}

/**
 * Blend TA + Fundamental (+optionally On-Chain) into a single Overall Conviction Score.
 *
 * Stage 5 fallback (no on-chain):  55% TA + 45% Fundamental
 * V2 (with on-chain):              40% On-Chain + 30% TA + 30% Fundamental
 */
export function calcOverallScore(params: {
  taScore: number
  fundamentalScore: number
  onChainScore: number | null   // null = not available
}): OverallScoreComponents {
  const { taScore, fundamentalScore, onChainScore } = params

  let totalScore: number
  let resolvedOnChain: number
  let hasOnChain: boolean

  if (onChainScore !== null) {
    resolvedOnChain = onChainScore
    hasOnChain = true
    totalScore = taScore * 0.30 + fundamentalScore * 0.30 + onChainScore * 0.40
  } else {
    resolvedOnChain = 50 // neutral placeholder
    hasOnChain = false
    totalScore = taScore * 0.55 + fundamentalScore * 0.45
  }

  const { label, color } = scoreLabel(totalScore)

  return {
    taScore,
    fundamentalScore,
    onChainScore: resolvedOnChain,
    totalScore,
    label,
    color,
    hasOnChain,
  }
}
