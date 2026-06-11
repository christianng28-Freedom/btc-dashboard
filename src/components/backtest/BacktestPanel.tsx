'use client'
import { useState } from 'react'
import { useBacktest, PERIODS, type StrategyId, type BacktestPeriod } from '@/hooks/useBacktest'
import { useExtendedHistory } from '@/hooks/useExtendedHistory'
import { StrategySelector } from './StrategySelector'
import { BacktestStats } from './BacktestStats'
import { TradeLog } from './TradeLog'
import { EquityCurve } from './EquityCurve'

interface Props {
  /** compact=true: designed for Dashboard Home sidebar */
  compact?: boolean
}

function fmtDate(unix: number) {
  return new Date(unix * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function BacktestPanel({ compact = false }: Props) {
  const [strategy, setStrategy] = useState<StrategyId | null>('ema21x55')
  const [period, setPeriod] = useState<BacktestPeriod>('3y')
  const [showTradeLog, setShowTradeLog] = useState(false)

  const { candles, isLoading } = useExtendedHistory()
  const result = useBacktest(candles, strategy, period)

  return (
    <div className="space-y-4">
      {/* Strategy + period selectors */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
        <div className="flex-1">
          <div className="text-xs uppercase tracking-widest text-[#666] mb-2">Strategy</div>
          <StrategySelector
            activeStrategy={strategy}
            onSelect={(id) => setStrategy((cur) => (cur === id ? null : id))}
          />
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-[#666] mb-2">Period</div>
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`text-xs font-mono px-3 py-1.5 rounded border transition-colors ${
                  period === p.id
                    ? 'border-[#3b82f6] text-[#3b82f6] bg-[#3b82f610]'
                    : 'border-[#1a1a2e] text-[#666] hover:text-[#999]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="text-[#555] text-sm py-2">Loading historical data…</div>
      )}

      {!isLoading && !strategy && (
        <div className="text-[#555] text-sm py-2">Select a strategy to run the backtest.</div>
      )}

      {result && (
        <>
          {/* Window + assumptions — a backtest number without its window is noise */}
          <div className="text-[10px] font-mono text-[#555] flex items-center gap-2 flex-wrap">
            <span>
              {fmtDate(result.windowStart)} → {fmtDate(result.windowEnd)}
            </span>
            <span className="text-[#333]">·</span>
            <span>daily closes, long/flat, {(result.feeRate * 100).toFixed(1)}% fee per side</span>
            {result.carriedEntry && (
              <>
                <span className="text-[#333]">·</span>
                <span className="text-[#3b82f6]">entered long at window start (signal pre-dates window)</span>
              </>
            )}
          </div>

          {/* Stats */}
          <BacktestStats result={result} compact={compact} />

          {/* Equity curve vs buy & hold */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs uppercase tracking-widest text-[#666]">Equity — Strategy vs Buy &amp; Hold</div>
              <div className="flex items-center gap-3 text-[10px] font-mono">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 inline-block" style={{ background: result.totalReturn >= 0 ? '#22c55e' : '#ef4444' }} />
                  <span className="text-[#888]">Strategy</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 inline-block bg-[#8884d8]" />
                  <span className="text-[#888]">Buy &amp; Hold</span>
                </span>
              </div>
            </div>
            <EquityCurve
              equity={result.equity}
              buyHoldEquity={result.buyHoldEquity}
              totalReturn={result.totalReturn}
              logScale={period === 'all' || period === '5y'}
              height={compact ? 120 : 160}
            />
          </div>

          {/* Trade log toggle */}
          <div>
            <button
              onClick={() => setShowTradeLog((x) => !x)}
              className="text-xs text-[#3b82f6] hover:text-[#60a5fa] cursor-pointer flex items-center gap-1"
            >
              <span>{showTradeLog ? '▲' : '▼'}</span>
              {showTradeLog ? 'Hide' : 'Show'} Trade Log ({result.totalTrades} trades)
            </button>
            {showTradeLog && (
              <div className="mt-2">
                <TradeLog trades={result.trades} maxVisible={compact ? 20 : 50} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
