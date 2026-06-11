'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { renderBriefingMarkdown } from '@/lib/renderBriefingMarkdown'
import type { AgentReport } from '@/lib/server/store'

/**
 * Analyst Desk — chronological feed of agent reports.
 * Each card: agent, verdict chip (action bias / materiality), timestamp,
 * expandable markdown body.
 */

interface ReportsResponse {
  reports: AgentReport[]
}

interface WatchlistResponse {
  watchlist: string[]
  proposals: Array<{ action: 'add' | 'remove'; ticker: string; rationale: string; proposedAt: string }>
}

const AGENT_LABELS: Record<string, string> = {
  momentum: 'Momentum Analyst',
  news: 'News/Event Analyst',
  scout: 'Opportunity Scout',
}

const BIAS_COLORS: Record<string, string> = {
  add: '#22c55e',
  hold: '#f59e0b',
  trim: '#f87171',
  hedge: '#ef4444',
}

const SESSION_LABELS: Record<string, string> = {
  'us-open': 'US Open',
  'us-midday': 'US Midday',
  'us-close': 'US Close',
}

async function fetchReports(agent: string | null): Promise<ReportsResponse> {
  const url = agent ? `/api/agents/reports?agent=${agent}` : '/api/agents/reports'
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Reports fetch failed: ${res.status}`)
  return res.json() as Promise<ReportsResponse>
}

async function fetchWatchlist(): Promise<WatchlistResponse> {
  const res = await fetch('/api/agents/watchlist')
  if (!res.ok) throw new Error(`Watchlist fetch failed: ${res.status}`)
  return res.json() as Promise<WatchlistResponse>
}

function WatchlistPanel() {
  const queryClient = useQueryClient()
  const { data } = useQuery({ queryKey: ['watchlist'], queryFn: fetchWatchlist, refetchInterval: 300_000 })

  const decide = async (decision: 'approve' | 'reject', ticker: string, action: 'add' | 'remove') => {
    await fetch('/api/agents/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, ticker, action }),
    })
    await queryClient.invalidateQueries({ queryKey: ['watchlist'] })
  }

  if (!data) return null

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg px-4 py-3 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs uppercase tracking-widest text-[#666] font-mono">Equity watchlist</span>
        {data.watchlist.map((t) => (
          <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1a1a2e] text-[#999]">
            {t}
          </span>
        ))}
      </div>
      {data.proposals.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-widest text-[#f59e0b] font-mono">
            Scout proposals — your approval required
          </div>
          {data.proposals.map((p) => (
            <div
              key={`${p.action}-${p.ticker}`}
              className="flex items-start gap-3 border border-[#f59e0b30] rounded px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <span className="text-xs font-mono font-semibold text-[#e0e0e0]">
                  {p.action.toUpperCase()} {p.ticker}
                </span>
                <div className="text-[10px] text-[#888] font-mono mt-0.5">{p.rationale}</div>
              </div>
              <button
                onClick={() => decide('approve', p.ticker, p.action)}
                className="text-[10px] font-mono px-2 py-1 rounded border border-[#22c55e] text-[#22c55e] hover:bg-[#22c55e15]"
              >
                Approve
              </button>
              <button
                onClick={() => decide('reject', p.ticker, p.action)}
                className="text-[10px] font-mono px-2 py-1 rounded border border-[#444] text-[#888] hover:bg-[#ffffff08]"
              >
                Reject
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function verdictChip(report: AgentReport): { text: string; color: string } | null {
  const s = report.structured as Record<string, unknown>
  if (typeof s.action_bias === 'string') {
    return { text: s.action_bias.toUpperCase(), color: BIAS_COLORS[s.action_bias] ?? '#888' }
  }
  if (typeof s.materiality === 'number') {
    const m = s.materiality
    return { text: `MATERIALITY ${m}/10`, color: m >= 7 ? '#ef4444' : m >= 4 ? '#f59e0b' : '#3b82f6' }
  }
  return null
}

function ReportCard({ report }: { report: AgentReport }) {
  const [expanded, setExpanded] = useState(false)
  const chip = verdictChip(report)
  const s = report.structured as Record<string, unknown>
  const btcRead =
    (typeof s.momentum_read === 'string' && s.momentum_read) ||
    (typeof s.event === 'string' && s.event) ||
    null
  const equityRead = typeof s.equity_read === 'string' && s.equity_read ? s.equity_read : null
  const confidence = typeof s.confidence === 'number' ? s.confidence : null
  const sessionLabel =
    typeof s.session === 'string' ? SESSION_LABELS[s.session] ?? s.session : null

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="group w-full text-left px-4 py-3 hover:bg-[#111120] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-mono font-semibold text-[#e0e0e0]">
            {AGENT_LABELS[report.agent] ?? report.agent}
            {sessionLabel && <span className="text-[#3b82f6]"> · {sessionLabel}</span>}
          </span>
          {chip && (
            <span
              className="text-[10px] font-mono font-bold px-2 py-0.5 rounded"
              style={{ color: chip.color, backgroundColor: `${chip.color}18`, border: `1px solid ${chip.color}40` }}
            >
              {chip.text}
            </span>
          )}
          {confidence != null && (
            <span className="text-[10px] font-mono text-[#666]">confidence {confidence}</span>
          )}
          <span className="text-[10px] font-mono text-[#555] ml-auto">
            {new Date(report.generatedAt).toLocaleString('en-HK', { timeZone: 'Asia/Hong_Kong' })} HKT
          </span>
          {/* Explicit expand affordance — the bare caret was easy to miss */}
          <span className="flex items-center gap-1 text-[10px] font-mono text-[#3b82f6] opacity-70 group-hover:opacity-100 transition-opacity shrink-0">
            {expanded ? 'collapse' : 'full report'}
            <svg
              className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </div>
        {btcRead && (
          <div className="text-xs text-[#999] mt-1.5 font-mono">
            {equityRead && <span className="text-[#f7931a] font-semibold">BTC </span>}
            {btcRead}
          </div>
        )}
        {equityRead && (
          <div className="text-xs text-[#999] mt-1 font-mono">
            <span className="text-[#3b82f6] font-semibold">EQUITIES </span>
            {equityRead}
          </div>
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-[#1a1a2e] text-sm">
          {renderBriefingMarkdown(report.markdown)}
        </div>
      )}
    </div>
  )
}

const RUN_KEY_STORAGE = 'cmd-agent-run-key'

export default function DeskPage() {
  const [agentFilter, setAgentFilter] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [runStatus, setRunStatus] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)
  const [runKey, setRunKey] = useState<string>(() =>
    typeof window !== 'undefined' ? localStorage.getItem(RUN_KEY_STORAGE) ?? '' : '',
  )
  const queryClient = useQueryClient()

  const promptForKey = () => {
    const entered = window.prompt(
      'Run key (the CRON_SECRET configured on Vercel). Stored only in this browser.',
      runKey,
    )
    if (entered === null) return
    const trimmed = entered.trim()
    setRunKey(trimmed)
    if (trimmed) localStorage.setItem(RUN_KEY_STORAGE, trimmed)
    else localStorage.removeItem(RUN_KEY_STORAGE)
    setRunStatus(trimmed ? { kind: 'success', text: 'Run key saved for this browser.' } : null)
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['agent-reports', agentFilter],
    queryFn: () => fetchReports(agentFilter),
    refetchInterval: 120_000,
  })

  const reports = data?.reports ?? []

  const triggerRun = async (agent: string) => {
    setRunning(true)
    setRunStatus(null)
    try {
      // Dev needs no key; production requires the CRON_SECRET as ?key=
      const url = runKey
        ? `/api/agents/${agent}/run?key=${encodeURIComponent(runKey)}`
        : `/api/agents/${agent}/run`
      const res = await fetch(url, { method: 'POST' })
      if (res.status === 401) {
        setRunStatus({
          kind: 'error',
          text: runKey
            ? 'Unauthorized — the saved run key does not match the CRON_SECRET on Vercel. Click the key icon to update it.'
            : 'Unauthorized — production runs need the CRON_SECRET. Click the key icon next to the run button to save it.',
        })
      } else if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        setRunStatus({ kind: 'error', text: body?.error ?? `Run failed (HTTP ${res.status})` })
      } else {
        setRunStatus({ kind: 'success', text: `${AGENT_LABELS[agent] ?? agent} filed a new report.` })
      }
      await queryClient.invalidateQueries({ queryKey: ['agent-reports'] })
    } catch (err) {
      setRunStatus({ kind: 'error', text: `Run failed: ${err instanceof Error ? err.message : 'network error'}` })
    } finally {
      setRunning(false)
    }
  }

  const filters: Array<{ key: string | null; label: string }> = [
    { key: null, label: 'All' },
    { key: 'momentum', label: 'Momentum' },
    { key: 'news', label: 'News' },
    { key: 'scout', label: 'Scout' },
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#e0e0e0]">Analyst Desk</h1>
          <p className="text-sm text-[#666] mt-0.5">Reports from the AI analyst team</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => triggerRun(agentFilter ?? 'momentum')}
            disabled={running}
            className="text-xs font-mono px-3 py-1.5 rounded border border-[#3b82f6] text-[#3b82f6] hover:bg-[#3b82f615] disabled:opacity-40 transition-colors"
          >
            {running ? 'Running…' : `Run ${agentFilter ?? 'momentum'} now`}
          </button>
          <button
            onClick={promptForKey}
            title={runKey ? 'Run key saved — click to change' : 'Set the run key (CRON_SECRET) for production runs'}
            className={`text-xs font-mono px-2 py-1.5 rounded border transition-colors ${
              runKey
                ? 'border-[#22c55e55] text-[#22c55e] hover:bg-[#22c55e10]'
                : 'border-[#1a1a2e] text-[#666] hover:text-[#999]'
            }`}
          >
            🔑
          </button>
        </div>
      </div>

      {runStatus && (
        <div
          className={`flex items-start justify-between gap-3 rounded-lg px-4 py-2.5 border text-xs font-mono ${
            runStatus.kind === 'error'
              ? 'border-[#ef444440] bg-[#ef444408] text-[#f87171]'
              : 'border-[#22c55e40] bg-[#22c55e08] text-[#22c55e]'
          }`}
        >
          <span>{runStatus.text}</span>
          <button onClick={() => setRunStatus(null)} className="text-[#666] hover:text-[#999] shrink-0">
            ✕
          </button>
        </div>
      )}

      <WatchlistPanel />

      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f.label}
            onClick={() => setAgentFilter(f.key)}
            className={`text-xs font-mono px-3 py-1 rounded border transition-colors ${
              agentFilter === f.key
                ? 'border-[#3b82f6] text-[#3b82f6] bg-[#3b82f610]'
                : 'border-[#1a1a2e] text-[#666] hover:text-[#999]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && <div className="text-[#555] text-sm font-mono">Loading reports…</div>}
      {isError && (
        <div className="text-[#f59e0b] text-sm font-mono border border-[#f59e0b30] rounded-lg px-4 py-3">
          Could not load reports — the reports API is unreachable.
        </div>
      )}
      {!isLoading && !isError && reports.length === 0 && (
        <div className="text-[#666] text-sm font-mono border border-[#1a1a2e] rounded-lg px-4 py-6 text-center">
          No reports yet. Trigger a run above, or wait for the next scheduled session.
        </div>
      )}

      <div className="space-y-3">
        {reports.map((r) => (
          <ReportCard key={r.id} report={r} />
        ))}
      </div>
    </div>
  )
}
