'use client'
import { useHalving } from '@/hooks/useHalving'

const HALVING_HISTORY = [
  { halving: '1st', date: '2012-11-28', block: 210000, prePrice: '$12', peak: '$1,163', peakDate: '2013-11-30', daysToPeak: 367 },
  { halving: '2nd', date: '2016-07-09', block: 420000, prePrice: '$650', peak: '$19,783', peakDate: '2017-12-17', daysToPeak: 526 },
  { halving: '3rd', date: '2020-05-11', block: 630000, prePrice: '$8,572', peak: '$69,000', peakDate: '2021-11-10', daysToPeak: 548 },
  { halving: '4th', date: '2024-04-19', block: 840000, prePrice: '$63,500', peak: '?', peakDate: '?', daysToPeak: null },
]

function ProgressRing({ pct, size = 120 }: { pct: number; size?: number }) {
  const r = (size - 16) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  const cx = size / 2

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#1a1a2e" strokeWidth={8} />
      <circle
        cx={cx}
        cy={cx}
        r={r}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={8}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cx})`}
      />
      <text x={cx} y={cx - 6} textAnchor="middle" fontSize="18" fontWeight="bold" fontFamily="JetBrains Mono, monospace" fill="#e0e0e0">
        {pct.toFixed(1)}%
      </text>
      <text x={cx} y={cx + 12} textAnchor="middle" fontSize="9" fontFamily="monospace" fill="#666666">
        EPOCH
      </text>
    </svg>
  )
}

export function HalvingCountdown() {
  const { data, isLoading, isError } = useHalving()

  if (isLoading) {
    return (
      <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 space-y-4">
        <div className="text-[10px] text-[#666666] uppercase tracking-widest font-mono">Halving Countdown</div>
        <div className="flex items-center justify-center h-32 text-[#555566] text-sm font-mono">Loading block data…</div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5">
        <div className="text-[10px] text-[#666666] uppercase tracking-widest font-mono mb-2">Halving Countdown</div>
        <div className="text-xs text-[#ef4444] font-mono">Failed to load block data</div>
      </div>
    )
  }

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 space-y-4">
      <div className="text-[10px] text-[#666666] uppercase tracking-widest font-mono">Halving Countdown</div>

      {/* Top section */}
      <div className="flex items-center gap-6">
        <ProgressRing pct={data.epochProgressPct} size={120} />
        <div className="space-y-3 flex-1">
          <div>
            <div className="text-[10px] text-[#555566] font-mono uppercase tracking-widest">Current Block</div>
            <div className="text-lg font-bold font-mono text-[#e0e0e0]">{data.blockHeight.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#555566] font-mono uppercase tracking-widest">Blocks Until Halving</div>
            <div className="text-lg font-bold font-mono text-[#f59e0b]">{data.blocksRemaining.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#555566] font-mono uppercase tracking-widest">Estimated Date</div>
            <div className="text-sm font-bold font-mono text-[#3b82f6]">{data.estimatedNextHalvingDate}</div>
          </div>
        </div>
      </div>

      {/* Days stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#111120] rounded-lg p-3">
          <div className="text-[9px] text-[#555566] font-mono uppercase tracking-widest">Days Since Last</div>
          <div className="text-base font-bold font-mono text-[#22c55e]">{data.daysSinceLastHalving.toLocaleString()}</div>
        </div>
        <div className="bg-[#111120] rounded-lg p-3">
          <div className="text-[9px] text-[#555566] font-mono uppercase tracking-widest">Days To Next</div>
          <div className="text-base font-bold font-mono text-[#f59e0b]">~{data.daysToNextHalving.toLocaleString()}</div>
        </div>
      </div>

      {/* Historical table */}
      <div className="space-y-1">
        <div className="text-[10px] text-[#444455] font-mono uppercase tracking-widest">Historical Cycles</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] font-mono">
            <thead>
              <tr className="text-[#444455]">
                <th className="text-left py-1 pr-2">Event</th>
                <th className="text-left py-1 pr-2">Date</th>
                <th className="text-right py-1 pr-2">Price At</th>
                <th className="text-right py-1 pr-2">Cycle Peak</th>
                <th className="text-right py-1">Days</th>
              </tr>
            </thead>
            <tbody>
              {HALVING_HISTORY.map((h) => (
                <tr key={h.halving} className="border-t border-[#1a1a2e]">
                  <td className="py-1 pr-2 text-[#3b82f6]">{h.halving}</td>
                  <td className="py-1 pr-2 text-[#666666]">{h.date}</td>
                  <td className="py-1 pr-2 text-right text-[#e0e0e0]">{h.prePrice}</td>
                  <td className="py-1 pr-2 text-right text-[#22c55e]">{h.peak}</td>
                  <td className="py-1 text-right text-[#f59e0b]">
                    {h.daysToPeak !== null ? h.daysToPeak : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-[9px] text-[#333344] font-mono pt-1">
          avg days to peak: ~480 · next halving block: 1,050,000
        </div>
      </div>
    </div>
  )
}
