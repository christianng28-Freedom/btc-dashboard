'use client'
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

export interface DualAxisSeries {
  key: string
  label: string
  color: string
  data: { date: string; value: number }[]
  type?: 'line' | 'area'
  formatY?: (v: number) => string
  yAxisId: 'left' | 'right'
}

interface ReferenceLineConfig {
  y: number
  yAxisId: 'left' | 'right'
  label: string
  color?: string
}

interface Props {
  title: string
  description?: string
  left: DualAxisSeries
  right: DualAxisSeries
  height?: number
  referenceLines?: ReferenceLineConfig[]
  source?: string
  isLoading?: boolean
  isError?: boolean
}

function mergeTwo(
  left: DualAxisSeries,
  right: DualAxisSeries,
): Record<string, number | string>[] {
  const dateSet = new Set<string>([
    ...left.data.map((p) => p.date),
    ...right.data.map((p) => p.date),
  ])
  const sorted = Array.from(dateSet).sort()
  const lMap = new Map(left.data.map((p) => [p.date, p.value]))
  const rMap = new Map(right.data.map((p) => [p.date, p.value]))
  return sorted.map((date) => {
    const row: Record<string, number | string> = { date }
    const lv = lMap.get(date)
    const rv = rMap.get(date)
    if (lv != null) row[left.key] = lv
    if (rv != null) row[right.key] = rv
    return row
  })
}

export function DualAxisChart({
  title,
  description,
  left,
  right,
  height = 240,
  referenceLines,
  source,
  isLoading,
  isError,
}: Props) {
  const noData = left.data.length === 0 && right.data.length === 0

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
    if (isError || noData) {
      return (
        <div
          className="flex items-center justify-center border border-dashed border-[#1a1a2e] rounded-lg"
          style={{ height }}
        >
          <div className="text-[10px] font-mono text-[#444455]">
            {isError ? 'Failed to load data' : 'No data available'}
          </div>
        </div>
      )
    }

    const merged = mergeTwo(left, right)
    const step = Math.max(1, Math.floor(merged.length / 200))
    const thinned = merged.filter((_, i) => i % step === 0 || i === merged.length - 1)
    const fmtL = left.formatY ?? ((v: number) => v.toLocaleString())
    const fmtR = right.formatY ?? ((v: number) => v.toLocaleString())

    const renderSeries = (s: DualAxisSeries) =>
      s.type === 'area' ? (
        <Area
          key={s.key}
          type="monotone"
          dataKey={s.key}
          name={s.label}
          yAxisId={s.yAxisId}
          stroke={s.color}
          fill={s.color}
          fillOpacity={0.12}
          strokeWidth={1.5}
          dot={false}
          connectNulls
        />
      ) : (
        <Line
          key={s.key}
          type="monotone"
          dataKey={s.key}
          name={s.label}
          yAxisId={s.yAxisId}
          stroke={s.color}
          strokeWidth={1.5}
          dot={false}
          connectNulls
        />
      )

    return (
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={thinned} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
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
            yAxisId="left"
            orientation="left"
            domain={['auto', 'auto']}
            tick={{ fill: left.color, fontSize: 9, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={fmtL}
            width={52}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={['auto', 'auto']}
            tick={{ fill: right.color, fontSize: 9, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={fmtR}
            width={52}
          />
          <Tooltip
            formatter={(v, name) => {
              if (name === left.label || name === left.key) return [fmtL(v as number), left.label]
              return [fmtR(v as number), right.label]
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
          <Legend wrapperStyle={{ fontSize: 9, fontFamily: 'monospace', color: '#555566' }} />
          {referenceLines?.map((rl, i) => (
            <ReferenceLine
              key={i}
              y={rl.y}
              yAxisId={rl.yAxisId}
              stroke={rl.color ?? '#444455'}
              strokeDasharray="4 4"
              label={{
                value: rl.label,
                position: 'insideTopRight',
                fill: rl.color ?? '#555566',
                fontSize: 9,
                fontFamily: 'monospace',
              }}
            />
          ))}
          {renderSeries(left)}
          {renderSeries(right)}
        </ComposedChart>
      </ResponsiveContainer>
    )
  }

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 space-y-3">
      <div>
        <div className="text-xs font-bold text-[#e0e0e0] font-mono">{title}</div>
        {description && (
          <div className="text-[10px] text-[#555566] font-mono">{description}</div>
        )}
      </div>
      {renderContent()}
      {source && (
        <div className="text-[9px] font-mono text-[#333344]">Source: {source}</div>
      )}
    </div>
  )
}
