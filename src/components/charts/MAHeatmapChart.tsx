'use client'
import { useEffect, useRef, useMemo } from 'react'
import { createChart, IChartApi, ColorType, UTCTimestamp } from 'lightweight-charts'
import type { OHLCV } from '@/lib/types'
import { calcMAHeatmap } from '@/lib/calc/technical-scores'
import { COLOR_TOKENS } from '@/lib/constants'
import { formatPrice } from '@/lib/format'

interface MAHeatmapChartProps {
  candles: OHLCV[]
  extendedCandles?: OHLCV[]
  height?: number
}

const HEATMAP_ZONES = [
  { label: 'Deep Value', range: '< -30%', color: '#1d4ed8' },
  { label: 'Undervalued', range: '-30% to 0%', color: '#3b82f6' },
  { label: 'Fair Value', range: '0% to +20%', color: '#22c55e' },
  { label: 'Elevated', range: '+20% to +100%', color: '#eab308' },
  { label: 'Overheated', range: '+100% to +200%', color: '#f97316' },
  { label: 'Extreme Heat', range: '> +200%', color: '#ef4444' },
]

export function MAHeatmapChart({ candles, extendedCandles, height = 300 }: MAHeatmapChartProps) {
  const sourceCandles =
    extendedCandles && extendedCandles.length > 1400 ? extendedCandles : candles
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)

  const heatmapData = useMemo(() => calcMAHeatmap(sourceCandles), [sourceCandles])

  const latestPoint = heatmapData[heatmapData.length - 1]
  const currentZone = latestPoint
    ? HEATMAP_ZONES.find((z, i) => {
        const dev = latestPoint.deviationPct
        if (i === 0) return dev < -30
        if (i === 1) return dev >= -30 && dev < 0
        if (i === 2) return dev >= 0 && dev < 20
        if (i === 3) return dev >= 20 && dev < 100
        if (i === 4) return dev >= 100 && dev < 200
        return dev >= 200
      }) ?? null
    : null

  useEffect(() => {
    if (!containerRef.current || heatmapData.length === 0) return

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: COLOR_TOKENS.bgCard },
        textColor: COLOR_TOKENS.textSecondary,
        fontFamily: 'JetBrains Mono, monospace',
      },
      grid: {
        vertLines: { color: COLOR_TOKENS.borderDefault },
        horzLines: { color: COLOR_TOKENS.borderDefault },
      },
      rightPriceScale: { mode: 1 }, // log
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
      heatmapData.map((d) => ({ time: d.time as UTCTimestamp, value: d.price }))
    )

    // 200-Week MA (yellow)
    const maSeries = chart.addLineSeries({
      color: '#f59e0b',
      lineWidth: 2,
      title: '200W MA',
      priceLineVisible: false,
      lastValueVisible: true,
    })
    maSeries.setData(
      heatmapData.map((d) => ({ time: d.time as UTCTimestamp, value: d.ma200w }))
    )

    chart.timeScale().fitContent()

    const ro = new ResizeObserver(() => {
      if (containerRef.current) chart.resize(containerRef.current.clientWidth, height)
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
    }
  }, [heatmapData, height])

  return (
    <div className="bg-[#111120] rounded-xl border border-[#1a1a2e] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a2e]">
        <div>
          <div className="text-xs font-bold text-[#e0e0e0] font-mono">200-Week MA Heatmap</div>
          <div className="text-[10px] text-[#555566] font-mono">Price distance from 200-week moving average</div>
        </div>
        <div className="text-right">
          {latestPoint && (
            <>
              <div className="text-[10px] text-[#555566] font-mono uppercase tracking-widest">Distance</div>
              <div className="text-sm font-bold font-mono" style={{ color: latestPoint.color }}>
                {latestPoint.deviationPct > 0 ? '+' : ''}{latestPoint.deviationPct.toFixed(1)}%
              </div>
            </>
          )}
        </div>
      </div>

      {sourceCandles.length < 1400 ? (
        <div className="flex items-center justify-center h-40 text-[#555566] text-xs font-mono">
          Insufficient data — need 1400+ daily candles (4+ years)
        </div>
      ) : (
        <div ref={containerRef} style={{ height }} />
      )}

      <div className="px-4 py-2 border-t border-[#1a1a2e] bg-[#0d0d14]">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {HEATMAP_ZONES.map((z) => (
            <span
              key={z.label}
              className="text-[9px] font-mono flex items-center gap-1"
              style={{
                color: currentZone?.label === z.label ? z.color : '#444455',
                fontWeight: currentZone?.label === z.label ? 'bold' : 'normal',
              }}
            >
              <span style={{ color: z.color }}>■</span>
              {z.label}
              {currentZone?.label === z.label && ' ◀'}
            </span>
          ))}
        </div>
        {latestPoint && (
          <div className="mt-1 text-[9px] font-mono text-[#444455]">
            200W MA: {formatPrice(latestPoint.ma200w)} · Price: {formatPrice(latestPoint.price)}
          </div>
        )}
      </div>
    </div>
  )
}
