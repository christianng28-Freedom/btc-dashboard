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
  ReferenceArea,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { useEquitiesData } from '@/hooks/useEquitiesData'
import { MetricHeatmapStrip, type MetricItem } from '@/components/widgets/MetricHeatmapStrip'
import type { GlobalEquityIndex } from '@/lib/types'

// ── shared chart config ────────────────────────────────────────────────────

const AXIS        = { fill: '#555566', fontSize: 9, fontFamily: 'monospace' } as const
const TOOLTIP_CSS = { background: '#0d0d14', border: '1px solid #1a1a2e', fontSize: 10, fontFamily: 'monospace' } as const
const GRID        = '#1a1a2e'

// ── helpers ────────────────────────────────────────────────────────────────

function thin<T>(arr: T[], max = 200): T[] {
  const step = Math.max(1, Math.floor(arr.length / max))
  return arr.filter((_, i) => i % step === 0 || i === arr.length - 1)
}

function fmtPrice(v: number): string {
  if (v >= 10000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (v >= 100)   return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return v.toFixed(2)
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

// ── EquityCard ─────────────────────────────────────────────────────────────

function EquityCard({
  index,
  color,
  isLoading,
  isError,
}: {
  index?: GlobalEquityIndex
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
  if (isError || !index || index.price === 0) {
    return (
      <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 flex items-center justify-center h-52">
        <div className="text-[10px] font-mono text-[#444455]">No data</div>
      </div>
    )
  }

  const gradId = `grad-eq-${index.symbol.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`
  const data   = thin(index.history, 150)

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-bold text-[#e0e0e0] font-mono">{index.name}</div>
          <div className="text-[9px] font-mono text-[#444455] mt-0.5">{index.symbol}</div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-lg font-bold font-mono leading-tight" style={{ color }}>
            {fmtPrice(index.price)}
          </div>
          <div className="text-[9px] font-mono text-[#555566]">{index.lastUpdated}</div>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap">
        {[
          { label: '1D',  val: index.change1d  },
          { label: '1W',  val: index.change1w  },
          { label: '1M',  val: index.change1m  },
          { label: 'YTD', val: index.changeYtd },
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
              formatter={(v: unknown) => [fmtPrice(v as number), index.name]}
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

// ── CryptoAdjacentCard ─────────────────────────────────────────────────────

function CryptoAdjacentCard({
  index,
  color,
  correlation,
  isLoading,
  isError,
}: {
  index?: GlobalEquityIndex
  color: string
  correlation: number | null
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
  if (isError || !index || index.price === 0) {
    return (
      <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 flex items-center justify-center h-52">
        <div className="text-[10px] font-mono text-[#444455]">No data</div>
      </div>
    )
  }

  const gradId   = `grad-ca-${index.symbol.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`
  const data     = thin(index.history, 150)
  const corrColor =
    correlation == null ? '#444455'
    : correlation > 0.7 ? '#22c55e'
    : correlation > 0.4 ? '#f59e0b'
    : correlation < 0   ? '#ef4444'
    : '#e0e0e0'

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-bold text-[#e0e0e0] font-mono">{index.name}</div>
          <div className="text-[9px] font-mono text-[#444455] mt-0.5">{index.symbol}</div>
        </div>
        <div className="text-right flex-shrink-0 space-y-1">
          <div className="text-lg font-bold font-mono leading-tight" style={{ color }}>
            ${fmtPrice(index.price)}
          </div>
          {correlation != null ? (
            <div className="text-[9px] font-mono" style={{ color: corrColor }}>
              90d r: {correlation.toFixed(3)}
            </div>
          ) : (
            <div className="text-[9px] font-mono text-[#444455]">90d r: —</div>
          )}
        </div>
      </div>

      <div className="flex gap-4 flex-wrap">
        {[
          { label: '1D',  val: index.change1d  },
          { label: '1M',  val: index.change1m  },
          { label: 'YTD', val: index.changeYtd },
          { label: '1Y',  val: index.change1y  },
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
              formatter={(v: unknown) => [`$${fmtPrice(v as number)}`, index.name]}
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

// ── VIXChart ───────────────────────────────────────────────────────────────

function VixChart({
  data,
  latest,
  zone,
  isLoading,
  isError,
}: {
  data: { date: string; value: number }[]
  latest: number
  zone: 'complacent' | 'normal' | 'elevated' | 'fear'
  isLoading: boolean
  isError: boolean
}) {
  const ZONE_LABELS: Record<typeof zone, string> = {
    complacent: 'Complacent',
    normal:     'Normal',
    elevated:   'Elevated',
    fear:       'Fear',
  }
  const ZONE_COLORS: Record<typeof zone, string> = {
    complacent: '#22c55e',
    normal:     '#60a5fa',
    elevated:   '#f59e0b',
    fear:       '#ef4444',
  }

  const zoneColor = ZONE_COLORS[zone]

  const body = () => {
    if (isLoading)
      return (
        <div className="flex items-center justify-center text-[#555566] text-xs font-mono h-[220px]">
          Loading…
        </div>
      )
    if (isError || data.length === 0)
      return (
        <div className="flex items-center justify-center border border-dashed border-[#1a1a2e] rounded-lg h-[220px]">
          <div className="text-[10px] font-mono text-[#444455]">{isError ? 'Failed to load' : 'No data'}</div>
        </div>
      )

    const thinned = thin(data, 300)
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
            domain={[0, 'auto']}
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => v.toFixed(0)}
            width={32}
          />
          <Tooltip
            formatter={(v: unknown) => [(v as number).toFixed(2), 'VIX']}
            labelStyle={{ color: '#666' }}
            contentStyle={TOOLTIP_CSS}
          />
          {/* Zone background shading */}
          <ReferenceArea y1={0}  y2={15}  fill="#22c55e" fillOpacity={0.05} />
          <ReferenceArea y1={15} y2={25}  fill="#60a5fa" fillOpacity={0.04} />
          <ReferenceArea y1={25} y2={35}  fill="#f59e0b" fillOpacity={0.06} />
          <ReferenceArea y1={35} y2={150} fill="#ef4444" fillOpacity={0.07} />
          {/* Zone boundary lines */}
          <ReferenceLine y={15} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.35} />
          <ReferenceLine y={25} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.35} />
          <ReferenceLine y={35} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.35} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#e0e0e0"
            strokeWidth={1.5}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-[#e0e0e0] font-mono">VIX — Volatility Index</div>
          <div className="text-[10px] text-[#555566] font-mono">CBOE Volatility Index — 2-year daily history</div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-2xl font-bold font-mono" style={{ color: zoneColor }}>
            {latest > 0 ? latest.toFixed(2) : '—'}
          </div>
          {latest > 0 && (
            <div
              className="text-[9px] font-mono px-2 py-1 rounded-lg font-bold uppercase tracking-wider"
              style={{ color: zoneColor, background: `${zoneColor}18`, border: `1px solid ${zoneColor}40` }}
            >
              {ZONE_LABELS[zone]}
            </div>
          )}
        </div>
      </div>
      {body()}
      <div className="flex flex-wrap gap-4 text-[9px] font-mono text-[#555566]">
        <span><span className="text-[#22c55e]">■</span> Complacent &lt;15</span>
        <span><span className="text-[#60a5fa]">■</span> Normal 15–25</span>
        <span><span className="text-[#f59e0b]">■</span> Elevated 25–35</span>
        <span><span className="text-[#ef4444]">■</span> Fear &gt;35</span>
      </div>
      <div className="text-[9px] font-mono text-[#333344]">Source: FRED (VIXCLS)</div>
    </div>
  )
}

// ── PerformanceTable ───────────────────────────────────────────────────────

type SortKey = '1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y'

interface TableRow extends GlobalEquityIndex {
  region: string
}

function heatBg(v: number): string {
  if (v >=  5)   return 'rgba(34,197,94,0.22)'
  if (v >=  2)   return 'rgba(34,197,94,0.11)'
  if (v >=  0.5) return 'rgba(34,197,94,0.05)'
  if (v >= -0.5) return 'transparent'
  if (v >= -2)   return 'rgba(239,68,68,0.07)'
  if (v >= -5)   return 'rgba(239,68,68,0.14)'
  return 'rgba(239,68,68,0.24)'
}

function PctCell({ value }: { value: number }) {
  return (
    <td
      className="px-3 py-2 text-[10px] font-mono text-right whitespace-nowrap"
      style={{ color: value >= 0 ? '#22c55e' : '#ef4444', background: heatBg(value) }}
    >
      {value >= 0 ? '+' : ''}{value.toFixed(2)}%
    </td>
  )
}

function PerformanceTable({ rows, isLoading }: { rows: TableRow[]; isLoading: boolean }) {
  const [sortKey, setSortKey] = useState<SortKey>('1D')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  const getValue = (row: TableRow, key: SortKey): number => {
    switch (key) {
      case '1D':  return row.change1d
      case '1W':  return row.change1w
      case '1M':  return row.change1m
      case '3M':  return row.change3m
      case 'YTD': return row.changeYtd
      case '1Y':  return row.change1y
    }
  }

  const sorted = [...rows].sort((a, b) => {
    const av = getValue(a, sortKey)
    const bv = getValue(b, sortKey)
    return sortDir === 'desc' ? bv - av : av - bv
  })

  const ColHeader = ({ k }: { k: SortKey }) => (
    <th
      className="px-3 py-2 text-right text-[9px] font-mono uppercase tracking-wider cursor-pointer hover:text-[#e0e0e0] select-none whitespace-nowrap"
      style={{ color: sortKey === k ? '#e0e0e0' : '#555566' }}
      onClick={() => handleSort(k)}
    >
      {k} {sortKey === k ? (sortDir === 'desc' ? '↓' : '↑') : ''}
    </th>
  )

  if (isLoading) {
    return (
      <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 animate-pulse space-y-2">
        <div className="h-4 w-48 bg-[#1a1a2e] rounded" />
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-8 bg-[#1a1a2e] rounded" />
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-8 flex items-center justify-center">
        <div className="text-[10px] font-mono text-[#444455]">No data</div>
      </div>
    )
  }

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl overflow-hidden">
      <div className="p-4 pb-2">
        <div className="text-[10px] text-[#555566] font-mono">
          Click column headers to sort · Cells coloured by magnitude
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[#1a1a2e]">
              <th className="px-3 py-2 text-left text-[9px] font-mono text-[#555566] uppercase tracking-wider">Index</th>
              <th className="px-3 py-2 text-right text-[9px] font-mono text-[#555566] uppercase tracking-wider">Price</th>
              <ColHeader k="1D" />
              <ColHeader k="1W" />
              <ColHeader k="1M" />
              <ColHeader k="3M" />
              <ColHeader k="YTD" />
              <ColHeader k="1Y" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.symbol} className="border-b border-[#1a1a2e] hover:bg-[#0f0f1a] transition-colors">
                <td className="px-3 py-2">
                  <div className="text-[10px] font-bold font-mono text-[#e0e0e0]">{row.name}</div>
                  <div className="text-[9px] font-mono text-[#444455]">{row.region} · {row.symbol}</div>
                </td>
                <td className="px-3 py-2 text-right text-[10px] font-mono text-[#e0e0e0] whitespace-nowrap">
                  {fmtPrice(row.price)}
                </td>
                <PctCell value={row.change1d} />
                <PctCell value={row.change1w} />
                <PctCell value={row.change1m} />
                <PctCell value={row.change3m} />
                <PctCell value={row.changeYtd} />
                <PctCell value={row.change1y} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── PAGE ───────────────────────────────────────────────────────────────────

export default function EquitiesPage() {
  const { data, isLoading, isError } = useEquitiesData()

  const metrics: MetricItem[] = [
    {
      label:  'S&P 500',
      value:  data?.usIndices.sp500.price   ? fmtPrice(data.usIndices.sp500.price)   : '—',
      change: data?.usIndices.sp500.change1d   ?? 0,
      sub:    'SP500',
      colorScheme: 'green-red',
    },
    {
      label:  'Nasdaq Composite',
      value:  data?.usIndices.nasdaq.price  ? fmtPrice(data.usIndices.nasdaq.price)  : '—',
      change: data?.usIndices.nasdaq.change1d  ?? 0,
      sub:    '^IXIC',
      colorScheme: 'green-red',
    },
    {
      label:  'Russell 2K',
      value:  data?.usIndices.russell2000.price ? fmtPrice(data.usIndices.russell2000.price) : '—',
      change: data?.usIndices.russell2000.change1d ?? 0,
      sub:    '^RUT',
      colorScheme: 'green-red',
    },
    {
      label:  'Dow Jones',
      value:  data?.usIndices.dowJones.price ? fmtPrice(data.usIndices.dowJones.price) : '—',
      change: data?.usIndices.dowJones.change1d ?? 0,
      sub:    '^DJI',
      colorScheme: 'green-red',
    },
    {
      label:  'DAX',
      value:  data?.european.dax.price      ? fmtPrice(data.european.dax.price)      : '—',
      change: data?.european.dax.change1d      ?? 0,
      sub:    '^GDAXI',
      colorScheme: 'green-red',
    },
    {
      label:  'Nikkei 225',
      value:  data?.asiaPacific.nikkei.price ? fmtPrice(data.asiaPacific.nikkei.price) : '—',
      change: data?.asiaPacific.nikkei.change1d ?? 0,
      sub:    '^N225',
      colorScheme: 'green-red',
    },
    {
      label:  'VIX',
      value:  data?.vix.latest               ? data.vix.latest.toFixed(2)             : '—',
      change: 0,
      sub:    data?.vix.zone ?? 'Volatility',
      colorScheme: 'neutral',
    },
  ]

  // Build performance table rows (indices only, not crypto stocks)
  const tableRows: TableRow[] = []
  if (data) {
    const addRow = (idx: GlobalEquityIndex, region: string) => {
      if (idx.price > 0) tableRows.push({ ...idx, region })
    }
    addRow(data.usIndices.sp500,       'US')
    addRow(data.usIndices.nasdaq,      'US')
    addRow(data.usIndices.russell2000, 'US')
    addRow(data.usIndices.dowJones,    'US')
    addRow(data.european.stoxx50,      'Europe')
    addRow(data.european.dax,          'Europe')
    addRow(data.european.ftse100,      'Europe')
    addRow(data.asiaPacific.nikkei,    'Asia-Pac')
    addRow(data.asiaPacific.hangSeng,  'Asia-Pac')
    addRow(data.asiaPacific.shanghai,  'Asia-Pac')
    addRow(data.asiaPacific.asx200,    'Asia-Pac')
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-8">

      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold font-mono text-[#e0e0e0]">Global Equities</h1>
        <p className="text-xs font-mono text-[#555566] mt-1">
          US, European &amp; Asia-Pacific indices — daily prices via FRED &amp; Yahoo Finance
        </p>
      </div>

      {/* Metric strip */}
      <MetricHeatmapStrip metrics={metrics} />

      {/* ── US INDICES ──────────────────────────────────────────────────── */}
      <section>
        <SectionTitle
          title="US Indices"
          subtitle="S&P 500, Nasdaq 100, Russell 2000 &amp; Dow Jones — 1-year daily closes"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <EquityCard index={data?.usIndices.sp500}       color="#60a5fa" isLoading={isLoading} isError={!!isError} />
          <EquityCard index={data?.usIndices.nasdaq}      color="#a78bfa" isLoading={isLoading} isError={!!isError} />
          <EquityCard index={data?.usIndices.russell2000} color="#34d399" isLoading={isLoading} isError={!!isError} />
          <EquityCard index={data?.usIndices.dowJones}    color="#f59e0b" isLoading={isLoading} isError={!!isError} />
        </div>
      </section>

      {/* ── VOLATILITY ──────────────────────────────────────────────────── */}
      <section>
        <SectionTitle
          title="Volatility"
          subtitle="CBOE VIX — market fear gauge with zone colouring"
        />
        <VixChart
          data={data?.vix.history ?? []}
          latest={data?.vix.latest ?? 0}
          zone={data?.vix.zone ?? 'normal'}
          isLoading={isLoading}
          isError={!!isError}
        />
      </section>

      {/* ── EUROPEAN INDICES ─────────────────────────────────────────────── */}
      <section>
        <SectionTitle
          title="European Indices"
          subtitle="Euro Stoxx 50, DAX &amp; FTSE 100"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <EquityCard index={data?.european.stoxx50} color="#f87171" isLoading={isLoading} isError={!!isError} />
          <EquityCard index={data?.european.dax}     color="#fb923c" isLoading={isLoading} isError={!!isError} />
          <EquityCard index={data?.european.ftse100} color="#fbbf24" isLoading={isLoading} isError={!!isError} />
        </div>
      </section>

      {/* ── ASIA-PACIFIC INDICES ─────────────────────────────────────────── */}
      <section>
        <SectionTitle
          title="Asia-Pacific Indices"
          subtitle="Nikkei 225, Hang Seng, Shanghai Composite &amp; ASX 200"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <EquityCard index={data?.asiaPacific.nikkei}   color="#e879f9" isLoading={isLoading} isError={!!isError} />
          <EquityCard index={data?.asiaPacific.hangSeng} color="#f472b6" isLoading={isLoading} isError={!!isError} />
          <EquityCard index={data?.asiaPacific.shanghai} color="#fb7185" isLoading={isLoading} isError={!!isError} />
          <EquityCard index={data?.asiaPacific.asx200}   color="#4ade80" isLoading={isLoading} isError={!!isError} />
        </div>
      </section>

      {/* ── CRYPTO-ADJACENT EQUITIES ─────────────────────────────────────── */}
      <section>
        <SectionTitle
          title="Crypto-Adjacent Equities"
          subtitle="Bitcoin-correlated stocks — 90-day log-return correlation with BTC"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <CryptoAdjacentCard
            index={data?.cryptoAdjacent.mstr}
            color="#f59e0b"
            correlation={data?.correlations.mstr ?? null}
            isLoading={isLoading}
            isError={!!isError}
          />
          <CryptoAdjacentCard
            index={data?.cryptoAdjacent.mara}
            color="#60a5fa"
            correlation={data?.correlations.mara ?? null}
            isLoading={isLoading}
            isError={!!isError}
          />
          <CryptoAdjacentCard
            index={data?.cryptoAdjacent.riot}
            color="#a78bfa"
            correlation={data?.correlations.riot ?? null}
            isLoading={isLoading}
            isError={!!isError}
          />
          <CryptoAdjacentCard
            index={data?.cryptoAdjacent.coin}
            color="#34d399"
            correlation={data?.correlations.coin ?? null}
            isLoading={isLoading}
            isError={!!isError}
          />
        </div>
      </section>

      {/* ── GLOBAL PERFORMANCE TABLE ─────────────────────────────────────── */}
      <section>
        <SectionTitle
          title="Global Performance Table"
          subtitle="Sortable multi-timeframe returns — click any column header to sort"
        />
        <PerformanceTable rows={tableRows} isLoading={isLoading} />
      </section>

    </div>
  )
}