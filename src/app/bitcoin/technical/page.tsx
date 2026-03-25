'use client'
import { useRef, useState, useEffect, useMemo } from 'react'
import type { LogicalRange, MouseEventParams } from 'lightweight-charts'
import { useCandles } from '@/hooks/useCandles'
import { useHistoricalData } from '@/hooks/useHistoricalData'
import { useExtendedHistory } from '@/hooks/useExtendedHistory'
import { useDominance } from '@/hooks/useDominance'
import { useTechnicalIndicators } from '@/hooks/useTechnicalIndicators'
import { CandlestickChart, ChartHandle } from '@/components/charts/CandlestickChart'
import { RSISubchart } from '@/components/charts/RSISubchart'
import { MACDSubchart } from '@/components/charts/MACDSubchart'
import { StochRSISubchart } from '@/components/charts/StochRSISubchart'
import { SubchartHandle } from '@/components/charts/IndicatorSubchart'
import { PiCycleChart } from '@/components/charts/PiCycleChart'
import { TwoYearMAChart } from '@/components/charts/TwoYearMAChart'
import { RainbowChart } from '@/components/charts/RainbowChart'
import { MAHeatmapChart } from '@/components/charts/MAHeatmapChart'
import { BTCDominanceChart } from '@/components/charts/BTCDominanceChart'
import { RelativeStrengthChart } from '@/components/charts/RelativeStrengthChart'
import { useRelativeStrength } from '@/hooks/useRelativeStrength'
import { HalvingCountdown } from '@/components/widgets/HalvingCountdown'
import { GaugeChart } from '@/components/widgets/GaugeChart'
import type { TimeInterval } from '@/lib/types'
import { calcRSI } from '@/lib/calc/rsi'
import { calcMACD } from '@/lib/calc/macd'
import { calcStochRSI } from '@/lib/calc/stochastic-rsi'
import { calcSMA } from '@/lib/calc/sma'

type ActiveSubchart = 'rsi' | 'macd' | 'stochrsi' | null

