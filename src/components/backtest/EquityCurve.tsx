'use client'
import { useRef, useEffect } from 'react'
import { createChart, ColorType, type IChartApi, type ISeriesApi, type LineData, type UTCTimestamp } from 'lightweight-charts'

interface Props {
  equity: { time: number; value: number }[]
  totalReturn: number
  height?: number
}

export function EquityCurve({ equity, totalReturn, height = 140 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null)

  const isPositive = totalReturn >= 0
  const lineColor = isPositive ? '#22c55e' : '#ef4444'
  const topColor = isPositive ? '#22c55e33' : '#ef444433'

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    chartRef.current = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: '#111120' },
        textColor: '#555',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: '#1a1a2e' },
      },
      rightPriceScale: { borderVisible: false, textColor: '#555' },
      timeScale: { borderVisible: false, visible: false },
      crosshair: { vertLine: { visible: false }, horzLine: { visible: false } },
      handleScroll: false,
      handleScale: false,
      width: container.clientWidth,
      height,
    })

    seriesRef.current = chartRef.current.addAreaSeries({
      topColor,
      bottomColor: '#0a0a0f00',
      lineColor,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    })

    const data: LineData[] = equity
      .filter((e, i, arr) => i === 0 || e.time !== arr[i - 1].time)
      .map(e => ({ time: e.time as UTCTimestamp, value: e.value }))

    seriesRef.current.setData(data)
    chartRef.current.timeScale().fitContent()

    const ro = new ResizeObserver(() => {
      if (container && chartRef.current) {
        chartRef.current.applyOptions({ width: container.clientWidth })
      }
    })
    ro.observe(container)

    return () => {
      ro.disconnect()
      chartRef.current?.remove()
      chartRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update data without recreating chart
  useEffect(() => {
    if (!seriesRef.current || equity.length === 0) return
    const data: LineData[] = equity
      .filter((e, i, arr) => i === 0 || e.time !== arr[i - 1].time)
      .map(e => ({ time: e.time as UTCTimestamp, value: e.value }))
    seriesRef.current.setData(data)
    chartRef.current?.timeScale().fitContent()
  }, [equity])

  // Update colors when return flips
  useEffect(() => {
    seriesRef.current?.applyOptions({ topColor, lineColor })
  }, [topColor, lineColor])

  return <div ref={containerRef} className="rounded overflow-hidden" style={{ height }} />
}
