'use client'
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import type { YieldCurvePoint } from '@/app/api/global/rates/route'

interface Props {
  points: YieldCurvePoint[]
  currentDate: string
  oneYearAgoDate: string
  twoYearsAgoDate: string
  isLoading?: boolean
  isError?: boolean
  height?: number
}

const CHART_AXIS    = { fill: '#555566', fontSize: 9, fontFamily: 'monospace' } as const
const CHART_TOOLTIP = {
  background: '#0d0d14',
  border: '1px solid #1a1a2e',
  fontSize: 10,
  fontFamily: 'monospace',
} as const

export function YieldCurveSnapshotChart({
  points,
  currentDate,
  oneYearAgoDate,
  twoYearsAgoDate,
  isLoading,
  isError,
  height = 260,
}: Props) {
  // Compute inversion status: 2Y or 3M yield > 10Y yield
  const curr10y = points.find((p) => p.maturity === '10Y')?.current
  const curr2y  = points.find((p) => p.maturity === '2Y')?.current
  const curr3m  = points.find((p) => p.maturity === '3M')?.current
  const isInvertedNow =
    (curr2y != null && curr10y != null && curr2y > curr10y) ||
    (curr3m != null && curr10y != null && curr3m > curr10y)

  // Custom dot for the current line — red where the curve inverts (yield drops vs prior maturity)
  const currentDot = (props: {
    cx?: number
    cy?: number
    index?: number
  }) => {
    const { cx, cy, index } = props
    if (cx == null || cy == null || index == null) return <g key={`cdot-${index ?? 0}`} />
    const curr = points[index]?.current
    const prevYield = index > 0 ? points[index - 1]?.current : null
    const inv = curr != null && prevYield != null && curr < prevYield
    return (
      <circle
        key={`cdot-${index}`}
        cx={cx}
        cy={cy}
        r={4}
        fill={inv ? '#ef4444' : '#3b82f6'}
        stroke="none"
      />
    )
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div
          className="flex items-center justify-center text-[#555566] text-xs font-mono"
          style={{ height }}
        >
          Loading…
        </div>
      )
    }
    if (isError || points.length === 0) {
      return (
        <div
          className="flex items-center justify-center border border-dashed border-[#1a1a2e] rounded-lg"
          style={{ height }}
        >
          <div className="text-[10px] font-mono text-[#444455]">
            {isError ? 'Failed to load data' : 'No data'}
          </div>
        </div>
      )
    }

    return (
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
          <XAxis
            dataKey="maturity"
            tick={CHART_AXIS}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={CHART_AXIS}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
            width={40}
          />
          <Tooltip
            formatter={(v: unknown, name: string | number | undefined) => [
              `${Number(v).toFixed(2)}%`,
              name,
            ]}
            contentStyle={CHART_TOOLTIP}
            labelStyle={{ color: '#888' }}
          />
          <Legend wrapperStyle={{ fontSize: 9, fontFamily: 'monospace', color: '#555566' }} />
          {/* 2Y ago — darkest gray dashed */}
          <Line
            type="monotone"
            dataKey="twoYearsAgo"
            name={`2Y ago (${twoYearsAgoDate.slice(0, 7)})`}
            stroke="#444455"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={{ r: 3, fill: '#444455', strokeWidth: 0 }}
            connectNulls
          />
          {/* 1Y ago — amber dashed */}
          <Line
            type="monotone"
            dataKey="oneYearAgo"
            name={`1Y ago (${oneYearAgoDate.slice(0, 7)})`}
            stroke="#f59e0b"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
            connectNulls
          />
          {/* Current — blue with red dots at inverted points */}
          <Line
            type="monotone"
            dataKey="current"
            name={`Current (${currentDate.slice(0, 7)})`}
            stroke="#3b82f6"
            strokeWidth={2}
            dot={currentDot as any} // eslint-disable-line @typescript-eslint/no-explicit-any
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    )
  }

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-bold text-[#e0e0e0] font-mono">Yield Curve Snapshot</div>
          <div className="text-[10px] text-[#555566] font-mono">
            Cross-sectional view — x = maturity, y = yield. Red dots = inverted region (yield drops vs prior maturity).
          </div>
        </div>
        {isInvertedNow && (
          <span className="flex-shrink-0 text-[9px] font-mono bg-red-500/10 text-red-400 border border-red-500/20 rounded px-2 py-0.5">
            INVERTED
          </span>
        )}
      </div>
      {renderContent()}
      <div className="text-[9px] font-mono text-[#333344]">
        Source: FRED (DGS1MO, DGS3MO, DGS6MO, DGS1, DGS2, DGS3, DGS5, DGS7, DGS10, DGS20, DGS30)
      </div>
    </div>
  )
}
