'use client'
import { useDominance } from '@/hooks/useDominance'

export function BTCDominanceChart() {
  const { data, isLoading, isError } = useDominance()

  const dominanceColor =
    !data ? '#999'
    : data.dominance > 55 ? '#22c55e'
    : data.dominance > 45 ? '#f59e0b'
    : '#ef4444'

  const interpretation =
    !data ? '—'
    : data.dominance > 55 ? 'High dominance — BTC cycle phase'
    : data.dominance > 45 ? 'Mid range — mixed market phase'
    : 'Low dominance — alt season / late cycle signal'

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 space-y-4">
      <div className="text-[10px] text-[#666666] uppercase tracking-widest font-mono">BTC Dominance</div>

      {isLoading ? (
        <div className="flex items-center justify-center h-24 text-[#555566] text-sm font-mono">Loading…</div>
      ) : isError || !data ? (
        <div className="text-xs text-[#ef4444] font-mono">Failed to load dominance data</div>
      ) : (
        <>
          {/* Large number display */}
          <div className="flex items-end gap-3">
            <div className="text-4xl font-bold font-mono" style={{ color: dominanceColor }}>
              {data.dominance.toFixed(1)}%
            </div>
            <div className="text-sm font-mono text-[#555566] pb-1">BTC dominance</div>
          </div>

          {/* Horizontal bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] font-mono text-[#444455]">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
            <div className="h-2 rounded-full bg-[#1a1a2e] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${data.dominance}%`, backgroundColor: dominanceColor }}
              />
            </div>
          </div>

          {/* Interpretation */}
          <div className="text-xs font-mono" style={{ color: dominanceColor }}>
            {interpretation}
          </div>

          {/* Zone reference */}
          <div className="grid grid-cols-3 gap-2 text-[9px] font-mono">
            <div className="bg-[#111120] rounded p-2">
              <div className="text-[#22c55e] font-bold">&gt; 55%</div>
              <div className="text-[#444455]">BTC Phase</div>
            </div>
            <div className="bg-[#111120] rounded p-2">
              <div className="text-[#f59e0b] font-bold">45–55%</div>
              <div className="text-[#444455]">Mixed</div>
            </div>
            <div className="bg-[#111120] rounded p-2">
              <div className="text-[#ef4444] font-bold">&lt; 45%</div>
              <div className="text-[#444455]">Alt Season</div>
            </div>
          </div>

          <div className="text-[9px] font-mono text-[#333344]">
            Source: CoinGecko · Total market cap: ${(data.totalMarketCap / 1e12).toFixed(2)}T
          </div>
        </>
      )}
    </div>
  )
}
