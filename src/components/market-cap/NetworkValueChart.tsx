'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer, ReferenceLine } from 'recharts'
import { COMPANY_COMPARISONS } from '@/lib/constants'

interface Props {
  btcMarketCap: number
  // ETH market cap — passed in from hook or hardcoded fallback
  ethMarketCap?: number
}

function fmtMcap(v: number) {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`
  if (v >= 1e9) return `$${(v / 1e9).toFixed(0)}B`
  return `$${v}`
}

export function NetworkValueChart({ btcMarketCap, ethMarketCap = 350_000_000_000 }: Props) {
  const entries = [
    ...COMPANY_COMPARISONS.map(c => ({ name: c.name, mcap: c.mcap, type: 'company' as const })),
    { name: 'Bitcoin', mcap: btcMarketCap, type: 'btc' as const },
    { name: 'Ethereum', mcap: ethMarketCap, type: 'eth' as const },
  ]
    .filter(e => e.mcap > 0)
    .sort((a, b) => a.mcap - b.mcap) // ascending for horizontal bar chart

  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={entries}
          layout="vertical"
          margin={{ top: 4, right: 60, bottom: 4, left: 120 }}
        >
          <XAxis
            type="number"
            scale="log"
            domain={[1e11, 1e13]}
            tickFormatter={fmtMcap}
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
            width={115}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0]?.payload as { name: string; mcap: number }
              return (
                <div className="bg-[#111120] border border-[#1a1a2e] rounded px-3 py-2 text-sm">
                  <div className="font-medium text-[#e0e0e0]">{d.name}</div>
                  <div className="font-mono text-[#f97316]">{fmtMcap(d.mcap)}</div>
                </div>
              )
            }}
            cursor={{ fill: '#ffffff06' }}
          />
          <Bar dataKey="mcap" radius={[0, 3, 3, 0]} maxBarSize={20}>
            {entries.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  entry.type === 'btc'
                    ? '#f97316'
                    : entry.type === 'eth'
                    ? '#8b5cf6'
                    : '#3b82f6'
                }
                opacity={entry.type === 'company' ? 0.55 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 justify-center mt-1 text-xs text-[#666]">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded-sm bg-[#3b82f6] opacity-55 inline-block" />
          Companies (static Q1 2025)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded-sm bg-[#f97316] inline-block" />
          Bitcoin (live)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded-sm bg-[#8b5cf6] inline-block" />
          Ethereum (live)
        </span>
      </div>
    </div>
  )
}
