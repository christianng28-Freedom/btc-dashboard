'use client'
import type { BacktestResult } from '@/hooks/useBacktest'

interface Props {
  result: BacktestResult
  compact?: boolean
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-[#0a0a0f] rounded-lg px-3 py-2.5">
      <div className="text-[#666] text-xs mb-1">{label}</div>
      <div className="font-mono font-semibold text-sm" style={{ color: color ?? '#e0e0e0' }}>{value}</div>
    </div>
  )
}

export function BacktestStats({ result, compact = false }: Props) {
  const {
    totalReturn, finalEquity, cagr, winRate, totalTrades, avgWin, avgLoss,
    profitFactor, maxDrawdown, buyHoldReturn, buyHoldCagr, isInPosition,
  } = result

  const retColor = totalReturn >= 0 ? '#22c55e' : '#ef4444'
  const vsBH = cagr > buyHoldCagr
  const fmt = (v: number, dec = 2) => v.toFixed(dec)
  const fmtMoney = (v: number) => '$' + v.toLocaleString('en-US', { maximumFractionDigits: 0 })

  return (
    <div className="space-y-3">
      {/* Headline: the annualised comparison — the only fair way to compare windows */}
      <div className="flex items-stretch gap-2 flex-wrap">
        <div className="flex-1 min-w-[140px] bg-[#0a0a0f] rounded-lg px-3 py-2.5">
          <div className="text-[#666] text-xs mb-0.5">Strategy CAGR</div>
          <div className="font-mono font-bold text-xl" style={{ color: retColor }}>
            {cagr >= 0 ? '+' : ''}{fmt(cagr, 1)}%<span className="text-xs text-[#555] font-normal"> /yr</span>
          </div>
        </div>
        <div className="flex-1 min-w-[140px] bg-[#0a0a0f] rounded-lg px-3 py-2.5">
          <div className="text-[#666] text-xs mb-0.5">Buy &amp; Hold CAGR</div>
          <div className={`font-mono font-bold text-xl ${buyHoldCagr >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
            {buyHoldCagr >= 0 ? '+' : ''}{fmt(buyHoldCagr, 1)}%<span className="text-xs text-[#555] font-normal"> /yr</span>
          </div>
        </div>
        <div className="flex items-center">
          <span
            className={`text-xs font-medium px-2.5 py-1.5 rounded border ${
              vsBH
                ? 'border-[#22c55e] text-[#22c55e] bg-[#22c55e10]'
                : 'border-[#ef4444] text-[#ef4444] bg-[#ef444410]'
            }`}
          >
            {vsBH ? 'Beats B&H' : 'Loses to B&H'}
          </span>
        </div>
      </div>

      <div className={`grid gap-2 ${compact ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-4'}`}>
        <StatCard label="Total Return" value={`${totalReturn >= 0 ? '+' : ''}${fmt(totalReturn, 1)}%`} color={retColor} />
        <StatCard label="Final Equity ($10k start)" value={fmtMoney(finalEquity)} color={retColor} />
        <StatCard label="Max Drawdown" value={`-${fmt(maxDrawdown, 1)}%`} color="#ef4444" />
        <StatCard label="Trades" value={String(totalTrades)} />
        {!compact && (
          <>
            <StatCard label="Win Rate" value={`${fmt(winRate, 1)}%`} />
            <StatCard label="Avg Win" value={`+${fmt(avgWin, 1)}%`} color="#22c55e" />
            <StatCard label="Avg Loss" value={`-${fmt(avgLoss, 1)}%`} color="#ef4444" />
            <StatCard
              label="Profit Factor"
              value={profitFactor === Infinity ? '∞' : fmt(profitFactor)}
              color={profitFactor >= 1 ? '#22c55e' : '#ef4444'}
            />
          </>
        )}
      </div>

      {isInPosition && (
        <div className="bg-[#3b82f610] border border-[#3b82f630] rounded-lg px-3 py-2 text-xs text-[#3b82f6]">
          Open position — marked to market in return/equity, excluded from trade stats
        </div>
      )}
    </div>
  )
}
