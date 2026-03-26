'use client'
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { useRatesData } from '@/hooks/useRatesData'
import { FREDTimeSeriesChart } from '@/components/charts/FREDTimeSeriesChart'
import { DualAxisChart } from '@/components/charts/DualAxisChart'
import { MetricHeatmapStrip, type MetricItem } from '@/components/widgets/MetricHeatmapStrip'
import { YieldCurveSnapshotChart } from '@/components/charts/YieldCurveSnapshotChart'
import { FedFundsChart } from '@/components/fundamental/FedFundsChart'
import { TreasuryYieldChart } from '@/components/fundamental/TreasuryYieldChart'
import type { DataPoint } from '@/app/api/global/rates/route'

// ── shared chart styles ────────────────────────────────────────────────────

const CHART_AXIS    = { fill: '#555566', fontSize: 9, fontFamily: 'monospace' } as const
const CHART_TOOLTIP = {
  background: '#0d0d14',
  border: '1px solid #1a1a2e',
  fontSize: 10,
  fontFamily: 'monospace',
} as const
const CHART_GRID = '#1a1a2e'

// ── inline chart — yield curve spreads history ────────────────────────────

interface YCHistoryProps {
  data10y2y: DataPoint[]
  data10y3m: DataPoint[]
  recessionBands: Array<{ start: string; end: string }>
  isLoading?: boolean
  isError?: boolean
}

function YieldCurveHistoryChart({
  data10y2y,
  data10y3m,
  recessionBands,
  isLoading,
  isError,
}: YCHistoryProps) {
  const height = 240

  const body = () => {
    if (isLoading) {
      return (
        <div
          className="flex items-center justify-center text-[#555566] text-xs font-mono"
          style={{ height }}
        >
          Loading…
        </div>
      )
    }
    if (isError || (data10y2y.length === 0 && data10y3m.length === 0)) {
      return (
        <div
          className="flex items-center justify-center border border-dashed border-[#1a1a2e] rounded-lg"
          style={{ height }}
        >
          <div className="text-[10px] font-mono text-[#444455]">
            {isError ? 'Failed to load data' : 'No data'}
          </div>
        </div>
      )
    }

    const dateSet = new Set([...data10y2y.map((p) => p.date), ...data10y3m.map((p) => p.date)])
    const map2y   = new Map(data10y2y.map((p) => [p.date, p.value]))
    const map3m   = new Map(data10y3m.map((p) => [p.date, p.value]))
    const sorted  = Array.from(dateSet).sort()
    const step    = Math.max(1, Math.floor(sorted.length / 300))
    const merged  = sorted
      .filter((_, i) => i % step === 0 || i === sorted.length - 1)
      .map((date) => ({
        date,
        '10Y-2Y': map2y.get(date),
        '10Y-3M': map3m.get(date),
      }))

    return (
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={merged} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
          <XAxis
            dataKey="date"
            tick={CHART_AXIS}
            tickLine={false}
            axisLine={false}
            tickFormatter={(d: string) => d.slice(0, 7)}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={CHART_AXIS}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
            width={40}
          />
          <Tooltip
            formatter={(v: unknown, name: string | number | undefined) => [
              `${(v as number).toFixed(2)}%`,
              name,
            ]}
            labelFormatter={(l) => l as string}
            contentStyle={CHART_TOOLTIP}
            labelStyle={{ color: '#666' }}
          />
          <Legend wrapperStyle={{ fontSize: 9, fontFamily: 'monospace', color: '#555566' }} />
          {/* NBER recession bands */}
          {recessionBands.map(({ start, end }, i) => (
            <ReferenceArea key={i} x1={start} x2={end} fill="#888888" fillOpacity={0.08} />
          ))}
          {/* Red shading for inversion zone (below zero) */}
          <ReferenceArea y1={-5} y2={0} fill="#ef4444" fillOpacity={0.07} />
          <ReferenceLine
            y={0}
            stroke="#ef4444"
            strokeDasharray="3 3"
            label={{ value: '0', position: 'insideTopRight', fill: '#ef4444', fontSize: 9, fontFamily: 'monospace' }}
          />
          <Line
            type="monotone"
            dataKey="10Y-2Y"
            stroke="#3b82f6"
            strokeWidth={1.5}
            dot={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="10Y-3M"
            stroke="#f59e0b"
            strokeWidth={1.5}
            dot={false}
            connectNulls
            strokeDasharray="4 2"
          />
        </ComposedChart>
      </ResponsiveContainer>
    )
  }

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 space-y-3">
      <div>
        <div className="text-xs font-bold text-[#e0e0e0] font-mono">Yield Curve History</div>
        <div className="text-[10px] text-[#555566] font-mono">
          10Y-2Y and 10Y-3M Treasury spreads — red shading = inversion zone (below 0), grey bars = NBER recessions
        </div>
      </div>
      {body()}
      <div className="text-[9px] font-mono text-[#333344]">Source: FRED (T10Y2Y, T10Y3M, USREC)</div>
    </div>
  )
}

