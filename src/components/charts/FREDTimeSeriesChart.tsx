'use client'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

export interface FREDSeries {
  key: string
  label: string
  color: string
  data: { date: string; value: number }[]
}

interface ReferenceLineConfig {
  y: number
  label: string
  color?: string
}

interface Props {
  title: string
  description?: string
  series: FREDSeries[]
  height?: number
  formatY?: (v: number) => string
  yDomain?: [number | 'auto', number | 'auto']
  referenceLines?: ReferenceLineConfig[]
  recessionBands?: Array<{ start: string; end: string }>
  source?: string
  isLoading?: boolean
  isError?: boolean
}

function mergeByDate(series: FREDSeries[]): Record<string, number | string>[] {
  const dateSet = new Set<string>()
  for (const s of series) {
    for (const p of s.data) dateSet.add(p.date)
  }
  const sorted = Array.from(dateSet).sort()
  const maps = series.map((s) => new Map(s.data.map((p) => [p.date, p.value])))
  return sorted.map((date) => {
    const row: Record<string, number | string> = { date }
    series.forEach((s, i) => {
      const v = maps[i].get(date)
      if (v != null) row[s.key] = v
    })
    return row
  })
}

export function FREDTimeSeriesChart({
  title,
  description,
  series,
  height = 200,
  formatY = (v) => v.toLocaleString(),
  yDomain,
  referenceLines,
  recessionBands,
  source,
  isLoading,
  isError,
}: Props) {
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
    if (isError || series.every((s) => s.data.length === 0)) {
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

    const merged = mergeByDate(series)
    // Thin to at most 200 points for render perf
    const step = Math.max(1, Math.floor(merged.length / 200))
    const thinned = merged.filter((_, i) => i % step === 0 || i === merged.length - 1)

    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={thinned} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#555566', fontSize: 9, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(d: string) => d.slice(0, 7)} // YYYY-MM
            interval="preserveStartEnd"
          />
          <YAxis
            domain={yDomain ?? ['auto', 'auto']}
            tick={{ fill: '#555566', fontSize: 9, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatY}
            width={48}
          />
          <Tooltip
            formatter={(v, name) => {
              const s = series.find((s) => s.key === name)
              return [formatY(v as number), s?.label ?? name]
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
          {series.length > 1 && (
            <Legend
              wrapperStyle={{ fontSize: 9, fontFamily: 'monospace', color: '#555566' }}
            />
          )}
          {referenceLines?.map((rl) => (
            <ReferenceLine
              key={rl.y}
              y={rl.y}
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
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={1.5}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
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
