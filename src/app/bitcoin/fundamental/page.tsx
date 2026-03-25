'use client'
import { ModuleHeader } from '@/components/layout/ModuleHeader'
import { FearGreedGauge } from '@/components/fundamental/FearGreedGauge'
import { FundingRateCard } from '@/components/fundamental/FundingRateCard'
import { FuturesOIChart } from '@/components/fundamental/FuturesOIChart'
import { MacroSnapshotCards } from '@/components/fundamental/MacroSnapshotCards'
import { FedFundsChart } from '@/components/fundamental/FedFundsChart'
import { InflationChart } from '@/components/fundamental/InflationChart'
import { M2BTCChart } from '@/components/fundamental/M2BTCChart'
import { TreasuryYieldChart } from '@/components/fundamental/TreasuryYieldChart'
import { GaugeChart } from '@/components/widgets/GaugeChart'
import { useFearGreed } from '@/hooks/useFearGreed'
import { useFundamentalData } from '@/hooks/useFundamentalData'
import { useMacroData } from '@/hooks/useMacroData'
import { useMacroCharts } from '@/hooks/useMacroCharts'
import { calcFundamentalScore } from '@/lib/calc/fundamental-scores'
import { useMemo } from 'react'

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-widest text-[#666] mb-4 flex items-center gap-2">
      <span className="w-4 h-px bg-[#2a2a3e]" />
      {children}
      <span className="flex-1 h-px bg-[#1a1a2e]" />
    </h2>
  )
}

