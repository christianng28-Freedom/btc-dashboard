'use client'
import { useEffect, useRef, useState } from 'react'
import {
  createChart,
  IChartApi,
  ColorType,
  UTCTimestamp,
  SeriesMarker,
} from 'lightweight-charts'
import type { OHLCV } from '@/lib/types'
import { calcPiCycle, getPiCycleGap } from '@/lib/calc/technical-scores'
import { COLOR_TOKENS, PI_CYCLE_TOP_DATES } from '@/lib/constants'

interface PiCycleChartProps {
  candles: OHLCV[]
  extendedCandles?: OHLCV[]
  height?: number
}

const CHECKONCHAIN_URL =
  'https://charts.checkonchain.com/btconchain/pricing/pricing_picycleindicator/pricing_picycleindicator_light.html'

type Zoom = 'all' | '3y' | '1y' | '6m'

const ZOOM_BUTTONS: { key: Zoom; label: string }[] = [
  { key: 'all', label: 'Full History' },
  { key: '3y', label: '3Y' },
  { key: '1y', label: '1Y' },
  { key: '6m', label: '6M' },
]

export function PiCycleChart({ candles, extendedCandles, height = 320 }: PiCycleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const oscContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const oscChartRef = useRef<IChartApi | null>(null)
  const [activeZoom, setActiveZoom] = useState<Zoom>('all')

  // Prefer extended history (CoinGecko ~2013) over short Binance history
  const sourceCandles =
    extendedCandles && extendedCandles.length > 350 ? extendedCandles : candles

  const piData = calcPiCycle(sourceCandles)
  const gap = getPiCycleGap(sourceCandles)

  const gapColor = !gap
    ? '#999'
    : gap.gapPct > 20
    ? '#22c55e'
    : gap.gapPct > 5
    ? '#f59e0b'
    : '#ef4444'
  const gapLabel = !gap
    ? '—'
    : gap.gapPct > 0
    ? `111DMA is ${gap.gapPct.toFixed(1)}% below 350DMAx2`
    : `111DMA crossed above 350DMAx2 — TOP SIGNAL`

  useEffect(() => {
    if (!containerRef.current || !oscContainerRef.current || piData.length === 0) return

    const sharedLayout = {
      background: { type: ColorType.Solid, color: COLOR_TOKENS.bgCard },
      textColor: COLOR_TOKENS.textSecondary,
      fontFamily: 'JetBrains Mono, monospace',
    }
    const sharedGrid = {
      vertLines: { color: COLOR_TOKENS.borderDefault },
      horzLines: { color: COLOR_TOKENS.borderDefault },
    }

    // ── Main chart ─────────────────────────────────────────────────────────
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: sharedLayout,
      grid: sharedGrid,
      rightPriceScale: { mode: 1 }, // log scale
      timeScale: { borderColor: COLOR_TOKENS.borderDefault },
      crosshair: { vertLine: { color: '#444455' }, horzLine: { color: '#444455' } },
    })
    chartRef.current = chart

    // Price line
    const priceSeries = chart.addLineSeries({
      color: '#e0e0e0',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    })
    priceSeries.setData(
      piData.map((d) => ({ time: d.time as UTCTimestamp, value: d.price }))
    )

    // Cycle top markers at confirmed historical crossover dates
    const piTimeSet = new Set(piData.map((d) => d.time))
    const markers: SeriesMarker<UTCTimestamp>[] = PI_CYCLE_TOP_DATES.flatMap((dateStr) => {
      const ts = Math.floor(new Date(dateStr).getTime() / 1000)
      if (!piTimeSet.has(ts)) return []
      return [{
        time: ts as UTCTimestamp,
        position: 'aboveBar' as const,
        color: '#ef4444',
        shape: 'arrowDown' as const,
        text: 'TOP',
        size: 2,
      }]
    })
    if (markers.length > 0) priceSeries.setMarkers(markers)

    // 111 DMA (green)
    chart.addLineSeries({
      color: '#22c55e',
      lineWidth: 2,
      title: '111 DMA',
      priceLineVisible: false,
      lastValueVisible: true,
    }).setData(piData.map((d) => ({ time: d.time as UTCTimestamp, value: d.ma111 })))

    // 350 DMA x2 (orange)
    chart.addLineSeries({
      color: '#f97316',
      lineWidth: 2,
      title: '350DMA×2',
      priceLineVisible: false,
      lastValueVisible: true,
    }).setData(piData.map((d) => ({ time: d.time as UTCTimestamp, value: d.ma350x2 })))

    chart.timeScale().fitContent()

    // ── Oscillator sub-chart ───────────────────────────────────────────────
    const oscChart = createChart(oscContainerRef.current!, {
      width: oscContainerRef.current!.clientWidth,
      height: 110,
      layout: sharedLayout,
      grid: sharedGrid,
      rightPriceScale: { mode: 0 },
      timeScale: { borderColor: COLOR_TOKENS.borderDefault, visible: true },
      crosshair: { vertLine: { color: '#444455' }, horzLine: { color: '#444455' } },
    })
    oscChartRef.current = oscChart

    const oscData = piData
      .filter((d) => d.ma350x2 > 0)
      .map((d) => ({
        time: d.time as UTCTimestamp,
        value: ((d.ma350x2 - d.ma111) / d.ma350x2) * 100,
      }))

    const oscSeries = oscChart.addAreaSeries({
      lineColor: '#8b5cf6',
      topColor: 'rgba(139,92,246,0.35)',
      bottomColor: 'rgba(139,92,246,0.02)',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: true,
    })
    oscSeries.setData(oscData)
    oscSeries.createPriceLine({
      price: 0,
      color: '#ef4444',
      lineWidth: 1,
      lineStyle: 0,
      axisLabelVisible: true,
      title: '0%',
    })

    oscChart.timeScale().fitContent()

    // ── Sync time scales (main ↔ oscillator) ─────────────────────────────
    let syncing = false
    chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
      if (syncing || !range) return
      syncing = true
      oscChart.timeScale().setVisibleRange(range)
      syncing = false
    })
    oscChart.timeScale().subscribeVisibleTimeRangeChange((range) => {
      if (syncing || !range) return
      syncing = true
      chart.timeScale().setVisibleRange(range)
      syncing = false
    })

    // ── ResizeObserver ────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      if (containerRef.current) chart.resize(containerRef.current.clientWidth, height)
      if (oscContainerRef.current) oscChart.resize(oscContainerRef.current.clientWidth, 110)
    })
    ro.observe(containerRef.current)
    ro.observe(oscContainerRef.current!)

    return () => {
      ro.disconnect()
      chart.remove()
      oscChart.remove()
      chartRef.current = null
      oscChartRef.current = null
    }
  }, [piData, height])

  // ── Zoom preset handler ─────────────────────────────────────────────────
  function applyZoom(zoom: Zoom) {
    setActiveZoom(zoom)
    const chart = chartRef.current
    if (!chart) return
    if (zoom === 'all') {
      chart.timeScale().fitContent()
      return
    }
    const now = Math.floor(Date.now() / 1000) as UTCTimestamp
    const days = zoom === '6m' ? 182 : zoom === '1y' ? 365 : 1095
    const from = (now - days * 86400) as UTCTimestamp
    chart.timeScale().setVisibleRange({ from, to: now })
  }

  return (
    <div className="bg-[#111120] rounded-xl border border-[#1a1a2e] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a2e]">
        <div>
          <div className="text-xs font-bold text-[#e0e0e0] font-mono">Pi Cycle Top Indicator</div>
          <div className="text-[10px] text-[#555566] font-mono">
            111DMA vs 350DMA×2 — historical cycle top signal
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={CHECKONCHAIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-mono text-[#555566] hover:text-[#8b5cf6] transition-colors"
          >
            ↗ CheckOnChain
          </a>
          <div className="text-right">
            <div className="text-[10px] text-[#555566] font-mono uppercase tracking-widest">Gap</div>
            <div className="text-sm font-bold font-mono" style={{ color: gapColor }}>
              {gap ? `${gap.gapPct.toFixed(1)}%` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Zoom presets */}
      <div className="flex gap-1 px-4 py-2 border-b border-[#1a1a2e]">
        {ZOOM_BUTTONS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => applyZoom(key)}
            className={`text-[10px] font-mono px-2 py-0.5 rounded transition-colors ${
              activeZoom === key
                ? 'bg-[#1a1a2e] text-[#e0e0e0]'
                : 'text-[#555566] hover:text-[#999] hover:bg-[#161630]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Charts */}
      {sourceCandles.length < 350 ? (
        <div className="flex items-center justify-center h-40 text-[#555566] text-xs font-mono">
          Insufficient data — need 350+ daily candles
        </div>
      ) : (
        <>
          <div ref={containerRef} style={{ height }} />
          <div className="border-t border-[#1a1a2e]">
            <div className="px-4 pt-1.5 pb-0">
              <span className="text-[9px] font-mono text-[#555566] uppercase tracking-widest">
                Pi Cycle Oscillator — Gap %
              </span>
            </div>
            <div ref={oscContainerRef} style={{ height: 110 }} />
          </div>
        </>
      )}

      {/* Legend */}
      <div className="px-4 py-2 border-t border-[#1a1a2e] bg-[#0d0d14]">
        <span className="text-[10px] font-mono" style={{ color: gapColor }}>
          {gapLabel}
        </span>
        <div className="flex gap-4 mt-1">
          <span className="text-[10px] font-mono text-[#555566]">
            <span className="text-[#22c55e]">●</span> 111 DMA
          </span>
          <span className="text-[10px] font-mono text-[#555566]">
            <span className="text-[#f97316]">●</span> 350 DMA × 2
          </span>
          <span className="text-[10px] font-mono text-[#555566]">
            <span className="text-[#e0e0e0]">●</span> Price
          </span>
          <span className="text-[10px] font-mono text-[#555566]">
            <span className="text-[#ef4444]">▼</span> Cycle Top
          </span>
          <span className="text-[10px] font-mono text-[#555566]">
            <span className="text-[#8b5cf6]">●</span> Oscillator
          </span>
        </div>
      </div>
    </div>
  )
}
