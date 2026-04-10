'use client'

import { useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from 'recharts'
import type { MonteCarloResult } from '@/lib/calc/kelly'

interface Props {
  data: MonteCarloResult[]
  portfolioSize: number
  selectedFraction: string
}

interface TooltipPayload {
  name: string
  value: number
  color: string
}

function fmtDollar(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}k`
  return `$${v.toFixed(0)}`
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0d1018] border border-[#1a1a2e] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[#999] text-xs mb-1.5">Year {label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs font-mono" style={{ color: p.color }}>
          {p.name}: {fmtDollar(p.value)}
        </p>
      ))}
    </div>
  )
}

export function MonteCarloChart({ data, portfolioSize, selectedFraction }: Props) {
  const [logScale, setLogScale] = useState(false)

  // Transform data for area chart: need the band ranges
  const chartData = data.map(d => ({
    year: d.year,
    // For area stacking, we need the actual values
    p10: d.p10,
    p25: d.p25,
    p50: d.p50,
    p75: d.p75,
    p90: d.p90,
  }))

  const terminal = data[data.length - 1]

  return (
    <div className="bg-[#0d1018] border border-[#1a1a2e] rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-[#e0e0e0] text-sm font-semibold">Monte Carlo Simulation</h3>
          <p className="text-[#666] text-xs mt-0.5">
            10,000 paths &middot; 10-year horizon &middot; {selectedFraction}
          </p>
        </div>
        <button
          onClick={() => setLogScale(!logScale)}
          className={`px-3 py-1 rounded text-xs font-medium border transition-all cursor-pointer ${
            logScale
              ? 'border-[#3b82f6] bg-[#3b82f6]/10 text-[#3b82f6]'
              : 'border-[#1a1a2e] text-[#666] hover:text-[#999]'
          }`}
        >
          Log Scale
        </button>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={380}>
        <ComposedChart data={chartData}>
          <defs>
            <linearGradient id="mcBandOuter" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.08} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="mcBandInner" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
          <XAxis
            dataKey="year"
            tick={{ fill: '#666', fontSize: 11 }}
            axisLine={{ stroke: '#1a1a2e' }}
            tickLine={false}
            label={{ value: 'Year', fill: '#666', fontSize: 11, position: 'insideBottomRight', offset: -5 }}
          />
          <YAxis
            tick={{ fill: '#666', fontSize: 11 }}
            axisLine={{ stroke: '#1a1a2e' }}
            tickLine={false}
            tickFormatter={fmtDollar}
            scale={logScale ? 'log' : 'auto'}
            domain={logScale ? ['auto', 'auto'] : [0, 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* P10-P90 band */}
          <Area type="monotone" dataKey="p90" stroke="none" fill="url(#mcBandOuter)" name="90th %ile" />
          <Area type="monotone" dataKey="p10" stroke="none" fill="#0d1018" name="10th %ile" />

          {/* P25-P75 band */}
          <Area type="monotone" dataKey="p75" stroke="none" fill="url(#mcBandInner)" name="75th %ile" />
          <Area type="monotone" dataKey="p25" stroke="none" fill="#0d1018" name="25th %ile" />

          {/* Median line */}
          <Line type="monotone" dataKey="p50" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="Median" />

          {/* Outer lines */}
          <Line type="monotone" dataKey="p90" stroke="#3b82f6" strokeWidth={1} strokeDasharray="4 3" dot={false} name="90th" />
          <Line type="monotone" dataKey="p10" stroke="#3b82f6" strokeWidth={1} strokeDasharray="4 3" dot={false} name="10th" />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Terminal Stats */}
      {terminal && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#080B10] border border-[#1a1a2e] rounded-lg p-3 text-center">
            <p className="text-[#666] text-[10px] uppercase tracking-wider mb-1">10th Percentile</p>
            <p className="text-[#ef4444] font-mono font-semibold text-lg">{fmtDollar(terminal.p10)}</p>
            <p className="text-[#666] text-[10px] mt-0.5">{((terminal.p10 / portfolioSize - 1) * 100).toFixed(0)}% return</p>
          </div>
          <div className="bg-[#080B10] border border-[#1a1a2e] rounded-lg p-3 text-center">
            <p className="text-[#666] text-[10px] uppercase tracking-wider mb-1">Median</p>
            <p className="text-[#3b82f6] font-mono font-semibold text-lg">{fmtDollar(terminal.p50)}</p>
            <p className="text-[#666] text-[10px] mt-0.5">{((terminal.p50 / portfolioSize - 1) * 100).toFixed(0)}% return</p>
          </div>
          <div className="bg-[#080B10] border border-[#1a1a2e] rounded-lg p-3 text-center">
            <p className="text-[#666] text-[10px] uppercase tracking-wider mb-1">90th Percentile</p>
            <p className="text-[#22c55e] font-mono font-semibold text-lg">{fmtDollar(terminal.p90)}</p>
            <p className="text-[#666] text-[10px] mt-0.5">{((terminal.p90 / portfolioSize - 1) * 100).toFixed(0)}% return</p>
          </div>
        </div>
      )}
    </div>
  )
}
