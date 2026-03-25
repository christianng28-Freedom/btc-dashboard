'use client'

import { useState, useEffect } from 'react'
import { useMorningBriefing } from '@/hooks/useMorningBriefing'

// ── Inline markdown helpers ────────────────────────────────────────────────────

function renderInline(text: string, labelColor?: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className={`font-semibold ${labelColor ?? 'text-[#c8c8e0]'}`}>
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={i} className="text-[#9090b0] not-italic">
          {part.slice(1, -1)}
        </em>
      )
    }
    return part
  })
}

// Returns true if the bullet line is a standalone label (e.g. "- **Bitcoin (BTC):**")
function isLabelOnlyBullet(text: string): boolean {
  const trimmed = text.trim()
  return /^\*\*[^*]+\*\*:?\s*$/.test(trimmed)
}

function renderMarkdown(content: string): React.ReactNode {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let key = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('## ')) {
      elements.push(
        <div
          key={key++}
          className="flex items-center gap-2 mt-6 mb-3 first:mt-0"
        >
          <span className="text-[13px] font-bold text-[#d0d0f0] tracking-tight leading-none">
            {line.slice(3)}
          </span>
          <span className="flex-1 h-px bg-[#1e1e30]" />
        </div>,
      )
    } else if (line === '---') {
      // suppress horizontal rules — section headers handle visual separation
      void 0
    } else if (line.startsWith('  - ')) {
      // Indented sub-bullet: "  - **Label:** body text"
      const body = line.slice(4)
      elements.push(
        <div key={key++} className="flex gap-2 text-[11.5px] leading-relaxed mb-1.5 ml-5">
          <span className="text-[#3a3a55] shrink-0 select-none mt-[3px] text-[9px]">▸</span>
          <span className="text-[#7878a0]">{renderInline(body, 'text-[#a0a0cc]')}</span>
        </div>,
      )
    } else if (line.startsWith('- ')) {
      const body = line.slice(2)
      if (isLabelOnlyBullet(body)) {
        // Standalone topic label — render as a mini sub-heading
        elements.push(
          <div key={key++} className="flex items-center gap-2 mt-4 mb-1.5 first:mt-0">
            <span className="text-[11.5px] font-semibold text-[#b8b8e0]">
              {body.replace(/\*\*/g, '').replace(/:$/, '')}
            </span>
            <span className="flex-1 h-px bg-[#161624]" />
          </div>,
        )
      } else {
        // Bullet with inline content
        elements.push(
          <div key={key++} className="flex gap-2 text-[11.5px] text-[#888899] leading-relaxed mb-1.5">
            <span className="text-[#3a3a55] shrink-0 select-none mt-0.5">·</span>
            <span>{renderInline(body, 'text-[#a8a8c8]')}</span>
          </div>,
        )
      }
    } else if (line.startsWith('> ')) {
      elements.push(
        <div key={key++} className="border-l-2 border-[#3a3a5e] pl-4 my-3 bg-[#0c0c1a] py-2 rounded-r">
          <p className="text-[12px] italic text-[#8080a8] leading-relaxed">
            {renderInline(line.slice(2), 'text-[#a0a0c8]')}
          </p>
        </div>,
      )
    } else if (line.trim() === '') {
      if (i > 0 && lines[i - 1].trim() !== '') {
        elements.push(<div key={key++} className="h-1" />)
      }
    } else {
      // Plain paragraph — e.g. "Good morning!" intro or Stoic application
      elements.push(
        <p key={key++} className="text-[11px] text-[#666677] leading-relaxed mb-1 italic">
          {renderInline(line)}
        </p>,
      )
    }
  }

  return <>{elements}</>
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function parsePreviewLine(content: string): string {
  for (const line of content.split('\n')) {
    if (line.startsWith('- ') && line.length > 3) {
      // Strip markdown bold/italic for the plain preview
      return line
        .slice(2)
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .trim()
    }
  }
  return 'Morning briefing ready'
}

function formatHKTTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-US', {
    timeZone: 'Asia/Hong_Kong',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  className?: string
}

export function MorningBriefing({ className = '' }: Props) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const { data, isLoading, isError } = useMorningBriefing()
  const showLoading = mounted && isLoading

  const previewLine = mounted && data?.content ? parsePreviewLine(data.content) : null
  const timestamp = mounted && data?.generatedAt ? formatHKTTime(data.generatedAt) : null

  return (
    <div
      className={`rounded-xl border border-[#1a1a2e] bg-[#0a0a12] overflow-hidden ${className}`}
    >
      {/* ── Collapsed header — always visible ── */}
      <button
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#0d0d1a] transition-colors duration-150 group"
        aria-expanded={isExpanded}
      >
        {/* Left: label + preview */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#444455] shrink-0">
            Morning Brief
          </span>

          {showLoading && (
            <span className="flex items-center gap-2 text-[10px] text-[#444455]">
              <span className="w-3 h-3 rounded-full border border-[#333355] border-t-[#6666aa] animate-spin shrink-0" />
              Generating briefing…
            </span>
          )}

          {mounted && !isLoading && !isError && previewLine && (
            <span className="text-[10px] text-[#555566] truncate">
              {previewLine}
            </span>
          )}

          {mounted && isError && (
            <span className="text-[10px] text-[#ef4444] font-mono">
              Failed to load briefing
            </span>
          )}
        </div>

        {/* Right: timestamp + source dot + chevron */}
        <div className="flex items-center gap-3 shrink-0 ml-3">
          {timestamp && (
            <span className="text-[8px] font-mono text-[#333344] hidden sm:block">
              {timestamp} HKT
            </span>
          )}

          {/* Status dot */}
          {mounted && data && (
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                data.source === 'error'
                  ? 'bg-[#f59e0b]'
                  : data.source === 'cache'
                    ? 'bg-[#22c55e]'
                    : 'bg-[#3b82f6]'
              }`}
              title={
                data.source === 'error'
                  ? 'Using cached or fallback data'
                  : data.source === 'cache'
                    ? 'Served from today\'s cache'
                    : 'Freshly generated'
              }
            />
          )}

          {/* Chevron */}
          <svg
            className={`w-3 h-3 text-[#444455] transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {/* ── Expanded content ── */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: isExpanded ? '3000px' : '0px' }}
        aria-hidden={!isExpanded}
      >
        <div className="px-5 pb-5 border-t border-[#111120]">
          {showLoading && (
            <div className="pt-8 pb-4 flex flex-col items-center gap-3">
              <span className="w-6 h-6 rounded-full border-2 border-[#1a1a2e] border-t-[#5555aa] animate-spin" />
              <span className="text-[10px] text-[#333344] font-mono tracking-wide">
                Generating briefing via Gemini…
              </span>
            </div>
          )}

          {mounted && data?.content && (
            <div className="pt-4">{renderMarkdown(data.content)}</div>
          )}

          {/* Footer */}
          {mounted && (
            <div className="mt-4 pt-3 border-t border-[#111120] flex items-center justify-between">
              {data?.source === 'error' && (
                <span className="text-[9px] font-mono text-[#f59e0b]">
                  ⚠ Gemini API unavailable — showing cached or fallback data
                </span>
              )}
              {data?.source !== 'error' && (
                <span className="text-[8px] font-mono text-[#2a2a3a]">
                  Gemini 2.0 Flash · Google Search grounding
                </span>
              )}
              {timestamp && (
                <span className="text-[8px] font-mono text-[#2a2a3a] sm:hidden">
                  {timestamp} HKT
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
