'use client'

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { useCommoditiesData } from '@/hooks/useCommoditiesData'
import { MetricHeatmapStrip, type MetricItem } from '@/components/widgets/MetricHeatmapStrip'
import { DualAxisChart } from '@/components/charts/DualAxisChart'
import type { CommodityPrice } from '@/lib/types'

// ── shared chart config ────────────────────────────────────────────────────

const AXIS        = { fill: '#555566', fontSize: 9, fontFamily: 'monospace' } as const
const TOOLTIP_CSS = { background: '#0d0d14', border: '1px solid #1a1a2e', fontSize: 10, fontFamily: 'monospace' } as const
const GRID        = '#1a1a2e'

// ── helpers ────────────────────────────────────────────────────────────────

function fmtPrice(v: number, unit: string): string {
  if (unit === 'USD/MBF')    return `$${v.toFixed(0)}`
  if (unit === 'USD/lb')     return `$${v.toFixed(4)}`
  if (unit === 'USD/MMBtu')  return `$${v.toFixed(3)}`
  if (unit === 'USD/bbl')    return `$${v.toFixed(2)}`
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function thin<T>(arr: T[], max = 200): T[] {
  const step = Math.max(1, Math.floor(arr.length / max))
  return arr.filter((_, i) => i % step === 0 || i === arr.length - 1)
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

// ── CommodityCard ──────────────────────────────────────────────────────────

function CommodityCard({
  commodity,
  color,
  isLoading,
  isError,
}: {
  commodity?: CommodityPrice
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
  if (isError || !commodity || commodity.price === 0) {
    return (
      <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 flex items-center justify-center h-52">
        <div className="text-[10px] font-mono text-[#444455]">No data</div>
      </div>
    )
  }

  const gradId = `grad-${commodity.symbol.toLowerCase()}`
  const data   = thin(commodity.history, 150)

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-bold text-[#e0e0e0] font-mono">{commodity.name}</div>
          <div className="text-[9px] font-mono text-[#444455] mt-0.5">{commodity.unit} · {commodity.symbol}</div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-lg font-bold font-mono leading-tight" style={{ color }}>
            {fmtPrice(commodity.price, commodity.unit)}
          </div>
          <div className="text-[9px] font-mono text-[#555566]">{commodity.lastUpdated}</div>
        </div>
      </div>

      <div className="flex gap-5">
        {[
          { label: '1D', val: commodity.change1d },
          { label: '1M', val: commodity.change1m },
          { label: '1Y', val: commodity.change1y },
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
              formatter={(v: unknown) => [fmtPrice(v as number, commodity.unit), commodity.name]}
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

// ── SectionTitle ────────────────────────────────────────────────────────────

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-bold font-mono text-[#e0e0e0] uppercase tracking-wider">{title}</h2>
      {subtitle && <p className="text-[10px] font-mono text-[#555566] mt-0.5">{subtitle}</p>}
    </div>
  )
}

// ── SimpleAreaChart ─────────────────────────────────────────────────────────

function SimpleAreaChart({
  title,
  description,
  data,
  color,
  height = 200,
  formatY = (v: number) => v.toFixed(2),
  referenceY,
  source,
  isLoading,
  isError,
}: {
  title: string
  description?: string
  data: { date: string; value: number }[]
  color: string
  height?: number
  formatY?: (v: number) => string
  referenceY?: number
  source?: string
  isLoading?: boolean
  isError?: boolean
}) {
  const gradId = `grad-area-${title.replace(/\W+/g, '-')}`

  const body = () => {
    if (isLoading)
      return (
        <div className="flex items-center justify-center text-[#555566] text-xs font-mono" style={{ height }}>
          Loading…
        </div>
      )
    if (isError || data.length === 0)
      return (
        <div className="flex items-center justify-center border border-dashed border-[#1a1a2e] rounded-lg" style={{ height }}>
          <div className="text-[10px] font-mono text-[#444455]">{isError ? 'Failed to load' : 'No data'}</div>
        </div>
      )

    const thinned = thin(data)
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={thinned} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.2} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
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
            tickFormatter={formatY}
            width={48}
          />
          <Tooltip
            formatter={(v: unknown) => [formatY(v as number), title]}
            labelStyle={{ color: '#666' }}
            contentStyle={TOOLTIP_CSS}
          />
          {referenceY !== undefined && (
            <ReferenceLine y={referenceY} stroke="#555566" strokeDasharray="4 4" />
          )}
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
    )
  }

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 space-y-3">
      <div>
        <div className="text-xs font-bold text-[#e0e0e0] font-mono">{title}</div>
        {description && <div className="text-[10px] text-[#555566] font-mono">{description}</div>}
      </div>
      {body()}
      {source && <div className="text-[9px] font-mono text-[#333344]">Source: {source}</div>}
    </div>
  )
}

// ── PPIYoYBarChart ──────────────────────────────────────────────────────────

function PPIYoYBarChart({
  data,
  isLoading,
  isError,
}: {
  data: { date: string; value: number }[]
  isLoading?: boolean
  isError?: boolean
}) {
  const body = () => {
    if (isLoading)
      return (
        <div className="flex items-center justify-center text-[#555566] text-xs font-mono h-[160px]">
          Loading…
        </div>
      )
    if (isError || data.length === 0)
      return (
        <div className="flex items-center justify-center border border-dashed border-[#1a1a2e] rounded-lg h-[160px]">
          <div className="text-[10px] font-mono text-[#444455]">{isError ? 'Failed to load' : 'No data'}</div>
        </div>
      )

    const thinned = thin(data, 120)
    return (
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={thinned} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
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
            tickFormatter={(v: number) => `${v.toFixed(1)}%`}
            width={40}
          />
          <Tooltip
            formatter={(v: unknown) => [`${(v as number).toFixed(1)}%`, 'YoY']}
            labelStyle={{ color: '#666' }}
            contentStyle={TOOLTIP_CSS}
          />
          <ReferenceLine y={0} stroke="#555566" strokeDasharray="4 4" />
          <Bar dataKey="value" fill="#f59e0b" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 space-y-3">
      <div>
        <div className="text-xs font-bold text-[#e0e0e0] font-mono">PPI YoY % Change</div>
        <div className="text-[10px] text-[#555566] font-mono">
          Producer Price Index — All Commodities, year-over-year
        </div>
      </div>
      {body()}
      <div className="text-[9px] font-mono text-[#333344]">Source: FRED (PPIACO)</div>
    </div>
  )
}

// ── PAGE ───────────────────────────────────────────────────────────────────

export default function CommoditiesPage() {
  const { data, isLoading, isError } = useCommoditiesData()

  const metrics: MetricItem[] = [
    {
      label: 'Gold',
      value: data?.metals.gold.price
        ? `$${data.metals.gold.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
        : '—',
      change: data?.metals.gold.change1d ?? 0,
      sub: 'XAU/USD',
      colorScheme: 'green-red',
      thresholds: { low: -1, high: 1 },
    },
    {
      label: 'Silver',
      value: data?.metals.silver.price ? `$${data.metals.silver.price.toFixed(2)}` : '—',
      change: data?.metals.silver.change1d ?? 0,
      sub: 'XAG/USD',
      colorScheme: 'green-red',
      thresholds: { low: -1, high: 1 },
    },
    {
      label: 'Platinum',
      value: data?.metals.platinum.price
        ? `$${data.metals.platinum.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
        : '—',
      change: data?.metals.platinum.change1d ?? 0,
      sub: 'XPT/USD',
      colorScheme: 'green-red',
      thresholds: { low: -1, high: 1 },
    },
    {
      label: 'WTI Crude',
      value: data?.energy.wti.price ? `$${data.energy.wti.price.toFixed(2)}` : '—',
      change: data?.energy.wti.change1d ?? 0,
      sub: 'USD/bbl',
      colorScheme: 'neutral',
    },
    {
      label: 'Brent',
      value: data?.energy.brent.price ? `$${data.energy.brent.price.toFixed(2)}` : '—',
      change: data?.energy.brent.change1d ?? 0,
      sub: 'USD/bbl',
      colorScheme: 'neutral',
    },
    {
      label: 'Nat Gas',
      value: data?.energy.naturalGas.price
        ? `$${data.energy.naturalGas.price.toFixed(3)}`
        : '—',
      change: data?.energy.naturalGas.change1d ?? 0,
      sub: 'USD/MMBtu',
      colorScheme: 'neutral',
    },
    {
      label: 'Copper',
      value: data?.industrial.copper.price
        ? `$${data.industrial.copper.price.toFixed(3)}`
        : '—',
      change: data?.industrial.copper.change1d ?? 0,
      sub: 'USD/lb',
      colorScheme: 'green-red',
      thresholds: { low: -1, high: 1 },
    },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-8">

      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold font-mono text-[#e0e0e0]">Commodities</h1>
        <p className="text-xs font-mono text-[#555566] mt-1">
          Precious metals, energy &amp; industrial inputs — daily spot &amp; futures prices via Stooq &amp; FRED
        </p>
      </div>

      {/* Metric strip */}
      <MetricHeatmapStrip metrics={metrics} />

      {/* ── PRECIOUS METALS ─────────────────────────────────────────────── */}
      <section>
        <SectionTitle
          title="Precious Metals"
          subtitle="Gold, Silver &amp; Platinum — spot prices (USD)"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <CommodityCard commodity={data?.metals.gold}     color="#f59e0b" isLoading={isLoading} isError={!!isError} />
          <CommodityCard commodity={data?.metals.silver}   color="#94a3b8" isLoading={isLoading} isError={!!isError} />
          <CommodityCard commodity={data?.metals.platinum} color="#a78bfa" isLoading={isLoading} isError={!!isError} />
        </div>
        <SimpleAreaChart
          title="Gold / Silver Ratio"
          description="Ounces of silver per ounce of gold — elevated readings historically favour silver"
          data={data?.metals.goldSilverRatio ?? []}
          color="#f59e0b"
          height={180}
          formatY={(v) => v.toFixed(1)}
          source="Stooq (XAU/USD ÷ XAG/USD)"
          isLoading={isLoading}
          isError={!!isError}
        />
      </section>

      {/* ── ENERGY ──────────────────────────────────────────────────────── */}
      <section>
        <SectionTitle
          title="Energy"
          subtitle="Crude oil benchmarks &amp; natural gas futures"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CommodityCard commodity={data?.energy.wti}        color="#f97316" isLoading={isLoading} isError={!!isError} />
          <CommodityCard commodity={data?.energy.brent}      color="#fb923c" isLoading={isLoading} isError={!!isError} />
          <CommodityCard commodity={data?.energy.naturalGas} color="#60a5fa" isLoading={isLoading} isError={!!isError} />
        </div>
      </section>

      {/* ── INDUSTRIAL & AGRICULTURAL ───────────────────────────────────── */}
      <section>
        <SectionTitle
          title="Industrial &amp; Agricultural"
          subtitle="Key industrial metals and lumber futures"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CommodityCard commodity={data?.industrial.copper} color="#f87171" isLoading={isLoading} isError={!!isError} />
          <CommodityCard commodity={data?.industrial.lumber} color="#86efac" isLoading={isLoading} isError={!!isError} />
        </div>
      </section>

      {/* ── GOLD VS BITCOIN ─────────────────────────────────────────────── */}
      <section>
        <SectionTitle
          title="Gold vs Bitcoin"
          subtitle="Comparative 1-year price history — separate Y-axes"
        />
        <div className="flex flex-wrap items-center gap-3 mb-3">
          {data?.correlation90d != null && (
            <div className="flex items-center gap-2 bg-[#0d0d14] border border-[#1a1a2e] rounded-lg px-3 py-2">
              <span className="text-[9px] font-mono text-[#555566] uppercase tracking-wider">
                90d Correlation
              </span>
              <span
                className="text-sm font-bold font-mono"
                style={{
                  color:
                    data.correlation90d > 0.5
                      ? '#22c55e'
                      : data.correlation90d < -0.1
                      ? '#ef4444'
                      : '#e0e0e0',
                }}
              >
                {data.correlation90d.toFixed(3)}
              </span>
              <span className="text-[9px] font-mono text-[#555566]">
                {data.correlation90d > 0.5
                  ? '(strong +ve)'
                  : data.correlation90d > 0.2
                  ? '(moderate +ve)'
                  : data.correlation90d < 0
                  ? '(negative)'
                  : '(weak)'}
              </span>
            </div>
          )}
        </div>
        <DualAxisChart
          title="BTC / Gold Overlay"
          description="Bitcoin (left axis) vs Gold spot (right axis) — 1-year daily closes"
          left={{
            key: 'btc',
            label: 'Bitcoin (USD)',
            color: '#f59e0b',
            data: data?.btcHistory ?? [],
            type: 'line',
            formatY: (v) => `$${(v / 1000).toFixed(0)}k`,
            yAxisId: 'left',
          }}
          right={{
            key: 'gold',
            label: 'Gold (USD)',
            color: '#94a3b8',
            data: data?.metals.gold.history ?? [],
            type: 'line',
            formatY: (v) =>
              `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
            yAxisId: 'right',
          }}
          height={260}
          source="Binance (BTC) · Stooq (Gold)"
          isLoading={isLoading}
          isError={!!isError}
        />
      </section>

      {/* ── COMMODITY PRICE INDEX ───────────────────────────────────────── */}
      <section>
        <SectionTitle
          title="Commodity Price Index"
          subtitle="PPI All Commodities — broad-based commodity inflation gauge"
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SimpleAreaChart
            title="PPI All Commodities (Index)"
            description="Producer Price Index — All Commodities (not seasonally adjusted)"
            data={data?.ppiCommodities.index ?? []}
            color="#f59e0b"
            height={200}
            formatY={(v) => v.toFixed(0)}
            source="FRED (PPIACO)"
            isLoading={isLoading}
            isError={!!isError}
          />
          <PPIYoYBarChart
            data={data?.ppiCommodities.yoy ?? []}
            isLoading={isLoading}
            isError={!!isError}
          />
        </div>

        {data?.ppiCommodities.latest.date && (
          <div className="mt-4 flex flex-wrap items-center gap-8 bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-4">
            <div>
              <div className="text-[9px] font-mono text-[#555566] uppercase tracking-wider mb-1">
                Latest Reading
              </div>
              <div className="text-2xl font-bold font-mono text-[#e0e0e0]">
                {data.ppiCommodities.latest.value.toFixed(1)}
              </div>
            </div>
            <div>
              <div className="text-[9px] font-mono text-[#555566] uppercase tracking-wider mb-1">
                YoY Change
              </div>
              <div
                className={`text-2xl font-bold font-mono ${
                  data.ppiCommodities.latest.yoy > 0 ? 'text-[#ef4444]' : 'text-[#22c55e]'
                }`}
              >
                {data.ppiCommodities.latest.yoy > 0 ? '+' : ''}
                {data.ppiCommodities.latest.yoy.toFixed(1)}%
              </div>
            </div>
            <div className="text-[9px] font-mono text-[#444455]">
              as of {data.ppiCommodities.latest.date}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
