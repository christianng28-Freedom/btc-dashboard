'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from 'recharts'
import { ASSET_CLASS_VALUES } from '@/lib/constants'

interface Props {
  btcMarketCap: number
}

// Custom tooltip
function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: { name: string; value: number; isBTC?: boolean } }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const fmt = (v: number) => {
    if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`
    if (v >= 1e9) return `$${(v / 1e9).toFixed(0)}B`
    return `$${v}`
  }
  return (
    <div className="bg-[#111120] border border-[#1a1a2e] rounded px-3 py-2 text-sm">
      <div className="font-medium text-[#e0e0e0]">{d.name}</div>
      <div className="font-mono text-[#f97316]">{fmt(d.value)}</div>
    </div>
  )
}

export function AssetBarChart({ btcMarketCap }: Props) {
  const sorted = [...ASSET_CLASS_VALUES]
    .sort((a, b) => a.value - b.value)
    .map(a => ({ name: a.name.replace('Global ', '').replace(' (Bonds)', ''), value: a.value, isBTC: false }))

  // Insert BTC at its natural sorted position
  const btcEntry = { name: 'Bitcoin', value: btcMarketCap, isBTC: true }
  const insertIdx = sorted.findIndex(a => a.value > btcMarketCap)
  if (insertIdx === -1) sorted.push(btcEntry)
  else sorted.splice(insertIdx, 0, btcEntry)

  const maxVal = sorted[sorted.length - 1].value

  // Use log scale manually via normalized bar widths
  const logData = sorted.map(d => ({
    ...d,
    logValue: d.value > 0 ? Math.log10(d.value) : 0,
  }))

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={logData}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: 130 }}
        >
          <XAxis
            type="number"
            domain={[9, Math.log10(maxVal) + 0.5]}
            tickFormatter={(v: number) => {
              const val = Math.pow(10, v)
              if (val >= 1e12) return `$${(val / 1e12).toFixed(0)}T`
              if (val >= 1e9) return `$${(val / 1e9).toFixed(0)}B`
              return ''
            }}
            tick={{ fill: '#666', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: '#999', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={125}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: '#ffffff08' }} />
          <Bar dataKey="logValue" radius={[0, 3, 3, 0]} maxBarSize={18}>
            {logData.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.isBTC ? '#f97316' : '#3b82f6'}
                opacity={entry.isBTC ? 1 : 0.6}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 justify-center mt-1 text-xs text-[#666]">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded-sm bg-[#3b82f6] opacity-60 inline-block" />
          Asset class (log scale)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded-sm bg-[#f97316] inline-block" />
          Bitcoin
        </span>
      </div>
    </div>
  )
}
