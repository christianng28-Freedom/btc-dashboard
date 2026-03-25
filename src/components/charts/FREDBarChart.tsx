'use client'
import {
  ComposedChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

interface ReferenceLineConfig {
  y: number
  label: string
  color?: string
}

interface Props {
  title: string
  description?: string
  data: { date: string; value: number }[]
  height?: number
  formatY?: (v: number) => string
  yDomain?: [number | 'auto', number | 'auto']
  referenceLines?: ReferenceLineConfig[]
  positiveColor?: string
  negativeColor?: string
  source?: string
  isLoading?: boolean
  isError?: boolean
}

export function FREDBarChart({
  title,
  description,
  data,
  height = 200,
  formatY = (v) => v.toLocaleString(),
  yDomain,
  referenceLines,
  positiveColor = '#22c55e',
  negativeColor = '#ef4444',
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
    if (isError || data.length === 0) {
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

    const step = Math.max(1, Math.floor(data.length / 200))
    const thinned = data.filter((_, i) => i % step === 0 || i === data.length - 1)

    return (
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={thinned} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
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
            domain={yDomain ?? ['auto', 'auto']}
            tick={{ fill: '#555566', fontSize: 9, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatY}
            width={48}
          />
          <Tooltip
            formatter={(v) => [formatY(v as number), title]}
            labelFormatter={(l) => l as string}
            contentStyle={{
              background: '#0d0d14',
              border: '1px solid #1a1a2e',
              fontSize: 10,
              fontFamily: 'monospace',
            }}
            labelStyle={{ color: '#666' }}
          />
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
          <Bar dataKey="value" maxBarSize={8} isAnimationActive={false}>
            {thinned.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.value >= 0 ? positiveColor : negativeColor}
                fillOpacity={0.75}
              />
            ))}
          </Bar>
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
