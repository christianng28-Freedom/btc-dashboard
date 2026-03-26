'use client'

import { useQuery } from '@tanstack/react-query'

interface CalendarEvent {
  date: string
  event: string
  period: string
  category: string
  description: string
  source?: string
}

interface CalendarResponse {
  events: CalendarEvent[]
  source: 'finnhub' | 'static'
  refreshedAt: string | null
}

const CATEGORY_META: Record<string, { color: string; bg: string; border: string; label: string }> = {
  fomc:       { color: '#a78bfa', bg: '#1a1030', border: '#a78bfa30', label: 'FOMC'      },
  inflation:  { color: '#fb923c', bg: '#1a0f00', border: '#fb923c30', label: 'INFLATION' },
  employment: { color: '#38bdf8', bg: '#001a1f', border: '#38bdf830', label: 'NFP'       },
}

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr: string): { month: string; day: string } {
  const d = new Date(dateStr)
  return {
    month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day:   d.toLocaleDateString('en-US', { day: 'numeric' }),
  }
}

interface Props {
  maxItems?: number
  className?: string
}

export function MacroCalendar({ maxItems = 8, className = '' }: Props) {
  const { data, isLoading } = useQuery<CalendarResponse>({
    queryKey: ['macro-calendar'],
    queryFn: () => fetch('/api/calendar').then((r) => r.json()),
    staleTime: 1000 * 60 * 60 * 24 * 7,
    gcTime:    1000 * 60 * 60 * 24 * 7,
  })

  const events = (data?.events ?? []).slice(0, maxItems)

  return (
    <div className={`bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="text-[9px] font-mono font-semibold uppercase tracking-[0.15em] text-[#444455]">
            Macro Calendar
          </div>
          <div className="w-px h-3 bg-[#1a1a2e]" />
          <div className="flex items-center gap-1.5">
            {Object.values(CATEGORY_META).map((m) => (
              <span
                key={m.label}
                className="text-[7px] font-mono font-bold px-1.5 py-0.5 rounded"
                style={{ color: m.color, backgroundColor: m.bg }}
              >
                {m.label}
              </span>
            ))}
          </div>
        </div>
        {data && (
          <div className="text-[8px] font-mono text-[#333344]">
            {data.source === 'finnhub' ? 'Finnhub · weekly' : 'static · 2026'}
          </div>
        )}
      </div>

      {/* Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[60px] rounded-lg bg-[#111120] animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && events.length === 0 && (
        <div className="text-[10px] font-mono text-[#444455] py-4 text-center">
          No upcoming events
        </div>
      )}

      {/* Events grid */}
      {events.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {events.map((e) => {
            const days    = daysUntil(e.date)
            const cat     = CATEGORY_META[e.category] ?? { color: '#888899', bg: '#111122', border: '#33334440', label: e.category.toUpperCase() }
            const isToday = days === 0
            const isSoon  = days > 0 && days <= 7

            const { month, day } = formatDate(e.date)

            return (
              <div
                key={`${e.date}-${e.event}`}
                className="flex items-stretch gap-0 rounded-lg border overflow-hidden transition-colors hover:border-[#2a2a3e]"
                style={{ borderColor: isToday ? cat.color + '60' : '#1a1a2e', backgroundColor: '#080810' }}
              >
                {/* Left: date column with accent */}
                <div
                  className="w-14 shrink-0 flex flex-col items-center justify-center py-3 gap-0.5"
                  style={{ backgroundColor: cat.bg, borderRight: `1px solid ${cat.border}` }}
                >
                  <div className="text-[8px] font-mono font-bold uppercase" style={{ color: cat.color }}>
                    {month}
                  </div>
                  <div className="text-lg font-black font-mono leading-none" style={{ color: cat.color }}>
                    {day}
                  </div>
                  <div
                    className="text-[8px] font-mono mt-0.5"
                    style={{ color: isToday ? '#f59e0b' : isSoon ? '#60a5fa' : '#555566' }}
                  >
                    {isToday ? 'TODAY' : `${days}d`}
                  </div>
                </div>

                {/* Right: event info */}
                <div className="flex-1 min-w-0 px-3 py-2.5 flex flex-col justify-center gap-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className="text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded"
                      style={{ color: cat.color, backgroundColor: cat.bg }}
                    >
                      {e.event}
                    </span>
                    <span className="text-[9px] font-mono text-[#666677]">{e.period}</span>
                    {isSoon && !isToday && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: '#3b82f6' }} />
                    )}
                    {isToday && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: '#f59e0b' }} />
                    )}
                  </div>
                  <div className="text-[9px] font-mono text-[#555566] leading-snug">{e.description}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
