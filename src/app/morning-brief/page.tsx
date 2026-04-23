'use client'

import { useEffect, useRef, useState } from 'react'
import { useMorningBriefing } from '@/hooks/useMorningBriefing'
import { useNotifications } from '@/providers/NotificationProvider'
import { renderBriefingMarkdown } from '@/lib/renderBriefingMarkdown'

function formatHKTDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

function formatHKTTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-US', {
    timeZone: 'Asia/Hong_Kong',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

// ── Toast ─────────────────────────────────────────────────────────────────────

type ToastKind = 'info' | 'success' | 'warning'

interface Toast {
  id: number
  message: string
  kind: ToastKind
}

let toastSeq = 0

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  function show(message: string, kind: ToastKind = 'info', durationMs = 3500) {
    const id = ++toastSeq
    setToasts((prev) => [...prev, { id, message, kind }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), durationMs)
  }
  return { toasts, show }
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
  if (!toasts.length) return null
  const colours: Record<ToastKind, string> = {
    info:    'border-[#2a2a4a] text-[#9090c0]',
    success: 'border-[#1a3a2a] text-[#4ade80]',
    warning: 'border-[#3a2a1a] text-[#f59e0b]',
  }
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-2.5 rounded-lg border bg-[#0d0d1a] text-[11px] font-medium shadow-lg transition-opacity ${colours[t.kind]}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MorningBriefPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const { data, isLoading, isError, refetch, isFetching, forceRegenerate } = useMorningBriefing()
  const { permissionStatus, requestPermission } = useNotifications()
  const { toasts, show: showToast } = useToast()

  const [isRegenerating, setIsRegenerating] = useState(false)
  const prevSourceRef = useRef<string | null>(null)

  // Fire browser notification when a fresh brief is generated
  useEffect(() => {
    if (!mounted || !data) return
    const prev = prevSourceRef.current
    prevSourceRef.current = data.source
    if (prev !== null && prev !== 'generated' && data.source === 'generated') {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('🌅 Morning Brief Ready', {
          body: `Today's brief has been generated — ${formatHKTDate(data.generatedAt)}.`,
          icon: '/apple-touch-icon.png',
          tag: 'morning-brief',
        })
      }
      showToast('Fresh briefing generated for today', 'success')
    }
  }, [data, mounted, showToast])

  async function handleRefresh() {
    const result = await refetch()
    if (result.data?.source === 'cache') {
      showToast("Today's briefing is already current", 'info')
    } else if (result.data?.source === 'generated') {
      showToast('Briefing refreshed', 'success')
    }
  }

  async function handleForceRegenerate() {
    setIsRegenerating(true)
    try {
      const fresh = await forceRegenerate()
      if (fresh.source === 'generated') {
        showToast('New briefing generated', 'success', 5000)
      }
    } catch {
      showToast('Regeneration failed — check API key and quota', 'warning', 5000)
    } finally {
      setIsRegenerating(false)
    }
  }

  const showLoading = mounted && (isLoading || (isFetching && !data))
  const dateLabel  = mounted && data?.generatedAt ? formatHKTDate(data.generatedAt) : null
  const timeLabel  = mounted && data?.generatedAt ? formatHKTTime(data.generatedAt) : null
  const isToday    = mounted && data?.generatedAt
    ? new Date(data.generatedAt).toISOString().slice(0, 10) ===
      new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10)
    : false

  return (
    <>
      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-4xl mx-auto w-full">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-3 h-px flex-shrink-0"
                style={{ background: 'linear-gradient(90deg, #00A3FF, rgba(0,163,255,0.15))' }}
              />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/65">
                Daily Brief
              </span>
            </div>
            <h1
              className="text-[22px] sm:text-[26px] font-bold leading-tight"
              style={{
                background: 'linear-gradient(90deg, #ffffff 0%, #00A3FF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Morning Brief
            </h1>
            {dateLabel && (
              <p className="text-[11px] text-[#666677] font-mono mt-1 tracking-wide">
                {dateLabel} · Hong Kong
              </p>
            )}

            {/* Today's status badge */}
            {mounted && data && !showLoading && (
              <div className="flex items-center gap-2 mt-2">
                {isToday && data.source !== 'error' ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] shrink-0" />
                    <span className="text-[10px] text-[#4ade80] font-mono">
                      Today&apos;s brief is ready
                      {timeLabel && <span className="text-[#2a4a2a]"> · generated {timeLabel} HKT</span>}
                    </span>
                  </>
                ) : data.source === 'error' ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] shrink-0" />
                    <span className="text-[10px] text-[#f59e0b] font-mono">
                      Using cached or fallback data
                    </span>
                  </>
                ) : null}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Notification permission */}
            {mounted && permissionStatus === 'default' && (
              <button
                onClick={requestPermission}
                title="Enable push notifications for new briefs"
                className="px-2.5 py-1.5 rounded-md border border-white/[0.06] text-[10px] text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-colors"
              >
                🔔 Notify me
              </button>
            )}

            {/* Force regenerate — uses 1 daily API call */}
            <button
              onClick={handleForceRegenerate}
              disabled={isRegenerating || isFetching}
              title="Force regenerate — uses 1 of your 20 daily API calls"
              className="px-2.5 py-1.5 rounded-md border border-white/[0.06] text-[10px] text-white/40 hover:text-[#f59e0b] hover:border-[#f59e0b]/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            >
              <svg
                className={`w-3 h-3 ${isRegenerating ? 'animate-spin' : ''}`}
                viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M13 10a3 3 0 11-6 0 3 3 0 016 0zM3.05 11a8 8 0 1014.9 0" />
              </svg>
              {isRegenerating ? 'Generating…' : 'Regenerate'}
            </button>

            {/* Refresh — checks for updates, free */}
            <button
              onClick={handleRefresh}
              disabled={isFetching || isRegenerating}
              title="Check for updates (uses cached data if brief is already current)"
              className="px-3 py-1.5 rounded-md border border-white/[0.08] text-[11px] font-medium text-white/60 hover:text-white hover:bg-white/[0.05] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <svg
                className={`w-3 h-3 ${isFetching && !isRegenerating ? 'animate-spin' : ''}`}
                viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isFetching && !isRegenerating ? 'Checking…' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* ── Body ──────────────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-[#1a1a2e] bg-[#0a0a12] overflow-hidden">
          <div className="px-5 sm:px-8 py-6 sm:py-8">
            {showLoading && (
              <div className="py-16 flex flex-col items-center gap-4">
                <span className="w-8 h-8 rounded-full border-2 border-[#1a1a2e] border-t-[#5555aa] animate-spin" />
                <span className="text-[11px] text-[#444455] font-mono tracking-wide">
                  Generating briefing via Gemini 2.5 Flash…
                </span>
                <span className="text-[10px] text-[#2a2a3a] font-mono">
                  First load on a fresh day takes 20–40 seconds
                </span>
              </div>
            )}

            {mounted && !showLoading && isError && (
              <div className="py-12 flex flex-col items-center gap-4 text-center">
                <span className="text-[13px] text-[#f59e0b] font-medium">
                  ⚠ Briefing failed to load
                </span>
                <span className="text-[11px] text-[#666677] max-w-md">
                  Check that GEMINI_API_KEY is set in .env.local. The free tier allows 20 requests per day.
                </span>
                <button
                  onClick={handleRefresh}
                  className="mt-2 px-4 py-2 rounded-md border border-white/[0.08] text-[11px] font-medium text-white/70 hover:text-white hover:bg-white/[0.05] transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {mounted && !showLoading && !isError && data?.content && (
              <div>{renderBriefingMarkdown(data.content)}</div>
            )}
          </div>

          {/* ── Footer ──────────────────────────────────────────────────────── */}
          {mounted && data && !showLoading && (
            <div className="px-5 sm:px-8 py-3 border-t border-[#111120] flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    data.source === 'error' ? 'bg-[#f59e0b]' :
                    data.source === 'cache' ? 'bg-[#22c55e]' : 'bg-[#3b82f6]'
                  }`}
                />
                <span className="text-[9px] font-mono text-[#3a3a4a] uppercase tracking-wider">
                  {data.source === 'error' ? 'Fallback' : data.source === 'cache' ? 'Cached' : 'Live'}
                </span>
                <span className="text-[9px] font-mono text-[#2a2a3a]">·</span>
                <span className="text-[9px] font-mono text-[#3a3a4a]">
                  Gemini 2.5 Flash · Google Search grounding
                </span>
              </div>
              {timeLabel && (
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-mono text-[#3a3a4a]">
                    Updated {timeLabel} HKT
                  </span>
                  {mounted && permissionStatus === 'granted' && (
                    <span className="text-[9px] font-mono text-[#2a3a2a]">🔔 notifications on</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Auto-generation note */}
        <p className="text-[10px] text-[#333344] font-mono mt-3 text-center">
          Briefing auto-generates daily at 08:00 HKT · Cached for the day once generated
        </p>
      </div>

      <ToastStack toasts={toasts} />
    </>
  )
}
