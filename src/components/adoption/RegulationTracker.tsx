'use client'

import { useState, useMemo } from 'react'

export interface RegulationEvent {
  id: string
  date: string
  country: string
  region: string
  title: string
  description: string
  sentiment: 'bullish' | 'bearish' | 'neutral'
  category: string
  source: string
}

interface Props {
  events: RegulationEvent[]
}

const REGIONS = ['All', 'Americas', 'Europe', 'Asia-Pacific', 'Middle East & Africa', 'Global']
const SENTIMENTS = ['All', 'Bullish', 'Bearish', 'Neutral']

const SENTIMENT_STYLES: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  bullish: { color: '#22c55e', bg: '#0a1f0e', border: '#1a4d24', dot: '#22c55e' },
  bearish: { color: '#ef4444', bg: '#1f0a0a', border: '#4d1a1a', dot: '#ef4444' },
  neutral: { color: '#f59e0b', bg: '#1f1600', border: '#4d3800', dot: '#f59e0b' },
}

const CATEGORY_COLORS: Record<string, string> = {
  ETF: '#a78bfa',
  'Legal Tender': '#f59e0b',
  Mining: '#38bdf8',
  Tax: '#fb923c',
  Ban: '#ef4444',
  Framework: '#64748b',
  Exchange: '#22d3ee',
  DeFi: '#e879f9',
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
}

export function RegulationTracker({ events }: Props) {
  const [regionFilter, setRegionFilter] = useState('All')
  const [sentimentFilter, setSentimentFilter] = useState('All')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return events
      .filter((e) => regionFilter === 'All' || e.region === regionFilter)
      .filter((e) => sentimentFilter === 'All' || e.sentiment === sentimentFilter.toLowerCase())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [events, regionFilter, sentimentFilter])

  const counts = useMemo(() => {
    const base = regionFilter === 'All' ? events : events.filter((e) => e.region === regionFilter)
    return {
      bullish: base.filter((e) => e.sentiment === 'bullish').length,
      bearish: base.filter((e) => e.sentiment === 'bearish').length,
      neutral: base.filter((e) => e.sentiment === 'neutral').length,
    }
  }, [events, regionFilter])

  return (
    <div>
      {/* Sentiment summary strip */}
      <div className="flex items-center gap-4 mb-5">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
          <span className="text-[11px] font-mono text-[#22c55e]">{counts.bullish} Bullish</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
          <span className="text-[11px] font-mono text-[#ef4444]">{counts.bearish} Bearish</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
          <span className="text-[11px] font-mono text-[#f59e0b]">{counts.neutral} Neutral</span>
        </div>
        <span className="ml-auto text-[9px] font-mono text-[#444455] uppercase tracking-wider">
          {filtered.length} event{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Region filter */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {REGIONS.map((r) => (
          <button
            key={r}
            onClick={() => setRegionFilter(r)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wide transition-all border ${
              regionFilter === r
                ? 'bg-[#00A3FF20] border-[#00A3FF55] text-[#00A3FF]'
                : 'bg-transparent border-[#1a1a2e] text-[#555566] hover:border-[#2a2a3e] hover:text-[#999]'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Sentiment filter */}
      <div className="flex gap-1.5 mb-6">
        {SENTIMENTS.map((s) => {
          const lower = s.toLowerCase() as keyof typeof SENTIMENT_STYLES
          const style = lower !== 'all' ? SENTIMENT_STYLES[lower] : null
          const isActive = sentimentFilter === s
          return (
            <button
              key={s}
              onClick={() => setSentimentFilter(s)}
              className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wide transition-all border"
              style={
                isActive && style
                  ? { backgroundColor: style.bg, borderColor: style.border, color: style.color }
                  : isActive
                  ? { backgroundColor: '#ffffff10', borderColor: '#ffffff25', color: '#e0e0e0' }
                  : { backgroundColor: 'transparent', borderColor: '#1a1a2e', color: '#555566' }
              }
            >
              {s}
            </button>
          )
        })}
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="text-[11px] font-mono text-[#444455] py-6 text-center">No events match current filters</div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[72px] top-0 bottom-0 w-px bg-[#1a1a2e]" />

          <div className="space-y-0">
            {filtered.map((event, idx) => {
              const style = SENTIMENT_STYLES[event.sentiment]
              const isExpanded = expandedId === event.id
              const isLast = idx === filtered.length - 1

              return (
                <div key={event.id} className="relative flex gap-0">
                  {/* Date column */}
                  <div className="w-[72px] flex-shrink-0 pt-3 pr-4 text-right">
                    <span className="text-[9px] font-mono text-[#444455] leading-tight whitespace-nowrap">
                      {formatShortDate(event.date)}
                    </span>
                  </div>

                  {/* Dot on timeline */}
                  <div className="flex-shrink-0 relative flex items-start pt-[14px]">
                    <div
                      className="w-2.5 h-2.5 rounded-full border-2 z-10 relative -ml-[5px]"
                      style={{ backgroundColor: style.bg, borderColor: style.dot }}
                    />
                  </div>

                  {/* Card */}
                  <div className={`flex-1 ml-4 ${isLast ? 'pb-0' : 'pb-3'}`}>
                    <div
                      className="rounded-lg border transition-all cursor-pointer"
                      style={{ backgroundColor: '#0d0d14', borderColor: isExpanded ? style.border : '#1a1a2e' }}
                      onClick={() => setExpandedId(isExpanded ? null : event.id)}
                    >
                      <div className="px-4 py-3">
                        {/* Top row: sentiment + category + date */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span
                            className="px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider font-semibold"
                            style={{ backgroundColor: style.bg, color: style.color, border: `1px solid ${style.border}` }}
                          >
                            {event.sentiment}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider"
                            style={{
                              backgroundColor: `${CATEGORY_COLORS[event.category] ?? '#64748b'}18`,
                              color: CATEGORY_COLORS[event.category] ?? '#64748b',
                              border: `1px solid ${CATEGORY_COLORS[event.category] ?? '#64748b'}30`,
                            }}
                          >
                            {event.category}
                          </span>
                          <span className="ml-auto text-[9px] font-mono text-[#333344]">
                            {formatDate(event.date)}
                          </span>
                        </div>

                        {/* Title */}
                        <div className="text-[13px] font-semibold text-[#e0e0e0] leading-snug mb-1">
                          {event.title}
                        </div>

                        {/* Country / region */}
                        <div className="text-[10px] font-mono text-[#555566]">
                          {event.country} · {event.region}
                        </div>

                        {/* Expand/collapse description */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-[#1a1a2e]">
                            <p className="text-[12px] text-[#999] leading-relaxed">{event.description}</p>
                            <div className="mt-2 text-[9px] font-mono text-[#333344]">
                              Source: {event.source}
                            </div>
                          </div>
                        )}

                        {/* Expand indicator */}
                        <div className="mt-1.5 flex items-center gap-1 text-[9px] font-mono text-[#333344]">
                          <svg
                            className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          {isExpanded ? 'collapse' : 'expand'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
