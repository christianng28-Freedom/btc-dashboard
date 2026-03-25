'use client'
import { AreaChart, Area, Line, Tooltip, ResponsiveContainer } from 'recharts'
import type { RatioPoint } from '@/hooks/useRelativeStrength'

interface Props {
  title: string
  description: string
  series: string
  ratioLabel: string
  formatRatio: (v: number) => string
  data?: RatioPoint[]
  isLoading?: boolean
  isError?: boolean
  showTrendLine?: boolean
  correlationDays?: number   // if set, show Pearson correlation over N days
}

/** Linear regression over { x: index, y: value } points */
function linearRegression(ys: number[]): { slope: number; intercept: number } {
  const n = ys.length
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0 }
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0
  for (let i = 0; i < n; i++) {
    sumX += i; sumY += ys[i]; sumXY += i * ys[i]; sumXX += i * i
  }
  const denom = n * sumXX - sumX * sumX
  if (denom === 0) return { slope: 0, intercept: sumY / n }
  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}

/** Pearson correlation between BTC returns and asset returns over last N days */
function pearsonCorrelation(data: RatioPoint[], days: number): number {
  const slice = data.slice(-days - 1)
  if (slice.length < 10) return 0
  const btcReturns: number[] = []
  const assetReturns: number[] = []
  for (let i = 1; i < slice.length; i++) {
    const prev = slice[i - 1]
    const curr = slice[i]
    if (prev.btc > 0 && prev.asset > 0) {
      btcReturns.push((curr.btc - prev.btc) / prev.btc)
      assetReturns.push((curr.asset - prev.asset) / prev.asset)
    }
  }
  const n = btcReturns.length
  if (n < 5) return 0
  const meanX = btcReturns.reduce((s, v) => s + v, 0) / n
  const meanY = assetReturns.reduce((s, v) => s + v, 0) / n
  let cov = 0, varX = 0, varY = 0
  for (let i = 0; i < n; i++) {
    const dx = btcReturns[i] - meanX
    const dy = assetReturns[i] - meanY
    cov += dx * dy
    varX += dx * dx
    varY += dy * dy
  }
  const denom = Math.sqrt(varX * varY)
  return denom > 0 ? cov / denom : 0
}

export function RelativeStrengthChart({
  title,
  description,
  series,
  ratioLabel,
  formatRatio,
  data,
  isLoading,
  isError,
  showTrendLine = false,
  correlationDays,
}: Props) {
  const gradientId = `rs-grad-${series}`
  const trendId = `rs-trend-${series}`

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-32 text-[#555566] text-xs font-mono">
          Loading…
        </div>
      )
    }

    if (isError || !data || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-32 border border-dashed border-[#1a1a2e] rounded-lg">
          <div className="text-center">
            <div className="text-[10px] font-mono text-[#444455]">
              {isError ? 'Failed to load data' : 'No data available'}
            </div>
            <div className="text-[9px] font-mono text-[#333344] mt-1">Source: FRED + CoinGecko</div>
          </div>
        </div>
      )
    }

    const latest = data[data.length - 1]
    const ago30 = data[Math.max(0, data.length - 30)]
    const change30d = ((latest.ratio - ago30.ratio) / ago30.ratio) * 100
    const isUp = change30d >= 0
    const changeColor = isUp ? '#22c55e' : '#ef4444'

    const baseRatio = data[0].ratio
    const indexedValues = data.map((d) => parseFloat(((d.ratio / baseRatio) * 100).toFixed(2)))

    // Trend line via linear regression on indexed values
    const { slope, intercept } = showTrendLine ? linearRegression(indexedValues) : { slope: 0, intercept: 0 }
    const trendIsUp = slope >= 0
    const trendColor = showTrendLine ? (trendIsUp ? '#22c55e' : '#ef4444') : 'transparent'

    const chartData = data.map((d, i) => ({
      date: d.date,
      value: indexedValues[i],
      ...(showTrendLine && { trend: parseFloat((intercept + slope * i).toFixed(2)) }),
    }))

    // 90d correlation (for DXY chart)
    const corr = correlationDays != null ? pearsonCorrelation(data, correlationDays) : null
    const corrColor = corr != null
      ? corr > 0.3 ? '#22c55e' : corr < -0.3 ? '#ef4444' : '#f59e0b'
      : undefined

    return (
      <>
        <div className="flex items-end gap-2">
          <div className="text-3xl font-bold font-mono text-[#e0e0e0]">
            {formatRatio(latest.ratio)}
          </div>
          <div className="text-[10px] font-mono text-[#555566] pb-1">{ratioLabel}</div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            <div className="text-xs font-mono font-bold" style={{ color: changeColor }}>
              {isUp ? '+' : ''}{change30d.toFixed(1)}%
            </div>
            <div className="text-[10px] font-mono text-[#444455]">30d</div>
          </div>
          {corr != null && (
            <div className="flex items-center gap-1">
              <div className="text-xs font-mono font-bold" style={{ color: corrColor }}>
                r={corr.toFixed(2)}
              </div>
              <div className="text-[10px] font-mono text-[#444455]">{correlationDays}d corr</div>
            </div>
          )}
          {showTrendLine && (
            <div className="flex items-center gap-1">
              <div className="text-[10px] font-mono" style={{ color: trendColor }}>
                {trendIsUp ? '↗ uptrend' : '↘ downtrend'}
              </div>
            </div>
          )}
        </div>

        <ResponsiveContainer width="100%" height={72}>
          <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip
              formatter={(v, name) => {
                if (name === 'trend') return [`${(v as number).toFixed(1)}`, 'Trend']
                return [`${(v as number).toFixed(1)}`, 'Indexed (1Y=100)']
              }}
              contentStyle={{
                background: '#0d0d14',
                border: '1px solid #1a1a2e',
                fontSize: 10,
                fontFamily: 'monospace',
              }}
              labelStyle={{ color: '#666' }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={1.5}
              fill={`url(#${gradientId})`}
              dot={false}
            />
            {showTrendLine && (
              <Line
                type="linear"
                dataKey="trend"
                stroke={trendColor}
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>

        <div className="text-[9px] font-mono text-[#333344]">
          Indexed 1Y ago = 100 · Source: FRED + CoinGecko
        </div>
      </>
    )
  }

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 space-y-3">
      <div>
        <div className="text-xs font-bold text-[#e0e0e0] font-mono">{title}</div>
        <div className="text-[10px] text-[#555566] font-mono">{description}</div>
      </div>
      {renderContent()}
    </div>
  )
}
