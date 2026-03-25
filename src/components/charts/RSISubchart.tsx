'use client'
import { forwardRef } from 'react'
import { LineStyle } from 'lightweight-charts'
import { IndicatorSubchart, SubchartHandle } from './IndicatorSubchart'
import type { OHLCV } from '@/lib/types'
import { calcRSI } from '@/lib/calc/rsi'

interface RSISubchartProps {
  candles: OHLCV[]
  height?: number
}

export const RSISubchart = forwardRef<SubchartHandle, RSISubchartProps>(
  function RSISubchart({ candles, height = 130 }, ref) {
    const rsiData = calcRSI(candles, 14)

    return (
      <IndicatorSubchart
        ref={ref}
        title="RSI (14)"
        height={height}
        lines={[
          {
            key: 'rsi',
            data: rsiData,
            color: '#c084fc', // purple
            lineWidth: 2,
            lineStyle: LineStyle.Solid,
          },
        ]}
        bands={[
          { value: 70, color: '#ef4444aa', label: 'OB' },
          { value: 30, color: '#22c55eaa', label: 'OS' },
        ]}
      />
    )
  }
)
