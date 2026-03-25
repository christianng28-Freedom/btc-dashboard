'use client'

import { LineChart, Line, ResponsiveContainer } from 'recharts'
import type { MarketSnap } from '@/app/api/global/overview/route'

interface MarketCard {
  key: string
  label: string
  snap: MarketSnap
  formatPrice: (v: number) => string
  formatChange: (snap: MarketSnap) => string
}

function Sparkline({ data, positive }: { data: { date: string; value: number }[]; positive: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={36}>
      <LineChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={positive ? '#22c55e' : '#ef4444'}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

function ChangeTag({ value, label }: { value: number; label: string }) {
  const positive = value >= 0
  return (
    <span
      className="text-[10px] font-mono font-semibold"
      style={{ color: positive ? '#22c55e' : '#ef4444' }}
    >
      {positive ? '▲' : '▼'} {label}
    </span>
  )
}

interface Props {
  markets: {
    sp500: MarketSnap
    nasdaq: MarketSnap
    gold: MarketSnap
    dxy: MarketSnap
    btc: MarketSnap
    tenY: MarketSnap
  }
  className?: string
}

function formatLargePrice(v: number): string {
  if (v >= 10000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (v >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 })
  return v.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

export function KeyMarketsSnapshot({ markets, className = '' }: Props) {
  const cards: MarketCard[] = [
    {
      key: 'sp500',
      label: 'S&P 500',
      snap: markets.sp500,
      formatPrice: (v) => v.toLocaleString('en-US', { maximumFractionDigits: 0 }),
      formatChange: (s) => `${s.changePercent >= 0 ? '+' : ''}${s.changePercent.toFixed(1)}%`,
    },
    {
      key: 'nasdaq',
      label: 'Nasdaq-100',
      snap: markets.nasdaq,
      formatPrice: (v) => v.toLocaleString('en-US', { maximumFractionDigits: 0 }),
      formatChange: (s) => `${s.changePercent >= 0 ? '+' : ''}${s.changePercent.toFixed(1)}%`,
    },
    {
      key: 'gold',
      label: 'Gold',
      snap: markets.gold,
      formatPrice: (v) => `$${formatLargePrice(v)}`,
      formatChange: (s) => `${s.changePercent >= 0 ? '+' : ''}${s.changePercent.toFixed(1)}%`,
    },
    {
      key: 'dxy',
      label: 'DXY',
      snap: markets.dxy,
      formatPrice: (v) => v.toFixed(2),
      formatChange: (s) => `${s.changePercent >= 0 ? '+' : ''}${s.changePercent.toFixed(1)}%`,
    },
    {
      key: 'btc',
      label: 'Bitcoin',
      snap: markets.btc,
      formatPrice: (v) => `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      formatChange: (s) => `${s.changePercent >= 0 ? '+' : ''}${s.changePercent.toFixed(1)}%`,
    },
    {
      key: 'tenY',
      label: '10Y Yield',
      snap: markets.tenY,
      // changePercent here is the raw yield change in percentage points (e.g. 0.05 = 5 bps)
      formatPrice: (v) => `${v.toFixed(2)}%`,
      formatChange: (s) => {
        const bps = Math.round(s.changePercent * 100)
        return `${bps >= 0 ? '+' : ''}${bps} bps`
      },
    },
  ]

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 ${className}`}>
      {cards.map((c) => {
        const positive = c.snap.changePercent >= 0
        return (
          <div
            key={c.key}
            className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-3 flex flex-col gap-1"
          >
            <div className="text-[9px] font-mono text-[#555566] uppercase tracking-wider">
              {c.label}
            </div>
            <div className="text-sm font-mono font-bold text-[#e0e0e0] leading-tight">
              {c.formatPrice(c.snap.price)}
            </div>
            <ChangeTag value={c.snap.changePercent} label={c.formatChange(c.snap)} />
            <div className="mt-1">
              <Sparkline data={c.snap.sparkline} positive={positive} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
