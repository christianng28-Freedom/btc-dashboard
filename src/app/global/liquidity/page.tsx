'use client'

import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts'
import { useLiquidityData } from '@/hooks/useLiquidityData'
import { MetricHeatmapStrip, type MetricItem } from '@/components/widgets/MetricHeatmapStrip'
import type { DataPoint, NetLiqPoint } from '@/app/api/global/liquidity/route'

// ── shared chart config ────────────────────────────────────────────────────

const AXIS        = { fill: '#555566', fontSize: 9, fontFamily: 'monospace' } as const
const TOOLTIP_CSS = {
  background: '#0d0d14',
  border:     '1px solid #1a1a2e',
  fontSize:   10,
  fontFamily: 'monospace',
} as const
const GRID = '#1a1a2e'

// ── helpers ────────────────────────────────────────────────────────────────

function thin<T>(arr: T[], max = 200): T[] {
  const step = Math.max(1, Math.floor(arr.length / max))
  return arr.filter((_, i) => i % step === 0 || i === arr.length - 1)
}

function fmtB(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(2)}T`
  if (v >= 1)    return `$${v.toFixed(0)}B`
  return `$${v.toFixed(2)}B`
}

function fmtBShort(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}T`
  return `${v.toFixed(0)}B`
}

function fmtPct(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
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

// ── LoadingChart / NoDataChart ─────────────────────────────────────────────

function LoadingChart({ height = 220 }: { height?: number }) {
  return (
    <div
      className="flex items-center justify-center bg-[#0d0d14] border border-[#1a1a2e] rounded-xl animate-pulse"
      style={{ height }}
    >
      <span className="text-[10px] font-mono text-[#444455]">Loading…</span>
    </div>
  )
}

function NoDataChart({ height = 220, label = 'No data' }: { height?: number; label?: string }) {
  return (
    <div
      className="flex items-center justify-center bg-[#0d0d14] border border-dashed border-[#1a1a2e] rounded-xl"
      style={{ height }}
    >
      <span className="text-[10px] font-mono text-[#444455]">{label}</span>
    </div>
  )
}

// ── NetLiquidityChart ──────────────────────────────────────────────────────

function NetLiquidityChart({
  history,
  btcHistory,
  isLoading,
  isError,
}: {
  history:    NetLiqPoint[]
  btcHistory: DataPoint[]
  isLoading:  boolean
  isError:    boolean
}) {
  if (isLoading) return <LoadingChart height={280} />
  if (isError || history.length === 0) return <NoDataChart height={280} label="Failed to load" />

  // FRED weekly dates are Wednesdays; Binance weekly klines are Mondays.
  // Use nearest-date lookup (≤7 days) instead of exact match.
  const sortedBtc = [...btcHistory].sort((a, b) => a.date.localeCompare(b.date))
  function nearestBtc(date: string): number | null {
    for (let i = sortedBtc.length - 1; i >= 0; i--) {
      if (sortedBtc[i].date <= date) {
        const diff = (new Date(date).getTime() - new Date(sortedBtc[i].date).getTime()) / 86_400_000
        return diff <= 7 ? sortedBtc[i].value : null
      }
    }
    return null
  }

  // Merge net liquidity (weekly) with BTC price
  const merged = thin(
    history.map((p) => ({
      date:       p.date,
      fedBalance: p.fedBalance,
      tga:        p.tga,
      rrp:        p.rrp,
      net:        p.net,
      btc:        nearestBtc(p.date),
    })).filter((p) => p.btc !== null),
    300,
  )

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-[#e0e0e0] font-mono">US Net Liquidity vs BTC Price</div>
          <div className="text-[10px] text-[#555566] font-mono">
            Net Liquidity = Fed Balance Sheet − TGA − RRP · Dual-axis overlay
          </div>
        </div>
        <div className="flex gap-4 text-[9px] font-mono flex-shrink-0">
          <span><span className="text-[#60a5fa]">━</span> Net Liquidity</span>
          <span><span className="text-[#f59e0b]">━</span> BTC Price</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={merged} margin={{ top: 4, right: 48, bottom: 0, left: 4 }}>
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
            yAxisId="left"
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => fmtBShort(v)}
            width={46}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`}
            width={46}
          />
          <Tooltip
            labelStyle={{ color: '#666' }}
            contentStyle={TOOLTIP_CSS}
            formatter={(value: unknown, name: string) => {
              const v = value as number
              if (name === 'net')  return [fmtB(v), 'Net Liquidity']
              if (name === 'btc')  return [`$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, 'BTC Price']
              return [v, name]
            }}
          />
          {/* QE4 phase */}
          <ReferenceArea yAxisId="left" x1="2020-03-01" x2="2022-04-30" fill="#22c55e" fillOpacity={0.04} />
          {/* QT2 phase */}
          <ReferenceArea yAxisId="left" x1="2022-06-01" x2="2099-01-01" fill="#ef4444" fillOpacity={0.03} />
          <ReferenceLine yAxisId="left" x="2022-06-01" stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.4} label={{ value: 'QT', position: 'top', fill: '#ef4444', fontSize: 8, fontFamily: 'monospace' }} />
          <ReferenceLine yAxisId="left" x="2020-03-15" stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.4} label={{ value: 'QE', position: 'top', fill: '#22c55e', fontSize: 8, fontFamily: 'monospace' }} />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="net"
            stroke="#60a5fa"
            fill="#60a5fa"
            fillOpacity={0.12}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="btc"
            stroke="#f59e0b"
            strokeWidth={1.5}
            dot={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="text-[9px] font-mono text-[#333344]">
        Source: FRED (WALCL, WTREGEN, RRPONTSYD) · Binance (BTC/USDT weekly)
      </div>
    </div>
  )
}

