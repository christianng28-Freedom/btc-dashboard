'use client'
import { forwardRef } from 'react'
import { LineStyle } from 'lightweight-charts'
import { IndicatorSubchart, SubchartHandle } from './IndicatorSubchart'
import type { OHLCV } from '@/lib/types'
import { calcMACD } from '@/lib/calc/macd'

interface MACDSubchartProps {
  candles: OHLCV[]
  height?: number
}

export const MACDSubchart = forwardRef<SubchartHandle, MACDSubchartProps>(
  function MACDSubchart({ candles, height = 130 }, ref) {
    const macdData = calcMACD(candles)

    const macdLine = macdData.map((d) => ({ time: d.time, value: d.macd }))
    const signalLine = macdData.map((d) => ({ time: d.time, value: d.signal }))
    const histogramData = macdData.map((d) => ({ time: d.time, value: d.histogram }))

    return (
      <IndicatorSubchart
        ref={ref}
        title="MACD (12, 26, 9)"
        height={height}
        lines={[
          {
            key: 'macd',
            data: macdLine,
            color: '#3b82f6', // blue
            lineWidth: 2,
            lineStyle: LineStyle.Solid,
            title: 'MACD',
          },
          {
            key: 'signal',
            data: signalLine,
            color: '#f59e0b', // amber
            lineWidth: 2,
            lineStyle: LineStyle.Solid,
            title: 'Signal',
          },
        ]}
        histogram={{
          data: histogramData,
          positiveColor: '#22c55e88',
          negativeColor: '#ef444488',
        }}
      />
    )
  }
)
