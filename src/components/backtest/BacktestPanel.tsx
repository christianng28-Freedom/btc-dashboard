'use client'
import { useState, useCallback } from 'react'
import { useBacktest, STRATEGIES, type StrategyId } from '@/hooks/useBacktest'
import { useExtendedHistory } from '@/hooks/useExtendedHistory'
import { StrategySelector } from './StrategySelector'
import { BacktestStats } from './BacktestStats'
import { TradeLog } from './TradeLog'
import { EquityCurve } from './EquityCurve'

interface Props {
  /** compact=true: designed for Dashboard Home sidebar */
  compact?: boolean
}

export function BacktestPanel({ compact = false }: Props) {
  const [activeStrategies, setActiveStrategies] = useState<Set<StrategyId>>(
    new Set(['ema21x55'])
  )
  const [showTradeLog, setShowTradeLog] = useState(false)

  const { candles, isLoading } = useExtendedHistory()
  const result = useBacktest(candles, activeStrategies)

  const toggleStrategy = useCallback((id: StrategyId) => {
    setActiveStrategies(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  return (
    <div className="space-y-4">
      {/* Strategy selector */}
      <div>
        <div className="text-xs uppercase tracking-widest text-[#666] mb-2">Strategies</div>
        <StrategySelector activeStrategies={activeStrategies} onToggle={toggleStrategy} />
      </div>

      {isLoading && (
        <div className="text-[#555] text-sm py-2">Loading historical data…</div>
      )}

      {!isLoading && activeStrategies.size === 0 && (
        <div className="text-[#555] text-sm py-2">Enable at least one strategy to run backtest.</div>
      )}

      {result && (
        <>
          {/* Stats */}
          <div>
            <div className="text-xs uppercase tracking-widest text-[#666] mb-2">Performance</div>
            <BacktestStats result={result} compact={compact} />
          </div>

          {/* Equity curve */}
          <div>
            <div className="text-xs uppercase tracking-widest text-[#666] mb-2">Equity Curve</div>
            <EquityCurve equity={result.equity} totalReturn={result.totalReturn} height={compact ? 100 : 140} />
          </div>

          {/* Trade log toggle */}
          <div>
            <button
              onClick={() => setShowTradeLog(x => !x)}
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
