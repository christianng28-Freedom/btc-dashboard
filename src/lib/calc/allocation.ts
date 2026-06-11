import { calcKellyFraction } from './kelly'
import { SCENARIOS } from './kelly'

/**
 * Conviction → allocation bridge.
 *
 * Maps the overall conviction score (0 = strong buy … 100 = strong sell) to
 * a Kelly-derived suggested BTC allocation band. The scenario assumptions are
 * a linear blend between the calculator's Bull case (score 0) and Bear case
 * (score 100) — a modeling choice, surfaced explicitly in `assumptions` so
 * the user can always see what produced the number. The band is
 * [quarter-Kelly, half-Kelly]: full Kelly is famously too aggressive for
 * fat-tailed assets.
 */

export interface AllocationSuggestion {
  suggestedMinPct: number // quarter Kelly, % of portfolio
  suggestedMaxPct: number // half Kelly, % of portfolio
  fullKellyPct: number
  assumptions: {
    expectedReturnPct: number
    volatilityPct: number
    riskFreeRatePct: number
    conviction: number
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t))
}

export function suggestAllocation(params: {
  convictionScore: number // 0-100, low = bullish
  riskFreeRatePct?: number | null // e.g. 10Y yield; defaults to 4%
}): AllocationSuggestion {
  const { convictionScore } = params
  const riskFreeRatePct = params.riskFreeRatePct ?? 4.0
  const t = convictionScore / 100

  const expectedReturnPct = lerp(SCENARIOS.bull.expectedReturn, SCENARIOS.bear.expectedReturn, t)
  const volatilityPct = lerp(SCENARIOS.bull.volatility, SCENARIOS.bear.volatility, t)

  const fullKelly = calcKellyFraction({
    expectedReturn: expectedReturnPct / 100,
    riskFreeRate: riskFreeRatePct / 100,
    volatility: volatilityPct / 100,
    portfolioSize: 1,
  })

  const clamped = Math.max(0, Math.min(1.0, fullKelly))
  return {
    suggestedMinPct: clamped * 0.25 * 100,
    suggestedMaxPct: clamped * 0.5 * 100,
    fullKellyPct: clamped * 100,
    assumptions: {
      expectedReturnPct,
      volatilityPct,
      riskFreeRatePct,
      conviction: convictionScore,
    },
  }
}

export type PositionVerdict = 'in-band' | 'overweight' | 'underweight'

export function comparePosition(
  currentAllocationPct: number,
  suggestion: AllocationSuggestion,
): PositionVerdict {
  if (currentAllocationPct > suggestion.suggestedMaxPct) return 'overweight'
  if (currentAllocationPct < suggestion.suggestedMinPct) return 'underweight'
  return 'in-band'
}
