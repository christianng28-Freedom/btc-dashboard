import { percentileRank, minMax, sigmoid } from './normalization'

export interface OnChainScoreComponents {
  // Price model scores
  mayerMultipleScore: number
  wmaRatioScore: number
  // Profitability scores
  nuplScore: number
  mvrvScore: number
  // Cycle position scores
  rainbowBandScore: number
  halvingCycleScore: number
  // Valuation score
  priceVsAthScore: number
  // Composite
  totalScore: number
  label: string
  color: string
  indicatorCount: number
}

function scoreLabel(score: number): { label: string; color: string } {
  if (score <= 15) return { label: 'Strong Buy', color: '#22c55e' }
  if (score <= 35) return { label: 'Buy',         color: '#86efac' }
  if (score <= 65) return { label: 'Neutral',     color: '#f59e0b' }
  if (score <= 85) return { label: 'Sell',        color: '#f87171' }
  return             { label: 'Strong Sell',      color: '#ef4444' }
}

/**
 * Compute 0–100 on-chain composite score (low = buy, high = sell).
 *
 * 7 Indicators (Pi Cycle removed — it is an MA-cross technical indicator and
 * already carries 15% of the technical score; counting it here too let one
 * indicator move the composite through two pillars at once):
 *   1. Mayer Multiple     (17%) — price / 200d SMA percentile
 *   2. 200w MA Ratio      (17%) — price / 1400d SMA percentile
 *   3. NUPL               (22%) — Net Unrealized Profit/Loss
 *   4. MVRV               (17%) — Market Value to Realized Value
 *   5. Rainbow Band       (11%) — log regression band position (0–8)
 *   6. Halving Cycle      ( 9%) — position in 4-year halving cycle
 *   7. Price vs ATH       ( 7%) — distance from all-time high
 */
export function calcOnChainScore(params: {
  currentMayerMultiple: number
  historicalMayerMultiples: number[]
  currentWMARatio: number
  historicalWMARatios: number[]
  currentNUPL?: number | null       // e.g. 0.5 (Belief phase)
  currentMVRV?: number | null       // e.g. 2.1
  rainbowBandIndex?: number | null  // 0–8 (0=Fire Sale, 8=Bubble)
  halvingCyclePos?: number | null   // 0–1 (position in 4-year cycle)
  priceVsAth?: number | null        // current price / all-time high, e.g. 0.85
}): OnChainScoreComponents {
  const {
    currentMayerMultiple,
    historicalMayerMultiples,
    currentWMARatio,
    historicalWMARatios,
    currentNUPL = null,
    currentMVRV = null,
    rainbowBandIndex = null,
    halvingCyclePos = null,
    priceVsAth = null,
  } = params

  // 1. Mayer Multiple: percentile rank vs history (high percentile = expensive = sell)
  const mayerMultipleScore = percentileRank(currentMayerMultiple, historicalMayerMultiples)

  // 2. 200w MA Ratio: percentile rank vs history
  const wmaRatioScore = percentileRank(currentWMARatio, historicalWMARatios)

  // 3. NUPL: <0=Capitulation(buy), 0-0.25=Hope, 0.25-0.5=Optimism, 0.5-0.75=Belief, >0.75=Euphoria(sell)
  const nuplScore = currentNUPL != null
    ? minMax(currentNUPL, -0.25, 0.75) * 100
    : 50

  // 4. MVRV: <1=undervalued(buy), 1-2=fair, 2-3.5=overvalued, >3.5=extreme(sell)
  const mvrvScore = currentMVRV != null
    ? minMax(currentMVRV, 0.8, 3.5) * 100
    : 50

  // 5. Rainbow Band: 0=Fire Sale(buy) → 8=Bubble(sell)
  const rainbowBandScore = rainbowBandIndex != null
    ? (rainbowBandIndex / 8) * 100
    : 50

  // 6. Halving Cycle Position: peaks at ~37% of cycle (day ~540 = 18m post-halving)
  //    Uses simple bucket scoring based on historical cycle patterns
  let halvingScore = 50
  if (halvingCyclePos != null) {
    if (halvingCyclePos < 0.10)      halvingScore = 40  // very early
    else if (halvingCyclePos < 0.25) halvingScore = 50  // early bull build
    else if (halvingCyclePos < 0.50) halvingScore = 72  // peak zone / post-peak
    else if (halvingCyclePos < 0.65) halvingScore = 55  // post-peak consolidation
    else if (halvingCyclePos < 0.82) halvingScore = 38  // bear market
    else                             halvingScore = 28  // late cycle, next halving approaching
  }

  // 7. Price vs ATH: at ATH=100(sell), 50% below ATH=35(buy), 80% below=10(strong buy)
  const priceVsAthScore = priceVsAth != null
    ? sigmoid((priceVsAth - 0.6) * 6) * 100
    : 50

  // Count how many non-null optional indicators were provided
  const optionalCount = [currentNUPL, currentMVRV, rainbowBandIndex, halvingCyclePos, priceVsAth]
    .filter((v) => v != null).length
  const indicatorCount = 2 + optionalCount

  const totalScore =
    mayerMultipleScore * 0.17 +
    wmaRatioScore      * 0.17 +
    nuplScore          * 0.22 +
    mvrvScore          * 0.17 +
    rainbowBandScore   * 0.11 +
    halvingScore       * 0.09 +
    priceVsAthScore    * 0.07

  const { label, color } = scoreLabel(totalScore)

  return {
    mayerMultipleScore,
    wmaRatioScore,
    nuplScore,
    mvrvScore,
    rainbowBandScore,
    halvingCycleScore: halvingScore,
    priceVsAthScore,
    totalScore,
    label,
    color,
    indicatorCount,
  }
}
