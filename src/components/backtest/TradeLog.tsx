'use client'
import { useState } from 'react'
import type { Trade } from '@/hooks/useBacktest'

interface Props {
  trades: Trade[]
  maxVisible?: number
}

function fmtDate(unix: number) {
  return new Date(unix * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

export function TradeLog({ trades, maxVisible = 50 }: Props) {
  const [expanded, setExpanded] = useState(false)

  if (trades.length === 0) {
    return <div className="text-[#555] text-sm py-2">No closed trades yet.</div>
  }

  const displayed = expanded ? trades.slice().reverse() : trades.slice(-maxVisible).reverse()

  return (
    <div>
      <div className="space-y-0.5 max-h-72 overflow-y-auto pr-1">
        {displayed.map((t, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-[#111122] hover:bg-[#0d0d14] px-1 rounded transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-[#22c55e] text-xs font-mono">BUY</span>
              <span className="text-[#555] text-xs">{fmtDate(t.entryTime)}</span>
              <span className="text-[#333] text-xs">→</span>
              <span className="text-[#ef4444] text-xs font-mono">SELL</span>
              <span className="text-[#555] text-xs">{fmtDate(t.exitTime)}</span>
            </div>
            <div className="text-right">
              <div className={`font-mono text-sm font-medium ${t.pnl >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                {t.pnl >= 0 ? '+' : ''}{t.pnl.toFixed(1)}%
              </div>
              <div className="text-[#444] text-xs">
                ${t.entryPrice.toFixed(0)} → ${t.exitPrice.toFixed(0)}
              </div>
            </div>
          </div>
        ))}
      </div>
      {trades.length > maxVisible && (
        <button
          onClick={() => setExpanded(x => !x)}
          className="mt-2 text-xs text-[#3b82f6] hover:text-[#60a5fa] cursor-pointer"
        >
          {expanded ? `Show fewer` : `Show all ${trades.length} trades`}
        </button>
      )}
    </div>
  )
}
