'use client'
import { useEffect, useRef } from 'react'
import { createChart, IChartApi, ColorType, UTCTimestamp } from 'lightweight-charts'
import type { OHLCV } from '@/lib/types'
import { calcTwoYearMA } from '@/lib/calc/technical-scores'
import { COLOR_TOKENS } from '@/lib/constants'
import { formatPrice } from '@/lib/format'

interface TwoYearMAChartProps {
  candles: OHLCV[]
  height?: number
}

export function TwoYearMAChart({ candles, height = 320 }: TwoYearMAChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)

  const twoYearData = calcTwoYearMA(candles)
  const latest = twoYearData[twoYearData.length - 1]
  const currentPrice = candles[candles.length - 1]?.close ?? 0
  const position = latest
    ? ((currentPrice - latest.ma730) / (latest.ma730x5 - latest.ma730)) * 100
    : null

  const positionColor = position === null ? '#999'
    : position < 0 ? '#22c55e'
    : position < 50 ? '#86efac'
    : position < 80 ? '#f59e0b'
    : position < 100 ? '#f87171'
    : '#ef4444'

  useEffect(() => {
    if (!containerRef.current || twoYearData.length === 0) return

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

    // Price
    const priceSeries = chart.addLineSeries({
      color: '#e0e0e0',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    })
    priceSeries.setData(
      twoYearData.map((d) => ({ time: d.time as UTCTimestamp, value: d.price }))
    )

    // 2-Year MA (green floor)
    const maFloor = chart.addLineSeries({
      color: '#22c55e',
      lineWidth: 2,
      title: '2Y MA',
      priceLineVisible: false,
      lastValueVisible: true,
    })
    maFloor.setData(
      twoYearData.map((d) => ({ time: d.time as UTCTimestamp, value: d.ma730 }))
    )

    // 5× ceiling (red)
    const maCeil = chart.addLineSeries({
      color: '#ef4444',
      lineWidth: 2,
      title: '2Y MA ×5',
      priceLineVisible: false,
      lastValueVisible: true,
    })
    maCeil.setData(
      twoYearData.map((d) => ({ time: d.time as UTCTimestamp, value: d.ma730x5 }))
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
  }, [twoYearData, height])

  return (
    <div className="bg-[#111120] rounded-xl border border-[#1a1a2e] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a2e]">
        <div>
          <div className="text-xs font-bold text-[#e0e0e0] font-mono">2-Year MA Multiplier</div>
          <div className="text-[10px] text-[#555566] font-mono">730d SMA floor · 730d SMA×5 ceiling</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-[#555566] font-mono uppercase tracking-widest">Position</div>
          <div className="text-sm font-bold font-mono" style={{ color: positionColor }}>
            {position !== null ? `${Math.round(position)}%` : '—'}
          </div>
        </div>
      </div>

      {candles.length < 730 ? (
        <div className="flex items-center justify-center h-40 text-[#555566] text-xs font-mono">
          Insufficient data — need 730+ daily candles
        </div>
      ) : (
        <div ref={containerRef} style={{ height }} />
      )}

      <div className="px-4 py-2 border-t border-[#1a1a2e] bg-[#0d0d14] flex items-center gap-4">
        {latest && (
          <>
            <span className="text-[10px] font-mono text-[#555566]">
              2Y MA: <span className="text-[#22c55e]">{formatPrice(latest.ma730)}</span>
            </span>
            <span className="text-[10px] font-mono text-[#555566]">
              5× Ceiling: <span className="text-[#ef4444]">{formatPrice(latest.ma730x5)}</span>
            </span>
          </>
        )}
        <span className="ml-auto text-[10px] font-mono text-[#444455]">below floor = undervalued · above ceiling = overvalued</span>
      </div>
    </div>
  )
}