export default function TechnicalPage() {
  const [interval, setIntervalState] = useState<TimeInterval>('1d')
  const [activeSubchart, setActiveSubchart] = useState<ActiveSubchart>('rsi')

  const { candles, isLoading, isError } = useCandles(interval, 500)
  const { candles: historyCandles, isLoading: historyLoading } = useHistoricalData()
  const { candles: extendedCandles } = useExtendedHistory()
  const { data: dominanceData } = useDominance()
  const { data: relStr, isLoading: relStrLoading, isError: relStrError } = useRelativeStrength()

  const dominancePct = dominanceData?.dominance ?? 50

  const score = useTechnicalIndicators(candles, historyCandles, dominancePct)

  // Chart refs for time-axis sync
  const mainChartRef = useRef<ChartHandle>(null)
  const rsiRef = useRef<SubchartHandle>(null)
  const macdRef = useRef<SubchartHandle>(null)
  const stochRef = useRef<SubchartHandle>(null)

  // Sync sub-chart visible range to main chart
  useEffect(() => {
    const mainChart = mainChartRef.current?.chart
    if (!mainChart) return

    const rangeHandler = (range: LogicalRange | null) => {
      if (!range) return
      for (const r of [rsiRef, macdRef, stochRef]) {
        r.current?.chart?.timeScale().setVisibleLogicalRange(range)
      }
    }
    mainChart.timeScale().subscribeVisibleLogicalRangeChange(rangeHandler)

    return () => {
      mainChart.timeScale().unsubscribeVisibleLogicalRangeChange(rangeHandler)
    }
  }, [candles])

  // Sync price-scale width so vertical crosshair aligns across all panes
  useEffect(() => {
    if (candles.length === 0) return
    const timer = setTimeout(() => {
      // Re-read ref inside timer — chart may have been destroyed between setup and execution
      const mainChart = mainChartRef.current?.chart
      if (!mainChart) return
      try {
        const psWidth = mainChart.priceScale('right').width()
        for (const r of [rsiRef, macdRef, stochRef]) {
          r.current?.chart?.priceScale('right').applyOptions({ minimumWidth: psWidth })
        }
      } catch {
        // chart was destroyed before timer fired — safe to ignore
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [candles])

  // Sync crosshair vertical line from main chart to indicator subcharts
  useEffect(() => {
    const mainChart = mainChartRef.current?.chart
    if (!mainChart) return

    const crosshairHandler = (param: MouseEventParams) => {
      const subRefs = [rsiRef, macdRef, stochRef]
      if (!param.time || !param.point) {
        for (const r of subRefs) r.current?.chart?.clearCrosshairPosition()
        return
      }
      for (const r of subRefs) {
        const h = r.current
        if (h?.chart && h.series) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          h.chart.setCrosshairPosition(0, param.time, h.series as any)
        }
      }
    }

    mainChart.subscribeCrosshairMove(crosshairHandler)
    return () => mainChart.unsubscribeCrosshairMove(crosshairHandler)
  }, [candles])

  // Derive latest indicator values for the stats strip
  const latestRSI = useMemo(() => {
    if (candles.length === 0) return null
    const data = calcRSI(candles)
    return data.length > 0 ? data[data.length - 1].value : null
  }, [candles])

  const latestMACD = useMemo(() => {
    if (candles.length === 0) return null
    const data = calcMACD(candles)
    return data.length > 0 ? data[data.length - 1] : null
  }, [candles])

  const latestStoch = useMemo(() => {
    if (candles.length === 0) return null
    const data = calcStochRSI(candles)
    return data.length > 0 ? data[data.length - 1] : null
  }, [candles])

  const crossStatus = useMemo(() => {
    if (candles.length < 200) return null
    const sma50 = calcSMA(candles, 50)
    const sma200 = calcSMA(candles, 200)
    if (sma50.length === 0 || sma200.length === 0) return null
    return sma50[sma50.length - 1].value > sma200[sma200.length - 1].value ? 'golden' : 'death'
  }, [candles])

  const rsiZone = latestRSI === null ? '—' : latestRSI > 70 ? 'Overbought' : latestRSI < 30 ? 'Oversold' : 'Neutral'
  const rsiColor = latestRSI === null ? '#999' : latestRSI > 70 ? '#ef4444' : latestRSI < 30 ? '#22c55e' : '#f59e0b'

  const subchart_tabs: { key: ActiveSubchart; label: string }[] = [
    { key: 'rsi', label: 'RSI' },
    { key: 'macd', label: 'MACD' },
    { key: 'stochrsi', label: 'Stoch RSI' },
  ]

  return (
    <div className="p-6 space-y-8 max-w-[1600px]">

      {/* ── Page header + Composite Score ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#e0e0e0] tracking-tight">Technical Analysis</h1>
          <p className="text-sm text-[#666666] mt-1">
            Price action · Moving averages · Oscillators · Cycle tools · Composite score
          </p>
        </div>

        {/* TA Composite Score badge */}
        {score && (
          <div
            className="flex items-center gap-3 px-4 py-2 rounded-xl border"
            style={{ borderColor: score.color + '44', backgroundColor: score.color + '11' }}
          >
            <div className="text-right">
              <div className="text-[10px] font-mono text-[#555566] uppercase tracking-widest">TA Composite Score</div>
              <div className="text-2xl font-bold font-mono" style={{ color: score.color }}>
                {Math.round(score.totalScore)}
              </div>
            </div>
            <div className="text-sm font-bold font-mono" style={{ color: score.color }}>
              {score.label}
            </div>
          </div>
        )}
      </div>

      {/* ── Indicator stats strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-4">
          <div className="text-[10px] text-[#666666] uppercase tracking-widest mb-2 font-mono">RSI 14</div>
          <div className="text-2xl font-bold font-mono" style={{ color: rsiColor }}>
            {latestRSI !== null ? latestRSI.toFixed(1) : '—'}
          </div>
          <div className="text-xs mt-1" style={{ color: rsiColor }}>{rsiZone}</div>
        </div>

        <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-4">
          <div className="text-[10px] text-[#666666] uppercase tracking-widest mb-2 font-mono">MACD Hist</div>
          <div
            className="text-2xl font-bold font-mono"
            style={{ color: latestMACD ? (latestMACD.histogram >= 0 ? '#22c55e' : '#ef4444') : '#999' }}
          >
            {latestMACD ? (latestMACD.histogram >= 0 ? '+' : '') + latestMACD.histogram.toFixed(0) : '—'}
          </div>
          <div
            className="text-xs mt-1"
            style={{ color: latestMACD ? (latestMACD.histogram >= 0 ? '#22c55e' : '#ef4444') : '#999' }}
          >
            {latestMACD ? (latestMACD.histogram >= 0 ? 'Bullish momentum' : 'Bearish momentum') : '—'}
          </div>
        </div>

        <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-4">
          <div className="text-[10px] text-[#666666] uppercase tracking-widest mb-2 font-mono">Stoch RSI %K</div>
          <div
            className="text-2xl font-bold font-mono"
            style={{
              color: latestStoch
                ? latestStoch.k > 80 ? '#ef4444' : latestStoch.k < 20 ? '#22c55e' : '#f59e0b'
                : '#999',
            }}
          >
            {latestStoch ? latestStoch.k.toFixed(1) : '—'}
          </div>
          <div
            className="text-xs mt-1"
            style={{
              color: latestStoch
                ? latestStoch.k > 80 ? '#ef4444' : latestStoch.k < 20 ? '#22c55e' : '#f59e0b'
                : '#999',
            }}
          >
            {latestStoch
              ? latestStoch.k > 80 ? 'Overbought' : latestStoch.k < 20 ? 'Oversold' : 'Neutral'
              : '—'}
          </div>
        </div>

        <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-4">
          <div className="text-[10px] text-[#666666] uppercase tracking-widest mb-2 font-mono">MA Cross (50/200)</div>
          <div
            className="text-2xl font-bold font-mono"
            style={{ color: crossStatus === 'golden' ? '#22c55e' : crossStatus === 'death' ? '#ef4444' : '#999' }}
          >
            {crossStatus === 'golden' ? 'Golden' : crossStatus === 'death' ? 'Death' : '—'}
          </div>
          <div
            className="text-xs mt-1"
            style={{ color: crossStatus === 'golden' ? '#22c55e' : crossStatus === 'death' ? '#ef4444' : '#999' }}
          >
            {crossStatus === 'golden' ? '50 SMA > 200 SMA' : crossStatus === 'death' ? '50 SMA < 200 SMA' : 'Insufficient data'}
          </div>
        </div>
      </div>

      {/* ── Main chart + sub-charts ── */}
      <div className="bg-[#111120] rounded-xl border border-[#1a1a2e] overflow-hidden">
        {isLoading && (
          <div className="flex items-center justify-center h-[500px] text-[#666666] text-sm font-mono">
            Loading chart data…
          </div>
        )}
        {isError && (
          <div className="flex items-center justify-center h-[500px] text-[#ef4444] text-sm font-mono">
            Failed to load candle data
          </div>
        )}
        {!isLoading && !isError && candles.length > 0 && (
          <>
            <CandlestickChart
              ref={mainChartRef}
              candles={candles}
              interval={interval}
              onIntervalChange={setIntervalState}
              height={480}
            />

            {/* Sub-chart tab selector */}
            <div className="flex items-center gap-0 border-t border-[#1a1a2e] bg-[#0d0d14]">
              {subchart_tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveSubchart((prev) => (prev === tab.key ? null : tab.key))}
                  className={`px-4 py-2 text-xs font-mono transition-colors border-b-2 ${
                    activeSubchart === tab.key
                      ? 'text-[#e0e0e0] border-[#3b82f6]'
                      : 'text-[#555566] border-transparent hover:text-[#999999]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
              <div className="ml-auto px-4 py-2 text-[10px] text-[#444455] font-mono uppercase tracking-wider">
                Oscillators
              </div>
            </div>

            {activeSubchart === 'rsi' && <RSISubchart ref={rsiRef} candles={candles} height={130} />}
            {activeSubchart === 'macd' && <MACDSubchart ref={macdRef} candles={candles} height={130} />}
            {activeSubchart === 'stochrsi' && <StochRSISubchart ref={stochRef} candles={candles} height={130} />}
          </>
        )}
      </div>

      {/* ── Score breakdown ── */}
      {score && (
        <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs font-bold text-[#e0e0e0] font-mono">Technical Composite Score Breakdown</div>
              <div className="text-[10px] text-[#555566] font-mono">8 indicators weighted · 0 = value/buy · 100 = heat/sell</div>
            </div>
            <GaugeChart score={score.totalScore} label={score.label} color={score.color} size={160} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'RSI(14)', score: score.rsiScore, weight: '15%' },
              { label: 'MACD Histogram', score: score.macdScore, weight: '10%' },
              { label: 'Price vs 200SMA', score: score.priceVsMA200Score, weight: '15%' },
              { label: 'Bollinger %B', score: score.bollingerScore, weight: '10%' },
              { label: 'Stoch RSI %K', score: score.stochRsiScore, weight: '10%' },
              { label: 'Pi Cycle Proximity', score: score.piCycleScore, weight: '15%' },
              { label: '2-Year MA Position', score: score.twoYearMAScore, weight: '10%' },
              { label: 'BTC Dominance', score: score.dominanceScore, weight: '15%' },
            ].map((item) => {
              const c = item.score <= 35 ? '#22c55e' : item.score <= 65 ? '#f59e0b' : '#ef4444'
              return (
                <div key={item.label} className="bg-[#111120] rounded-lg p-3">
                  <div className="text-[9px] text-[#555566] font-mono uppercase tracking-widest">{item.label}</div>
                  <div className="text-[9px] text-[#333344] font-mono mb-1">w: {item.weight}</div>
                  <div className="text-base font-bold font-mono" style={{ color: c }}>{Math.round(item.score)}</div>
                  <div className="mt-1 h-1 rounded-full bg-[#1a1a2e] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${item.score}%`, backgroundColor: c }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Indicator reference ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-4 space-y-2">
          <div className="text-xs font-mono text-[#3b82f6] uppercase tracking-widest">RSI Zones</div>
          <div className="space-y-1 text-xs font-mono">
            <div className="flex justify-between"><span className="text-[#ef4444]">70 – 100</span><span className="text-[#666666]">Overbought</span></div>
            <div className="flex justify-between"><span className="text-[#f59e0b]">45 – 70</span><span className="text-[#666666]">Neutral–Bullish</span></div>
            <div className="flex justify-between"><span className="text-[#f59e0b]">30 – 45</span><span className="text-[#666666]">Neutral–Bearish</span></div>
            <div className="flex justify-between"><span className="text-[#22c55e]">0 – 30</span><span className="text-[#666666]">Oversold</span></div>
          </div>
        </div>
        <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-4 space-y-2">
          <div className="text-xs font-mono text-[#f59e0b] uppercase tracking-widest">MACD Signal</div>
          <div className="space-y-1 text-xs font-mono text-[#666666]">
            <div>Histogram &gt; 0 → Bullish momentum</div>
            <div>Histogram &lt; 0 → Bearish momentum</div>
            <div>MACD crosses signal ↑ → Buy</div>
            <div>MACD crosses signal ↓ → Sell</div>
          </div>
        </div>
        <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-4 space-y-2">
          <div className="text-xs font-mono text-[#22c55e] uppercase tracking-widest">MA Crosses</div>
          <div className="space-y-1 text-xs font-mono text-[#666666]">
            <div><span className="text-[#22c55e]">Golden Cross</span> — 50 SMA crosses above 200 SMA</div>
            <div><span className="text-[#ef4444]">Death Cross</span> — 50 SMA crosses below 200 SMA</div>
          </div>
        </div>
      </div>

      {/* ── Cycle Tools section header ── */}
      <div className="border-t border-[#1a1a2e] pt-6">
        <h2 className="text-lg font-bold text-[#e0e0e0] tracking-tight">Cycle Tools</h2>
        <p className="text-sm text-[#666666] mt-1">Long-term cycle positioning indicators</p>
      </div>

      {/* ── Cycle Tools grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Pi Cycle */}
        <PiCycleChart
          candles={historyCandles.length >= 350 ? historyCandles : candles}
          extendedCandles={extendedCandles}
          height={280}
        />

        {/* 2-Year MA Multiplier */}
        <TwoYearMAChart
          candles={historyCandles.length >= 730 ? historyCandles : candles}
          height={280}
        />
      </div>

      {/* Rainbow Chart — full width */}
      <RainbowChart candles={historyCandles.length >= 500 ? historyCandles : candles} height={320} />

      {/* 200W MA Heatmap — full width */}
      <MAHeatmapChart
        candles={historyCandles.length >= 1400 ? historyCandles : candles}
        extendedCandles={extendedCandles}
        height={280}
      />

      {/* Halving Countdown */}
      <HalvingCountdown />

      {/* ── Relative Strength section header ── */}
      <div className="border-t border-[#1a1a2e] pt-6">
        <h2 className="text-lg font-bold text-[#e0e0e0] tracking-tight">Relative Strength</h2>
        <p className="text-sm text-[#666666] mt-1">BTC vs major assets and macroeconomic indicators</p>
      </div>

      {/* Relative Strength grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <BTCDominanceChart />
        <RelativeStrengthChart
          title="BTC / Gold Ratio"
          description="BTC price relative to Gold price (USD/oz)"
          series="gold"
          ratioLabel="oz Gold per BTC"
          formatRatio={(v) => v.toFixed(1)}
          data={relStr?.gold}
          isLoading={relStrLoading}
          isError={relStrError}
          showTrendLine
        />
        <RelativeStrengthChart
          title="BTC / S&P 500 Ratio"
          description="BTC price relative to SPX index level"
          series="spx"
          ratioLabel="BTC/SPX ratio"
          formatRatio={(v) => v.toFixed(2)}
          data={relStr?.spx}
          isLoading={relStrLoading}
          isError={relStrError}
          showTrendLine
        />
        <RelativeStrengthChart
          title="BTC / DXY Inverse"
          description="BTC performance vs US Dollar Index"
          series="dxy"
          ratioLabel="BTC/DXY ratio"
          formatRatio={(v) => v.toFixed(0)}
          data={relStr?.dxy}
          isLoading={relStrLoading}
          isError={relStrError}
          correlationDays={90}
        />
      </div>
    </div>
  )
}
