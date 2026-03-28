'use client'

interface GaugeChartProps {
  score: number // 0-100
  label: string
  color: string
  size?: number
  title?: string
  subtitle?: string
}

function scoreToAngle(score: number): number {
  // Map 0-100 to -180deg to 0deg (semicircle left to right)
  return -180 + (score / 100) * 180
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  }
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`
}

const GAUGE_SEGMENTS = [
  { from: 0, to: 15, color: '#22c55e' },
  { from: 15, to: 35, color: '#86efac' },
  { from: 35, to: 65, color: '#f59e0b' },
  { from: 65, to: 85, color: '#f87171' },
  { from: 85, to: 100, color: '#ef4444' },
]

export function GaugeChart({ score, label, color, size = 180, title, subtitle }: GaugeChartProps) {
  const cx = size / 2
  const cy = size * 0.6
  const r = size * 0.38
  const trackWidth = size * 0.09

  const clampedScore = Math.max(0, Math.min(100, score))
  const needleAngle = -180 + (clampedScore / 100) * 180

  return (
    <div className="flex flex-col items-center">
      {title && (
        <div className="text-[10px] text-[#888888] uppercase tracking-wider mb-1 font-mono">{title}</div>
      )}
      <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.65}`} style={{ overflow: 'visible' }}>
        {/* Background track */}
        <path
          d={arcPath(cx, cy, r, -180, 0)}
          fill="none"
          stroke="#1a1a2e"
          strokeWidth={trackWidth}
          strokeLinecap="round"
        />

        {/* Colored segments */}
        {GAUGE_SEGMENTS.map((seg) => {
          const startAngle = -180 + (seg.from / 100) * 180
          const endAngle = -180 + (seg.to / 100) * 180
          return (
            <path
              key={seg.from}
              d={arcPath(cx, cy, r, startAngle, endAngle)}
              fill="none"
              stroke={seg.color}
              strokeWidth={trackWidth}
              strokeLinecap="butt"
              opacity={0.35}
            />
          )
        })}

        {/* Active arc (from start to current score) */}
        <path
          d={arcPath(cx, cy, r, -180, needleAngle)}
          fill="none"
          stroke={color}
          strokeWidth={trackWidth}
          strokeLinecap="round"
        />

        {/* Needle */}
        {(() => {
          const needleRad = (needleAngle * Math.PI) / 180
          const needleLen = r * 0.85
          const nx = cx + needleLen * Math.cos(needleRad)
          const ny = cy + needleLen * Math.sin(needleRad)
          return (
            <>
              <line
                x1={cx}
                y1={cy}
                x2={nx}
                y2={ny}
                stroke="#e0e0e0"
                strokeWidth={1.5}
                strokeLinecap="round"
              />
              <circle cx={cx} cy={cy} r={size * 0.028} fill="#e0e0e0" />
            </>
          )
        })()}

        {/* Score label */}
        <text
          x={cx}
          y={cy - r * 0.18}
          textAnchor="middle"
          fontSize={size * 0.16}
          fontWeight="bold"
          fontFamily="JetBrains Mono, monospace"
          fill={color}
        >
          {Math.round(clampedScore)}
        </text>

        {/* Min / Max labels — sit right at the arc endpoints */}
        <text x={cx - r - 10} y={cy + 10} textAnchor="end" fontSize={size * 0.072} fill="#556677" fontFamily="monospace">
          BUY
        </text>
        <text x={cx + r + 10} y={cy + 10} textAnchor="start" fontSize={size * 0.072} fill="#556677" fontFamily="monospace">
          SELL
        </text>
      </svg>
      {/* Signal label — outside SVG so it has clean spacing */}
      <div className="text-[12px] font-mono font-semibold mt-1" style={{ color }}>{label}</div>
      {subtitle && (
        <div className="text-[10px] text-[#6666aa] font-mono mt-1 tracking-wide">{subtitle}</div>
      )}
    </div>
  )
}