// ── inline chart — credit spreads with zone reference lines ──────────────

interface CreditProps {
  hyOas: DataPoint[]
  igOas: DataPoint[]
  isLoading?: boolean
  isError?: boolean
}

function CreditSpreadChart({ hyOas, igOas, isLoading, isError }: CreditProps) {
  const height = 240

  const body = () => {
    if (isLoading) {
      return (
        <div
          className="flex items-center justify-center text-[#555566] text-xs font-mono"
          style={{ height }}
        >
          Loading…
        </div>
      )
    }
    if (isError || (hyOas.length === 0 && igOas.length === 0)) {
      return (
        <div
          className="flex items-center justify-center border border-dashed border-[#1a1a2e] rounded-lg"
          style={{ height }}
        >
          <div className="text-[10px] font-mono text-[#444455]">
            {isError ? 'Failed to load data' : 'No data'}
          </div>
        </div>
      )
    }

    const dateSet = new Set([...hyOas.map((p) => p.date), ...igOas.map((p) => p.date)])
    const hyMap   = new Map(hyOas.map((p) => [p.date, p.value]))
    const igMap   = new Map(igOas.map((p) => [p.date, p.value]))
    const sorted  = Array.from(dateSet).sort()
    const step    = Math.max(1, Math.floor(sorted.length / 300))
    const merged  = sorted
      .filter((_, i) => i % step === 0 || i === sorted.length - 1)
      .map((date) => ({
        date,
        'HY OAS': hyMap.get(date),
        'IG OAS': igMap.get(date),
      }))

    return (
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={merged} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
          <XAxis
            dataKey="date"
            tick={CHART_AXIS}
            tickLine={false}
            axisLine={false}
            tickFormatter={(d: string) => d.slice(0, 7)}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={CHART_AXIS}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
            width={44}
          />
          <Tooltip
            formatter={(v: unknown, name: string | number | undefined) => [
              `${(v as number).toFixed(2)}% (${Math.round((v as number) * 100)} bps)`,
              name,
            ]}
            labelFormatter={(l) => l as string}
            contentStyle={CHART_TOOLTIP}
            labelStyle={{ color: '#666' }}
          />
          <Legend wrapperStyle={{ fontSize: 9, fontFamily: 'monospace', color: '#555566' }} />
          {/* HY OAS zone lines */}
          <ReferenceLine
            y={3.5}
            stroke="#22c55e"
            strokeDasharray="4 4"
            label={{ value: 'HY tight', position: 'insideTopLeft', fill: '#22c55e', fontSize: 8, fontFamily: 'monospace' }}
          />
          <ReferenceLine
            y={6.0}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            label={{ value: 'HY wide', position: 'insideTopLeft', fill: '#f59e0b', fontSize: 8, fontFamily: 'monospace' }}
          />
          <ReferenceLine
            y={9.0}
            stroke="#ef4444"
            strokeDasharray="4 4"
            label={{ value: 'HY extreme', position: 'insideTopLeft', fill: '#ef4444', fontSize: 8, fontFamily: 'monospace' }}
          />
          <Line
            type="monotone"
            dataKey="HY OAS"
            stroke="#ef4444"
            strokeWidth={1.5}
            dot={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="IG OAS"
            stroke="#3b82f6"
            strokeWidth={1.5}
            dot={false}
            connectNulls
            strokeDasharray="4 2"
          />
        </ComposedChart>
      </ResponsiveContainer>
    )
  }

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 space-y-3">
      <div>
        <div className="text-xs font-bold text-[#e0e0e0] font-mono">Credit Spreads</div>
        <div className="text-[10px] text-[#555566] font-mono">
          Option-adjusted spreads over Treasuries — wider = more stress, tighter = risk-on
        </div>
      </div>
      {body()}
      <div className="text-[9px] font-mono text-[#333344]">
        Source: FRED (BAMLH0A0HYM2, BAMLC0A0CM)
      </div>
    </div>
  )
}

