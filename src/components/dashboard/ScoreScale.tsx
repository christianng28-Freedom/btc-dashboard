'use client'

/**
 * Shared primitives for the conviction design language:
 * scores live on a 0–100 buy→sell axis, displayed as a position marker on a
 * green→amber→red gradient band. Used by the overview conviction panel and
 * the per-tab score cards so every score in the app reads the same way.
 */

const BAND_GRADIENT =
  'linear-gradient(to right, #16a34a 0%, #22c55e 15%, #86efac 30%, #f59e0b 50%, #f87171 72%, #ef4444 100%)'

// Zone boundaries from scoreLabel(): 15 / 35 / 65 / 85
const ZONE_TICKS = [15, 35, 65, 85]

export function BandScale({
  score,
  height = 8,
  ticks = ZONE_TICKS,
}: {
  score: number
  height?: number
  /** Zone boundary ticks — override for scales with different zones (e.g. Fear & Greed) */
  ticks?: number[]
}) {
  const clamped = Math.max(0, Math.min(100, score))
  return (
    <div className="relative w-full" style={{ height: height + 10 }}>
      <div
        className="absolute inset-x-0 rounded-full opacity-90"
        style={{ height, top: 5, background: BAND_GRADIENT }}
      />
      {ticks.map((t) => (
        <div
          key={t}
          className="absolute w-px bg-[#05070A] opacity-70"
          style={{ left: `${t}%`, height, top: 5 }}
        />
      ))}
      <div
        className="absolute rounded-full border-2 border-white bg-[#0d0d14] shadow-[0_0_6px_rgba(255,255,255,0.45)]"
        style={{
          width: height + 8,
          height: height + 8,
          top: 1,
          left: `calc(${clamped}% - ${(height + 8) / 2}px)`,
        }}
      />
    </div>
  )
}

export function LabelChip({ label, color, large = false }: { label: string; color: string; large?: boolean }) {
  return (
    <span
      className={`font-mono font-bold rounded ${large ? 'text-sm px-2.5 py-1' : 'text-[10px] px-2 py-0.5'}`}
      style={{ color, backgroundColor: `${color}1a`, border: `1px solid ${color}55` }}
    >
      {label.toUpperCase()}
    </span>
  )
}

/** Big score number + chip + full band with zone labels — the hero treatment */
export function ScoreHero({
  score,
  label,
  color,
  subtitle,
}: {
  score: number
  label: string
  color: string
  subtitle?: string
}) {
  return (
    <div>
      <div className="flex items-end gap-4 flex-wrap">
        <span className="text-6xl font-mono font-bold leading-none" style={{ color }}>
          {Math.round(score)}
        </span>
        <div className="pb-1">
          <LabelChip label={label} color={color} large />
        </div>
      </div>
      <div className="mt-4">
        <BandScale score={score} height={10} />
        <div className="flex justify-between text-[9px] font-mono uppercase tracking-widest text-[#555] mt-0.5">
          <span className="text-[#22c55e]">Strong Buy</span>
          <span>Neutral</span>
          <span className="text-[#ef4444]">Strong Sell</span>
        </div>
      </div>
      {subtitle && <div className="text-[10px] text-[#555] font-mono mt-3">{subtitle}</div>}
    </div>
  )
}

/** Compact breakdown row: indicator name, weight, position marker on band */
export function IndicatorRow({
  label,
  score,
  weight,
}: {
  label: string
  score: number
  weight: string
}) {
  const color = score > 65 ? '#ef4444' : score > 35 ? '#f59e0b' : '#22c55e'
  return (
    <div className="flex items-center gap-2.5 text-[11px] font-mono">
      <span className="text-[#888] w-32 shrink-0">{label}</span>
      <div className="flex-1">
        <BandScale score={score} height={5} />
      </div>
      <span className="w-7 text-right shrink-0 font-bold" style={{ color }}>
        {Math.round(score)}
      </span>
      <span className="text-[#555] w-8 text-right shrink-0">{weight}</span>
    </div>
  )
}
