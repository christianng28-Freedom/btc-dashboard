'use client'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

interface DataPoint {
  date: string
  value: number
  yoy: number | null
}

interface Props {
  cpi: DataPoint[]
  pce: DataPoint[]
  isLoading?: boolean
  isError?: boolean
}

function mergeInflation(
  cpi: DataPoint[],
  pce: DataPoint[],
): { date: string; cpi?: number; pce?: number }[] {
  const dateSet = new Set([...cpi.map((d) => d.date), ...pce.map((d) => d.date)])
  const cpiMap = new Map(cpi.map((d) => [d.date, d.yoy]))
  const pceMap = new Map(pce.map((d) => [d.date, d.yoy]))
  return Array.from(dateSet)
    .sort()
    .map((date) => {
      const row: { date: string; cpi?: number; pce?: number } = { date }
      const c = cpiMap.get(date)
      const p = pceMap.get(date)
      if (c != null) row.cpi = Math.round(c * 10) / 10
      if (p != null) row.pce = Math.round(p * 10) / 10
      return row
    })
    .filter((d) => d.cpi != null || d.pce != null)
}

export function InflationChart({ cpi, pce, isLoading, isError }: Props) {
  if (isLoading) {
    return (
      <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5">
        <div className="h-[180px] flex items-center justify-center text-[#555566] text-xs font-mono">
          Loading…
        </div>
      </div>
    )
  }

  const noData = cpi.length === 0 && pce.length === 0
  if (isError || noData) {
    return (
      <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5">
        <div className="h-[180px] flex items-center justify-center border border-dashed border-[#1a1a2e] rounded-lg">
          <div className="text-[10px] font-mono text-[#444455]">
            {isError ? 'Failed to load inflation data' : 'No data available'}
          </div>
        </div>
      </div>
    )
  }

  const merged = mergeInflation(cpi, pce)

  const latestCPI = [...cpi].reverse().find((d) => d.yoy != null)
  const latestPCE = [...pce].reverse().find((d) => d.yoy != null)

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-[#e0e0e0] font-mono">CPI &amp; PCE Inflation (YoY)</div>
          <div className="text-[10px] text-[#555566] font-mono">
            Consumer Price Index + Personal Consumption Expenditures
          </div>
        </div>
        <div className="text-right shrink-0 flex gap-4">
          {latestCPI?.yoy != null && (
            <div>
              <div className="text-[9px] font-mono text-[#555566]">CPI</div>
              <div
                className="text-base font-bold font-mono"
                style={{ color: latestCPI.yoy > 3.5 ? '#ef4444' : latestCPI.yoy < 2.5 ? '#22c55e' : '#f59e0b' }}
              >
                {latestCPI.yoy.toFixed(1)}%
              </div>
            </div>
          )}
          {latestPCE?.yoy != null && (
            <div>
              <div className="text-[9px] font-mono text-[#555566]">PCE</div>
              <div
                className="text-base font-bold font-mono"
                style={{ color: latestPCE.yoy > 3.0 ? '#ef4444' : latestPCE.yoy < 2.0 ? '#22c55e' : '#f59e0b' }}
              >
                {latestPCE.yoy.toFixed(1)}%
              </div>
            </div>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={merged} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
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
            formatter={(v, name) => [`${(v as number).toFixed(1)}%`, name === 'cpi' ? 'CPI YoY' : 'PCE YoY']}
            labelFormatter={(l) => l as string}
            contentStyle={{
              background: '#0d0d14',
              border: '1px solid #1a1a2e',
              fontSize: 10,
              fontFamily: 'monospace',
            }}
            labelStyle={{ color: '#666' }}
          />
          <Legend wrapperStyle={{ fontSize: 9, fontFamily: 'monospace', color: '#555566' }} />
          {/* Fed 2% inflation target */}
          <ReferenceLine
            y={2}
            stroke="#22c55e"
            strokeDasharray="4 4"
            label={{
              value: '2% target',
              position: 'insideTopRight',
              fill: '#22c55e',
              fontSize: 9,
              fontFamily: 'monospace',
            }}
          />
          <Line
            type="monotone"
            dataKey="cpi"
            name="CPI YoY"
            stroke="#3b82f6"
            strokeWidth={1.5}
            dot={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="pce"
            name="PCE YoY"
            stroke="#a78bfa"
            strokeWidth={1.5}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="text-[9px] font-mono text-[#333344]">Source: FRED (CPIAUCSL, PCEPI)</div>
    </div>
  )
}