// ── section header ─────────────────────────────────────────────────────────

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h2 className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#444455]">
        {title}
      </h2>
      {description && (
        <p className="text-[10px] text-[#555566] font-mono mt-0.5">{description}</p>
      )}
    </div>
  )
}

// ── MOVE index chart ───────────────────────────────────────────────────────

interface MOVEChartProps {
  data: DataPoint[]
  isLoading?: boolean
  isError?: boolean
}

function MOVEChart({ data, isLoading, isError }: MOVEChartProps) {
  const height = 240

  const body = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center text-[#555566] text-xs font-mono" style={{ height }}>
          Loading…
        </div>
      )
    }
    if (isError || data.length === 0) {
      return (
        <div className="flex items-center justify-center border border-dashed border-[#1a1a2e] rounded-lg" style={{ height }}>
          <div className="text-[10px] font-mono text-[#444455]">
            {isError ? 'Failed to load data' : 'No data'}
          </div>
        </div>
      )
    }

    const step = Math.max(1, Math.floor(data.length / 300))
    const sampled = data.filter((_, i) => i % step === 0 || i === data.length - 1)

    return (
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={sampled} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
          <XAxis
            dataKey="date"
            tick={CHART_AXIS}
            tickLine={false}
            axisLine={false}
            tickFormatter={(d: string) => d.slice(0, 7)}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={CHART_AXIS}
            tickLine={false}
            axisLine={false}
            width={36}
          />
          <Tooltip
            formatter={(v: unknown) => [`${(v as number).toFixed(1)}`, 'MOVE']}
            labelFormatter={(l) => l as string}
            contentStyle={CHART_TOOLTIP}
            labelStyle={{ color: '#666' }}
          />
          {/* Zone reference lines */}
          <ReferenceLine
            y={60}
            stroke="#22c55e"
            strokeDasharray="4 4"
            label={{ value: 'Calm <60', position: 'insideTopLeft', fill: '#22c55e', fontSize: 8, fontFamily: 'monospace' }}
          />
          <ReferenceLine
            y={100}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            label={{ value: 'Elevated 80-100', position: 'insideTopLeft', fill: '#f59e0b', fontSize: 8, fontFamily: 'monospace' }}
          />
          <ReferenceLine
            y={120}
            stroke="#ef4444"
            strokeDasharray="4 4"
            label={{ value: 'Stressed >120', position: 'insideTopLeft', fill: '#ef4444', fontSize: 8, fontFamily: 'monospace' }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#a78bfa"
            strokeWidth={1.5}
            dot={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    )
  }

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 space-y-3">
      <div>
        <div className="text-xs font-bold text-[#e0e0e0] font-mono">ICE BofAML MOVE Index (^MOVE)</div>
        <div className="text-[10px] text-[#555566] font-mono">
          Bond market implied volatility — 1-month options on 2Y, 5Y, 10Y & 30Y Treasuries. High = rate uncertainty, Low = complacency.
        </div>
      </div>
      {body()}
      <div className="text-[9px] font-mono text-[#333344]">Source: Yahoo Finance (^MOVE) · Delayed quote</div>
    </div>
  )
}

// ── page ───────────────────────────────────────────────────────────────────

