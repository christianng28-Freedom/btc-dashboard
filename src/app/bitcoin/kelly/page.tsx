'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  calcKellyFraction,
  calcAllFractions,
  runMonteCarlo,
  calcSensitivityGrid,
  generateCSV,
  SCENARIOS,
  type KellyInputs,
} from '@/lib/calc/kelly'
import { KellyInputPanel, type RiskProfile, type ScenarioKey } from '@/components/kelly/KellyInputPanel'
import { KellyResultsTable } from '@/components/kelly/KellyResultsTable'
import { KellyAllocationChart } from '@/components/kelly/KellyAllocationChart'
import { MonteCarloChart } from '@/components/kelly/MonteCarloChart'
import { SensitivityTable } from '@/components/kelly/SensitivityTable'
import { KellyGuidance } from '@/components/kelly/KellyGuidance'

// ─── Monte Carlo fraction selector ─────────────────────────────────────────

const MC_OPTIONS = [
  { key: 'full', label: 'Full Kelly', multiplier: 1.0 },
  { key: 'half', label: 'Half Kelly', multiplier: 0.5 },
  { key: 'quarter', label: 'Quarter Kelly', multiplier: 0.25 },
] as const

type MCKey = typeof MC_OPTIONS[number]['key']

// ─── Page ───────────────────────────────────────────────────────────────────

export default function KellyCriterionPage() {
  // Inputs
  const [expectedReturn, setExpectedReturn] = useState(50)
  const [riskFreeRate, setRiskFreeRate] = useState(4.5)
  const [volatility, setVolatility] = useState(75)
  const [portfolioSize, setPortfolioSize] = useState(100000)
  const [riskProfile, setRiskProfile] = useState<RiskProfile>('moderate')
  const [activeScenario, setActiveScenario] = useState<ScenarioKey>('base')
  const [mcKey, setMcKey] = useState<MCKey>('half')

  // Scenario handler
  const handleScenarioChange = useCallback((s: ScenarioKey) => {
    setActiveScenario(s)
    if (s !== 'custom') {
      const scenario = SCENARIOS[s]
      setExpectedReturn(scenario.expectedReturn)
      setVolatility(scenario.volatility)
    }
  }, [])

  // Auto-switch to custom when inputs are manually edited
  const handleReturnChange = useCallback((v: number) => {
    setExpectedReturn(v)
    setActiveScenario('custom')
  }, [])
  const handleVolChange = useCallback((v: number) => {
    setVolatility(v)
    setActiveScenario('custom')
  }, [])

  // Derived: Kelly inputs (convert % to decimal)
  const kellyInputs: KellyInputs = useMemo(() => ({
    expectedReturn: expectedReturn / 100,
    riskFreeRate: riskFreeRate / 100,
    volatility: volatility / 100,
    portfolioSize,
  }), [expectedReturn, riskFreeRate, volatility, portfolioSize])

  // Derived: calculations
  const fullKellyRaw = useMemo(() => calcKellyFraction(kellyInputs), [kellyInputs])
  const allFractions = useMemo(() => calcAllFractions(kellyInputs), [kellyInputs])
  const sensitivityGrid = useMemo(() => calcSensitivityGrid(kellyInputs), [kellyInputs])

  const mcMultiplier = MC_OPTIONS.find(o => o.key === mcKey)!.multiplier
  const mcLabel = MC_OPTIONS.find(o => o.key === mcKey)!.label
  const monteCarloData = useMemo(
    () => runMonteCarlo(kellyInputs, mcMultiplier),
    [kellyInputs, mcMultiplier],
  )

  // Reset
  function reset() {
    setExpectedReturn(50)
    setRiskFreeRate(4.5)
    setVolatility(75)
    setPortfolioSize(100000)
    setRiskProfile('moderate')
    setActiveScenario('base')
    setMcKey('half')
  }

  // CSV Export
  function exportCSV() {
    const csv = generateCSV(kellyInputs, allFractions, monteCarloData, sensitivityGrid)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'btc-kelly-criterion.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Kelly Criterion Allocator</h1>
          <p className="text-[#666] text-sm mt-1">
            Optimal Bitcoin position sizing using the continuous-time Kelly formula
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#1a1a2e] text-[#999] hover:text-white hover:border-[#3b82f6] transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#1a1a2e] text-[#999] hover:text-white hover:border-[#ef4444] transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset
          </button>
        </div>
      </div>

      {/* Formula Reference */}
      <div className="bg-[#0d1018]/60 border border-[#1a1a2e] rounded-xl px-5 py-3 flex items-center gap-4 flex-wrap">
        <span className="text-[#666] text-xs">Formula:</span>
        <code className="text-[#3b82f6] text-sm font-mono">
          f* = (mu - r<sub>f</sub>) / sigma<sup>2</sup>
        </code>
        <span className="text-[#444] text-xs">|</span>
        <span className="text-[#666] text-xs">
          mu = expected return, r<sub>f</sub> = risk-free rate, sigma = volatility
        </span>
      </div>

      {/* Input Panel */}
      <KellyInputPanel
        expectedReturn={expectedReturn}
        riskFreeRate={riskFreeRate}
        volatility={volatility}
        portfolioSize={portfolioSize}
        riskProfile={riskProfile}
        activeScenario={activeScenario}
        onExpectedReturnChange={handleReturnChange}
        onRiskFreeRateChange={setRiskFreeRate}
        onVolatilityChange={handleVolChange}
        onPortfolioSizeChange={setPortfolioSize}
        onRiskProfileChange={setRiskProfile}
        onScenarioChange={handleScenarioChange}
      />

      {/* Results Table */}
      <KellyResultsTable
        fractions={allFractions}
        riskProfile={riskProfile}
        fullKellyRaw={fullKellyRaw}
      />

      {/* Allocation Chart (all scenarios) */}
      <KellyAllocationChart
        riskFreeRate={riskFreeRate / 100}
        portfolioSize={portfolioSize}
      />

      {/* Monte Carlo Section */}
      <div className="space-y-3">
        {/* MC Fraction Selector */}
        <div className="flex items-center gap-3">
          <span className="text-[#666] text-xs font-medium">Simulate:</span>
          <div className="inline-flex bg-[#060810] border border-[#1a1a2e] rounded-lg p-0.5">
            {MC_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setMcKey(opt.key)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  mcKey === opt.key
                    ? 'bg-[#1a1a2e] text-white'
                    : 'text-[#666] hover:text-[#999]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <MonteCarloChart
          data={monteCarloData}
          portfolioSize={portfolioSize}
          selectedFraction={mcLabel}
        />
      </div>

      {/* Sensitivity Table */}
      <SensitivityTable
        grid={sensitivityGrid}
        currentReturnPct={expectedReturn}
        currentVolPct={volatility}
      />

      {/* Guidance */}
      <KellyGuidance
        riskProfile={riskProfile}
        fractions={allFractions}
        fullKelly={fullKellyRaw}
      />
    </div>
  )
}
