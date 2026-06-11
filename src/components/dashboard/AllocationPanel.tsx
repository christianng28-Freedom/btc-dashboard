'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { suggestAllocation, comparePosition } from '@/lib/calc/allocation'
import type { PositionJournal } from '@/app/api/position/route'

/**
 * Closes the loop from signal to position: conviction score → Kelly-derived
 * allocation band → comparison against the user's actual logged position.
 * Assumptions are always visible — this is a model, not advice.
 */

interface Props {
  overallScore: number | null
  tenYearYield?: number | null
}

const VERDICT_STYLE: Record<string, { color: string; text: string }> = {
  'in-band': { color: '#22c55e', text: 'IN BAND' },
  overweight: { color: '#f87171', text: 'OVERWEIGHT vs model' },
  underweight: { color: '#3b82f6', text: 'UNDERWEIGHT vs model' },
}

async function fetchPosition(): Promise<PositionJournal | null> {
  const res = await fetch('/api/position')
  if (!res.ok) throw new Error(`Position fetch failed: ${res.status}`)
  const json = (await res.json()) as { position: PositionJournal | null }
  return json.position
}

export function AllocationPanel({ overallScore, tenYearYield }: Props) {
  const queryClient = useQueryClient()
  const { data: position } = useQuery({ queryKey: ['position'], queryFn: fetchPosition })
  const [editing, setEditing] = useState(false)
  const [btcUsd, setBtcUsd] = useState('')
  const [totalUsd, setTotalUsd] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)

  if (overallScore == null) {
    return (
      <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg px-4 py-3">
        <span className="text-xs font-mono text-[#666]">
          Allocation guidance unavailable — overall conviction score has not computed
        </span>
      </div>
    )
  }

  const suggestion = suggestAllocation({ convictionScore: overallScore, riskFreeRatePct: tenYearYield })
  const currentPct =
    position && position.totalPortfolioUsd > 0 ? (position.btcUsd / position.totalPortfolioUsd) * 100 : null
  const verdict = currentPct != null ? comparePosition(currentPct, suggestion) : null

  const save = async () => {
    setSaveError(null)
    const btc = parseFloat(btcUsd)
    const total = parseFloat(totalUsd)
    const res = await fetch('/api/position', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ btcUsd: btc, totalPortfolioUsd: total }),
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      setSaveError(body?.error ?? `Save failed (${res.status})`)
      return
    }
    setEditing(false)
    await queryClient.invalidateQueries({ queryKey: ['position'] })
  }

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg px-5 py-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs uppercase tracking-widest text-[#666] font-mono">Position vs Model</span>
        {verdict && (
          <span
            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded"
            style={{
              color: VERDICT_STYLE[verdict].color,
              backgroundColor: `${VERDICT_STYLE[verdict].color}18`,
              border: `1px solid ${VERDICT_STYLE[verdict].color}40`,
            }}
          >
            {VERDICT_STYLE[verdict].text}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <div className="text-[10px] text-[#666] font-mono uppercase">Model band (¼–½ Kelly)</div>
          <div className="text-lg font-mono font-bold text-[#e0e0e0]">
            {suggestion.suggestedMinPct.toFixed(0)}–{suggestion.suggestedMaxPct.toFixed(0)}%
          </div>
          <div className="text-[10px] text-[#555] font-mono">of portfolio in BTC</div>
        </div>
        <div>
          <div className="text-[10px] text-[#666] font-mono uppercase">Your allocation</div>
          {currentPct != null ? (
            <div className="text-lg font-mono font-bold" style={{ color: verdict ? VERDICT_STYLE[verdict].color : '#e0e0e0' }}>
              {currentPct.toFixed(1)}%
            </div>
          ) : (
            <div className="text-sm font-mono text-[#666] mt-1">not logged</div>
          )}
          <button
            onClick={() => {
              setEditing((e) => !e)
              if (position) {
                setBtcUsd(String(position.btcUsd))
                setTotalUsd(String(position.totalPortfolioUsd))
              }
            }}
            className="text-[10px] font-mono text-[#3b82f6] hover:text-[#60a5fa] mt-0.5"
          >
            {editing ? 'cancel' : position ? 'update position' : 'log position'}
          </button>
        </div>
        <div>
          <div className="text-[10px] text-[#666] font-mono uppercase">Model assumptions</div>
          <div className="text-[10px] text-[#888] font-mono mt-1 leading-relaxed">
            conviction {suggestion.assumptions.conviction.toFixed(0)} → E[r] {suggestion.assumptions.expectedReturnPct.toFixed(0)}%,
            vol {suggestion.assumptions.volatilityPct.toFixed(0)}%, rf {suggestion.assumptions.riskFreeRatePct.toFixed(1)}%.
            Full Kelly {suggestion.fullKellyPct.toFixed(0)}%. Model output, not advice.
          </div>
        </div>
      </div>

      {editing && (
        <div className="flex items-end gap-3 flex-wrap border-t border-[#1a1a2e] pt-3">
          <label className="text-[10px] font-mono text-[#666]">
            BTC value (USD)
            <input
              type="number"
              value={btcUsd}
              onChange={(e) => setBtcUsd(e.target.value)}
              className="block bg-[#111120] border border-[#2a2a3e] rounded px-2 py-1 text-xs font-mono text-[#e0e0e0] w-36 mt-1"
            />
          </label>
          <label className="text-[10px] font-mono text-[#666]">
            Total portfolio (USD)
            <input
              type="number"
              value={totalUsd}
              onChange={(e) => setTotalUsd(e.target.value)}
              className="block bg-[#111120] border border-[#2a2a3e] rounded px-2 py-1 text-xs font-mono text-[#e0e0e0] w-36 mt-1"
            />
          </label>
          <button
            onClick={save}
            className="text-xs font-mono px-3 py-1.5 rounded border border-[#22c55e] text-[#22c55e] hover:bg-[#22c55e15]"
          >
            Save
          </button>
          {saveError && <span className="text-[10px] font-mono text-[#ef4444]">{saveError}</span>}
        </div>
      )}
    </div>
  )
}
