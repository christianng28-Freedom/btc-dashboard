'use client'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

interface DataPoint {
  date: string
  value: number
}

interface Props {
  data: DataPoint[]
  isLoading?: boolean
  isError?: boolean
}

export function TreasuryYieldChart({ data, isLoading, isError }: Props) {
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
            {isError ? 'Failed to load yield data' : 'No data available'}
          </div>
        </div>
      </div>
    )
  }

  const latest = data[data.length - 1]
  const ago90 = data[Math.max(0, data.length - 90)]
  const change90d = latest.value - ago90.value
  const isUp = change90d >= 0

  const yieldColor =
    latest.value >= 5 ? '#ef4444' : latest.value >= 4 ? '#f97316' : latest.value >= 3 ? '#f59e0b' : '#22c55e'

  const step = Math.max(1, Math.floor(data.length / 300))
  const thinned = data.filter((_, i) => i % step === 0 || i === data.length - 1)

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-[#e0e0e0] font-mono">10-Year Treasury Yield</div>
          <div className="text-[10px] text-[#555566] font-mono">
            US DGS10 · risk-free rate benchmark
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-bold font-mono" style={{ color: yieldColor }}>
            {latest.value.toFixed(2)}%
          </div>
          <div
            className="text-[10px] font-mono mt-0.5"
            style={{ color: isUp ? '#ef4444' : '#22c55e' }}
          >
            {isUp ? '+' : ''}{change90d.toFixed(2)}% 90d
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={thinned} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="yield-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={yieldColor} stopOpacity={0.2} />
              <stop offset="95%" stopColor={yieldColor} stopOpacity={0} />
            </linearGradient>
          </defs>
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
            domain={['auto', 'auto']}
            tick={{ fill: '#555566', fontSize: 9, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v}%`}
            width={36}
          />
          <Tooltip
            formatter={(v) => [`${(v as number).toFixed(2)}%`, '10Y Yield']}
            labelFormatter={(l) => l as string}
            contentStyle={{
              background: '#0d0d14',
              border: '1px solid #1a1a2e',
              fontSize: 10,
              fontFamily: 'monospace',
            }}
            labelStyle={{ color: '#666' }}
          />
          {/* Key rate levels */}
          <ReferenceLine
            y={5}
            stroke="#ef4444"
            strokeDasharray="4 4"
            label={{ value: '5% — high', position: 'insideTopRight', fill: '#ef4444', fontSize: 9, fontFamily: 'monospace' }}
          />
          <ReferenceLine
            y={3}
            stroke="#22c55e"
            strokeDasharray="4 4"
            label={{ value: '3% — neutral', position: 'insideTopRight', fill: '#22c55e', fontSize: 9, fontFamily: 'monospace' }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={yieldColor}
            strokeWidth={1.5}
            fill="url(#yield-grad)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="text-[9px] font-mono text-[#333344]">
        Source: FRED (DGS10) · High yield = opportunity cost, bearish for BTC
      </div>
    </div>
  )
}
