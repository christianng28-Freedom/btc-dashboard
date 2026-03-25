'use client'
import { STRATEGIES, type StrategyId } from '@/hooks/useBacktest'

interface Props {
  activeStrategies: Set<StrategyId>
  onToggle: (id: StrategyId) => void
}

export function StrategySelector({ activeStrategies, onToggle }: Props) {
  return (
    <div className="space-y-2">
      {STRATEGIES.map(s => {
        const active = activeStrategies.has(s.id)
        return (
          <button
            key={s.id}
            onClick={() => onToggle(s.id)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors cursor-pointer text-left ${
              active
                ? 'bg-[#12121f] border-[#2a2a3e]'
                : 'bg-transparent border-transparent hover:bg-[#0d0d14]'
            }`}
          >
            <div>
              <div className="text-sm font-medium text-[#ddd]">{s.name}</div>
              <div className="text-xs text-[#555]">{s.description}</div>
            </div>
            {/* Toggle switch */}
            <div
              className={`w-9 h-5 rounded-full relative flex-shrink-0 transition-colors ${
                active ? 'bg-[#3b82f6]' : 'bg-[#2a2a3e]'
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  active ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </div>
          </button>
        )
      })}
    </div>
  )
}
