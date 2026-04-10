// ─── Kelly Criterion Calculator ──────────────────────────────────────────────
// Continuous-time (log-optimal) Kelly formula for a single risky asset:
//   f* = μ_excess / σ²
// where μ_excess = expected annual BTC return − risk-free rate

// ─── Types ───────────────────────────────────────────────────────────────────

export interface KellyInputs {
  expectedReturn: number   // annual, decimal (0.50 = 50%)
  riskFreeRate: number     // annual, decimal (0.045 = 4.5%)
  volatility: number       // annualized, decimal (0.75 = 75%)
  portfolioSize: number    // USD
}

export interface KellyFraction {
  label: string
  multiplier: number       // 1.0, 0.5, 0.25, 0.125, or capped
  allocation: number       // fraction of portfolio (can exceed 1.0 for full Kelly)
  dollarAmount: number
  expectedGrowthRate: number
  estimatedMaxDrawdown: number
  yearsTo10x: number
  probabilityOfRuin: number
}

export interface Scenario {
  name: string
  expectedReturn: number   // percent (e.g. 80)
  volatility: number       // percent (e.g. 65)
}

export interface MonteCarloResult {
  year: number
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
}

export interface SensitivityCell {
  returnPct: number
  volPct: number
  kellyPct: number
  growthRate: number
}

// ─── Built-in Scenarios ─────────────────────────────────────────────────────

export const SCENARIOS: Record<string, Scenario> = {
  bull: { name: 'Bull Case', expectedReturn: 80, volatility: 65 },
  base: { name: 'Base Case', expectedReturn: 50, volatility: 75 },
  bear: { name: 'Bear Case', expectedReturn: 15, volatility: 90 },
}

// ─── Fractional Kelly Definitions ───────────────────────────────────────────

export const KELLY_FRACTIONS = [
  { label: 'Full Kelly (100%)', multiplier: 1.0 },
  { label: 'Half Kelly (50%)', multiplier: 0.5 },
  { label: 'Quarter Kelly (25%)', multiplier: 0.25 },
  { label: 'Eighth Kelly (12.5%)', multiplier: 0.125 },
  { label: 'Conservative (10% cap)', multiplier: -1 }, // special: capped at 10%
]

// ─── Core Kelly Formula ─────────────────────────────────────────────────────

export function calcKellyFraction(inputs: KellyInputs): number {
  const { expectedReturn, riskFreeRate, volatility } = inputs
  const muExcess = expectedReturn - riskFreeRate
  const sigmaSquared = volatility * volatility
  if (sigmaSquared === 0) return 0
  return muExcess / sigmaSquared
}

// ─── Compute All Fractions ──────────────────────────────────────────────────

export function calcAllFractions(inputs: KellyInputs): KellyFraction[] {
  const fullKelly = calcKellyFraction(inputs)
  const { riskFreeRate, volatility, portfolioSize } = inputs
  const muExcess = inputs.expectedReturn - riskFreeRate
  const sigma2 = volatility * volatility

  return KELLY_FRACTIONS.map(({ label, multiplier }) => {
    // Conservative: cap at min(fullKelly * multiplier, 0.10)
    let allocation: number
    if (multiplier < 0) {
      allocation = Math.min(Math.max(fullKelly, 0), 0.10)
    } else {
      allocation = fullKelly * multiplier
    }

    // Expected log-growth rate: g = rf + f * μ_excess − 0.5 * f² * σ²
    const g = riskFreeRate + allocation * muExcess - 0.5 * allocation * allocation * sigma2

    // Estimated max drawdown: approx 1 − e^(−2 * |f| * σ)
    const absAlloc = Math.abs(allocation)
    const maxDD = 1 - Math.exp(-2 * absAlloc * volatility)

    // Years to 10x: ln(10) / g
    const yearsTo10x = g > 0.001 ? Math.log(10) / g : Infinity

    // Simplified probability of ruin (Gambler's ruin approximation)
    // For fractional Kelly with positive edge, ruin probability is extremely low
    // P(ruin) ≈ exp(−2 * g / (f² * σ²)) when f > 0 and g > 0
    let pRuin: number
    if (allocation <= 0 || g <= 0) {
      pRuin = allocation <= 0 ? 0 : 1
    } else {
      const exponent = -2 * g / (allocation * allocation * sigma2 + 1e-12)
      pRuin = Math.max(0, Math.min(1, Math.exp(exponent)))
    }

    return {
      label,
      multiplier: multiplier < 0 ? allocation / (fullKelly || 1) : multiplier,
      allocation,
      dollarAmount: allocation * portfolioSize,
      expectedGrowthRate: g,
      estimatedMaxDrawdown: maxDD,
      yearsTo10x,
      probabilityOfRuin: pRuin,
    }
  })
}

