'use client'

import type { KellyFraction } from '@/lib/calc/kelly'
import type { RiskProfile } from './KellyInputPanel'

interface Props {
  fractions: KellyFraction[]
  riskProfile: RiskProfile
  fullKellyRaw: number // raw f* value for display
}

const RISK_RECOMMENDED: Record<RiskProfile, number> = {
  conservative: 3, // Eighth Kelly index
  moderate: 1,     // Half Kelly index
  aggressive: 0,   // Full Kelly index
}

function fmtPct(v: number, decimals = 1): string {
  return `${(v * 100).toFixed(decimals)}%`
}

function fmtDollar(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(1)}k`
  return `$${v.toFixed(0)}`
}

function cellColor(value: number, thresholds: [number, number]): string {
  if (value <= thresholds[0]) return '#22c55e'
  if (value <= thresholds[1]) return '#f59e0b'
  return '#ef4444'
}

export function KellyResultsTable({ fractions, riskProfile, fullKellyRaw }: Props) {
  const recommendedIdx = RISK_RECOMMENDED[riskProfile]

  return (
    <div className="bg-[#0d1018] border border-[#1a1a2e] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-[#1a1a2e] flex items-center justify-between">
        <div>
          <h3 className="text-[#e0e0e0] text-sm font-semibold">Allocation Results</h3>
          <p className="text-[#666] text-xs mt-0.5">
            Raw Kelly f* = <span className={`font-mono font-semibold ${fullKellyRaw > 1 ? 'text-[#ef4444]' : 'text-[#22c55e]'}`}>
              {(fullKellyRaw * 100).toFixed(1)}%
            </span>
            {fullKellyRaw > 1 && <span className="text-[#ef4444] ml-2">Leverage implied</span>}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[#666] text-xs uppercase tracking-wider">
              <th className="text-left px-5 py-3 font-medium">Fraction</th>
              <th className="text-right px-4 py-3 font-medium">Allocation</th>
              <th className="text-right px-4 py-3 font-medium">$ Amount</th>
              <th className="text-right px-4 py-3 font-medium">Growth Rate</th>
              <th className="text-right px-4 py-3 font-medium">Max Drawdown</th>
              <th className="text-right px-4 py-3 font-medium">Years to 10x</th>
              <th className="text-right px-5 py-3 font-medium">P(Ruin)</th>
            </tr>
          </thead>
          <tbody>
            {fractions.map((f, i) => {
              const isRecommended = i === recommendedIdx
              return (
                <tr
                  key={f.label}
                  className={`border-t border-[#1a1a2e]/60 transition-colors ${
                    isRecommended ? 'bg-[#3b82f6]/[0.06]' : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <td className="px-5 py-3 text-left">
                    <span className="text-[#e0e0e0] font-medium">{f.label}</span>
                    {isRecommended && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-[#3b82f6]/20 text-[#3b82f6] font-semibold uppercase">
                        Recommended
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold" style={{ color: f.allocation > 1 ? '#ef4444' : f.allocation > 0.5 ? '#f59e0b' : '#22c55e' }}>
                    {fmtPct(f.allocation)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[#e0e0e0]">
                    {fmtDollar(f.dollarAmount)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono" style={{ color: f.expectedGrowthRate > 0 ? '#22c55e' : '#ef4444' }}>
                    {fmtPct(f.expectedGrowthRate, 2)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono" style={{ color: cellColor(f.estimatedMaxDrawdown, [0.3, 0.6]) }}>
                    {fmtPct(f.estimatedMaxDrawdown)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[#e0e0e0]">
                    {f.yearsTo10x === Infinity ? '—' : `${f.yearsTo10x.toFixed(1)}y`}
                  </td>
                  <td className="px-5 py-3 text-right font-mono" style={{ color: cellColor(f.probabilityOfRuin, [0.01, 0.1]) }}>
                    {f.probabilityOfRuin < 0.0001 ? '<0.01%' : fmtPct(f.probabilityOfRuin, 2)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
