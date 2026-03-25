'use client'
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineData,
  ColorType,
  CrosshairMode,
  UTCTimestamp,
  LineStyle,
  SeriesMarker,
  Time,
} from 'lightweight-charts'
import type { OHLCV, TimeInterval } from '@/lib/types'
import { formatPrice } from '@/lib/format'
import { COLOR_TOKENS } from '@/lib/constants'
import { calcEMA } from '@/lib/calc/ema'
import { calcSMA } from '@/lib/calc/sma'
import { calcBollinger } from '@/lib/calc/bollinger'

export interface ChartHandle {
  chart: IChartApi | null
}

interface CandlestickChartProps {
  candles: OHLCV[]
  interval: TimeInterval
  onIntervalChange: (i: TimeInterval) => void
  height?: number
}

const TIMEFRAMES: { label: string; value: TimeInterval }[] = [
  { label: '1H', value: '1h' },
  { label: '4H', value: '4h' },
  { label: '1D', value: '1d' },
  { label: '1W', value: '1w' },
]

type ChartType = 'candlestick' | 'line'

// ── MA Config ───────────────────────────────────────────────────────────────
interface MAConfig {
  key: string
  label: string
  type: 'ema' | 'sma'
  period: number
  color: string
  defaultOn: boolean
}

const MA_CONFIGS: MAConfig[] = [
  { key: 'ema21',  label: 'EMA 21',  type: 'ema', period: 21,  color: '#60a5fa', defaultOn: true  },
  { key: 'ema55',  label: 'EMA 55',  type: 'ema', period: 55,  color: '#f59e0b', defaultOn: true  },
  { key: 'ema200', label: 'EMA 200', type: 'ema', period: 200, color: '#ef4444', defaultOn: true  },
  { key: 'sma20',  label: 'SMA 20',  type: 'sma', period: 20,  color: '#a78bfa', defaultOn: false },
  { key: 'sma50',  label: 'SMA 50',  type: 'sma', period: 50,  color: '#34d399', defaultOn: false },
  { key: 'sma100', label: 'SMA 100', type: 'sma', period: 100, color: '#fb923c', defaultOn: false },
  { key: 'sma200', label: 'SMA 200', type: 'sma', period: 200, color: '#f87171', defaultOn: false },
  { key: 'sma365', label: 'SMA 365', type: 'sma', period: 365, color: '#e879f9', defaultOn: false },
]

/**
 * Main BTC price chart with:
 * - Candlestick / Line toggle
 * - Log scale toggle
 * - MA overlay toggles (8 MAs)
 * - Bollinger Bands overlay
 * - Golden / Death Cross markers
 */