// ─── Seeded PRNG (xorshift128+) ────────────────────────────────────────────
// Deterministic random numbers so Monte Carlo doesn't jitter on re-render

class Xorshift128Plus {
  private s0: number
  private s1: number

  constructor(seed: number) {
    this.s0 = seed | 0 || 1
    this.s1 = (seed * 1664525 + 1013904223) | 0 || 1
  }

  next(): number {
    let s1 = this.s0
    const s0 = this.s1
    this.s0 = s0
    s1 ^= s1 << 23
    s1 ^= s1 >> 17
    s1 ^= s0
    s1 ^= s0 >> 26
    this.s1 = s1
    // Convert to [0, 1)
    return ((this.s0 + this.s1) >>> 0) / 4294967296
  }

  // Box-Muller transform for standard normal
  nextGaussian(): number {
    const u1 = this.next() || 1e-10
    const u2 = this.next()
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  }
}

// ─── Monte Carlo Simulation ─────────────────────────────────────────────────

export interface MonteCarloParams {
  paths: number
  years: number
  stepsPerYear: number
}

const DEFAULT_MC_PARAMS: MonteCarloParams = {
  paths: 10000,
  years: 10,
  stepsPerYear: 12,
}

export function runMonteCarlo(
  inputs: KellyInputs,
  fractionMultiplier: number,
  params: Partial<MonteCarloParams> = {},
): MonteCarloResult[] {
  const { paths, years, stepsPerYear } = { ...DEFAULT_MC_PARAMS, ...params }
  const fullKelly = calcKellyFraction(inputs)
  const f = fullKelly * fractionMultiplier
  const { expectedReturn, riskFreeRate, volatility, portfolioSize } = inputs

  // GBM parameters
  const dt = 1 / stepsPerYear
  const sqrtDt = Math.sqrt(dt)
  // Drift per step for the BTC portion: (μ − 0.5σ²) * dt
  const drift = (expectedReturn - 0.5 * volatility * volatility) * dt
  // Risk-free growth per step for the non-BTC portion
  const rfStep = riskFreeRate * dt

  const totalSteps = years * stepsPerYear
  const rng = new Xorshift128Plus(42)

  // Pre-allocate wealth array
  const wealth = new Float64Array(paths)

  // Results at each year boundary
  const results: MonteCarloResult[] = [
    { year: 0, p10: portfolioSize, p25: portfolioSize, p50: portfolioSize, p75: portfolioSize, p90: portfolioSize },
  ]

  // Initialize
  for (let i = 0; i < paths; i++) wealth[i] = portfolioSize

  // Temp array for sorting percentiles
  const sorted = new Float64Array(paths)

  for (let step = 1; step <= totalSteps; step++) {
    for (let i = 0; i < paths; i++) {
      const z = rng.nextGaussian()
      // BTC return this step
      const btcReturn = Math.exp(drift + volatility * sqrtDt * z)
      // Portfolio: f in BTC, (1-f) in risk-free
      const btcPortion = f * wealth[i] * btcReturn
      const rfPortion = (1 - f) * wealth[i] * (1 + rfStep)
      wealth[i] = btcPortion + rfPortion
      // Floor at 0
      if (wealth[i] < 0) wealth[i] = 0
    }

    // Extract percentiles at each year boundary
    if (step % stepsPerYear === 0) {
      sorted.set(wealth)
      sorted.sort()
      const year = step / stepsPerYear
      results.push({
        year,
        p10: sorted[Math.floor(paths * 0.10)],
        p25: sorted[Math.floor(paths * 0.25)],
        p50: sorted[Math.floor(paths * 0.50)],
        p75: sorted[Math.floor(paths * 0.75)],
        p90: sorted[Math.floor(paths * 0.90)],
      })
    }
  }

  return results
}

