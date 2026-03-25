'use client'

interface Props {
  currentFundingRate: number    // raw, e.g. 0.0001
  annualisedFundingRate: number // in %, e.g. 10.95
  nextFundingTime: number       // ms timestamp
  isLoading?: boolean
}

function formatFundingRate(rate: number): string {
  return (rate * 100).toFixed(4) + '%'
}

function getRateColor(rate: number): string {
  if (rate < -0.0001) return '#3b82f6'  // negative → blue (shorts paying)
  if (rate < 0.0001)  return '#f59e0b'  // near zero → amber (neutral)
  if (rate < 0.0003)  return '#22c55e'  // mild positive → green (slight leverage)
  if (rate < 0.0005)  return '#f97316'  // elevated → orange (heated)
  return '#ef4444'                       // extreme → red (overheated)
}

function getRateLabel(rate: number): string {
  if (rate < -0.0001) return 'Shorts paying longs'
  if (rate < 0.0001)  return 'Near neutral'
  if (rate < 0.0003)  return 'Mild positive'
  if (rate < 0.0005)  return 'Elevated'
  return 'Overheated'
}

export function FundingRateCard({ currentFundingRate, annualisedFundingRate, nextFundingTime, isLoading }: Props) {
  const color = getRateColor(currentFundingRate)
  const label = getRateLabel(currentFundingRate)

  const nextFundingDate = new Date(nextFundingTime)
  const nowMs = Date.now()
  const minsUntil = Math.max(0, Math.round((nextFundingTime - nowMs) / 60_000))
  const hoursUntil = Math.floor(minsUntil / 60)
  const minsRemainder = minsUntil % 60
  const countdown = hoursUntil > 0 ? `${hoursUntil}h ${minsRemainder}m` : `${minsUntil}m`

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-5 space-y-4">
      <div className="text-xs uppercase tracking-widest text-[#666] font-mono">Funding Rate</div>

      {isLoading ? (
        <div className="text-[#555] text-sm">Loading…</div>
      ) : (
        <>
          {/* Current rate */}
          <div className="flex items-end gap-3">
            <div>
              <div className="text-3xl font-bold font-mono" style={{ color }}>
                {formatFundingRate(currentFundingRate)}
              </div>
              <div className="text-xs font-mono mt-0.5" style={{ color }}>
                {label}
              </div>
            </div>
            <div className="text-right ml-auto pb-0.5">
              <div className="text-[#999] text-xs font-mono">per 8h</div>
              <div className="text-[#666] text-xs font-mono">Next: {countdown}</div>
            </div>
          </div>

          {/* Annualised */}
          <div className="flex items-center gap-2">
            <div className="text-[#666] text-xs font-mono">Annualised</div>
            <div className="text-sm font-mono font-semibold" style={{ color }}>
              {annualisedFundingRate >= 0 ? '+' : ''}{annualisedFundingRate.toFixed(1)}%
            </div>
          </div>

          {/* Rate bar */}
          <div className="space-y-1">
            <div className="h-1.5 w-full bg-[#1a1a2e] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, Math.max(0, (currentFundingRate / 0.001) * 100))}%`,
                  backgroundColor: color,
                }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-[#333] font-mono">
              <span>-0.10%</span>
              <span>0%</span>
              <span>+0.10%</span>
            </div>
          </div>

          {/* Overheated warning */}
          {currentFundingRate >= 0.0005 && (
            <div className="flex items-center gap-2 bg-[#ef444415] border border-[#ef444430] rounded px-3 py-2">
              <span className="text-[#ef4444] text-sm">▲</span>
              <span className="text-[#ef4444] text-xs font-mono">Elevated leverage detected — funding rate extreme</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
