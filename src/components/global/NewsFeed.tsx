'use client'

import { useQuery } from '@tanstack/react-query'
import type { NewsItem } from '@/app/api/news/route'

interface NewsResponse {
  items: NewsItem[]
  source: string
}

const SENTIMENT: Record<NewsItem['sentiment'], { color: string; dot: string }> = {
  positive: { color: '#22c55e', dot: '#22c55e' },
  negative: { color: '#ef4444', dot: '#ef4444' },
  neutral:  { color: '#555566', dot: '#333344' },
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)   return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

interface Props {
  maxItems?: number
  compact?: boolean   // single-line mode for dashboard embedding
  className?: string
}

export function NewsFeed({ maxItems = 8, compact = false, className = '' }: Props) {
  const { data, isLoading, isError } = useQuery<NewsResponse>({
    queryKey: ['btc-news'],
    queryFn: () => fetch('/api/news').then((r) => r.json()),
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
  })

  const items = (data?.items ?? []).slice(0, maxItems)

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[9px] font-mono text-[#555566] uppercase tracking-wider">
          BTC Headlines
        </span>
        <span className="text-[8px] font-mono text-[#333344]">RSS · 5m</span>
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className={compact ? 'space-y-1' : 'space-y-2'}>
          {Array.from({ length: compact ? 5 : 4 }).map((_, i) => (
            <div key={i} className={`${compact ? 'h-7' : 'h-10'} rounded bg-[#111120] animate-pulse`} />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-[10px] font-mono text-[#ef4444] py-2">Failed to load news</p>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <p className="text-[10px] font-mono text-[#444455] py-2">No headlines available</p>
      )}

      {/* Compact mode — single row per item, no subtitle */}
      {compact && (
        <div className="space-y-px">
          {items.map((item) => {
            const s = SENTIMENT[item.sentiment]
            return (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded hover:bg-[#0f0f1a] transition-colors group"
              >
                {/* Sentiment dot */}
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: s.dot }}
                />
                {/* Headline — single line truncate */}
                <span
                  className="flex-1 text-[10px] text-[#9090a0] group-hover:text-[#c0c0d0] transition-colors truncate"
                >
                  {item.title}
                </span>
                {/* Source + time — right-aligned */}
                <span className="text-[8px] font-mono text-[#3a3a4a] shrink-0 whitespace-nowrap">
                  {item.source} · {timeAgo(item.publishedAt)}
                </span>
              </a>
            )
          })}
        </div>
      )}

      {/* Full mode — two-line card style */}
      {!compact && (
        <div className="space-y-1">
          {items.map((item) => {
            const s = SENTIMENT[item.sentiment]
            return (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2.5 px-3 py-2 rounded-lg border border-[#1a1a2e] bg-[#0d0d14] hover:border-[#2a2a3e] hover:bg-[#0f0f1a] transition-colors group"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0 mt-1"
                  style={{ backgroundColor: s.dot }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-[#b0b0c0] group-hover:text-[#d0d0e0] transition-colors leading-snug line-clamp-2">
                    {item.title}
                  </p>
                  <p className="text-[8px] font-mono text-[#444455] mt-1">
                    {item.source} · {timeAgo(item.publishedAt)}
                  </p>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
