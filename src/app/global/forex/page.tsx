'use client'

import { useState } from 'react'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { useForexData } from '@/hooks/useForexData'
import { MetricHeatmapStrip, type MetricItem } from '@/components/widgets/MetricHeatmapStrip'
import { DualAxisChart } from '@/components/charts/DualAxisChart'
import type { ForexPair } from '@/lib/types'

// ── shared chart config ────────────────────────────────────────────────────

const AXIS        = { fill: '#555566', fontSize: 9, fontFamily: 'monospace' } as const
const TOOLTIP_CSS = { background: '#0d0d14', border: '1px solid #1a1a2e', fontSize: 10, fontFamily: 'monospace' } as const
const GRID        = '#1a1a2e'

// ── helpers ────────────────────────────────────────────────────────────────

function thin<T>(arr: T[], max = 200): T[] {
  const step = Math.max(1, Math.floor(arr.length / max))
  return arr.filter((_, i) => i % step === 0 || i === arr.length - 1)
}

function fmtRate(v: number, pair: string): string {
  // JPY pairs typically have 2 decimal places, others 4-5
  if (pair.includes('JPY') || pair.includes('jpy')) {
    return v >= 1 ? v.toFixed(2) : v.toFixed(6)
  }
  return v.toFixed(4)
}

// ── ChangePill ─────────────────────────────────────────────────────────────

