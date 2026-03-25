'use client'
import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import macroCalendar from '@/data/macro-calendar.json'

interface Props {
  data: { date: string; upper: number; lower: number }[]
  isLoading?: boolean
  isError?: boolean
}

const FOMC_EVENTS = (macroCalendar as { date: string; category: string; period: string }[]).filter(
  (e) => e.category === 'fomc',
)

export function FedFundsChart({ data, isLoading, isError }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const nextFOMC = FOMC_EVENTS.find((e) => e.date >= today)
  const daysToFOMC = nextFOMC
    ? Math.ceil((new Date(nextFOMC.date).getTime() - Date.now()) / 86_400_000)
    : null

  if (isLoading) {
    return (
      <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5">
        <div className="h-[180px] flex items-center justify-center text-[#555566] text-xs font-mono">
          Loading…
        </div>
      </div>
    )
  }

  if (isError || data.length === 0) {
    return (
      <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5">
        <div className="h-[180px] flex items-center justify-center border border-dashed border-[#1a1a2e] rounded-lg">
          <div className="text-[10px] font-mono text-[#444455]">
            {isError ? 'Failed to load Fed funds data' : 'No data available'}
          </div>
        </div>
      </div>
    )
  }

  const latest = data[data.length - 1]
  const step = Math.max(1, Math.floor(data.length / 300))
  const thinned = data.filter((_, i) => i % step === 0 || i === data.length - 1)

  // Build stacked area: lower is transparent base, spread is colored band
  const chartData = thinned.map((d) => ({
    date: d.date,
    lower: d.lower,
    spread: +(d.upper - d.lower).toFixed(4),
    midpoint: +((d.upper + d.lower) / 2).toFixed(4),
  }))

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-[#e0e0e0] font-mono">Fed Funds Rate</div>
          <div className="text-[10px] text-[#555566] font-mono">
            Federal Reserve target range · step chart
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-bold font-mono text-[#f59e0b]">
            {latest.lower.toFixed(2)}–{latest.upper.toFixed(2)}%
          </div>
          {nextFOMC && daysToFOMC !== null && (
            <div className="text-[9px] font-mono text-[#555566] mt-0.5">
              Next FOMC{' '}
              <span className="text-[#3b82f6]">{nextFOMC.date}</span>{' '}
              <span className="text-[#444]">({daysToFOMC}d)</span>
            </div>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#555566', fontSize: 9, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(d: string) => d.slice(0, 7)}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 'auto']}
            tick={{ fill: '#555566', fontSize: 9, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v}%`}
            width={36}
          />
          <Tooltip
            formatter={(v, key) => {
              if (key === 'lower') return [`${v}%`, 'Lower bound']
              if (key === 'spread') return [`${(v as number).toFixed(2)}%`, 'Range']
              return [v, key]
            }}
            labelFormatter={(l) => l as string}
            contentStyle={{
              background: '#0d0d14',
              border: '1px solid #1a1a2e',
              fontSize: 10,
              fontFamily: 'monospace',
            }}
            labelStyle={{ color: '#666' }}
          />
          {/* Transparent base for stacking */}
          <Area
            type="stepAfter"
            dataKey="lower"
            stroke="none"
            fill="transparent"
            stackId="fed"
          />
          {/* Colored rate band */}
          <Area
            type="stepAfter"
            dataKey="spread"
            stroke="#f59e0b"
            strokeWidth={2}
            fill="#f59e0b"
            fillOpacity={0.18}
            stackId="fed"
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="text-[9px] font-mono text-[#333344]">Source: FRED (DFEDTARL/DFEDTARU)</div>
    </div>
  )
}
