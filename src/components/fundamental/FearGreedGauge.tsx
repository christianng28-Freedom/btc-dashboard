'use client'
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'
import type { FearGreedEntry } from '@/lib/api/alternative-me'

interface Props {
  current: FearGreedEntry | null
  sparkline: FearGreedEntry[]  // 30 days oldest → newest
  isLoading?: boolean
}

const CLASSIFICATIONS: Record<string, { color: string; bg: string }> = {
  'Extreme Fear':  { color: '#3b82f6', bg: '#1d4ed818' },
  'Fear':          { color: '#22c55e', bg: '#15803d18' },
  'Neutral':       { color: '#f59e0b', bg: '#b4530918' },
  'Greed':         { color: '#f97316', bg: '#c2410c18' },
  'Extreme Greed': { color: '#ef4444', bg: '#b91c1c18' },
}

function getColors(classification: string) {
  return CLASSIFICATIONS[classification] ?? { color: '#888888', bg: '#88888818' }
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number): string {
  const s = polarToCartesian(cx, cy, r, end)
  const e = polarToCartesian(cx, cy, r, start)
  const large = end - start > 180 ? 1 : 0
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y}`
}

const SEGMENTS = [
  { from: 0,  to: 25,  color: '#3b82f6' },  // Extreme Fear
  { from: 25, to: 45,  color: '#22c55e' },  // Fear
  { from: 45, to: 55,  color: '#f59e0b' },  // Neutral
  { from: 55, to: 75,  color: '#f97316' },  // Greed
  { from: 75, to: 100, color: '#ef4444' },  // Extreme Greed
]

// Zone labels shown at gauge edges
const ZONE_LABELS = [
  { x: 'left',  label: 'Fear' },
  { x: 'right', label: 'Greed' },
]

export function FearGreedGauge({ current, sparkline, isLoading }: Props) {
  const value = current ? parseInt(current.value, 10) : 50
  const classification = current?.value_classification ?? 'Neutral'
  const { color, bg } = getColors(classification)

  // SVG geometry — cy at bottom of arc so all text fits above it
  const W = 220
  const H = 140    // total SVG height
  const cx = W / 2
  const cy = H - 20  // pivot sits 20px from SVG bottom → room for pivot dot + min/max labels
  const r  = 95
  const trackW = 18

  const needleAngle = -180 + (value / 100) * 180

  // Score text: center vertically in the arc area (between top of arc and pivot)
  const scoreY = cy - r * 0.42

  const sparkData = sparkline.map((d) => ({ v: parseInt(d.value, 10) }))

  return (
    <div className="flex flex-col items-center gap-2 w-full">

      {/* ── Gauge SVG ── */}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
        {/* Background track */}
        <path
          d={arcPath(cx, cy, r, -180, 0)}
          fill="none"
          stroke="#111120"
          strokeWidth={trackW + 4}
          strokeLinecap="round"
        />
        {/* Dim colour-band segments */}
        {SEGMENTS.map((seg) => {
          const sa = -180 + (seg.from / 100) * 180
          const ea = -180 + (seg.to  / 100) * 180
          return (
            <path
              key={seg.from}
              d={arcPath(cx, cy, r, sa, ea)}
              fill="none"
              stroke={seg.color}
              strokeWidth={trackW}
              strokeLinecap="butt"
              opacity={0.25}
            />
          )
        })}
        {/* Active arc */}
        <path
          d={arcPath(cx, cy, r, -180, needleAngle)}
          fill="none"
          stroke={color}
          strokeWidth={trackW}
          strokeLinecap="round"
          opacity={0.9}
        />

        {/* Needle */}
        {(() => {
          const rad = (needleAngle * Math.PI) / 180
          const len = r * 0.78
          const nx  = cx + len * Math.cos(rad)
          const ny  = cy + len * Math.sin(rad)
          return (
            <>
              <line
                x1={cx} y1={cy} x2={nx} y2={ny}
                stroke="#c0c0d0"
                strokeWidth={2.5}
                strokeLinecap="round"
              />
              <circle cx={cx} cy={cy} r={7} fill="#1a1a2e" stroke="#c0c0d0" strokeWidth={2} />
            </>
          )
        })()}

        {/* Score number — centred in the arc area */}
        <text
          x={cx}
          y={scoreY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={56}
          fontWeight="bold"
          fontFamily="JetBrains Mono, monospace"
          fill={color}
        >
          {isLoading ? '–' : value}
        </text>

        {/* Zone edge labels */}
        <text
          x={cx - r - 6} y={cy + 2}
          textAnchor="end"
          dominantBaseline="middle"
          fontSize={11}
          fontFamily="monospace"
          fill="#3b82f6"
          opacity={0.7}
        >
          Fear
        </text>
        <text
          x={cx + r + 6} y={cy + 2}
          textAnchor="start"
          dominantBaseline="middle"
          fontSize={11}
          fontFamily="monospace"
          fill="#ef4444"
          opacity={0.7}
        >
          Greed
        </text>
      </svg>

      {/* ── Classification badge — outside SVG, no clipping ── */}
      <div
        className="px-4 py-1 rounded-full border text-sm font-bold font-mono tracking-wide"
        style={{ color, backgroundColor: bg, borderColor: `${color}40` }}
      >
        {isLoading ? 'Loading…' : classification}
      </div>

      {/* ── 30-day sparkline ── */}
      {sparkData.length > 0 && (
        <div className="w-full mt-1">
          <div className="text-[10px] text-[#555] uppercase tracking-widest mb-1.5 text-center font-mono">
            30-Day History
          </div>
          {/* Hard pixel height prevents Recharts width/height=-1 warning */}
          <div style={{ width: '100%', height: 56 }}>
            <ResponsiveContainer width="100%" height={56}>
              <AreaChart data={sparkData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                <defs>
                  <linearGradient id="fgGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={color} stopOpacity={0.35} />
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