export default function TreasuryRatesPage() {
  const { data, isLoading, isError } = useRatesData()

  const snap      = data?.snapshot
  const spreads   = data?.spreads
  const keyRates  = data?.keyRates

  // Build { date, upper, lower }[] for FedFundsChart
  const fedFundsRangeData = (() => {
    const upperArr = keyRates?.fedFunds ?? []
    const lowerArr = keyRates?.fedFundsLower ?? []
    const lowerMap = new Map(lowerArr.map((p) => [p.date, p.value]))
    return upperArr
      .filter((p) => lowerMap.has(p.date))
      .map((p) => ({ date: p.date, upper: p.value, lower: lowerMap.get(p.date)! }))
  })()
  const credit    = data?.credit
  const realRates = data?.realRates
  const move      = data?.move
  const recBands  = data?.recessionBands ?? []

  // ── Snapshot stat cards ─────────────────────────────────────────────────
  const snapshotMetrics: MetricItem[] = [
    {
      label: '2Y Yield',
      value: keyRates ? `${keyRates.latest.y2.value}%` : '—',
      rawValue: keyRates?.latest.y2.value,
      change: keyRates?.latest.y2.change,
      colorScheme: 'neutral',
      sub: keyRates?.latest.y2.date.slice(0, 7),
    },
    {
      label: '5Y Yield',
      value: snap?.points.find((p) => p.maturity === '5Y')?.current != null
        ? `${snap.points.find((p) => p.maturity === '5Y')!.current!.toFixed(2)}%`
        : '—',
      rawValue: snap?.points.find((p) => p.maturity === '5Y')?.current ?? undefined,
      colorScheme: 'neutral',
      sub: snap?.currentDate.slice(0, 7),
    },
    {
      label: '10Y Yield',
      value: keyRates ? `${keyRates.latest.y10.value}%` : '—',
      rawValue: keyRates?.latest.y10.value,
      change: keyRates?.latest.y10.change,
      colorScheme: 'neutral',
      sub: keyRates?.latest.y10.date.slice(0, 7),
    },
    {
      label: '30Y Yield',
      value: keyRates ? `${keyRates.latest.y30.value}%` : '—',
      rawValue: keyRates?.latest.y30.value,
      change: keyRates?.latest.y30.change,
      colorScheme: 'neutral',
      sub: keyRates?.latest.y30.date.slice(0, 7),
    },
    {
      label: '10Y-2Y Spread',
      value: spreads
        ? `${spreads.latest.spread10y2y.value >= 0 ? '+' : ''}${spreads.latest.spread10y2y.value}%`
        : '—',
      rawValue: spreads?.latest.spread10y2y.value,
      change: spreads?.latest.spread10y2y.change,
      colorScheme: 'green-red',
      thresholds: { low: -0.25, high: 0.5 },
      sub: spreads?.latest.spread10y2y.value != null
        ? spreads.latest.spread10y2y.value < 0 ? 'Inverted' : 'Normal'
        : '',
    },
    {
      label: '10Y-3M Spread',
      value: spreads
        ? `${spreads.latest.spread10y3m.value >= 0 ? '+' : ''}${spreads.latest.spread10y3m.value}%`
        : '—',
      rawValue: spreads?.latest.spread10y3m.value,
      change: spreads?.latest.spread10y3m.change,
      colorScheme: 'green-red',
      thresholds: { low: -0.25, high: 0.5 },
      sub: spreads?.latest.spread10y3m.value != null
        ? spreads.latest.spread10y3m.value < 0 ? 'Inverted' : 'Normal'
        : '',
    },
  ]

  // ── Key Rates stat cards ────────────────────────────────────────────────
  const keyRateMetrics: MetricItem[] = [
    {
      label: 'Fed Funds',
      value: keyRates ? `${keyRates.latest.fedFunds.value}%` : '—',
      rawValue: keyRates?.latest.fedFunds.value,
      colorScheme: 'neutral',
      sub: 'Upper bound',
    },
    {
      label: '2Y Treasury',
      value: keyRates ? `${keyRates.latest.y2.value}%` : '—',
      rawValue: keyRates?.latest.y2.value,
      change: keyRates?.latest.y2.change,
      colorScheme: 'neutral',
      sub: keyRates?.latest.y2.date.slice(0, 7),
    },
    {
      label: '10Y Treasury',
      value: keyRates ? `${keyRates.latest.y10.value}%` : '—',
      rawValue: keyRates?.latest.y10.value,
      change: keyRates?.latest.y10.change,
      colorScheme: 'neutral',
      sub: 'Benchmark rate',
    },
    {
      label: '20Y Treasury',
      value: keyRates ? `${keyRates.latest.y20.value}%` : '—',
      rawValue: keyRates?.latest.y20.value,
      change: keyRates?.latest.y20.change,
      colorScheme: 'neutral',
      sub: keyRates?.latest.y20.date.slice(0, 7),
    },
    {
      label: '30Y Treasury',
      value: keyRates ? `${keyRates.latest.y30.value}%` : '—',
      rawValue: keyRates?.latest.y30.value,
      change: keyRates?.latest.y30.change,
      colorScheme: 'neutral',
      sub: 'Long bond',
    },
    {
      label: 'SOFR',
      value: keyRates ? `${keyRates.latest.sofr.value}%` : '—',
      rawValue: keyRates?.latest.sofr.value,
      colorScheme: 'neutral',
      sub: 'Overnight rate',
    },
  ]

  // ── Credit stat cards ───────────────────────────────────────────────────
  const creditMetrics: MetricItem[] = [
    {
      label: 'HY OAS',
      value: credit ? `${credit.latest.hyOas.value}%` : '—',
      rawValue: credit?.latest.hyOas.value,
      change: credit?.latest.hyOas.change,
      colorScheme: 'red-green',
      thresholds: { low: 3.5, high: 6.0 },
      sub: credit?.latest.hyOas.value != null
        ? credit.latest.hyOas.value < 3.5
          ? 'Tight — risk-on'
          : credit.latest.hyOas.value < 6.0
          ? 'Normal'
          : 'Wide — stress'
        : '',
    },
    {
      label: 'IG OAS',
      value: credit ? `${credit.latest.igOas.value}%` : '—',
      rawValue: credit?.latest.igOas.value,
      change: credit?.latest.igOas.change,
      colorScheme: 'red-green',
      thresholds: { low: 1.2, high: 2.0 },
      sub: credit?.latest.igOas.value != null
        ? credit.latest.igOas.value < 1.2
          ? 'Tight'
          : credit.latest.igOas.value < 2.0
          ? 'Normal'
          : 'Wide'
        : '',
    },
  ]

  // ── Real Rates stat cards ───────────────────────────────────────────────
  const realRateMetrics: MetricItem[] = [
    {
      label: '10Y Real Yield',
      value: realRates
        ? `${realRates.latest.tipsReal10y.value >= 0 ? '+' : ''}${realRates.latest.tipsReal10y.value}%`
        : '—',
      rawValue: realRates?.latest.tipsReal10y.value,
      change: realRates?.latest.tipsReal10y.change,
      colorScheme: 'neutral',
      sub: '10Y TIPS real yield',
    },
    {
      label: '10Y Breakeven',
      value: realRates ? `${realRates.latest.breakeven10y.value}%` : '—',
      rawValue: realRates?.latest.breakeven10y.value,
      change: realRates?.latest.breakeven10y.change,
      colorScheme: 'red-green',
      thresholds: { low: 2.0, high: 2.8 },
      sub: 'Inflation expectations',
    },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-10">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[#e0e0e0]">Treasury & Rates</h1>
        <p className="text-sm text-[#666] mt-0.5">
          Yield curve, key rates, credit conditions & real rates — US fixed income via FRED
        </p>
      </div>

      {/* ── Fed Policy & 10Y Benchmark ───────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeader
          title="Fed Policy & 10Y Benchmark"
          description="The two pivotal rates: Fed Funds target range set by the FOMC, and the 10-year Treasury — the global risk-free benchmark."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FedFundsChart
            data={fedFundsRangeData}
            isLoading={isLoading}
            isError={isError}
          />
          <TreasuryYieldChart
            data={keyRates?.y10 ?? []}
            isLoading={isLoading}
            isError={isError}
          />
        </div>
      </section>

      {/* ── Yield Curve Snapshot ──────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeader
          title="Yield Curve Snapshot"
          description="Current term structure of US Treasury yields vs 1Y and 2Y ago. Red dots indicate where the curve inverts."
        />
        <MetricHeatmapStrip metrics={snapshotMetrics} />
        <YieldCurveSnapshotChart
          points={snap?.points ?? []}
          currentDate={snap?.currentDate ?? ''}
          oneYearAgoDate={snap?.oneYearAgoDate ?? ''}
          twoYearsAgoDate={snap?.twoYearsAgoDate ?? ''}
          isLoading={isLoading}
          isError={isError}
        />
      </section>

      {/* ── Yield Curve History ───────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeader
          title="Yield Curve History"
          description="10Y-2Y and 10Y-3M spreads over time — inversion (below 0) historically precedes recession by 12-18 months."
        />
        <YieldCurveHistoryChart
          data10y2y={spreads?.spread10y2y ?? []}
          data10y3m={spreads?.spread10y3m ?? []}
          recessionBands={recBands}
          isLoading={isLoading}
          isError={isError}
        />
      </section>

      {/* ── Key Rates ─────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeader
          title="Key Rates"
          description="Federal Funds upper bound, treasury yields, and SOFR overnight rate — all in annualised % terms."
        />
        <MetricHeatmapStrip metrics={keyRateMetrics} />
        <FREDTimeSeriesChart
          title="Key Rates — Historical"
          description="Fed Funds (upper bound), 2Y, 10Y, 20Y, 30Y Treasury yields, and SOFR"
          height={260}
          series={[
            { key: 'fedFunds', label: 'Fed Funds', color: '#ef4444', data: keyRates?.fedFunds ?? [] },
            { key: 'y2',       label: '2Y',        color: '#f59e0b', data: keyRates?.y2       ?? [] },
            { key: 'y10',      label: '10Y',       color: '#3b82f6', data: keyRates?.y10      ?? [] },
            { key: 'y20',      label: '20Y',       color: '#8b5cf6', data: keyRates?.y20      ?? [] },
            { key: 'y30',      label: '30Y',       color: '#10b981', data: keyRates?.y30      ?? [] },
            { key: 'sofr',     label: 'SOFR',      color: '#06b6d4', data: keyRates?.sofr     ?? [] },
          ]}
          formatY={(v) => `${v.toFixed(2)}%`}
          source="FRED: DFEDTARU, DGS2, DGS10, DGS20, DGS30, SOFR"
          isLoading={isLoading}
          isError={isError}
        />
      </section>

      {/* ── Credit Conditions ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeader
          title="Credit Conditions"
          description="High Yield and Investment Grade option-adjusted spreads over Treasuries. Wider spreads = more credit stress."
        />
        <MetricHeatmapStrip metrics={creditMetrics} />
        <CreditSpreadChart
          hyOas={credit?.hyOas ?? []}
          igOas={credit?.igOas ?? []}
          isLoading={isLoading}
          isError={isError}
        />
      </section>

      {/* ── MOVE Index ────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeader
          title="MOVE Index"
          description="Bond market implied volatility — the rate equivalent of VIX."
        />
        {move?.latest && (
          <MetricHeatmapStrip metrics={[{
            label: 'MOVE Index',
            value: move.latest.value.toFixed(1),
            rawValue: move.latest.value,
            change: move.latest.change,
            colorScheme: 'red-green',
            thresholds: { low: 60, high: 120 },
            sub: move.latest.value < 60 ? 'Calm' : move.latest.value < 100 ? 'Elevated' : 'Stressed',
          }]} />
        )}
        <MOVEChart
          data={move?.history ?? []}
          isLoading={isLoading}
          isError={isError}
        />
      </section>

      {/* ── Real Rates & Inflation Expectations ───────────────────────────── */}
      <section className="space-y-4">
        <SectionHeader
          title="Real Rates & Inflation Expectations"
          description="10Y TIPS real yield and 10Y breakeven inflation rate (market's inflation expectation). Nominal yield ≈ Real yield + Breakeven."
        />
        <MetricHeatmapStrip metrics={realRateMetrics} />
        <DualAxisChart
          title="10Y Real Yield vs 10Y Breakeven Inflation"
          description="TIPS-implied real yield (left) and market breakeven inflation expectation (right)"
          height={260}
          left={{
            key: 'tipsReal10y',
            label: '10Y TIPS Real Yield',
            color: '#3b82f6',
            data: realRates?.tipsReal10y ?? [],
            type: 'line',
            formatY: (v) => `${v.toFixed(2)}%`,
            yAxisId: 'left',
          }}
          right={{
            key: 'breakeven10y',
            label: '10Y Breakeven Inflation',
            color: '#ef4444',
            data: realRates?.breakeven10y ?? [],
            type: 'area',
            formatY: (v) => `${v.toFixed(2)}%`,
            yAxisId: 'right',
          }}
          referenceLines={[
            { y: 0,   yAxisId: 'left',  label: '0% real',    color: '#555566' },
            { y: 2.0, yAxisId: 'right', label: '2% target',  color: '#f59e0b' },
          ]}
          source="FRED: DFII10, T10YIE"
          isLoading={isLoading}
          isError={isError}
        />
      </section>

    </div>
  )
}
