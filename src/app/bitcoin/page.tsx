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
import { useCompositeScore } from '@/hooks/useCompositeScore'
import { useOnChainScore } from '@/hooks/useOnChainScore'
import { SignalSummaryPanel } from '@/components/dashboard/SignalSummaryPanel'
import { SummaryText } from '@/components/dashboard/SummaryText'
import { KeyAlerts } from '@/components/dashboard/KeyAlerts'
import { SecondaryInfoBar } from '@/components/dashboard/SecondaryInfoBar'
import { BacktestPanel } from '@/components/backtest/BacktestPanel'
import { NewsFeed } from '@/components/global/NewsFeed'
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
  const { candles: historyCandles } = useHistoricalData()
  const { candles: extendedCandles } = useExtendedHistory()
  const { data: dominanceData } = useDominance()
  const { current: fgCurrent, sparkline: fgSparkline, isLoading: fgLoading } = useFearGreed()
  const { data: fundData, isLoading: fundLoading } = useFundamentalData()

  const dominancePct = dominanceData?.dominance ?? 50

  // ── Scores ───────────────────────────────────────────────────────
  const taScore = useTechnicalIndicators(candles, historyCandles, dominancePct)

  const fundamentalScore = useMemo(() => {
    if (!fgCurrent) return null
    return calcFundamentalScore({
      fearGreed: parseInt(fgCurrent.value, 10),
      oiValue: fundData?.currentOI ?? 0,
      oi90dMA: fundData?.oi90dMA ?? 0,
      fundingRate: fundData?.currentFundingRate ?? 0,
    })
  }, [fgCurrent, fundData])

  const onChainScore = useOnChainScore()
  const overallScore = useCompositeScore(taScore, fundamentalScore, onChainScore)

  // ── Alert inputs ────────────────────────────────────────────────
  const alertInputs = useMemo((): AlertInputs => {
    const inputs: AlertInputs = {}

    if (candles.length > 0) {
      inputs.price = candles[candles.length - 1].close

      const rsiData = calcRSI(candles)
      if (rsiData.length > 0) inputs.rsi = rsiData[rsiData.length - 1].value

      const stochData = calcStochRSI(candles)
      if (stochData.length > 0) inputs.stochRsiK = stochData[stochData.length - 1].k

      const sma200 = calcSMA(candles, 200)
      if (sma200.length > 0) inputs.ma200 = sma200[sma200.length - 1].value

      const sma50 = calcSMA(candles, 50)
      if (sma50.length > 0) inputs.ma50 = sma50[sma50.length - 1].value
    }

    const piData = historyCandles.length >= 350 ? historyCandles : candles
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
  }, [candles, historyCandles, fgCurrent, fundData])

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

      {/* BTC Headlines */}
      <section className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg px-4 py-3">
        <NewsFeed maxItems={6} compact />
      </section>

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
