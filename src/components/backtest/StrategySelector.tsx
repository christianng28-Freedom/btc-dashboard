'use client'
import { STRATEGIES, type StrategyId } from '@/hooks/useBacktest'

interface Props {
  activeStrategy: StrategyId | null
  onSelect: (id: StrategyId) => void
}

/** Single-select: the backtest runs exactly one strategy at a time. */
export function StrategySelector({ activeStrategy, onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
      {STRATEGIES.map((s) => {
        const active = activeStrategy === s.id
        return (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-colors cursor-pointer text-left ${
              active
                ? 'bg-[#3b82f60d] border-[#3b82f655]'
                : 'bg-transparent border-[#1a1a2e] hover:bg-[#0d0d14]'
            }`}
          >
            <span
              className={`w-3 h-3 rounded-full border flex-shrink-0 ${
                active ? 'border-[#3b82f6] bg-[#3b82f6]' : 'border-[#444]'
              }`}
            />
            <span>
              <span className={`block text-sm font-medium ${active ? 'text-[#e0e0e0]' : 'text-[#999]'}`}>
                {s.name}
              </span>
              <span className="block text-xs text-[#555]">{s.description}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