// ── NetLiquidityComponents ────────────────────────────────────────────────

function NetLiquidityComponents({
  history,
  isLoading,
  isError,
}: {
  history:   NetLiqPoint[]
  isLoading: boolean
  isError:   boolean
}) {
  if (isLoading) return <LoadingChart height={180} />
  if (isError || history.length === 0) return <NoDataChart height={180} />

  const thinned = thin(history, 200)

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 space-y-3">
      <div>
        <div className="text-xs font-bold text-[#e0e0e0] font-mono">Net Liquidity Components</div>
        <div className="text-[10px] text-[#555566] font-mono">Fed Balance Sheet, TGA &amp; RRP — weekly $B</div>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={thinned} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
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
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => fmtBShort(v)}
            width={46}
          />
          <Tooltip
            labelStyle={{ color: '#666' }}
            contentStyle={TOOLTIP_CSS}
            formatter={(value: unknown, name: string) => {
              const v = value as number
              const labels: Record<string, string> = { fedBalance: 'Fed BS', tga: 'TGA', rrp: 'RRP' }
              return [fmtB(v), labels[name] ?? name]
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 9, fontFamily: 'monospace', color: '#555566', paddingTop: 4 }}
            formatter={(value: string) => {
              const m: Record<string, string> = { fedBalance: 'Fed BS', tga: 'TGA', rrp: 'RRP' }
              return m[value] ?? value
            }}
          />
          <Line type="monotone" dataKey="fedBalance" stroke="#60a5fa" strokeWidth={1.5} dot={false} connectNulls />
          <Line type="monotone" dataKey="tga"        stroke="#f87171" strokeWidth={1.5} dot={false} connectNulls />
          <Line type="monotone" dataKey="rrp"        stroke="#a78bfa" strokeWidth={1.5} dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap gap-4 text-[9px] font-mono text-[#555566]">
        <span><span className="text-[#60a5fa]">━</span> Fed Balance Sheet (Total Assets)</span>
        <span><span className="text-[#f87171]">━</span> TGA (Treasury General Account)</span>
        <span><span className="text-[#a78bfa]">━</span> RRP (Reverse Repo, RRP↓ = liquidity entering system)</span>
      </div>
    </div>
  )
}

// ── FedBalanceChart ────────────────────────────────────────────────────────

