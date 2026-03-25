'use client'
import { useQuery } from '@tanstack/react-query'
import type { MempoolStats } from '@/app/api/mempool-stats/route'

async function fetchMempoolStats(): Promise<MempoolStats> {
  const res = await fetch('/api/mempool-stats')
  if (!res.ok) throw new Error('Mempool stats fetch failed')
  return res.json() as Promise<MempoolStats>
}

function formatTimeSince(seconds: number | null): string {
  if (seconds === null) return '—'
  if (seconds < 60) return `${seconds}s ago`
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ${mins % 60}m ago`
}

function formatMempool(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(0)}k txs`
  return `${count} txs`
}

interface StatItemProps {
  label: string
  value: string
  sub?: string
}

function StatItem({ label, value, sub }: StatItemProps) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-4 py-2 border-r border-[#1a1a2e] last:border-r-0">
      <div className="text-[9px] text-[#555] font-mono uppercase tracking-widest">{label}</div>
      <div className="text-sm font-mono font-semibold text-[#e0e0e0]">{value}</div>
      {sub && <div className="text-[9px] text-[#444] font-mono">{sub}</div>}
    </div>
  )
}

export function SecondaryInfoBar() {
  const { data, isLoading } = useQuery({
    queryKey: ['mempool-stats'],
    queryFn: fetchMempoolStats,
    staleTime: 60_000,
    refetchInterval: 60_000,
  })

  if (isLoading || !data) {
    return (
      <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg px-4 py-2 flex items-center justify-center">
        <span className="text-[#555] text-xs font-mono">Loading chain data…</span>
      </div>
    )
  }

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg overflow-hidden">
      <div className="flex flex-wrap divide-x divide-[#1a1a2e]">
        <StatItem
          label="Block Height"
          value={data.blockHeight.toLocaleString()}
          sub="latest"
        />
        <StatItem
          label="Last Block"
          value={formatTimeSince(data.timeSinceBlock)}
          sub={data.timeSinceBlock !== null && data.timeSinceBlock > 1200 ? 'slow' : undefined}
        />
        <StatItem
          label="Mempool"
          value={formatMempool(data.mempoolCount)}
          sub={`${(data.mempoolVsize / 1e6).toFixed(1)} MB`}
        />
        <StatItem
          label="Fast Fee"
          value={`${data.fastFee} sat/vB`}
          sub="next block"
        />
        <StatItem
          label="Avg Fee"
          value={`${data.halfHourFee} sat/vB`}
          sub="30 min"
        />
      </div>
    </div>
  )
}
