import { minMax, sigmoid } from './normalization'

export interface FundamentalScoreComponents {
  // Sentiment & leverage
  fearGreedScore: number
  oiScore: number
  fundingRateScore: number
  // Macro environment
  fedFundsScore: number
  cpiScore: number
  pceScore: number
  m2Score: number
  tenYearScore: number
  dxyScore: number
  // Composite
  totalScore: number
  label: string
  color: string
  indicatorCount: number
}

function scoreLabel(score: number): { label: string; color: string } {
  if (score <= 15) return { label: 'Strong Buy', color: '#22c55e' }
  if (score <= 35) return { label: 'Buy', color: '#86efac' }
  if (score <= 65) return { label: 'Neutral', color: '#f59e0b' }
  if (score <= 85) return { label: 'Sell', color: '#f87171' }
  return { label: 'Strong Sell', color: '#ef4444' }
}

/**
 * Compute a 0–100 fundamental composite score (low = buy, high = sell).
 *
 * 9 Indicators:
 *   1. Fear & Greed       (15%) — high greed → sell
 *   2. Open Interest      (12%) — elevated vs 90d MA → leverage risk → sell
 *   3. Funding Rate       (12%) — highly positive → overleveraged longs → sell
 *   4. Fed Funds Rate     (15%) — high rate → restrictive monetary policy → sell
 *   5. CPI YoY            ( 8%) — above target → inflation pressure → sell
 *   6. PCE YoY            (10%) — Fed's preferred gauge → above target → sell
 *   7. M2 YoY Growth      (10%) — positive growth = more liquidity = buy (inverted)
 *   8. 10Y Treasury Yield (10%) — high yield = opportunity cost for BTC → sell
 *   9. DXY Broad Index    ( 8%) — strong dollar = sell for BTC (inversely correlated)
 */
export function calcFundamentalScore(params: {
  fearGreed: number        // raw 0–100 (Alternative.me)
  oiValue: number          // current BTC futures OI in USD
  oi90dMA: number          // 90-day MA of OI in USD
  fundingRate: number      // current funding rate, e.g. 0.0001 = 0.01% per 8h
  fedFunds?: number | null // Fed funds upper bound, e.g. 4.5
  cpiYoY?: number | null   // CPI YoY %, e.g. 3.1
  pceYoY?: number | null   // PCE YoY %, e.g. 2.8
  m2YoY?: number | null    // M2 YoY growth %, e.g. 4.5
  tenYearYield?: number | null // 10Y Treasury yield %, e.g. 4.3
  dxy?: number | null      // Broad dollar index, e.g. 106
}): FundamentalScoreComponents {
  const { fearGreed, oiValue, oi90dMA, fundingRate } = params
  const {
    fedFunds = null,
    cpiYoY = null,
    pceYoY = null,
    m2YoY = null,
    tenYearYield = null,
    dxy = null,
  } = params

  // 1. Fear & Greed: 0=Extreme Fear(buy) → 100=Extreme Greed(sell)
  const fearGreedScore = minMax(fearGreed, 10, 90) * 100

  // 2. OI deviation: sigmoid of (deviation% - 15%) * 5
  const oiDeviation = oi90dMA > 0 ? ((oiValue - oi90dMA) / oi90dMA) * 100 : 0
  const oiScore = sigmoid((oiDeviation - 15) * 0.05) * 100

  // 3. Funding Rate: negative (<0) → shorts paying → buy; elevated positive → sell
  const fundingRateScore = sigmoid((fundingRate - 0) * 10000 * 0.35) * 100

  // 4. Fed Funds Rate: 0% = cheap money (buy), 5%+ = very restrictive (sell)
  const fedFundsScore = fedFunds != null ? minMax(fedFunds, 0, 5.5) * 100 : 50

  // 5. CPI YoY: <2% = low inflation (neutral/buy), >6% = hot inflation (sell)
  const cpiScore = cpiYoY != null ? minMax(cpiYoY, 1.5, 6.0) * 100 : 50

  // 6. PCE YoY: Fed targets 2%; <2% = ok, >4% = concern (sell)
  const pceScore = pceYoY != null ? minMax(pceYoY, 1.5, 5.0) * 100 : 50

  // 7. M2 YoY: inverted — positive growth = more liquidity = buy (low score)
  const m2Score = m2YoY != null ? (1 - minMax(m2YoY, -3, 12)) * 100 : 50

  // 8. 10Y Yield: high yield = competition for BTC = sell
  const tenYearScore = tenYearYield != null ? minMax(tenYearYield, 1.0, 6.0) * 100 : 50

  // 9. DXY (DTWEXBGS broad index): strong dollar = bearish for BTC
  //    Historical range roughly 95–125; ~100 neutral, >115 strong USD (sell)
  const dxyScore = dxy != null ? minMax(dxy, 95, 125) * 100 : 50

  const totalScore =
    fearGreedScore  * 0.15 +
    oiScore         * 0.12 +
    fundingRateScore* 0.12 +
    fedFundsScore   * 0.15 +
    cpiScore        * 0.08 +
    pceScore        * 0.10 +
    m2Score         * 0.10 +
    tenYearScore    * 0.10 +
    dxyScore        * 0.08

  const { label, color } = scoreLabel(totalScore)

  // Count how many macro inputs were actually provided
  const macroCount = [fedFunds, cpiYoY, pceYoY, m2YoY, tenYearYield, dxy].filter(
    (v) => v != null,
  ).length
  const indicatorCount = 3 + macroCount

  return {
    fearGreedScore,
    oiScore,
    fundingRateScore,
    fedFundsScore,
    cpiScore,
    pceScore,
    m2Score,
    tenYearScore,
    dxyScore,
    totalScore,
    label,
    color,
    indicatorCount,
  }
}
