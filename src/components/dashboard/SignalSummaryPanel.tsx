'use client'
import { BandScale, LabelChip } from '@/components/dashboard/ScoreScale'
import type { OverallScoreComponents } from '@/lib/calc/overall-score'
import type { TechnicalScoreComponents } from '@/lib/calc/technical-scores'
import type { FundamentalScoreComponents } from '@/lib/calc/fundamental-scores'
import type { OnChainScoreComponents } from '@/lib/calc/onchain-scores'

interface Props {
  taScore: TechnicalScoreComponents | null
  fundamentalScore: FundamentalScoreComponents | null
  overallScore: OverallScoreComponents | null
  onChainScore: OnChainScoreComponents | null
}

/**
 * Conviction signals, redesigned for glanceability:
 *  - Overall is the hero — big number, label chip, full-width band scale
 *  - The three pillars are horizontal band rows, not mini-gauges
 *  - Scale: 0 = Strong Buy (left/green) … 100 = Strong Sell (right/red)
 */

function PillarRow({
  title,
  subtitle,
  score,
  label,
  color,
}: {
  title: string
  subtitle: string
  score: number | null
  label?: string
  color?: string
}) {
  if (score == null) {
    return (
      <div className="py-2.5 border-b border-[#15151f] last:border-0 opacity-60">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#888]">{title}</span>
          <span className="text-[10px] font-mono text-[#f59e0b]">awaiting data</span>
        </div>
        <div className="mt-1.5 h-[18px] rounded-full bg-[#111120] border border-[#1a1a2e]" />
        <div className="text-[10px] text-[#555] font-mono mt-1">{subtitle}</div>
      </div>
    )
  }
  return (
    <div className="py-2.5 border-b border-[#15151f] last:border-0">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#bbb]">{title}</span>
        <div className="flex items-center gap-2">
          <span className="text-xl font-mono font-bold leading-none" style={{ color }}>
            {Math.round(score)}
          </span>
          {label && color && <LabelChip label={label} color={color} />}
        </div>
      </div>
      <div className="mt-1">
        <BandScale score={score} />
      </div>
      <div className="text-[10px] text-[#555] font-mono">{subtitle}</div>
    </div>
  )
}

export function SignalSummaryPanel({ taScore, fundamentalScore, overallScore, onChainScore }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[5fr_7fr] gap-8 items-center">
      {/* ── Overall: the decision number ── */}
      <div className="flex flex-col justify-center lg:border-r lg:border-[#15151f] lg:pr-8">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#666] mb-3">
          Overall Conviction
        </div>
        {overallScore ? (
          <>
            <div className="flex items-end gap-4 flex-wrap">
              <span
                className="text-6xl font-mono font-bold leading-none"
                style={{ color: overallScore.color }}
              >
                {Math.round(overallScore.totalScore)}
              </span>
              <div className="pb-1">
                <LabelChip label={overallScore.label} color={overallScore.color} large />
              </div>
            </div>
            <div className="mt-4">
              <BandScale score={overallScore.totalScore} height={10} />
              <div className="flex justify-between text-[9px] font-mono uppercase tracking-widest text-[#555] mt-0.5">
                <span className="text-[#22c55e]">Strong Buy</span>
                <span>Neutral</span>
                <span className="text-[#ef4444]">Strong Sell</span>
              </div>
            </div>
            <div className="text-[10px] text-[#555] font-mono mt-3">
              {overallScore.hasOnChain
                ? 'On-chain 40% · Technical 30% · Fundamental 30%'
                : 'TA 55% + Fund 45% — on-chain unavailable, blend reweighted'}
            </div>
          </>
        ) : (
          <div className="h-[140px] flex items-center justify-center rounded-lg bg-[#111120] border border-[#1a1a2e]">
            <span className="text-[#555] text-xs font-mono animate-pulse">awaiting data</span>
          </div>
        )}
      </div>

      {/* ── Pillars ── */}
      <div>
        <PillarRow
          title="On-Chain"
          subtitle={onChainScore ? `${onChainScore.indicatorCount} indicators · NUPL, MVRV, Mayer, 200w MA` : 'needs full daily history (NUPL, MVRV, Mayer, 200w MA)'}
          score={onChainScore?.totalScore ?? null}
          label={onChainScore?.label}
          color={onChainScore?.color}
        />
        <PillarRow
          title="Technical"
          subtitle="8 indicators · RSI, MACD, Pi Cycle, 200d SMA, dominance"
          score={taScore?.totalScore ?? null}
          label={taScore?.label}
          color={taScore?.color}
        />
        <PillarRow
          title="Fundamental"
          subtitle={
            fundamentalScore
              ? `${fundamentalScore.indicatorCount} of 9 indicators · sentiment, leverage, macro`
              : 'needs Fear & Greed + futures data'
          }
          score={fundamentalScore?.totalScore ?? null}
          label={fundamentalScore?.label}
          color={fundamentalScore?.color}
        />
      </div>
    </div>
  )
}
