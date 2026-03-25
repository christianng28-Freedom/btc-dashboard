'use client'

import calendarData from '@/data/macro-calendar.json'

interface CalendarEvent {
  date: string
  event: string
  period: string
  category: string
  description: string
}

const CATEGORY_COLORS: Record<string, { color: string; bg: string }> = {
  fomc:       { color: '#a78bfa', bg: '#1a1030' },
  inflation:  { color: '#fb923c', bg: '#1a0f00' },
  employment: { color: '#38bdf8', bg: '#001a1f' },
}

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface Props {
  maxItems?: number
  className?: string
}

export function MacroCalendar({ maxItems = 6, className = '' }: Props) {
  const events = (calendarData as CalendarEvent[])
    .filter((e) => daysUntil(e.date) >= 0)
    .slice(0, maxItems)

  return (
    <div className={className}>
      <div className="text-[9px] font-mono text-[#555566] uppercase tracking-wider mb-3">
        Macro Calendar
      </div>
      <div className="space-y-1.5">
        {events.map((e) => {
          const days = daysUntil(e.date)
          const cat = CATEGORY_COLORS[e.category] ?? { color: '#888899', bg: '#111122' }
          const isToday = days === 0
          const isThisWeek = days > 0 && days <= 7

          return (
            <div
              key={`${e.date}-${e.event}`}
              className="flex items-center gap-3 px-3 py-2 rounded-lg border border-[#1a1a2e] bg-[#0d0d14] hover:border-[#2a2a3e] transition-colors"
            >
              {/* Date column */}
              <div className="w-14 shrink-0 text-center">
                <div className="text-[10px] font-mono font-bold text-[#a0a0b0]">
                  {formatDate(e.date)}
                </div>
                <div
                  className="text-[9px] font-mono"
                  style={{ color: isToday ? '#f59e0b' : isThisWeek ? '#60a5fa' : '#555566' }}
                >
                  {isToday ? 'Today' : isThisWeek ? `${days}d` : `${days}d`}
                </div>
              </div>

              {/* Divider */}
              <div className="w-px h-6 bg-[#1a1a2e] shrink-0" />

              {/* Event info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded"
                    style={{ color: cat.color, backgroundColor: cat.bg }}
                  >
                    {e.event}
                  </span>
                  <span className="text-[10px] font-mono text-[#666677] truncate">{e.period}</span>
                </div>
                <div className="text-[9px] text-[#444455] mt-0.5 truncate">{e.description}</div>
              </div>

              {/* Urgency dot */}
              {isThisWeek && (
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: isToday ? '#f59e0b' : '#3b82f6' }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
