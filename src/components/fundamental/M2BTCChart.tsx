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

interface M2Point {
  date: string
  value: number
  yoy: number | null
}

interface BTCPoint {
  date: string
  price: number
}

interface Props {
  m2: M2Point[]
  btcMonthly: BTCPoint[]
  isLoading?: boolean
  isError?: boolean
}

function mergeM2BTC(
  m2: M2Point[],
  btc: BTCPoint[],
): { date: string; m2yoy?: number; btc?: number }[] {
  const btcMap = new Map(btc.map((d) => [d.date, d.price]))
  // Build set of all months from m2 that have YoY and align to 1st of month
  const result: { date: string; m2yoy?: number; btc?: number }[] = []
  for (const d of m2) {
    if (d.yoy == null) continue
    // Normalize M2 date to YYYY-MM-01 for matching BTC monthly
    const monthKey = d.date.slice(0, 7) + '-01'
    const row: { date: string; m2yoy?: number; btc?: number } = { date: d.date }
    row.m2yoy = Math.round(d.yoy * 10) / 10
    const btcPrice = btcMap.get(monthKey) ?? btcMap.get(d.date)
    if (btcPrice != null) row.btc = Math.round(btcPrice)
    result.push(row)
  }
  return result
}

export function M2BTCChart({ m2, btcMonthly, isLoading, isError }: Props) {
  if (isLoading) {
    return (
      <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5">
        <div className="h-[180px] flex items-center justify-center text-[#555566] text-xs font-mono">
          Loading…
        </div>
      </div>
    )
  }

  if (isError || m2.length === 0) {
    return (
      <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5">
        <div className="h-[180px] flex items-center justify-center border border-dashed border-[#1a1a2e] rounded-lg">
          <div className="text-[10px] font-mono text-[#444455]">
            {isError ? 'Failed to load M2 data' : 'No data available'}
          </div>
        </div>
      </div>
    )
  }

  const merged = mergeM2BTC(m2, btcMonthly)

  const latestM2 = [...m2].reverse().find((d) => d.yoy != null)
  const latestBTC = btcMonthly.length > 0 ? btcMonthly[btcMonthly.length - 1] : null

  const m2Color = latestM2?.yoy != null
    ? latestM2.yoy > 5 ? '#22c55e' : latestM2.yoy < 0 ? '#ef4444' : '#f59e0b'
    : '#f59e0b'

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-[#e0e0e0] font-mono">M2 Money Supply vs BTC</div>
          <div className="text-[10px] text-[#555566] font-mono">
            M2 YoY growth (left) · BTC price USD (right)
          </div>
        </div>
        <div className="text-right shrink-0 flex gap-4">
          {latestM2?.yoy != null && (
            <div>
              <div className="text-[9px] font-mono text-[#555566]">M2 YoY</div>
              <div className="text-base font-bold font-mono" style={{ color: m2Color }}>
                {latestM2.yoy >= 0 ? '+' : ''}{latestM2.yoy.toFixed(1)}%
              </div>
            </div>
          )}
          {latestBTC && (
            <div>
              <div className="text-[9px] font-mono text-[#555566]">BTC</div>
              <div className="text-base font-bold font-mono text-[#f97316]">
                ${latestBTC.price >= 1000
                  ? `${(latestBTC.price / 1000).toFixed(1)}k`
                  : latestBTC.price.toFixed(0)}
              </div>
            </div>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart data={merged} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
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
            tick={{ fill: '#22c55e', fontSize: 9, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v}%`}
            width={36}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={['auto', 'auto']}
            tick={{ fill: '#f97316', fontSize: 9, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) =>
              v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
            }
            width={52}
          />
          <Tooltip
            formatter={(v, name) => {
              if (name === 'm2yoy') return [`${(v as number).toFixed(1)}%`, 'M2 YoY']
              return [`$${(v as number).toLocaleString()}`, 'BTC Price']
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
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="m2yoy"
            name="M2 YoY %"
            stroke="#22c55e"
            strokeWidth={1.5}
            dot={false}
            connectNulls
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="btc"
            name="BTC Price"
            stroke="#f97316"
            strokeWidth={1.5}
            dot={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="text-[9px] font-mono text-[#333344]">
        Source: FRED (M2SL) + CoinGecko · Positive M2 growth = liquidity expansion = bullish BTC
      </div>
    </div>
  )
}
