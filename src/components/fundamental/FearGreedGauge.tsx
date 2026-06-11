'use client'
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'
import { BandScale, LabelChip } from '@/components/dashboard/ScoreScale'
import type { FearGreedEntry } from '@/lib/api/alternative-me'

interface Props {
  current: FearGreedEntry | null
  sparkline: FearGreedEntry[] // 30 days oldest → newest
  isLoading?: boolean
}

// Alternative.me zone boundaries (≠ the score-engine zones)
const FG_TICKS = [25, 45, 55, 75]

// Color by position on the contrarian axis — same semantics as the
// fundamental score's indicator rows (extreme fear = green = accumulation)
function fgColor(value: number): string {
  return value > 65 ? '#ef4444' : value > 35 ? '#f59e0b' : '#22c55e'
}

export function FearGreedGauge({ current, sparkline, isLoading }: Props) {
  const value = current ? parseInt(current.value, 10) : null
  const classification = current?.value_classification ?? 'Neutral'

  if (isLoading || value == null) {
    return (
      <div className="h-[160px] flex items-center justify-center rounded-lg bg-[#111120] border border-[#1a1a2e]">
        <span className="text-[#555] text-xs font-mono animate-pulse">awaiting data</span>
      </div>
    )
  }

  const color = fgColor(value)
  const sparkData = sparkline.map((d) => ({ v: parseInt(d.value, 10) }))
  const sparkVals = sparkData.map((d) => d.v)
  const stats =
    sparkVals.length > 0
      ? {
          low: Math.min(...sparkVals),
          high: Math.max(...sparkVals),
          avg: Math.round(sparkVals.reduce((s, v) => s + v, 0) / sparkVals.length),
        }
      : null

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* ── Hero — same language as the fundamental score card ── */}
      <div>
        <div className="flex items-end gap-4 flex-wrap">
          <span className="text-6xl font-mono font-bold leading-none" style={{ color }}>
            {value}
          </span>
          <div className="pb-1">
            <LabelChip label={classification} color={color} large />
          </div>
        </div>
        <div className="mt-4">
          <BandScale score={value} height={10} ticks={FG_TICKS} />
          <div className="flex justify-between text-[9px] font-mono uppercase tracking-widest text-[#555] mt-0.5">
            <span className="text-[#22c55e]">Extreme Fear</span>
            <span>Neutral</span>
            <span className="text-[#ef4444]">Extreme Greed</span>
          </div>
        </div>
        <div className="text-[10px] text-[#555] font-mono mt-3">
          Contrarian read: extreme fear has historically marked accumulation zones, extreme greed has preceded tops
        </div>
      </div>

      {/* ── 30-day stats ── */}
      {stats && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#111120] rounded-lg px-3 py-2 text-center border border-[#1a1a2e]">
            <div className="text-[9px] text-[#555] font-mono uppercase tracking-widest">30d Low</div>
            <div className="text-base font-bold font-mono mt-0.5" style={{ color: fgColor(stats.low) }}>
              {stats.low}
            </div>
          </div>
          <div className="bg-[#111120] rounded-lg px-3 py-2 text-center border border-[#1a1a2e]">
            <div className="text-[9px] text-[#555] font-mono uppercase tracking-widest">30d Avg</div>
            <div className="text-base font-bold font-mono mt-0.5" style={{ color: fgColor(stats.avg) }}>
              {stats.avg}
            </div>
          </div>
          <div className="bg-[#111120] rounded-lg px-3 py-2 text-center border border-[#1a1a2e]">
            <div className="text-[9px] text-[#555] font-mono uppercase tracking-widest">30d High</div>
            <div className="text-base font-bold font-mono mt-0.5" style={{ color: fgColor(stats.high) }}>
              {stats.high}
            </div>
          </div>
        </div>
      )}

      {/* ── 30-day sparkline ── */}
      {sparkData.length > 0 && (
        <div className="w-full">
          <div className="text-[10px] text-[#555] uppercase tracking-widest mb-1.5 font-mono">
            30-Day History
          </div>
          {/* Hard pixel height prevents Recharts width/height=-1 warning */}
          <div style={{ width: '100%', height: 72 }}>
            <ResponsiveContainer width="100%" height={72}>
              <AreaChart data={sparkData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                <defs>
                  <linearGradient id="fgGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  content={({ payload }) => {
                    if (!payload?.length) return null
                    return (
                      <div className="bg-[#111120] border border-[#2a2a3e] rounded px-2 py-1 text-xs font-mono text-[#e0e0e0]">
                        {payload[0].value as number}
                      </div>
                    )
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={color}
                  strokeWidth={1.5}
                  fill="url(#fgGrad)"
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between text-[9px] text-[#444] font-mono mt-0.5 px-1">
            <span>30d ago</span>
            <span>Today</span>
          </div>
        </div>
      )}
    </div>
  )
}
