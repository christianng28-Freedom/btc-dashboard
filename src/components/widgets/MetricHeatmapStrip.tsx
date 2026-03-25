'use client'

export interface MetricItem {
  label: string
  /** Formatted display string, e.g. "4.5%" */
  value: string
  /** Raw numeric value used for colour evaluation */
  rawValue?: number
  /** Direction arrow: positive = ▲ green, negative = ▼ red */
  change?: number
  /**
   * How to colour the card background:
   * - 'green-red'   : higher is good  (e.g. equity returns)
   * - 'red-green'   : lower is good   (e.g. VIX, CPI)
   * - 'neutral'     : no colour tint  (default)
   */
  colorScheme?: 'green-red' | 'red-green' | 'neutral'
  /**
   * Thresholds for background tint.
   * Values below `low` → first extreme, above `high` → second extreme.
   * Between → neutral.
   */
  thresholds?: { low: number; high: number }
  /** Small sub-label, e.g. the FRED series ID or source */
  sub?: string
}

interface Props {
  metrics: MetricItem[]
  className?: string
}

function tintClass(item: MetricItem): string {
  if (item.colorScheme === 'neutral' || !item.thresholds || item.rawValue == null) {
    return 'bg-[#0d0d14]'
  }
  const { low, high } = item.thresholds
  const v = item.rawValue
  if (item.colorScheme === 'green-red') {
    if (v >= high) return 'bg-[#0d2010]'   // strong green tint
    if (v >= low)  return 'bg-[#0a1a0c]'   // light green tint
    return 'bg-[#1a0d0d]'                   // red tint
  }
  // red-green: low value is good
  if (v <= low)  return 'bg-[#0d2010]'
  if (v <= high) return 'bg-[#0a1a0c]'
  return 'bg-[#1a0d0d]'
}

function arrowEl(change: number) {
  if (change > 0) return <span className="text-[#22c55e]">▲</span>
  if (change < 0) return <span className="text-[#ef4444]">▼</span>
  return <span className="text-[#555566]">—</span>
}

export function MetricHeatmapStrip({ metrics, className = '' }: Props) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {metrics.map((m) => (
        <div
          key={m.label}
          className={`${tintClass(m)} border border-[#1a1a2e] rounded-lg px-3 py-2 min-w-[90px] flex-1`}
        >
          <div className="text-[9px] font-mono text-[#555566] uppercase tracking-wider mb-1">
            {m.label}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-bold font-mono text-[#e0e0e0]">{m.value}</span>
            {m.change != null && (
              <span className="text-[10px]">{arrowEl(m.change)}</span>
            )}
          </div>
          {m.sub && (
            <div className="text-[8px] font-mono text-[#333344] mt-0.5">{m.sub}</div>
          )}
        </div>
      ))}
    </div>
  )
}
