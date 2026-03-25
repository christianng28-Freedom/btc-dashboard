'use client'
import { forwardRef } from 'react'
import { LineStyle } from 'lightweight-charts'
import { IndicatorSubchart, SubchartHandle } from './IndicatorSubchart'
import type { OHLCV } from '@/lib/types'
import { calcStochRSI } from '@/lib/calc/stochastic-rsi'

interface StochRSISubchartProps {
  candles: OHLCV[]
  height?: number
}

export const StochRSISubchart = forwardRef<SubchartHandle, StochRSISubchartProps>(
  function StochRSISubchart({ candles, height = 130 }, ref) {
    const stochData = calcStochRSI(candles)

    const kLine = stochData.map((d) => ({ time: d.time, value: d.k }))
    const dLine = stochData.map((d) => ({ time: d.time, value: d.d }))

    return (
      <IndicatorSubchart
        ref={ref}
        title="Stoch RSI (14, 14, 3, 3)"
        height={height}
        lines={[
          {
            key: 'k',
            data: kLine,
            color: '#3b82f6', // blue — solid %K
            lineWidth: 2,
            lineStyle: LineStyle.Solid,
            title: '%K',
          },
          {
            key: 'd',
            data: dLine,
            color: '#f59e0b', // amber — dashed %D
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            title: '%D',
          },
        ]}
        bands={[
          { value: 80, color: '#ef4444aa', label: 'OB' },
          { value: 20, color: '#22c55eaa', label: 'OS' },
        ]}
      />
    )
  }
)