// ─── Sensitivity Grid ───────────────────────────────────────────────────────

export function calcSensitivityGrid(
  baseInputs: KellyInputs,
  offsets: number[] = [-0.10, -0.05, 0, 0.05, 0.10],
): SensitivityCell[] {
  const grid: SensitivityCell[] = []
  const baseReturnPct = baseInputs.expectedReturn * 100
  const baseVolPct = baseInputs.volatility * 100

  for (const retOff of offsets) {
    for (const volOff of offsets) {
      const adjReturn = baseInputs.expectedReturn + retOff
      const adjVol = baseInputs.volatility + volOff
      if (adjVol <= 0) {
        grid.push({ returnPct: baseReturnPct + retOff * 100, volPct: baseVolPct + volOff * 100, kellyPct: 0, growthRate: 0 })
        continue
      }
      const adjInputs = { ...baseInputs, expectedReturn: adjReturn, volatility: adjVol }
      const fStar = calcKellyFraction(adjInputs)
      const muExcess = adjReturn - baseInputs.riskFreeRate
      const g = baseInputs.riskFreeRate + fStar * muExcess - 0.5 * fStar * fStar * adjVol * adjVol
      grid.push({
        returnPct: baseReturnPct + retOff * 100,
        volPct: baseVolPct + volOff * 100,
        kellyPct: fStar * 100,
        growthRate: g * 100,
      })
    }
  }

  return grid
}

// ─── CSV Export ──────────────────────────────────────────────────────────────

export function generateCSV(
  inputs: KellyInputs,
  fractions: KellyFraction[],
  mcResults: MonteCarloResult[],
  sensitivityGrid: SensitivityCell[],
): string {
  const rows: string[] = []

  // Section 1: Inputs
  rows.push('KELLY CRITERION ANALYSIS')
  rows.push(`Expected Return,${(inputs.expectedReturn * 100).toFixed(1)}%`)
  rows.push(`Risk-Free Rate,${(inputs.riskFreeRate * 100).toFixed(1)}%`)
  rows.push(`Volatility,${(inputs.volatility * 100).toFixed(1)}%`)
  rows.push(`Portfolio Size,$${inputs.portfolioSize.toLocaleString()}`)
  rows.push('')

  // Section 2: Allocation Table
  rows.push('ALLOCATION TABLE')
  rows.push('Fraction,Allocation %,Dollar Amount,Expected Growth %,Max Drawdown %,Years to 10x,P(Ruin) %')
  for (const f of fractions) {
    rows.push([
      f.label,
      (f.allocation * 100).toFixed(1),
      f.dollarAmount.toFixed(0),
      (f.expectedGrowthRate * 100).toFixed(2),
      (f.estimatedMaxDrawdown * 100).toFixed(1),
      f.yearsTo10x === Infinity ? 'N/A' : f.yearsTo10x.toFixed(1),
      (f.probabilityOfRuin * 100).toFixed(4),
    ].join(','))
  }
  rows.push('')

  // Section 3: Monte Carlo Percentiles
  rows.push('MONTE CARLO SIMULATION (10-Year)')
  rows.push('Year,10th %ile,25th %ile,Median,75th %ile,90th %ile')
  for (const mc of mcResults) {
    rows.push([mc.year, mc.p10.toFixed(0), mc.p25.toFixed(0), mc.p50.toFixed(0), mc.p75.toFixed(0), mc.p90.toFixed(0)].join(','))
  }
  rows.push('')

  // Section 4: Sensitivity Grid
  rows.push('SENSITIVITY ANALYSIS')
  rows.push('Expected Return %,Volatility %,Kelly %,Growth Rate %')
  for (const cell of sensitivityGrid) {
    rows.push([cell.returnPct.toFixed(1), cell.volPct.toFixed(1), cell.kellyPct.toFixed(1), cell.growthRate.toFixed(2)].join(','))
  }

  return rows.join('\n')
}
