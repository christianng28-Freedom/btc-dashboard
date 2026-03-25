'use client'
import { useMemo } from 'react'
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { OHLCV } from '@/lib/types'
import { calcRainbowBands, getRainbowZone } from '@/lib/calc/technical-scores'

interface RainbowChartProps {
  candles: OHLCV[]
  height?: number
}

const BAND_COLORS = [
  '#1e3a5f', // dark blue  — Fire Sale
  '#1d4ed8', // blue       — BUY!
  '#0891b2', // cyan       — Accumulate
  '#16a34a', // green      — Still Cheap
  '#ca8a04', // yellow     — Is This a Bubble?
  '#ea580c', // orange     — FOMO Intensifies
  '#dc2626', // red-orange — Sell. Seriously.
  '#7f1d1d', // dark red   — Maximum Bubble
  '#4a0000', // deeper red — Bitcoin is Dead
]

const BAND_LABELS = [
  'Fire Sale',
  'BUY!',
  'Accumulate',
  'Still Cheap',
  'Is This a Bubble?',
  'FOMO Intensifies',
  'Sell. Seriously.',
  'Max Bubble Territory',
  'Bitcoin is Dead (not)',
]

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', { year: '2-digit', month: 'short' })
}

function logTickFormatter(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value}`
}

// Custom tooltip
function RainbowTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Record<string, number> }> }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const zone = getRainbowZone(d.price, d.time)
  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded p-2 text-[10px] font-mono">
      <div className="text-[#666666]">{formatDate(d.time)}</div>
      <div className="text-[#e0e0e0]">${d.price?.toLocaleString()}</div>
      <div className="text-[#f59e0b]">{zone}</div>
    </div>
  )
}

export function RainbowChart({ candles, height = 320 }: RainbowChartProps) {
  // Downsample to weekly for performance (every 7th point)
  const downsampled = useMemo(() => {
    const filtered = candles.filter((_, i) => i % 7 === 0)
    return calcRainbowBands(filtered)
  }, [candles])

  const currentZone = useMemo(() => {
    if (candles.length === 0) return null
    const last = candles[candles.length - 1]
    return getRainbowZone(last.close, last.time)
  }, [candles])

  // Explicit Y domain so log scale never hits 0
  const yDomain = useMemo((): [number, number] => {
    if (downsampled.length === 0) return [1_000, 1_000_000]
    const minY = Math.max(100, Math.min(...downsampled.map((d) => d.top0)) * 0.8)
    const maxY = Math.max(...downsampled.map((d) => d.top8)) * 1.2
    return [minY, maxY]
  }, [downsampled])

  if (downsampled.length < 100) {
    return (
      <div className="bg-[#111120] rounded-xl border border-[#1a1a2e] p-4">
        <div className="text-xs font-bold text-[#e0e0e0] font-mono mb-1">Rainbow Chart</div>
        <div className="flex items-center justify-center h-40 text-[#555566] text-xs font-mono">
          Insufficient data — need full price history
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#111120] rounded-xl border border-[#1a1a2e] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a2e]">
        <div>
          <div className="text-xs font-bold text-[#e0e0e0] font-mono">Rainbow Chart</div>
          <div className="text-[10px] text-[#555566] font-mono">Log regression bands — cycle positioning</div>
        </div>
        {currentZone && (
          <div className="text-right">
            <div className="text-[10px] text-[#555566] font-mono uppercase tracking-widest">Zone</div>
            <div className="text-xs font-bold font-mono text-[#f59e0b]">{currentZone}</div>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={downsampled} margin={{ top: 8, right: 40, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#1a1a2e" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="time"
            tickFormatter={formatDate}
            tick={{ fill: '#555566', fontSize: 9, fontFamily: 'monospace' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            scale="log"
            domain={yDomain}
            tickFormatter={logTickFormatter}
            tick={{ fill: '#555566', fontSize: 9, fontFamily: 'monospace' }}
            axisLine={false}
            tickLine={false}
            width={52}
            allowDataOverflow
          />
          <Tooltip content={<RainbowTooltip />} />

          {/* Rainbow bands — rendered highest-to-lowest so each band covers everything below it.
              All values are absolute ceilings, no stacking needed (avoids log(0) = -∞ issue). */}
          <Area dataKey="top8" stroke="none" fill={BAND_COLORS[8]} fillOpacity={0.85} isAnimationActive={false} dot={false} />
          <Area dataKey="top7" stroke="none" fill={BAND_COLORS[7]} fillOpacity={0.85} isAnimationActive={false} dot={false} />
          <Area dataKey="top6" stroke="none" fill={BAND_COLORS[6]} fillOpacity={0.85} isAnimationActive={false} dot={false} />
          <Area dataKey="top5" stroke="none" fill={BAND_COLORS[5]} fillOpacity={0.85} isAnimationActive={false} dot={false} />
          <Area dataKey="top4" stroke="none" fill={BAND_COLORS[4]} fillOpacity={0.85} isAnimationActive={false} dot={false} />
          <Area dataKey="top3" stroke="none" fill={BAND_COLORS[3]} fillOpacity={0.85} isAnimationActive={false} dot={false} />
          <Area dataKey="top2" stroke="none" fill={BAND_COLORS[2]} fillOpacity={0.85} isAnimationActive={false} dot={false} />
          <Area dataKey="top1" stroke="none" fill={BAND_COLORS[1]} fillOpacity={0.85} isAnimationActive={false} dot={false} />
          <Area dataKey="top0" stroke="none" fill={BAND_COLORS[0]} fillOpacity={0.85} isAnimationActive={false} dot={false} />

          {/* Price line on top */}
          <Line dataKey="price" stroke="#ffffff" strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Band legend */}
      <div className="px-4 py-2 border-t border-[#1a1a2e] bg-[#0d0d14]">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {BAND_LABELS.map((label, i) => (
            <span key={i} className="text-[9px] font-mono flex items-center gap-1" style={{ color: '#666' }}>
              <span style={{ color: BAND_COLORS[i] }}>■</span> {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