function FedBalanceChart({
  total,
  treasuries,
  mbs,
  isLoading,
  isError,
}: {
  total:      DataPoint[]
  treasuries: DataPoint[]
  mbs:        DataPoint[]
  isLoading:  boolean
  isError:    boolean
}) {
  if (isLoading) return <LoadingChart height={260} />
  if (isError || total.length === 0) return <NoDataChart height={260} />

  const treasMap = new Map(treasuries.map((p) => [p.date, p.value]))
  const mbsMap   = new Map(mbs.map((p) => [p.date, p.value]))

  const merged = thin(
    total.map((p) => ({
      date:  p.date,
      total: p.value,
      treas: treasMap.get(p.date) ?? null,
      mbs:   mbsMap.get(p.date)   ?? null,
    })),
    250,
  )

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-[#e0e0e0] font-mono">Fed Balance Sheet Decomposition</div>
          <div className="text-[10px] text-[#555566] font-mono">
            Total Assets, Treasuries &amp; MBS — weekly $B · QE/QT phases annotated
          </div>
        </div>
        <div className="flex gap-4 text-[9px] font-mono flex-shrink-0">
          <span><span className="text-[#e0e0e0]">━</span> Total</span>
          <span><span className="text-[#60a5fa]">━</span> Treasuries</span>
          <span><span className="text-[#a78bfa]">━</span> MBS</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={merged} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
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
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => fmtBShort(v)}
            width={46}
          />
          <Tooltip
            labelStyle={{ color: '#666' }}
            contentStyle={TOOLTIP_CSS}
            formatter={(value: unknown, name: string) => {
              const labels: Record<string, string> = { total: 'Total Assets', treas: 'Treasuries', mbs: 'MBS' }
              return [fmtB(value as number), labels[name] ?? name]
            }}
          />
          {/* QE4 */}
          <ReferenceArea x1="2020-03-01" x2="2022-04-30" fill="#22c55e" fillOpacity={0.04} />
          {/* QT2 */}
          <ReferenceArea x1="2022-06-01" x2="2099-01-01" fill="#ef4444" fillOpacity={0.03} />
          <ReferenceLine x="2022-06-01" stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5}
            label={{ value: 'QT2 starts', position: 'insideTopRight', fill: '#ef4444', fontSize: 8, fontFamily: 'monospace' }}
          />
          <ReferenceLine x="2020-03-15" stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.5}
            label={{ value: 'QE4 (COVID)', position: 'insideTopLeft', fill: '#22c55e', fontSize: 8, fontFamily: 'monospace' }}
          />
          <Line type="monotone" dataKey="total" stroke="#e0e0e0" strokeWidth={2}   dot={false} connectNulls />
          <Line type="monotone" dataKey="treas" stroke="#60a5fa" strokeWidth={1.5} dot={false} connectNulls />
          <Line type="monotone" dataKey="mbs"   stroke="#a78bfa" strokeWidth={1.5} dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>

      <div className="text-[9px] font-mono text-[#333344]">Source: FRED (WALCL, TREAST, WSHOMCB)</div>
    </div>
  )
}

// ── RrpTgaCharts ───────────────────────────────────────────────────────────

function RrpAreaChart({ data, isLoading, isError }: { data: DataPoint[]; isLoading: boolean; isError: boolean }) {
  if (isLoading) return <LoadingChart height={180} />
  if (isError || data.length === 0) return <NoDataChart height={180} />
  const thinned = thin(data, 200)
  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 space-y-2">
      <div>
        <div className="text-xs font-bold text-[#e0e0e0] font-mono">Reverse Repo (RRP)</div>
        <div className="text-[10px] text-[#555566] font-mono">RRPONTSYD — Daily $B · RRP draining = liquidity entering system</div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold font-mono text-[#a78bfa]">{fmtB(thinned.at(-1)?.value ?? 0)}</span>
        <span className="text-[9px] font-mono text-[#555566]">latest</span>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={thinned} margin={{ top: 2, right: 2, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="grad-rrp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#a78bfa" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(d: string) => d.slice(0, 7)} interval="preserveStartEnd" />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v: number) => fmtBShort(v)} width={44} />
          <Tooltip formatter={(v: unknown) => [fmtB(v as number), 'RRP']} labelStyle={{ color: '#666' }} contentStyle={TOOLTIP_CSS} />
          <Area type="monotone" dataKey="value" stroke="#a78bfa" fill="url(#grad-rrp)" strokeWidth={1.5} dot={false} connectNulls />
        </AreaChart>
      </ResponsiveContainer>
      <div className="text-[9px] font-mono text-[#333344]">Source: FRED (RRPONTSYD)</div>
    </div>
  )
}

