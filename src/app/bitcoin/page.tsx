'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { usePrice } from '@/hooks/usePrice'
import { useCandles } from '@/hooks/useCandles'
import { useHistoricalData } from '@/hooks/useHistoricalData'
import { useExtendedHistory } from '@/hooks/useExtendedHistory'
import { useDominance } from '@/hooks/useDominance'
import { useTechnicalIndicators } from '@/hooks/useTechnicalIndicators'
import { useFearGreed } from '@/hooks/useFearGreed'
import { useFundamentalData } from '@/hooks/useFundamentalData'
import { useMacroData } from '@/hooks/useMacroData'
import { useCompositeScore } from '@/hooks/useCompositeScore'
import { useOnChainScore } from '@/hooks/useOnChainScore'
import { SignalSummaryPanel } from '@/components/dashboard/SignalSummaryPanel'
import { AllocationPanel } from '@/components/dashboard/AllocationPanel'
import { SummaryText } from '@/components/dashboard/SummaryText'
import { KeyAlerts } from '@/components/dashboard/KeyAlerts'
import { SecondaryInfoBar } from '@/components/dashboard/SecondaryInfoBar'
import { BacktestPanel } from '@/components/backtest/BacktestPanel'
import { CandlestickChart } from '@/components/charts/CandlestickChart'
import { calcFundamentalScore } from '@/lib/calc/fundamental-scores'
import { calcRSI } from '@/lib/calc/rsi'
import { calcStochRSI } from '@/lib/calc/stochastic-rsi'
import { calcSMA } from '@/lib/calc/sma'
import { getPiCycleGap } from '@/lib/calc/technical-scores'
import type { AlertInputs } from '@/lib/alerts'
import type { TimeInterval } from '@/lib/types'
import { formatPrice } from '@/lib/format'

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-widest text-[#666] mb-4 flex items-center gap-2">
      <span className="w-4 h-px bg-[#2a2a3e]" />
      {children}
      <span className="flex-1 h-px bg-[#1a1a2e]" />
    </h2>
  )
}

export default function DashboardHome() {
  const [chartInterval, setChartInterval] = useState<TimeInterval>('1d')

  // ── Data hooks ──────────────────────────────────────────────────
  const { price, changePercent } = usePrice()
  const { candles } = useCandles(chartInterval, 500)
  // Scores and alerts are always computed from daily candles — the chart's
  // display interval must never change the conviction read or the alert set
  const { candles: dailyCandles } = useCandles('1d', 500)
  const { candles: historyCandles } = useHistoricalData()
  const { candles: extendedCandles } = useExtendedHistory()
  const { data: dominanceData } = useDominance()
  const { current: fgCurrent, sparkline: fgSparkline, isLoading: fgLoading } = useFearGreed()
  const { data: fundData, isLoading: fundLoading } = useFundamentalData()
  const { data: macroData } = useMacroData()

  const dominancePct = dominanceData?.dominance ?? null

  // ── Scores ───────────────────────────────────────────────────────
  const taScore = useTechnicalIndicators(dailyCandles, historyCandles, dominancePct)

  const fundamentalScore = useMemo(() => {
    // No score without real leverage data — zeroed-out OI/funding inputs
    // would read as a mild buy signal
    if (!fgCurrent || !fundData) return null
    return calcFundamentalScore({
      fearGreed: parseInt(fgCurrent.value, 10),
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
  }, [fgCurrent, fundData, macroData])

  const onChainScore = useOnChainScore()
  const overallScore = useCompositeScore(taScore, fundamentalScore, onChainScore)

  // ── Alert inputs (daily candles only — never the chart's interval) ──
  const alertInputs = useMemo((): AlertInputs => {
    const inputs: AlertInputs = {}

    if (dailyCandles.length > 0) {
      inputs.price = dailyCandles[dailyCandles.length - 1].close

      const rsiData = calcRSI(dailyCandles)
      if (rsiData.length > 0) inputs.rsi = rsiData[rsiData.length - 1].value

      const stochData = calcStochRSI(dailyCandles)
      if (stochData.length > 0) inputs.stochRsiK = stochData[stochData.length - 1].k

      const sma200 = calcSMA(dailyCandles, 200)
      if (sma200.length > 0) inputs.ma200 = sma200[sma200.length - 1].value

      const sma50 = calcSMA(dailyCandles, 50)
      if (sma50.length > 0) inputs.ma50 = sma50[sma50.length - 1].value
    }

    const piData = historyCandles.length >= 350 ? historyCandles : dailyCandles
    if (piData.length >= 350) {
      const piCycle = getPiCycleGap(piData)
      inputs.piCycleGapPct = piCycle?.gapPct ?? null
    }

    if (fgCurrent) {
      inputs.fearGreed = parseInt(fgCurrent.value, 10)
      inputs.fearGreedLabel = fgCurrent.value_classification
    }

    if (fundData) {
      inputs.fundingRate = fundData.currentFundingRate
      inputs.oiDeviationPct = fundData.oiDeviationPct
    }

    return inputs
  }, [dailyCandles, historyCandles, fgCurrent, fundData])

  const changeColor = changePercent >= 0 ? '#22c55e' : '#ef4444'

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e0e0e0]">Bitcoin Overview</h1>
          <p className="text-sm text-[#666] mt-0.5">Bitcoin conviction dashboard</p>
        </div>
        {price > 0 && (
          <div className="text-right">
            <div className="text-3xl font-bold font-mono text-[#e0e0e0]">{formatPrice(price)}</div>
            <div className="text-sm font-mono mt-0.5" style={{ color: changeColor }}>
              {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}% 24h
            </div>
          </div>
        )}
      </div>

      {/* Secondary info bar */}
      <SecondaryInfoBar />

      {/* Signal Summary */}
      <section>
        <SectionTitle>Conviction Signals</SectionTitle>
        <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-6">
          <SignalSummaryPanel
            taScore={taScore}
            fundamentalScore={fundamentalScore}
            overallScore={overallScore}
            onChainScore={onChainScore}
          />
        </div>
      </section>

      {/* Summary interpretation */}
      <SummaryText score={overallScore?.totalScore ?? null} />

      {/* Position vs model — the decision layer */}
      <AllocationPanel
        overallScore={overallScore?.totalScore ?? null}
        tenYearYield={macroData?.tenYearYield ?? null}
      />

      {/* Alerts + Key metrics */}
      <section>
        <SectionTitle>Key Alerts</SectionTitle>
        <KeyAlerts inputs={alertInputs} />
      </section>

      {/* Price chart — full width */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>Price Chart</SectionTitle>
          <Link
            href="/bitcoin/technical"
            className="text-xs text-[#3b82f6] hover:text-[#60a5fa] font-mono flex items-center gap-1 mb-4"
          >
            Full Chart →
          </Link>
        </div>
        <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg overflow-hidden">
          {candles.length > 0 ? (
            <CandlestickChart
              candles={candles}
              interval={chartInterval}
              onIntervalChange={setChartInterval}
              height={460}
            />
          ) : (
            <div className="h-[460px] flex items-center justify-center text-[#555] text-sm font-mono">
              Loading chart data…
            </div>
          )}
        </div>
      </section>

      {/* Backtest panel — below chart */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>Backtest</SectionTitle>
          <Link
            href="/bitcoin/technical"
            className="text-xs text-[#3b82f6] hover:text-[#60a5fa] font-mono flex items-center gap-1 mb-4"
          >
            Full Analysis →
          </Link>
        </div>
        <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-5">
          <BacktestPanel compact={true} />
        </div>
      </section>
    </div>
  )
}
