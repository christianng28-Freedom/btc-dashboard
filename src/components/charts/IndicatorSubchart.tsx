'use client'
import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import {
  createChart,
  IChartApi,
  ColorType,
  CrosshairMode,
  UTCTimestamp,
  LineStyle,
  ISeriesApi,
} from 'lightweight-charts'
import { COLOR_TOKENS } from '@/lib/constants'

export interface SubchartHandle {
  chart: IChartApi | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  series: ISeriesApi<any> | null
}

interface SubchartLine {
  key: string
  data: Array<{ time: number; value: number }>
  color: string
  lineWidth?: 1 | 2 | 3 | 4
  lineStyle?: LineStyle
  title?: string
}

interface SubchartHistogram {
  data: Array<{ time: number; value: number }>
  positiveColor?: string
  negativeColor?: string
}

interface SubchartBand {
  value: number
  color: string
  label?: string
}

export interface IndicatorSubchartProps {
  title: string
  height?: number
  lines?: SubchartLine[]
  histogram?: SubchartHistogram
  bands?: SubchartBand[]
}

/**
 * Generic indicator sub-chart. Exposes IChartApi via ref so parent can
 * sync the visible time range with the main price chart.
 */
export const IndicatorSubchart = forwardRef<SubchartHandle, IndicatorSubchartProps>(
  function IndicatorSubchart({ title, height = 140, lines = [], histogram, bands = [] }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<IChartApi | null>(null)
    const lineSeriesMap = useRef<Map<string, ISeriesApi<'Line'>>>(new Map())
    const histSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
    const bandSeriesRef = useRef<ISeriesApi<'Line'>[]>([])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const primarySeriesRef = useRef<ISeriesApi<any> | null>(null)

    useImperativeHandle(ref, () => ({ chart: chartRef.current, series: primarySeriesRef.current }))

    // Init chart once
    useEffect(() => {
      if (!containerRef.current) return

      const chart = createChart(containerRef.current, {
        height,
        layout: {
          background: { type: ColorType.Solid, color: COLOR_TOKENS.bgCard },
          textColor: COLOR_TOKENS.textSecondary,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10,
        },
        grid: {
          vertLines: { color: COLOR_TOKENS.borderDefault },
          horzLines: { color: COLOR_TOKENS.borderDefault },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          horzLine: { visible: false, labelVisible: false },
        },
        rightPriceScale: {
          borderColor: COLOR_TOKENS.borderDefault,
          scaleMargins: { top: 0.08, bottom: 0.08 },
        },
        timeScale: {
          borderColor: COLOR_TOKENS.borderDefault,
          visible: false,
        },
        handleScroll: false,
        handleScale: false,
      })

      chartRef.current = chart

      if (ref && typeof ref === 'object') {
        ref.current = { chart, series: null }
      }

      const ro = new ResizeObserver(() => {
        if (containerRef.current && chartRef.current) {
          chartRef.current.applyOptions({ width: containerRef.current.clientWidth })
        }
      })
      ro.observe(containerRef.current)

      return () => {
        ro.disconnect()
        chart.remove()
        chartRef.current = null
        lineSeriesMap.current.clear()
        histSeriesRef.current = null
        bandSeriesRef.current = []
        primarySeriesRef.current = null
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [height])

    // Sync line series data
    useEffect(() => {
      const chart = chartRef.current
      if (!chart) return

      for (const line of lines) {
        let series = lineSeriesMap.current.get(line.key)
        if (!series) {
          series = chart.addLineSeries({
            color: line.color,
            lineWidth: line.lineWidth ?? 2,
            lineStyle: line.lineStyle ?? LineStyle.Solid,
            priceLineVisible: false,
            lastValueVisible: false,
            title: line.title ?? '',
          })
          lineSeriesMap.current.set(line.key, series)
          if (!primarySeriesRef.current) {
            primarySeriesRef.current = series
            if (ref && typeof ref === 'object' && ref.current) {
              ref.current = { chart: ref.current.chart, series }
            }
          }
        }
        const chartData = line.data
          .filter((d) => isFinite(d.value))
          .map((d) => ({ time: d.time as UTCTimestamp, value: d.value }))
        series.setData(chartData)
      }
    }, [lines])

    // Sync histogram data
    useEffect(() => {
      const chart = chartRef.current
      if (!chart || !histogram) return

      if (!histSeriesRef.current) {
        histSeriesRef.current = chart.addHistogramSeries({
          priceLineVisible: false,
          lastValueVisible: false,
        })
        if (!primarySeriesRef.current) {
          primarySeriesRef.current = histSeriesRef.current
          if (ref && typeof ref === 'object' && ref.current) {
            ref.current = { chart: ref.current.chart, series: histSeriesRef.current }
          }
        }
      }
      const posColor = histogram.positiveColor ?? COLOR_TOKENS.accentGreen
      const negColor = histogram.negativeColor ?? COLOR_TOKENS.accentRed

      histSeriesRef.current.setData(
        histogram.data
          .filter((d) => isFinite(d.value))
          .map((d) => ({
            time: d.time as UTCTimestamp,
            value: d.value,
            color: d.value >= 0 ? posColor : negColor,
          }))
      )
    }, [histogram])

    // Add horizontal bands once data is available
    useEffect(() => {
      const chart = chartRef.current
      if (!chart || bands.length === 0) return
      if (bandSeriesRef.current.length > 0) return // already added

      // Need a time range — use lines or histogram data
      const timeData = lines[0]?.data ?? histogram?.data ?? []
      if (timeData.length === 0) return

      const times = timeData
        .filter((d) => isFinite(d.value))
        .map((d) => d.time as UTCTimestamp)

      for (const band of bands) {
        const s = chart.addLineSeries({
          color: band.color,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
          title: band.label ?? '',
        })
        s.setData(times.map((t) => ({ time: t, value: band.value })))
        bandSeriesRef.current.push(s)
      }
    }, [lines, histogram, bands])

    return (
      <div className="relative border-t border-[#1a1a2e]">
        <div className="absolute top-1.5 left-2 z-10 text-[10px] font-mono text-[#555577] uppercase tracking-widest pointer-events-none">
          {title}
        </div>
        <div ref={containerRef} className="w-full" />
      </div>
    )
  }
)