function TgaAreaChart({ data, isLoading, isError }: { data: DataPoint[]; isLoading: boolean; isError: boolean }) {
  if (isLoading) return <LoadingChart height={180} />
  if (isError || data.length === 0) return <NoDataChart height={180} />
  const thinned = thin(data, 200)
  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 space-y-2">
      <div>
        <div className="text-xs font-bold text-[#e0e0e0] font-mono">Treasury General Account (TGA)</div>
        <div className="text-[10px] text-[#555566] font-mono">WTREGEN — Weekly $B · TGA building = liquidity leaving system</div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold font-mono text-[#f87171]">{fmtB(thinned.at(-1)?.value ?? 0)}</span>
        <span className="text-[9px] font-mono text-[#555566]">latest</span>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={thinned} margin={{ top: 2, right: 2, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="grad-tga" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#f87171" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(d: string) => d.slice(0, 7)} interval="preserveStartEnd" />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v: number) => fmtBShort(v)} width={44} />
          <Tooltip formatter={(v: unknown) => [fmtB(v as number), 'TGA']} labelStyle={{ color: '#666' }} contentStyle={TOOLTIP_CSS} />
          <Area type="monotone" dataKey="value" stroke="#f87171" fill="url(#grad-tga)" strokeWidth={1.5} dot={false} connectNulls />
        </AreaChart>
      </ResponsiveContainer>
      <div className="text-[9px] font-mono text-[#333344]">Source: FRED (WTREGEN)</div>
    </div>
  )
}

// ── GlobalM2Chart ──────────────────────────────────────────────────────────

function GlobalM2IndexedChart({
  usIndexed,
  euIndexed,
  jpIndexed,
  cnIndexed,
  isLoading,
  isError,
}: {
  usIndexed:  DataPoint[]
  euIndexed:  DataPoint[]
  jpIndexed:  DataPoint[]
  cnIndexed:  DataPoint[]
  isLoading:  boolean
  isError:    boolean
}) {
  if (isLoading) return <LoadingChart height={220} />
  if (isError)   return <NoDataChart height={220} label="Failed to load" />

  const usMap = new Map(usIndexed.map((p) => [p.date, p.value]))
  const euMap = new Map(euIndexed.map((p) => [p.date, p.value]))
  const jpMap = new Map(jpIndexed.map((p) => [p.date, p.value]))
  const cnMap = new Map(cnIndexed.map((p) => [p.date, p.value]))

  const allDates = Array.from(
    new Set([
      ...usIndexed.map((p) => p.date),
      ...euIndexed.map((p) => p.date),
      ...jpIndexed.map((p) => p.date),
      ...cnIndexed.map((p) => p.date),
    ]),
  ).sort()

  const merged = thin(
    allDates.map((date) => ({
      date,
      us: usMap.get(date) ?? null,
      eu: euMap.get(date) ?? null,
      jp: jpMap.get(date) ?? null,
      cn: cnMap.get(date) ?? null,
    })),
    200,
  )

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-[#e0e0e0] font-mono">Global M2 — Indexed Growth</div>
          <div className="text-[10px] text-[#555566] font-mono">All series indexed to 100 at start date — comparable relative growth in local currency</div>
        </div>
        <div className="flex gap-3 text-[9px] font-mono flex-shrink-0">
          <span><span className="text-[#60a5fa]">━</span> US</span>
          <span><span className="text-[#34d399]">━</span> EU</span>
          <span><span className="text-[#f59e0b]">━</span> JP</span>
          <span><span className="text-[#f87171]">━</span> CN</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={merged} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(d: string) => d.slice(0, 7)} interval="preserveStartEnd" />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toFixed(0)} width={38} domain={['auto', 'auto']} />
          <Tooltip
            labelStyle={{ color: '#666' }}
            contentStyle={TOOLTIP_CSS}
            formatter={(value: unknown, name: string) => {
              const labels: Record<string, string> = { us: 'US M2', eu: 'EU M2', jp: 'JP M2', cn: 'CN M2' }
              return [`${(value as number).toFixed(1)}`, labels[name] ?? name]
            }}
          />
          <ReferenceLine y={100} stroke="#333344" strokeDasharray="3 3" />
          <Line type="monotone" dataKey="us" stroke="#60a5fa" strokeWidth={1.5} dot={false} connectNulls />
          <Line type="monotone" dataKey="eu" stroke="#34d399" strokeWidth={1.5} dot={false} connectNulls />
          <Line type="monotone" dataKey="jp" stroke="#f59e0b" strokeWidth={1.5} dot={false} connectNulls />
          <Line type="monotone" dataKey="cn" stroke="#f87171" strokeWidth={1.5} dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
      <div className="text-[9px] font-mono text-[#333344]">Source: FRED (M2SL, MANMM101 series) · Indexed = 100 at earliest available date</div>
    </div>
  )
}

