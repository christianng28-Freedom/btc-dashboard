'use client'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import type { OIDataPoint } from '@/app/api/fundamental/route'

interface Props {
  oiHistory: OIDataPoint[]
  oi90dMA: number
  oiDeviationPct: number
  currentOI: number
  isLoading?: boolean
}

function formatBillions(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`
  return `$${v.toFixed(0)}`
}

interface ChartPoint {
  date: string
  oi: number
  ma: number | null
}

function buildChartData(history: OIDataPoint[]): ChartPoint[] {
  return history.map((d, i) => {
    const slice = history.slice(Math.max(0, i - 89), i + 1)
    const ma = slice.length >= 5
      ? slice.reduce((s, x) => s + x.oiValue, 0) / slice.length
      : null
    const date = new Date(d.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return { date, oi: d.oiValue, ma }
  })
}

export function FuturesOIChart({ oiHistory, oi90dMA, oiDeviationPct, currentOI, isLoading }: Props) {
  const isElevated = oiDeviationPct > 20

  if (isLoading) {
    return (
      <div className="h-48 flex items-center justify-center text-[#555] text-sm">
        Loading OI data…
      </div>
    )
  }

  if (oiHistory.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-[#555] text-sm">
        No OI data available
      </div>
    )
  }

  const chartData = buildChartData(oiHistory)

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="text-xs text-[#666] font-mono">Current OI</div>
          <div className="text-lg font-bold font-mono text-[#e0e0e0]">{formatBillions(currentOI)}</div>
          <div className="text-xs font-mono" style={{ color: oiDeviationPct > 0 ? '#f97316' : '#22c55e' }}>
            {oiDeviationPct >= 0 ? '+' : ''}{oiDeviationPct.toFixed(1)}% vs 90d MA
          </div>
        </div>
        <div className="text-right space-y-0.5">
          <div className="text-xs text-[#666] font-mono">90d MA</div>
          <div className="text-sm font-mono text-[#999]">{formatBillions(oi90dMA)}</div>
        </div>
        {isElevated && (
          <div className="flex items-center gap-1.5 bg-[#f9731615] border border-[#f9731630] rounded px-3 py-1.5">
            <span className="text-[#f97316] text-xs">▲</span>
            <span className="text-[#f97316] text-xs font-mono font-semibold">Elevated leverage</span>
          </div>
        )}
      </div>

      {/* Chart */}
      <div style={{ width: '100%', height: 192 }}>
        <ResponsiveContainer width="100%" height={192}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#555', fontSize: 10, fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={{ stroke: '#1a1a2e' }}
              interval={Math.floor(chartData.length / 6)}
            />
            <YAxis
              tickFormatter={formatBillions}
              tick={{ fill: '#555', fontSize: 10, fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                return (
                  <div className="bg-[#111120] border border-[#2a2a3e] rounded p-2 text-xs font-mono text-[#e0e0e0] space-y-1">
                    <div className="text-[#666]">{label}</div>
                    {payload.map((p) => (
                      <div key={p.dataKey as string} style={{ color: p.color as string }}>
                        {p.dataKey === 'oi' ? 'OI' : '90d MA'}: {formatBillions(p.value as number)}
                      </div>
                    ))}
                  </div>
                )
              }}
            />
            <Line
              type="monotone"
              dataKey="oi"
              stroke="#3b82f6"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              name="OI"
            />
            <Line
              type="monotone"
              dataKey="ma"
              stroke="#f59e0b"
              strokeWidth={1}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive={false}
              connectNulls
              name="90d MA"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-[10px] font-mono text-[#555]">
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-0.5 bg-[#3b82f6]" />OI
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-0.5 bg-[#f59e0b] opacity-80 border-dashed" style={{ borderTop: '1px dashed #f59e0b', background: 'transparent' }} />90d MA
        </span>
      </div>
    </div>
  )
}