export default function FundamentalPage() {
  const { current, sparkline, isLoading: fgLoading, isError: fgError } = useFearGreed()
  const { data: fundData, isLoading: fundLoading, isError: fundError } = useFundamentalData()
  const { data: macroData } = useMacroData()
  const { data: macroCharts, isLoading: chartsLoading, isError: chartsError } = useMacroCharts()

  const fundamentalScore = useMemo(() => {
    if (!current || !fundData) return null
    return calcFundamentalScore({
      fearGreed: parseInt(current.value, 10),
      oiValue: fundData.currentOI,
      oi90dMA: fundData.oi90dMA,
      fundingRate: fundData.currentFundingRate,
      fedFunds: macroData?.fedFundsUpper ?? null,
      cpiYoY: macroData?.cpiYoY ?? null,
      pceYoY: macroData?.pceYoY ?? null,
      m2YoY: macroData?.m2YoY ?? null,
      tenYearYield: macroData?.tenYearYield ?? null,
      dxy: macroData?.dxy ?? null,
    })
  }, [current, fundData, macroData])

  const fearGreedValue = current ? parseInt(current.value, 10) : null

  // Score indicator rows — sentiment + leverage + macro
  const scoreIndicators = fundamentalScore
    ? [
        { label: 'Fear & Greed', score: fundamentalScore.fearGreedScore, weight: '15%' },
        { label: 'Open Interest', score: fundamentalScore.oiScore, weight: '12%' },
        { label: 'Funding Rate', score: fundamentalScore.fundingRateScore, weight: '12%' },
        { label: 'Fed Funds Rate', score: fundamentalScore.fedFundsScore, weight: '15%' },
        { label: 'CPI YoY', score: fundamentalScore.cpiScore, weight: '8%' },
        { label: 'PCE YoY', score: fundamentalScore.pceScore, weight: '10%' },
        { label: 'M2 Growth', score: fundamentalScore.m2Score, weight: '10%' },
        { label: '10Y Yield', score: fundamentalScore.tenYearScore, weight: '10%' },
        { label: 'DXY', score: fundamentalScore.dxyScore, weight: '8%' },
      ]
    : []

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-10">
      <ModuleHeader
        title="Fundamental Analysis"
        description="Sentiment, leverage, and macro context for Bitcoin."
        score={fundamentalScore ? Math.round(fundamentalScore.totalScore) : undefined}
        scoreLabel={fundamentalScore?.label}
      />

      {/* Composite Score + F&G */}
      <section>
        <SectionTitle>Sentiment &amp; Composite Score</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Fear & Greed */}
          <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-5">
            <div className="text-xs uppercase tracking-widest text-[#666] font-mono mb-4">Fear &amp; Greed Index</div>
            {fgError ? (
              <div className="text-[#555] text-sm font-mono">Failed to load Fear &amp; Greed data</div>
            ) : (
              <FearGreedGauge current={current} sparkline={sparkline} isLoading={fgLoading} />
            )}
          </div>

          {/* Fundamental Score */}
          <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-5 flex flex-col">
            <div className="text-xs uppercase tracking-widest text-[#666] font-mono mb-4">
              Fundamental Score
            </div>

            {fundamentalScore ? (
              <div className="flex flex-col items-center gap-4 flex-1">
                <GaugeChart
                  score={fundamentalScore.totalScore}
                  label={fundamentalScore.label}
                  color={fundamentalScore.color}
                  size={200}
                />

                <div
                  className="px-5 py-1.5 rounded-full border text-sm font-bold font-mono tracking-wide"
                  style={{
                    color: fundamentalScore.color,
                    backgroundColor: `${fundamentalScore.color}18`,
                    borderColor: `${fundamentalScore.color}40`,
                  }}
                >
                  {fundamentalScore.label}
                </div>

                {/* Indicator breakdown — all 9 */}
                <div className="space-y-2 w-full">
                  {/* Separator labels */}
                  <div className="text-[9px] font-mono text-[#444] uppercase tracking-widest">
                    Sentiment &amp; Leverage
                  </div>
                  {scoreIndicators.slice(0, 3).map((item) => {
                    const barColor = item.score > 65 ? '#ef4444' : item.score > 35 ? '#f59e0b' : '#22c55e'
                    return (
                      <div key={item.label} className="flex items-center gap-2 text-[11px] font-mono">
                        <span className="text-[#777] w-28 shrink-0">{item.label}</span>
                        <div className="flex-1 h-1.5 bg-[#1a1a2e] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${item.score}%`, backgroundColor: barColor }}
                          />
                        </div>
                        <span className="text-[#555] w-7 text-right shrink-0">{item.weight}</span>
                      </div>
                    )
                  })}
                  <div className="text-[9px] font-mono text-[#444] uppercase tracking-widest pt-1">
                    Macro Environment
                  </div>
                  {scoreIndicators.slice(3).map((item) => {
                    const barColor = item.score > 65 ? '#ef4444' : item.score > 35 ? '#f59e0b' : '#22c55e'
                    return (
                      <div key={item.label} className="flex items-center gap-2 text-[11px] font-mono">
                        <span className="text-[#777] w-28 shrink-0">{item.label}</span>
                        <div className="flex-1 h-1.5 bg-[#1a1a2e] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${item.score}%`, backgroundColor: barColor }}
                          />
                        </div>
                        <span className="text-[#555] w-7 text-right shrink-0">{item.weight}</span>
                      </div>
                    )
                  })}
                </div>

                {/* Quick stats strip */}
                <div className="grid grid-cols-3 gap-2 w-full mt-1">
                  {fearGreedValue !== null && (
                    <div className="bg-[#111120] rounded-lg px-3 py-2 text-center border border-[#1a1a2e]">
                      <div className="text-[9px] text-[#555] font-mono uppercase tracking-widest">F&amp;G</div>
                      <div className="text-base font-bold font-mono text-[#e0e0e0] mt-0.5">{fearGreedValue}</div>
                    </div>
                  )}
                  {fundData && (
                    <>
                      <div className="bg-[#111120] rounded-lg px-3 py-2 text-center border border-[#1a1a2e]">
                        <div className="text-[9px] text-[#555] font-mono uppercase tracking-widest">Funding</div>
                        <div className="text-base font-bold font-mono text-[#e0e0e0] mt-0.5">
                          {(fundData.currentFundingRate * 100).toFixed(3)}%
                        </div>
                      </div>
                      <div className="bg-[#111120] rounded-lg px-3 py-2 text-center border border-[#1a1a2e]">
                        <div className="text-[9px] text-[#555] font-mono uppercase tracking-widest">OI vs MA</div>
                        <div
                          className="text-base font-bold font-mono mt-0.5"
                          style={{ color: fundData.oiDeviationPct > 20 ? '#f97316' : '#e0e0e0' }}
                        >
                          {fundData.oiDeviationPct >= 0 ? '+' : ''}{fundData.oiDeviationPct.toFixed(0)}%
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="text-[10px] text-[#444] font-mono">
                  {fundamentalScore.indicatorCount} of 9 indicators
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[#555] text-sm font-mono">
                Loading…
              </div>
            )}
          </div>

        </div>
      </section>

      {/* Futures & Funding */}
      <section>
        <SectionTitle>Futures Open Interest &amp; Funding</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-5">
            <div className="text-xs uppercase tracking-widest text-[#666] font-mono mb-4">Open Interest (Daily)</div>
            {fundError ? (
              <div className="text-[#555] text-sm font-mono py-8">Failed to load futures data</div>
            ) : (
              <FuturesOIChart
                oiHistory={fundData?.oiHistory ?? []}
                oi90dMA={fundData?.oi90dMA ?? 0}
                oiDeviationPct={fundData?.oiDeviationPct ?? 0}
                currentOI={fundData?.currentOI ?? 0}
                isLoading={fundLoading}
              />
            )}
          </div>
          <div>
            <FundingRateCard
              currentFundingRate={fundData?.currentFundingRate ?? 0}
              annualisedFundingRate={fundData?.annualisedFundingRate ?? 0}
              nextFundingTime={fundData?.nextFundingTime ?? Date.now() + 28800000}
              isLoading={fundLoading}
            />
          </div>
        </div>
      </section>

      {/* Macro Snapshot Cards */}
      <section>
        <SectionTitle>Macro Snapshot</SectionTitle>
        <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-5">
          <MacroSnapshotCards />
        </div>
      </section>

      {/* Live Macro Charts */}
      <section>
        <SectionTitle>Live Macro Charts</SectionTitle>

        {/* Fed Funds Rate + 10Y Yield */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          <FedFundsChart
            data={macroCharts?.fedFunds ?? []}
            isLoading={chartsLoading}
            isError={chartsError}
          />
          <TreasuryYieldChart
            data={macroCharts?.tenYear ?? []}
            isLoading={chartsLoading}
            isError={chartsError}
          />
        </div>

        {/* CPI/PCE + M2 vs BTC */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <InflationChart
            cpi={macroCharts?.cpi ?? []}
            pce={macroCharts?.pce ?? []}
            isLoading={chartsLoading}
            isError={chartsError}
          />
          <M2BTCChart
            m2={macroCharts?.m2 ?? []}
            btcMonthly={macroCharts?.btcMonthly ?? []}
            isLoading={chartsLoading}
            isError={chartsError}
          />
        </div>
      </section>
    </div>
  )
}