function GlobalM2YoYChart({
  usYoY,
  euYoY,
  jpYoY,
  cnYoY,
  btcHistory,
  isLoading,
  isError,
}: {
  usYoY:      DataPoint[]
  euYoY:      DataPoint[]
  jpYoY:      DataPoint[]
  cnYoY:      DataPoint[]
  btcHistory: DataPoint[]
  isLoading:  boolean
  isError:    boolean
}) {
  if (isLoading) return <LoadingChart height={220} />
  if (isError)   return <NoDataChart height={220} label="Failed to load" />

  const euMap  = new Map(euYoY.map((p) => [p.date, p.value]))
  const jpMap  = new Map(jpYoY.map((p) => [p.date, p.value]))
  const cnMap  = new Map(cnYoY.map((p) => [p.date, p.value]))
  const sortedBtcM2 = [...btcHistory].sort((a, b) => a.date.localeCompare(b.date))
  function nearestBtcM2(date: string): number | null {
    for (let i = sortedBtcM2.length - 1; i >= 0; i--) {
      if (sortedBtcM2[i].date <= date) {
        const diff = (new Date(date).getTime() - new Date(sortedBtcM2[i].date).getTime()) / 86_400_000
        return diff <= 7 ? sortedBtcM2[i].value : null
      }
    }
    return null
  }

  const merged = thin(
    usYoY.map((p) => ({
      date: p.date,
      us:   p.value,
      eu:   euMap.get(p.date)  ?? null,
      jp:   jpMap.get(p.date)  ?? null,
      cn:   cnMap.get(p.date)  ?? null,
      btc:  nearestBtcM2(p.date),
    })).filter((p) => p.btc !== null),
    200,
  )

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-[#e0e0e0] font-mono">Global M2 YoY Growth &amp; BTC Price</div>
          <div className="text-[10px] text-[#555566] font-mono">Year-over-year % change — all regions + BTC price overlay (right axis)</div>
        </div>
        <div className="flex gap-3 text-[9px] font-mono flex-shrink-0">
          <span><span className="text-[#60a5fa]">━</span> US</span>
          <span><span className="text-[#34d399]">━</span> EU</span>
          <span><span className="text-[#f59e0b]">━</span> JP</span>
          <span><span className="text-[#f87171]">━</span> CN</span>
          <span><span className="text-[#fbbf24]">⋯</span> BTC</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={merged} margin={{ top: 4, right: 48, bottom: 0, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(d: string) => d.slice(0, 7)} interval="preserveStartEnd" />
          <YAxis yAxisId="left" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v.toFixed(0)}%`} width={38} />
          <YAxis yAxisId="right" orientation="right" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`} width={46} />
          <Tooltip
            labelStyle={{ color: '#666' }}
            contentStyle={TOOLTIP_CSS}
            formatter={(value: unknown, name: string) => {
              const v = value as number
              if (name === 'btc') return [`$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, 'BTC Price']
              const labels: Record<string, string> = { us: 'US M2 YoY', eu: 'EU M2 YoY', jp: 'JP M2 YoY', cn: 'CN M2 YoY' }
              return [fmtPct(v), labels[name] ?? name]
            }}
          />
          <ReferenceLine yAxisId="left" y={0} stroke="#333344" strokeDasharray="3 3" />
          <Line yAxisId="left"  type="monotone" dataKey="us"  stroke="#60a5fa" strokeWidth={1.5} dot={false} connectNulls />
          <Line yAxisId="left"  type="monotone" dataKey="eu"  stroke="#34d399" strokeWidth={1.5} dot={false} connectNulls />
          <Line yAxisId="left"  type="monotone" dataKey="jp"  stroke="#f59e0b" strokeWidth={1.5} dot={false} connectNulls />
          <Line yAxisId="left"  type="monotone" dataKey="cn"  stroke="#f87171" strokeWidth={1.5} dot={false} connectNulls />
          <Line yAxisId="right" type="monotone" dataKey="btc" stroke="#fbbf24" strokeWidth={1} strokeDasharray="4 2" dot={false} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="text-[9px] font-mono text-[#333344]">Source: FRED (M2SL, MANMM101 series) · Binance (BTC/USDT)</div>
    </div>
  )
}

// ── CreditGrowthChart ──────────────────────────────────────────────────────

function CreditGrowthChart({
  totalBankCredit,
  businessLoans,
  totalYoY,
  businessYoY,
  isLoading,
  isError,
}: {
  totalBankCredit: DataPoint[]
  businessLoans:   DataPoint[]
  totalYoY:        DataPoint[]
  businessYoY:     DataPoint[]
  isLoading:       boolean
  isError:         boolean
}) {
  if (isLoading) return <LoadingChart height={260} />
  if (isError || totalBankCredit.length === 0) return <NoDataChart height={260} />

  const bizMap = new Map(businessLoans.map((p) => [p.date, p.value]))
  const merged = thin(
    totalBankCredit.map((p) => ({
      date:  p.date,
      total: p.value,
      biz:   bizMap.get(p.date) ?? null,
    })),
    200,
  )

  const yoyBizMap = new Map(businessYoY.map((p) => [p.date, p.value]))
  const yoyMerged = thin(
    totalYoY.map((p) => ({
      date:  p.date,
      total: p.value,
      biz:   yoyBizMap.get(p.date) ?? null,
    })),
    200,
  )

  return (
    <div className="space-y-4">
      {/* Absolute levels */}
      <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-[#e0e0e0] font-mono">Bank Credit — Absolute Levels</div>
            <div className="text-[10px] text-[#555566] font-mono">Total Bank Credit &amp; C&amp;I Loans — weekly $B</div>
          </div>
          <div className="flex gap-4 text-[9px] font-mono flex-shrink-0">
            <span><span className="text-[#34d399]">━</span> Total Bank Credit</span>
            <span><span className="text-[#60a5fa]">━</span> C&amp;I Loans</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={merged} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(d: string) => d.slice(0, 7)} interval="preserveStartEnd" />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v: number) => fmtBShort(v)} width={46} domain={['auto', 'auto']} />
            <Tooltip
              labelStyle={{ color: '#666' }}
              contentStyle={TOOLTIP_CSS}
              formatter={(value: unknown, name: string) => {
                const labels: Record<string, string> = { total: 'Total Bank Credit', biz: 'C&I Loans' }
                return [fmtB(value as number), labels[name] ?? name]
              }}
            />
            <Line type="monotone" dataKey="total" stroke="#34d399" strokeWidth={2}   dot={false} connectNulls />
            <Line type="monotone" dataKey="biz"   stroke="#60a5fa" strokeWidth={1.5} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
        <div className="text-[9px] font-mono text-[#333344]">Source: FRED (TOTBKCR, BUSLOANS)</div>
      </div>

      {/* YoY % change */}
      <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-[#e0e0e0] font-mono">Bank Credit YoY Growth</div>
            <div className="text-[10px] text-[#555566] font-mono">Year-over-year % change — slowing credit growth signals tightening financial conditions</div>
          </div>
          <div className="flex gap-4 text-[9px] font-mono flex-shrink-0">
            <span><span className="text-[#34d399]">━</span> Total Credit</span>
            <span><span className="text-[#60a5fa]">━</span> C&amp;I Loans</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <ComposedChart data={yoyMerged} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(d: string) => d.slice(0, 7)} interval="preserveStartEnd" />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v.toFixed(0)}%`} width={38} />
            <Tooltip
              labelStyle={{ color: '#666' }}
              contentStyle={TOOLTIP_CSS}
              formatter={(value: unknown, name: string) => {
                const labels: Record<string, string> = { total: 'Total Credit YoY', biz: 'C&I Loans YoY' }
                return [fmtPct(value as number), labels[name] ?? name]
              }}
            />
            <ReferenceLine y={0} stroke="#555566" strokeDasharray="3 3" />
            <Bar dataKey="total" fill="#34d399" fillOpacity={0.5} />
            <Line type="monotone" dataKey="biz" stroke="#60a5fa" strokeWidth={1.5} dot={false} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="text-[9px] font-mono text-[#333344]">Source: FRED (TOTBKCR, BUSLOANS)</div>
      </div>
    </div>
  )
}

// ── PAGE ───────────────────────────────────────────────────────────────────

export default function LiquidityPage() {
  const { data, isLoading, isError } = useLiquidityData()

  const nl     = data?.netLiquidity.latest
  const fbLatest  = data?.fedBalance.total.at(-1)?.value ?? 0
  const rrpLatest = data?.rrp.at(-1)?.value              ?? 0
  const tgaLatest = data?.tga.at(-1)?.value              ?? 0
  const m2Latest  = data?.globalM2.usHistory.at(-1)?.value ?? 0
  const tbc       = data?.creditGrowth.totalBankCredit.at(-1)?.value ?? 0

  // WoW changes (prev week = second-to-last)
  const fbPrev     = data?.fedBalance.total.at(-2)?.value              ?? fbLatest
  const rrpPrev    = data?.rrp.at(-2)?.value                           ?? rrpLatest
  const tgaPrev    = data?.tga.at(-2)?.value                           ?? tgaLatest
  const m2Prev     = data?.globalM2.usHistory.at(-2)?.value            ?? m2Latest
  const tbcPrev    = data?.creditGrowth.totalBankCredit.at(-2)?.value  ?? tbc

  const pct = (cur: number, prev: number) =>
    prev !== 0 ? Math.round(((cur - prev) / Math.abs(prev)) * 10000) / 100 : 0

  const metrics: MetricItem[] = [
    {
      label:       'Fed Balance Sheet',
      value:       fbLatest > 0 ? fmtB(fbLatest) : '—',
      change:      pct(fbLatest, fbPrev),
      sub:         'WALCL · Total Assets',
      colorScheme: 'green-red',
    },
    {
      label:       'Net Liquidity',
      value:       nl?.net != null ? fmtB(nl.net) : '—',
      change:      nl?.changeWoW ?? 0,
      sub:         'Fed BS − TGA − RRP',
      colorScheme: 'green-red',
    },
    {
      label:       'RRP',
      value:       rrpLatest > 0 ? fmtB(rrpLatest) : '—',
      change:      pct(rrpLatest, rrpPrev),
      sub:         'RRPONTSYD · ↓ = bullish',
      colorScheme: 'red-green',
    },
    {
      label:       'TGA',
      value:       tgaLatest > 0 ? fmtB(tgaLatest) : '—',
      change:      pct(tgaLatest, tgaPrev),
      sub:         'WTREGEN · ↓ = bullish',
      colorScheme: 'red-green',
    },
    {
      label:       'US M2',
      value:       m2Latest > 0 ? fmtB(m2Latest) : '—',
      change:      pct(m2Latest, m2Prev),
      sub:         'M2SL · Money Supply',
      colorScheme: 'green-red',
    },
    {
      label:       'Bank Credit',
      value:       tbc > 0 ? fmtB(tbc) : '—',
      change:      pct(tbc, tbcPrev),
      sub:         'TOTBKCR · Total',
      colorScheme: 'green-red',
    },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-8">

      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold font-mono text-[#e0e0e0]">Liquidity &amp; Flows</h1>
        <p className="text-xs font-mono text-[#555566] mt-1">
          US Net Liquidity · Fed Balance Sheet · Global M2 · Reverse Repo · TGA · Bank Credit
        </p>
      </div>

      {/* Metric strip */}
      <MetricHeatmapStrip metrics={metrics} />

      {/* ── US NET LIQUIDITY ──────────────────────────────────────────── */}
      <section>
        <SectionTitle
          title="US Net Liquidity"
          subtitle="Net Liquidity = Fed Balance Sheet − Treasury General Account (TGA) − Reverse Repo (RRP)"
        />
        <div className="space-y-4">
          <NetLiquidityChart
            history={data?.netLiquidity.history    ?? []}
            btcHistory={data?.btcHistory           ?? []}
            isLoading={isLoading}
            isError={!!isError}
          />
          <NetLiquidityComponents
            history={data?.netLiquidity.history ?? []}
            isLoading={isLoading}
            isError={!!isError}
          />
        </div>
      </section>

      {/* ── FED BALANCE SHEET ─────────────────────────────────────────── */}
      <section>
        <SectionTitle
          title="Fed Balance Sheet Decomposition"
          subtitle="Total Assets, Treasuries held outright &amp; Mortgage-Backed Securities — QE/QT phases annotated"
        />
        <FedBalanceChart
          total={data?.fedBalance.total           ?? []}
          treasuries={data?.fedBalance.treasuries ?? []}
          mbs={data?.fedBalance.mbs               ?? []}
          isLoading={isLoading}
          isError={!!isError}
        />
      </section>

      {/* ── REVERSE REPO & TGA ────────────────────────────────────────── */}
      <section>
        <SectionTitle
          title="Reverse Repo &amp; Treasury General Account"
          subtitle="Key liquidity drain/injection mechanisms — declining RRP or TGA releases liquidity into the financial system"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RrpAreaChart
            data={data?.rrp     ?? []}
            isLoading={isLoading}
            isError={!!isError}
          />
          <TgaAreaChart
            data={data?.tga     ?? []}
            isLoading={isLoading}
            isError={!!isError}
          />
        </div>
      </section>

      {/* ── GLOBAL M2 ─────────────────────────────────────────────────── */}
      <section>
        <SectionTitle
          title="Global M2"
          subtitle="US, Eurozone, Japan &amp; China money supply — indexed growth &amp; YoY % change with BTC price overlay"
        />
        <div className="space-y-4">
          <GlobalM2IndexedChart
            usIndexed={data?.globalM2.usIndexed ?? []}
            euIndexed={data?.globalM2.euIndexed ?? []}
            jpIndexed={data?.globalM2.jpIndexed ?? []}
            cnIndexed={data?.globalM2.cnIndexed ?? []}
            isLoading={isLoading}
            isError={!!isError}
          />
          <GlobalM2YoYChart
            usYoY={data?.globalM2.usYoY      ?? []}
            euYoY={data?.globalM2.euYoY      ?? []}
            jpYoY={data?.globalM2.jpYoY      ?? []}
            cnYoY={data?.globalM2.cnYoY      ?? []}
            btcHistory={data?.btcHistory     ?? []}
            isLoading={isLoading}
            isError={!!isError}
          />
        </div>
      </section>

      {/* ── CREDIT GROWTH ─────────────────────────────────────────────── */}
      <section>
        <SectionTitle
          title="Credit Growth"
          subtitle="Total Bank Credit &amp; Commercial &amp; Industrial Loans — absolute levels and YoY % change"
        />
        <CreditGrowthChart
          totalBankCredit={data?.creditGrowth.totalBankCredit ?? []}
          businessLoans={data?.creditGrowth.businessLoans     ?? []}
          totalYoY={data?.creditGrowth.totalYoY               ?? []}
          businessYoY={data?.creditGrowth.businessYoY         ?? []}
          isLoading={isLoading}
          isError={!!isError}
        />
      </section>

    </div>
  )
}