function ChangePill({ value }: { value: number }) {
  const pos = value >= 0
  return (
    <span className={`text-[10px] font-mono ${pos ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
      {pos ? '▲' : '▼'} {Math.abs(value).toFixed(2)}%
    </span>
  )
}

// ── SectionTitle ───────────────────────────────────────────────────────────

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-bold font-mono text-[#e0e0e0] uppercase tracking-wider">{title}</h2>
      {subtitle && <p className="text-[10px] font-mono text-[#555566] mt-0.5">{subtitle}</p>}
    </div>
  )
}

// ── ForexPairCard ──────────────────────────────────────────────────────────

function ForexPairCard({
  pair,
  color,
  isLoading,
  isError,
}: {
  pair?: ForexPair
  color: string
  isLoading: boolean
  isError: boolean
}) {
  if (isLoading) {
    return (
      <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 space-y-3 animate-pulse">
        <div className="h-3 w-24 bg-[#1a1a2e] rounded" />
        <div className="h-8 w-32 bg-[#1a1a2e] rounded" />
        <div className="h-[90px] bg-[#1a1a2e] rounded" />
      </div>
    )
  }
  if (isError || !pair || pair.rate === 0) {
    return (
      <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 flex items-center justify-center h-52">
        <div className="text-[10px] font-mono text-[#444455]">No data</div>
      </div>
    )
  }

  const gradId = `grad-fx-${pair.pair.toLowerCase()}`
  const data   = thin(pair.history, 150)
  const rateStr = fmtRate(pair.rate, pair.pair)

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-bold text-[#e0e0e0] font-mono">{pair.pair}</div>
          <div className="text-[9px] font-mono text-[#444455] mt-0.5">{pair.base} / {pair.quote}</div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-lg font-bold font-mono leading-tight" style={{ color }}>
            {rateStr}
          </div>
          <div className="text-[9px] font-mono text-[#555566]">{pair.lastUpdated}</div>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap">
        {[
          { label: '1D', val: pair.change1d },
          { label: '1M', val: pair.change1m },
          { label: '1Y', val: pair.change1y },
        ].map(({ label, val }) => (
          <div key={label}>
            <div className="text-[9px] font-mono text-[#555566] mb-0.5">{label}</div>
            <ChangePill value={val} />
          </div>
        ))}
      </div>

      {data.length > 1 ? (
        <ResponsiveContainer width="100%" height={90}>
          <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" hide />
            <YAxis domain={['auto', 'auto']} hide />
            <Tooltip
              formatter={(v: unknown) => [fmtRate(v as number, pair.pair), pair.pair]}
              labelStyle={{ color: '#666' }}
              contentStyle={TOOLTIP_CSS}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              fill={`url(#${gradId})`}
              strokeWidth={1.5}
              dot={false}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[90px] flex items-center justify-center border border-dashed border-[#1a1a2e] rounded">
          <span className="text-[10px] font-mono text-[#444455]">No history</span>
        </div>
      )}
    </div>
  )
}

// ── DXY Chart ──────────────────────────────────────────────────────────────

function DxyChart({
  history,
  latest,
  ma200,
  isLoading,
  isError,
}: {
  history: { date: string; value: number }[]
  latest: number
  ma200: number | null
  isLoading: boolean
  isError: boolean
}) {
  const dxyColor  = '#60a5fa'
  const ma200Color = '#f59e0b'

  const body = () => {
    if (isLoading)
      return (
        <div className="flex items-center justify-center text-[#555566] text-xs font-mono h-[220px]">
          Loading…
        </div>
      )
    if (isError || history.length === 0)
      return (
        <div className="flex items-center justify-center border border-dashed border-[#1a1a2e] rounded-lg h-[220px]">
          <div className="text-[10px] font-mono text-[#444455]">{isError ? 'Failed to load' : 'No data'}</div>
        </div>
      )

    const thinned = thin(history, 300)
    const aboveMa = ma200 !== null && latest > ma200

    return (
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={thinned} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis
            dataKey="date"
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            tickFormatter={(d: string) => d.slice(0, 7)}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => v.toFixed(1)}
            width={38}
          />
          <Tooltip
            formatter={(v: unknown) => [(v as number).toFixed(2), 'DXY']}
            labelStyle={{ color: '#666' }}
            contentStyle={TOOLTIP_CSS}
          />
          {ma200 !== null && (
            <ReferenceLine
              y={ma200}
              stroke={ma200Color}
              strokeDasharray="4 4"
              strokeOpacity={0.6}
              label={{
                value: `200 MA: ${ma200.toFixed(1)}`,
                position: 'insideTopRight',
                fill: ma200Color,
                fontSize: 9,
                fontFamily: 'monospace',
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke={aboveMa ? '#22c55e' : dxyColor}
            strokeWidth={1.5}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  const aboveMa = ma200 !== null && latest > ma200

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-[#e0e0e0] font-mono">DXY — US Dollar Index</div>
          <div className="text-[10px] text-[#555566] font-mono">ICE US Dollar Index — 2-year daily history</div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-2xl font-bold font-mono" style={{ color: aboveMa ? '#22c55e' : dxyColor }}>
            {latest > 0 ? latest.toFixed(2) : '—'}
          </div>
          {ma200 !== null && latest > 0 && (
            <div
              className="text-[9px] font-mono px-2 py-1 rounded-lg font-bold uppercase tracking-wider"
              style={{
                color: aboveMa ? '#22c55e' : '#ef4444',
                background: aboveMa ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${aboveMa ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              }}
            >
              {aboveMa ? 'Above 200 MA' : 'Below 200 MA'}
            </div>
          )}
        </div>
      </div>
      {body()}
      <div className="flex flex-wrap gap-4 text-[9px] font-mono text-[#555566]">
        <span><span className="text-[#22c55e]">●</span> Above 200 MA — Strong Dollar</span>
        <span><span className="text-[#60a5fa]">●</span> Below 200 MA — Weak Dollar</span>
        {ma200 !== null && <span><span style={{ color: '#f59e0b' }}>- -</span> 200-day MA: {ma200.toFixed(2)}</span>}
      </div>
      <div className="text-[9px] font-mono text-[#333344]">Source: ICE via Yahoo Finance (DX-Y.NYB)</div>
    </div>
  )
}

// ── Dollar Smile Card ──────────────────────────────────────────────────────

function DollarSmileCard() {
  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 space-y-4">
      <div>
        <div className="text-xs font-bold text-[#e0e0e0] font-mono">Dollar Smile Framework</div>
        <div className="text-[10px] text-[#555566] font-mono">
          Stephen Jen&apos;s model for USD strength across macro regimes
        </div>
      </div>

      {/* Smile curve visual */}
      <div className="relative h-20 flex items-end justify-between px-2">
        {/* Left peak */}
        <div className="flex flex-col items-center gap-1" style={{ width: '28%' }}>
          <div
            className="w-full rounded-t-lg"
            style={{
              height: 52,
              background: 'linear-gradient(to top, rgba(239,68,68,0.08), rgba(239,68,68,0.25))',
              border: '1px solid rgba(239,68,68,0.3)',
              borderBottom: 'none',
            }}
          />
          <div className="text-[9px] font-mono text-[#ef4444] font-bold text-center leading-tight">
            RISK-OFF<br />
            <span className="text-[8px] text-[#555566]">USD soars (safe haven)</span>
          </div>
        </div>

        {/* Smile trough */}
        <div className="flex flex-col items-center gap-1" style={{ width: '34%' }}>
          <div
            className="w-full rounded-t-sm"
            style={{
              height: 18,
              background: 'linear-gradient(to top, rgba(96,165,250,0.06), rgba(96,165,250,0.14))',
              border: '1px solid rgba(96,165,250,0.2)',
              borderBottom: 'none',
            }}
          />
          <div className="text-[9px] font-mono text-[#60a5fa] text-center leading-tight">
            MILD GROWTH<br />
            <span className="text-[8px] text-[#555566]">USD weakens (carry flows out)</span>
          </div>
        </div>

        {/* Right peak */}
        <div className="flex flex-col items-center gap-1" style={{ width: '28%' }}>
          <div
            className="w-full rounded-t-lg"
            style={{
              height: 52,
              background: 'linear-gradient(to top, rgba(34,197,94,0.08), rgba(34,197,94,0.25))',
              border: '1px solid rgba(34,197,94,0.3)',
              borderBottom: 'none',
            }}
          />
          <div className="text-[9px] font-mono text-[#22c55e] font-bold text-center leading-tight">
            STRONG GROWTH<br />
            <span className="text-[8px] text-[#555566]">USD rises (rate differentials)</span>
          </div>
        </div>
      </div>

      {/* Three regime bullets */}
      <div className="space-y-2 border-t border-[#1a1a2e] pt-3">
        {[
          {
            color: '#ef4444',
            regime: 'Left peak — Risk-Off / Recession',
            desc: 'Global panic drives USD demand. Investors exit risky assets, buy Treasuries. Carry trades unwind violently. DXY surges regardless of US fundamentals.',
          },
          {
            color: '#60a5fa',
            regime: 'Trough — Mild/Synchronised Global Growth',
            desc: 'Relative US outperformance fades. Capital flows to higher-yielding EM & risk assets. USD weakens as investors reduce USD overweights.',
          },
          {
            color: '#22c55e',
            regime: 'Right peak — US Outperformance',
            desc: 'US economy accelerates faster than peers. Fed tightens while others ease. Rate differentials attract capital inflows. DXY strengthens.',
          },
        ].map(({ color, regime, desc }) => (
          <div key={regime} className="flex gap-2">
            <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: color }} />
            <div>
              <div className="text-[10px] font-mono font-bold" style={{ color }}>{regime}</div>
              <div className="text-[9px] font-mono text-[#555566] leading-relaxed">{desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-[9px] font-mono text-[#333344]">
        Framework: Stephen Jen (Morgan Stanley, 2001) — Illustrative, not predictive
      </div>
    </div>
  )
}

// ── PAGE ───────────────────────────────────────────────────────────────────

export default function ForexPage() {
  const { data, isLoading, isError } = useForexData()
  const [showBtcOverlay, setShowBtcOverlay] = useState(false)

  const fmtDxy = (v: number) => v > 0 ? v.toFixed(2) : '—'

  const metrics: MetricItem[] = [
    {
      label:  'DXY',
      value:  data?.dxy.latest ? fmtDxy(data.dxy.latest) : '—',
      change: 0,
      sub:    'Dollar Index',
      colorScheme: 'neutral',
    },
    {
      label:  'EUR/USD',
      value:  data?.pairs.eurusd.rate ? data.pairs.eurusd.rate.toFixed(4) : '—',
      change: data?.pairs.eurusd.change1d ?? 0,
      sub:    'EURUSD',
      colorScheme: 'green-red',
    },
    {
      label:  'USD/JPY',
      value:  data?.pairs.usdjpy.rate
        ? (data.pairs.usdjpy.rate >= 1 ? data.pairs.usdjpy.rate.toFixed(2) : data.pairs.usdjpy.rate.toFixed(4))
        : '—',
      change: data?.pairs.usdjpy.change1d ?? 0,
      sub:    'USDJPY',
      colorScheme: 'green-red',
    },
    {
      label:  'GBP/USD',
      value:  data?.pairs.gbpusd.rate ? data.pairs.gbpusd.rate.toFixed(4) : '—',
      change: data?.pairs.gbpusd.change1d ?? 0,
      sub:    'GBPUSD',
      colorScheme: 'green-red',
    },
    {
      label:  'AUD/USD',
      value:  data?.pairs.audusd.rate ? data.pairs.audusd.rate.toFixed(4) : '—',
      change: data?.pairs.audusd.change1d ?? 0,
      sub:    'AUDUSD',
      colorScheme: 'green-red',
    },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-8">

      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold font-mono text-[#e0e0e0]">Forex</h1>
        <p className="text-xs font-mono text-[#555566] mt-1">
          US Dollar Index &amp; major currency pairs — daily rates via FRED &amp; Stooq
        </p>
      </div>

      {/* Metric strip */}
      <MetricHeatmapStrip metrics={metrics} />

      {/* ── DOLLAR INDEX ─────────────────────────────────────────────────── */}
      <section>
        <SectionTitle
          title="US Dollar Index (DXY)"
          subtitle="ICE DXY — 2-year daily history with 200-day MA"
        />

        {/* BTC overlay toggle */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setShowBtcOverlay((v) => !v)}
            className={`text-[10px] font-mono px-3 py-1.5 rounded-lg transition-colors ${
              showBtcOverlay
                ? 'bg-[#f7931a]/15 text-[#f7931a] border border-[#f7931a]/30'
                : 'bg-[#1a1a2e] text-[#555566] border border-[#1a1a2e] hover:text-[#e0e0e0]'
            }`}
          >
            {showBtcOverlay ? '▶ BTC Overlay On' : '○ Show BTC Price Overlay'}
          </button>
          {showBtcOverlay && (
            <span className="text-[9px] font-mono text-[#555566]">
              Right axis = BTC price (log scale not applied)
            </span>
          )}
        </div>

        {showBtcOverlay ? (
          <DualAxisChart
            title="DXY vs Bitcoin Price"
            description="Dollar Index (left) overlaid with BTC/USD (right) — inverse correlation often visible"
            left={{
              key:     'dxy',
              label:   'DXY',
              color:   '#60a5fa',
              data:    data?.dxy.history ?? [],
              type:    'line',
              formatY: (v) => v.toFixed(1),
              yAxisId: 'left',
            }}
            right={{
              key:     'btc',
              label:   'BTC',
              color:   '#f7931a',
              data:    (data?.btcHistory ?? []).filter((p) => p.date >= (data?.dxy.history[0]?.date ?? '')),
              type:    'line',
              formatY: (v) => `$${(v / 1000).toFixed(0)}k`,
              yAxisId: 'right',
            }}
            height={260}
            source="FRED (DTWEXBGS) + Binance"
            isLoading={isLoading}
            isError={!!isError}
          />
        ) : (
          <DxyChart
            history={data?.dxy.history ?? []}
            latest={data?.dxy.latest ?? 0}
            ma200={data?.dxy.ma200 ?? null}
            isLoading={isLoading}
            isError={!!isError}
          />
        )}
      </section>

      {/* ── MAJOR FOREX PAIRS ────────────────────────────────────────────── */}
      <section>
        <SectionTitle
          title="Major Forex Pairs"
          subtitle="EUR/USD, USD/JPY, GBP/USD &amp; AUD/USD — 1-year daily closes via Stooq / FRED"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <ForexPairCard pair={data?.pairs.eurusd} color="#60a5fa" isLoading={isLoading} isError={!!isError} />
          <ForexPairCard pair={data?.pairs.usdjpy} color="#f59e0b" isLoading={isLoading} isError={!!isError} />
          <ForexPairCard pair={data?.pairs.gbpusd} color="#a78bfa" isLoading={isLoading} isError={!!isError} />
          <ForexPairCard pair={data?.pairs.audusd} color="#34d399" isLoading={isLoading} isError={!!isError} />
        </div>
      </section>

      {/* ── DOLLAR SMILE FRAMEWORK ───────────────────────────────────────── */}
      <section>
        <SectionTitle
          title="Dollar Smile Framework"
          subtitle="Educational panel — USD behaviour across macro regimes"
        />
        <DollarSmileCard />
      </section>

    </div>
  )
}