export const CandlestickChart = forwardRef<ChartHandle, CandlestickChartProps>(
  function CandlestickChart({ candles, interval, onIntervalChange, height = 500 }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<IChartApi | null>(null)
    const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
    const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
    const maSeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map())
    const bbSeriesRef = useRef<{
      upper: ISeriesApi<'Line'>
      middle: ISeriesApi<'Line'>
      lower: ISeriesApi<'Line'>
    } | null>(null)

    const [chartType, setChartType] = useState<ChartType>('candlestick')
    const [logScale, setLogScale] = useState(false)
    const [showBB, setShowBB] = useState(false)
    const [showMAPanel, setShowMAPanel] = useState(false)
    const [activeMA, setActiveMA] = useState<Set<string>>(
      () => new Set(MA_CONFIGS.filter((m) => m.defaultOn).map((m) => m.key))
    )

    // Tooltip state
    const [tooltip, setTooltip] = useState<{
      visible: boolean
      x: number
      y: number
      open: number
      high: number
      low: number
      close: number
      volume: number
      time: number
    } | null>(null)

    useImperativeHandle(ref, () => ({ chart: chartRef.current }))

    // ── Init chart ────────────────────────────────────────────────────────
    useEffect(() => {
      if (!containerRef.current) return

      const chart = createChart(containerRef.current, {
        height,
        layout: {
          background: { type: ColorType.Solid, color: COLOR_TOKENS.bgCard },
          textColor: COLOR_TOKENS.textSecondary,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11,
        },
        grid: {
          vertLines: { color: COLOR_TOKENS.borderDefault },
          horzLines: { color: COLOR_TOKENS.borderDefault },
        },
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: {
          borderColor: COLOR_TOKENS.borderDefault,
          mode: logScale ? 1 : 0,
        },
        timeScale: {
          borderColor: COLOR_TOKENS.borderDefault,
          timeVisible: true,
          secondsVisible: false,
        },
        handleScroll: true,
        handleScale: true,
      })

      chartRef.current = chart
      if (ref && typeof ref === 'object') ref.current = { chart }

      // Candlestick series
      const candleSeries = chart.addCandlestickSeries({
        upColor: COLOR_TOKENS.accentGreen,
        downColor: COLOR_TOKENS.accentRed,
        borderUpColor: COLOR_TOKENS.accentGreen,
        borderDownColor: COLOR_TOKENS.accentRed,
        wickUpColor: COLOR_TOKENS.accentGreen,
        wickDownColor: COLOR_TOKENS.accentRed,
      })
      candleSeriesRef.current = candleSeries

      // Line series (alternative chart type)
      const lineSeries = chart.addLineSeries({
        color: COLOR_TOKENS.accentBlue,
        lineWidth: 2,
        visible: false,
        priceLineVisible: false,
      })
      lineSeriesRef.current = lineSeries

      // Bollinger Bands series
      const bbUpper = chart.addLineSeries({
        color: '#64748b88',
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        visible: false,
        priceLineVisible: false,
        lastValueVisible: false,
        title: 'BB Upper',
      })
      const bbMiddle = chart.addLineSeries({
        color: '#94a3b855',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        visible: false,
        priceLineVisible: false,
        lastValueVisible: false,
        title: 'BB Mid',
      })
      const bbLower = chart.addLineSeries({
        color: '#64748b88',
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        visible: false,
        priceLineVisible: false,
        lastValueVisible: false,
        title: 'BB Lower',
      })
      bbSeriesRef.current = { upper: bbUpper, middle: bbMiddle, lower: bbLower }

      // Crosshair tooltip
      chart.subscribeCrosshairMove((param) => {
        if (!param.time || !param.point) {
          setTooltip(null)
          return
        }
        const timeVal =
          typeof param.time === 'number'
            ? param.time
            : new Date(param.time as string).getTime() / 1000

        const matched = candles.find((c) => c.time === timeVal)
        if (!matched) {
          setTooltip(null)
          return
        }

        setTooltip({
          visible: true,
          x: param.point.x,
          y: param.point.y,
          open: matched.open,
          high: matched.high,
          low: matched.low,
          close: matched.close,
          volume: matched.volume,
          time: matched.time,
        })
      })

      const ro = new ResizeObserver(() => {
        if (containerRef.current && chartRef.current) {
          chartRef.current.applyOptions({ width: containerRef.current.clientWidth })
        }
      })
      ro.observe(containerRef.current)

      // ── Price-axis scroll zoom (TradingView-style) ─────────────────────
      const el = containerRef.current

      const handleWheel = (e: WheelEvent) => {
        const c = chartRef.current
        if (!c || !el) return
        const psWidth = c.priceScale('right').width()
        const rect = el.getBoundingClientRect()
        if (e.clientX - rect.left < rect.width - psWidth) return
        e.preventDefault()
        const margins = c.priceScale('right').options().scaleMargins ?? { top: 0.1, bottom: 0.1 }
        // scroll up (deltaY < 0) = zoom in; scroll down = zoom out
        const delta = e.deltaY < 0 ? 0.03 : -0.03
        c.priceScale('right').applyOptions({
          scaleMargins: {
            top: Math.max(0, Math.min(0.45, margins.top + delta)),
            bottom: Math.max(0, Math.min(0.45, margins.bottom + delta)),
          },
        })
      }

      const handleMouseMove = (e: MouseEvent) => {
        const c = chartRef.current
        if (!c || !el) return
        const psWidth = c.priceScale('right').width()
        const rect = el.getBoundingClientRect()
        el.style.cursor = e.clientX - rect.left >= rect.width - psWidth ? 'ns-resize' : ''
      }

      el.addEventListener('wheel', handleWheel, { passive: false })
      el.addEventListener('mousemove', handleMouseMove)

      return () => {
        ro.disconnect()
        el.removeEventListener('wheel', handleWheel)
        el.removeEventListener('mousemove', handleMouseMove)
        chart.remove()
        chartRef.current = null
        candleSeriesRef.current = null
        lineSeriesRef.current = null
        bbSeriesRef.current = null
        maSeriesRef.current.clear()
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [height])

    // ── Update price data ─────────────────────────────────────────────────
    useEffect(() => {
      if (!candleSeriesRef.current || !lineSeriesRef.current || candles.length === 0) return

      const candleData: CandlestickData[] = candles.map((c) => ({
        time: c.time as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
      const lineData: LineData[] = candles.map((c) => ({
        time: c.time as UTCTimestamp,
        value: c.close,
      }))

      candleSeriesRef.current.setData(candleData)
      lineSeriesRef.current.setData(lineData)
      chartRef.current?.timeScale().fitContent()
    }, [candles])

    // ── Update MA overlays ────────────────────────────────────────────────
    useEffect(() => {
      const chart = chartRef.current
      if (!chart || candles.length === 0) return

      for (const cfg of MA_CONFIGS) {
        const isActive = activeMA.has(cfg.key)
        let series = maSeriesRef.current.get(cfg.key)

        if (!series) {
          series = chart.addLineSeries({
            color: cfg.color,
            lineWidth: 1,
            lineStyle: LineStyle.Solid,
            visible: isActive,
            priceLineVisible: false,
            lastValueVisible: false,
            title: cfg.label,
          })
          maSeriesRef.current.set(cfg.key, series)

          // Compute and set data
          const maData =
            cfg.type === 'ema'
              ? calcEMA(candles, cfg.period)
              : calcSMA(candles, cfg.period)

          series.setData(
            maData.map((d) => ({ time: d.time as UTCTimestamp, value: d.value }))
          )
        } else {
          series.applyOptions({ visible: isActive })
        }
      }
    }, [activeMA, candles])

    // Recompute MA data when candles change
    useEffect(() => {
      const chart = chartRef.current
      if (!chart || candles.length === 0) return

      for (const cfg of MA_CONFIGS) {
        const series = maSeriesRef.current.get(cfg.key)
        if (!series) continue
        const maData =
          cfg.type === 'ema'
            ? calcEMA(candles, cfg.period)
            : calcSMA(candles, cfg.period)
        series.setData(
          maData.map((d) => ({ time: d.time as UTCTimestamp, value: d.value }))
        )
      }
    }, [candles])

    // ── Bollinger Bands overlay ───────────────────────────────────────────
    useEffect(() => {
      if (!bbSeriesRef.current || candles.length === 0) return
      const { upper, middle, lower } = bbSeriesRef.current
      upper.applyOptions({ visible: showBB })
      middle.applyOptions({ visible: showBB })
      lower.applyOptions({ visible: showBB })
    }, [showBB, candles])

    useEffect(() => {
      if (!bbSeriesRef.current || !showBB || candles.length === 0) return
      const { upper, middle, lower } = bbSeriesRef.current
      const bbData = calcBollinger(candles)
      upper.setData(bbData.map((d) => ({ time: d.time as UTCTimestamp, value: d.upper })))
      middle.setData(bbData.map((d) => ({ time: d.time as UTCTimestamp, value: d.middle })))
      lower.setData(bbData.map((d) => ({ time: d.time as UTCTimestamp, value: d.lower })))
    }, [showBB, candles])

    // ── Golden / Death Cross markers ──────────────────────────────────────
    useEffect(() => {
      if (!candleSeriesRef.current || candles.length === 0) return

      const sma50 = calcSMA(candles, 50)
      const sma200 = calcSMA(candles, 200)

      // Align on matching times
      const sma50Map = new Map(sma50.map((d) => [d.time, d.value]))
      const markers: SeriesMarker<Time>[] = []

      let prevDiff: number | null = null
      for (const point of sma200) {
        const s50 = sma50Map.get(point.time)
        if (s50 === undefined) continue
        const diff = s50 - point.value
        if (prevDiff !== null) {
          if (prevDiff <= 0 && diff > 0) {
            // Golden Cross
            markers.push({
              time: point.time as UTCTimestamp,
              position: 'belowBar',
              color: '#22c55e',
              shape: 'arrowUp',
              text: 'Golden Cross',
            })
          } else if (prevDiff >= 0 && diff < 0) {
            // Death Cross
            markers.push({
              time: point.time as UTCTimestamp,
              position: 'aboveBar',
              color: '#ef4444',
              shape: 'arrowDown',
              text: 'Death Cross',
            })
          }
        }
        prevDiff = diff
      }

      candleSeriesRef.current.setMarkers(markers)
    }, [candles])

    // ── Chart type toggle ─────────────────────────────────────────────────
    useEffect(() => {
      if (!candleSeriesRef.current || !lineSeriesRef.current) return
      candleSeriesRef.current.applyOptions({ visible: chartType === 'candlestick' })
      lineSeriesRef.current.applyOptions({ visible: chartType === 'line' })
    }, [chartType])

    // ── Log scale toggle ──────────────────────────────────────────────────
    useEffect(() => {
      chartRef.current?.applyOptions({ rightPriceScale: { mode: logScale ? 1 : 0 } })
    }, [logScale])

    const toggleMA = (key: string) => {
      setActiveMA((prev) => {
        const next = new Set(prev)
        next.has(key) ? next.delete(key) : next.add(key)
        return next
      })
    }

    return (
      <div className="relative bg-[#111120] rounded-xl border border-[#1a1a2e] overflow-hidden">
        {/* ── Controls bar ── */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#1a1a2e] flex-wrap gap-y-2">
          {/* Timeframe */}
          <div className="flex items-center gap-1">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.value}
                onClick={() => onIntervalChange(tf.value)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  interval === tf.value
                    ? 'bg-[#3b82f6] text-white'
                    : 'text-[#999999] hover:text-[#e0e0e0] hover:bg-[#1a1a2e]'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1.5">
            {/* MA panel toggle */}
            <button
              onClick={() => setShowMAPanel((v) => !v)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                showMAPanel
                  ? 'bg-[#3b82f6]/20 text-[#3b82f6] border border-[#3b82f6]/30'
                  : 'text-[#999999] hover:text-[#e0e0e0] hover:bg-[#1a1a2e]'
              }`}
            >
              MA
            </button>

            {/* Bollinger Bands */}
            <button
              onClick={() => setShowBB((v) => !v)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                showBB
                  ? 'bg-[#94a3b8]/20 text-[#94a3b8] border border-[#94a3b8]/30'
                  : 'text-[#999999] hover:text-[#e0e0e0] hover:bg-[#1a1a2e]'
              }`}
            >
              BB
            </button>

            {/* Chart type */}
            <button
              onClick={() => setChartType((t) => (t === 'candlestick' ? 'line' : 'candlestick'))}
              className="px-2.5 py-1 text-xs font-medium text-[#999999] hover:text-[#e0e0e0] hover:bg-[#1a1a2e] rounded transition-colors"
            >
              {chartType === 'candlestick' ? 'Line' : 'Candles'}
            </button>

            {/* Log scale */}
            <button
              onClick={() => setLogScale((l) => !l)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                logScale
                  ? 'bg-[#8b5cf6]/20 text-[#8b5cf6] border border-[#8b5cf6]/30'
                  : 'text-[#999999] hover:text-[#e0e0e0] hover:bg-[#1a1a2e]'
              }`}
            >
              Log
            </button>
          </div>
        </div>

        {/* ── MA toggle panel ── */}
        {showMAPanel && (
          <div className="flex flex-wrap items-center gap-1.5 px-4 py-2 border-b border-[#1a1a2e] bg-[#0d0d14]">
            {MA_CONFIGS.map((cfg) => {
              const isOn = activeMA.has(cfg.key)
              return (
                <button
                  key={cfg.key}
                  onClick={() => toggleMA(cfg.key)}
                  className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded border transition-colors ${
                    isOn
                      ? 'border-current opacity-100'
                      : 'border-[#2a2a3e] text-[#555566] opacity-60'
                  }`}
                  style={isOn ? { color: cfg.color, borderColor: cfg.color + '55' } : {}}
                >
                  <span
                    className="inline-block w-3 h-0.5 rounded-full"
                    style={{ backgroundColor: isOn ? cfg.color : '#555566' }}
                  />
                  {cfg.label}
                </button>
              )
            })}
          </div>
        )}

        {/* ── Chart container ── */}
        <div ref={containerRef} className="w-full relative">
          {/* OHLCV Tooltip */}
          {tooltip?.visible && (
            <div
              className="absolute z-10 pointer-events-none bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-2 text-xs font-mono"
              style={{
                left: Math.min(
                  tooltip.x + 12,
                  (containerRef.current?.clientWidth ?? 400) - 160
                ),
                top: Math.max(tooltip.y - 80, 8),
              }}
            >
              <div className="text-[#666666] mb-1">
                {new Date(tooltip.time * 1000).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                <span className="text-[#666666]">O</span>
                <span className="text-[#e0e0e0]">{formatPrice(tooltip.open)}</span>
                <span className="text-[#666666]">H</span>
                <span className="text-[#22c55e]">{formatPrice(tooltip.high)}</span>
                <span className="text-[#666666]">L</span>
                <span className="text-[#ef4444]">{formatPrice(tooltip.low)}</span>
                <span className="text-[#666666]">C</span>
                <span
                  className={tooltip.close >= tooltip.open ? 'text-[#22c55e]' : 'text-[#ef4444]'}
                >
                  {formatPrice(tooltip.close)}
                </span>
                {tooltip.volume > 0 && (
                  <>
                    <span className="text-[#666666]">V</span>
                    <span className="text-[#999999]">
                      {(tooltip.volume / 1_000_000).toFixed(1)}M
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }
)
