'use client'
import { GaugeChart } from '@/components/widgets/GaugeChart'
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

function PlaceholderGauge({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center opacity-40">
      <div className="text-[10px] text-[#666666] uppercase tracking-widest mb-1 font-mono">{title}</div>
      <div className="w-[180px] h-[117px] bg-[#111120] rounded-lg flex items-center justify-center border border-[#1a1a2e]">
        <span className="text-[#444] text-xs font-mono">V2</span>
      </div>
      {subtitle && <div className="text-[10px] text-[#444] font-mono mt-1">{subtitle}</div>}
    </div>
  )
}

export function SignalSummaryPanel({ taScore, fundamentalScore, overallScore, onChainScore }: Props) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-6 justify-items-center">
      {/* On-Chain */}
      {onChainScore ? (
        <GaugeChart
          score={onChainScore.totalScore}
          label={onChainScore.label}
          color={onChainScore.color}
          title="On-Chain"
          subtitle="Mayer + 200w MA"
        />
      ) : (
        <PlaceholderGauge title="On-Chain" subtitle="Loading…" />
      )}

      {/* Technical Analysis */}
      {taScore ? (
        <GaugeChart
          score={taScore.totalScore}
          label={taScore.label}
          color={taScore.color}
          title="Technical"
          subtitle="8 indicators"
        />
      ) : (
        <PlaceholderGauge title="Technical" subtitle="Loading…" />
      )}

      {/* Fundamental */}
      {fundamentalScore ? (
        <GaugeChart
          score={fundamentalScore.totalScore}
          label={fundamentalScore.label}
          color={fundamentalScore.color}
          title="Fundamental"
          subtitle={`${fundamentalScore.indicatorCount} of 9 indicators`}
        />
      ) : (
        <PlaceholderGauge title="Fundamental" subtitle="Loading…" />
      )}

      {/* Overall Conviction */}
      {overallScore ? (
        <GaugeChart
          score={overallScore.totalScore}
          label={overallScore.label}
          color={overallScore.color}
          title="Overall"
          subtitle={overallScore.hasOnChain ? '3-module blend' : 'TA 55% + Fund 45%'}
        />
      ) : (
        <PlaceholderGauge title="Overall" subtitle="Loading…" />
      )}
    </div>
  )
}
