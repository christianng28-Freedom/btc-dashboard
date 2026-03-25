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
  const { totalReturn, finalEquity, winRate, totalTrades, avgWin, avgLoss, profitFactor, maxDrawdown, buyHoldReturn, isInPosition } = result

  const retColor = totalReturn >= 0 ? '#22c55e' : '#ef4444'
  const vrBH = totalReturn > buyHoldReturn

  const fmt = (v: number, dec = 2) => v.toFixed(dec)
  const fmtMoney = (v: number) => '$' + v.toLocaleString('en-US', { maximumFractionDigits: 0 })

  return (
    <div className="space-y-3">
      <div className={`grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
        <StatCard label="Total Return" value={`${totalReturn >= 0 ? '+' : ''}${fmt(totalReturn)}%`} color={retColor} />
        <StatCard label="Final Equity" value={fmtMoney(finalEquity)} color={retColor} />
        <StatCard label="Win Rate" value={`${fmt(winRate, 1)}%`} color={winRate >= 50 ? '#22c55e' : '#ef4444'} />
        <StatCard label="Total Trades" value={String(totalTrades)} />
        {!compact && (
          <>
            <StatCard label="Avg Win" value={`+${fmt(avgWin)}%`} color="#22c55e" />
            <StatCard label="Avg Loss" value={`-${fmt(avgLoss)}%`} color="#ef4444" />
            <StatCard label="Profit Factor" value={profitFactor === Infinity ? '∞' : fmt(profitFactor)} color={profitFactor >= 1 ? '#22c55e' : '#ef4444'} />
            <StatCard label="Max Drawdown" value={`-${fmt(maxDrawdown)}%`} color="#ef4444" />
          </>
        )}
      </div>

      {/* Buy & Hold comparison */}
      <div className="flex items-center justify-between bg-[#0a0a0f] rounded-lg px-3 py-2.5">
        <div>
          <div className="text-[#666] text-xs mb-0.5">Buy & Hold Return</div>
          <div className={`font-mono font-semibold text-sm ${buyHoldReturn >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
            {buyHoldReturn >= 0 ? '+' : ''}{fmt(buyHoldReturn)}%
          </div>
        </div>
        <div className={`text-xs font-medium px-2 py-1 rounded border ${vrBH ? 'border-[#22c55e] text-[#22c55e] bg-[#22c55e10]' : 'border-[#ef4444] text-[#ef4444] bg-[#ef444410]'}`}>
          {vrBH ? 'Outperforms B&H' : 'Underperforms B&H'}
        </div>
      </div>

      {isInPosition && (
        <div className="bg-[#3b82f610] border border-[#3b82f630] rounded-lg px-3 py-2 text-xs text-[#3b82f6]">
          Currently in position — open trade not included in stats
        </div>
      )}
    </div>
  )
}
