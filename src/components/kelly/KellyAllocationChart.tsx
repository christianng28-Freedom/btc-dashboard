'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { calcAllFractions, SCENARIOS, type KellyInputs } from '@/lib/calc/kelly'

interface Props {
  riskFreeRate: number   // decimal
  portfolioSize: number
}

interface TooltipPayload {
  name: string
  value: number
  color: string
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0d1018] border border-[#1a1a2e] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[#999] text-xs mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs font-mono" style={{ color: p.color }}>
          {p.name}: {p.value.toFixed(1)}%
        </p>
      ))}
    </div>
  )
}

export function KellyAllocationChart({ riskFreeRate, portfolioSize }: Props) {
  // Compute fractions for each scenario
  const data = ['Full Kelly (100%)', 'Half Kelly (50%)', 'Quarter Kelly (25%)', 'Eighth Kelly (12.5%)', 'Conservative (10% cap)'].map((label, idx) => {
    const entry: Record<string, string | number> = { name: label.replace(/ \(.*\)/, '') }

    for (const [key, scenario] of Object.entries(SCENARIOS)) {
      const inputs: KellyInputs = {
        expectedReturn: scenario.expectedReturn / 100,
        riskFreeRate,
        volatility: scenario.volatility / 100,
        portfolioSize,
      }
      const fractions = calcAllFractions(inputs)
      entry[key] = Number((fractions[idx].allocation * 100).toFixed(1))
    }

    return entry
  })

  return (
    <div className="bg-[#0d1018] border border-[#1a1a2e] rounded-xl p-5">
      <h3 className="text-[#e0e0e0] text-sm font-semibold mb-4">Allocation Across Scenarios</h3>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} barGap={2} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
          <XAxis
            dataKey="name"
            tick={{ fill: '#666', fontSize: 11 }}
            axisLine={{ stroke: '#1a1a2e' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#666', fontSize: 11 }}
            axisLine={{ stroke: '#1a1a2e' }}
            tickLine={false}
            tickFormatter={v => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)', stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }} />
          <Legend
            wrapperStyle={{ paddingTop: 8 }}
            formatter={(value: string) => <span className="text-xs text-[#999]">{value}</span>}
          />
          <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1} label={{ value: 'Leverage', fill: '#ef4444', fontSize: 10, position: 'right' }} />
          <Bar dataKey="bull" name="Bull Case" fill="#22c55e" radius={[3, 3, 0, 0]} />
          <Bar dataKey="base" name="Base Case" fill="#3b82f6" radius={[3, 3, 0, 0]} />
          <Bar dataKey="bear" name="Bear Case" fill="#ef4444" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
