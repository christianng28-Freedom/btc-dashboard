'use client'
import {
  ComposedChart,
  AreaChart,
  Area,
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
import { useEconomicData } from '@/hooks/useEconomicData'
import { FREDTimeSeriesChart } from '@/components/charts/FREDTimeSeriesChart'
import { FREDBarChart } from '@/components/charts/FREDBarChart'
import { MetricHeatmapStrip, type MetricItem } from '@/components/widgets/MetricHeatmapStrip'

// ── shared chart styles ────────────────────────────────────────────────────

const CHART_AXIS = { fill: '#555566', fontSize: 9, fontFamily: 'monospace' } as const
const CHART_TOOLTIP = {
  background: '#0d0d14',
  border: '1px solid #1a1a2e',
  fontSize: 10,
  fontFamily: 'monospace',
} as const
const CHART_GRID = '#1a1a2e'

// ── inline chart primitives ────────────────────────────────────────────────

interface AreaSeriesProps {
  title: string
  description?: string
  data: { date: string; value: number }[]
  color: string
  height?: number
  formatY?: (v: number) => string
  yDomain?: [number | 'auto', number | 'auto']
  referenceY?: number
  referenceLabel?: string
  source?: string
  isLoading?: boolean
  isError?: boolean
}

function AreaTimeChart({
  title,
  description,
  data,
  color,
  height = 200,
  formatY = (v) => v.toLocaleString(),
  yDomain,
  referenceY,
  referenceLabel,
  source,
  isLoading,
  isError,
}: AreaSeriesProps) {
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
          <div className="text-[10px] font-mono text-[#444455]">{isError ? 'Failed to load data' : 'No data'}</div>
        </div>
      )
    const step = Math.max(1, Math.floor(data.length / 200))
    const thinned = data.filter((_, i) => i % step === 0 || i === data.length - 1)
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={thinned} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
          <XAxis dataKey="date" tick={CHART_AXIS} tickLine={false} axisLine={false}
            tickFormatter={(d: string) => d.slice(0, 7)} interval="preserveStartEnd" />
          <YAxis domain={yDomain ?? ['auto', 'auto']} tick={CHART_AXIS} tickLine={false}
            axisLine={false} tickFormatter={formatY} width={48} />
          <Tooltip formatter={(v) => [formatY(v as number), title]}
            labelFormatter={(l) => l as string}
            contentStyle={CHART_TOOLTIP} labelStyle={{ color: '#666' }} />
          {referenceY != null && (
            <ReferenceLine y={referenceY} stroke="#444455" strokeDasharray="4 4"
              label={{ value: referenceLabel ?? '', position: 'insideTopRight', fill: '#555566', fontSize: 9, fontFamily: 'monospace' }} />
          )}
          <Area type="monotone" dataKey="value" name={title} stroke={color}
            fill={color} fillOpacity={0.12} strokeWidth={1.5} dot={false} connectNulls />
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

// Yield curve chart with red shading below zero
interface YieldCurveProps {
  data10y2y: { date: string; value: number }[]
  data10y3m: { date: string; value: number }[]
  isLoading?: boolean
  isError?: boolean
}

function YieldCurveChart({ data10y2y, data10y3m, isLoading, isError }: YieldCurveProps) {
  const height = 220

  const body = () => {
    if (isLoading)
      return (
        <div className="flex items-center justify-center text-[#555566] text-xs font-mono" style={{ height }}>
          Loading…
        </div>
      )
    if (isError || (data10y2y.length === 0 && data10y3m.length === 0))
      return (
        <div className="flex items-center justify-center border border-dashed border-[#1a1a2e] rounded-lg" style={{ height }}>
          <div className="text-[10px] font-mono text-[#444455]">{isError ? 'Failed to load data' : 'No data'}</div>
        </div>
      )

    // Merge by date
    const dateSet = new Set([...data10y2y.map((p) => p.date), ...data10y3m.map((p) => p.date)])
    const map2y  = new Map(data10y2y.map((p) => [p.date, p.value]))
    const map3m  = new Map(data10y3m.map((p) => [p.date, p.value]))
    const sorted = Array.from(dateSet).sort()
    const step   = Math.max(1, Math.floor(sorted.length / 300))
    const merged = sorted
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
          <XAxis dataKey="date" tick={CHART_AXIS} tickLine={false} axisLine={false}
            tickFormatter={(d: string) => d.slice(0, 7)} interval="preserveStartEnd" />
          <YAxis tick={CHART_AXIS} tickLine={false} axisLine={false}
            tickFormatter={(v) => `${v}%`} width={40} />
          <Tooltip
            formatter={(v, name) => [`${(v as number).toFixed(2)}%`, name as string]}
            labelFormatter={(l) => l as string}
            contentStyle={CHART_TOOLTIP} labelStyle={{ color: '#666' }} />
          <Legend wrapperStyle={{ fontSize: 9, fontFamily: 'monospace', color: '#555566' }} />
          {/* Red shading for inversion zone */}
          <ReferenceArea y1={-5} y2={0} fill="#ef4444" fillOpacity={0.07} />
          <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3"
            label={{ value: '0', position: 'insideTopRight', fill: '#ef4444', fontSize: 9, fontFamily: 'monospace' }} />
          <Line type="monotone" dataKey="10Y-2Y" stroke="#3b82f6" strokeWidth={1.5}
            dot={false} connectNulls />
          <Line type="monotone" dataKey="10Y-3M" stroke="#f59e0b" strokeWidth={1.5}
            dot={false} connectNulls strokeDasharray="4 2" />
        </ComposedChart>
      </ResponsiveContainer>
    )
  }

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 space-y-3">
      <div>
        <div className="text-xs font-bold text-[#e0e0e0] font-mono">Yield Curve Spreads</div>
        <div className="text-[10px] text-[#555566] font-mono">
          10Y-2Y and 10Y-3M Treasury spreads — inversion (below zero) historically precedes recession
        </div>
      </div>
      {body()}
      <div className="text-[9px] font-mono text-[#333344]">Source: FRED (T10Y2Y, T10Y3M)</div>
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

// ── page ───────────────────────────────────────────────────────────────────

export default function EconomicIndicatorsPage() {
  const { data, isLoading, isError } = useEconomicData()

  const inf  = data?.inflation
  const emp  = data?.employment
  const out  = data?.output
  const lead = data?.leading

  // ── Inflation stat cards ────────────────────────────────────────────────
  const inflationMetrics: MetricItem[] = [
    {
      label: 'CPI YoY',
      value: inf ? `${inf.latest.cpi.yoy}%` : '—',
      rawValue: inf?.latest.cpi.yoy,
      change: inf?.latest.cpi.mom,
      colorScheme: 'red-green',
      thresholds: { low: 2.5, high: 4.0 },
      sub: `MoM ${inf ? (inf.latest.cpi.mom >= 0 ? '+' : '') + inf.latest.cpi.mom + '%' : '—'}`,
    },
    {
      label: 'Core CPI YoY',
      value: inf ? `${inf.latest.coreCpi.yoy}%` : '—',
      rawValue: inf?.latest.coreCpi.yoy,
      change: inf?.latest.coreCpi.mom,
      colorScheme: 'red-green',
      thresholds: { low: 2.5, high: 4.0 },
      sub: `MoM ${inf ? (inf.latest.coreCpi.mom >= 0 ? '+' : '') + inf.latest.coreCpi.mom + '%' : '—'}`,
    },
    {
      label: 'Core PCE YoY',
      value: inf ? `${inf.latest.corePce.yoy}%` : '—',
      rawValue: inf?.latest.corePce.yoy,
      change: inf?.latest.corePce.mom,
      colorScheme: 'red-green',
      thresholds: { low: 2.0, high: 3.5 },
      sub: 'Fed target: 2%',
    },
    {
      label: 'PPI YoY',
      value: inf ? `${inf.latest.ppi.yoy}%` : '—',
      rawValue: inf?.latest.ppi.yoy,
      change: inf?.latest.ppi.mom,
      colorScheme: 'red-green',
      thresholds: { low: 2.0, high: 5.0 },
      sub: 'Producer prices',
    },
  ]

  // ── Employment stat cards ───────────────────────────────────────────────
  const employmentMetrics: MetricItem[] = [
    {
      label: 'Unemployment',
      value: emp ? `${emp.latest.unemployment.value}%` : '—',
      rawValue: emp?.latest.unemployment.value,
      change: emp?.latest.unemployment.change,
      colorScheme: 'red-green',
      thresholds: { low: 4.0, high: 5.5 },
      sub: emp ? emp.latest.unemployment.date.slice(0, 7) : '',
    },
    {
      label: 'NFP MoM',
      value: emp ? `${emp.latest.nfp.value >= 0 ? '+' : ''}${emp.latest.nfp.value.toLocaleString()}K` : '—',
      rawValue: emp?.latest.nfp.value,
      change: emp?.latest.nfp.value,
      colorScheme: 'green-red',
      thresholds: { low: 0, high: 150 },
      sub: emp ? emp.latest.nfp.date.slice(0, 7) : '',
    },
    {
      label: 'Init. Claims',
      value: emp ? `${emp.latest.claims.value.toLocaleString()}K` : '—',
      rawValue: emp?.latest.claims.value,
      colorScheme: 'red-green',
      thresholds: { low: 220, high: 300 },
      sub: emp ? `4WMA: ${emp.latest.claims.ma4.toLocaleString()}K` : '',
    },
    {
      label: 'LFPR',
      value: emp ? `${emp.latest.lfpr.value}%` : '—',
      rawValue: emp?.latest.lfpr.value,
      change: emp?.latest.lfpr.change,
      colorScheme: 'green-red',
      thresholds: { low: 62, high: 64 },
      sub: 'Labor force participation',
    },
  ]

  // ── Output & Sentiment stat cards ───────────────────────────────────────
  const outputMetrics: MetricItem[] = [
    {
      label: 'Mfg Confidence',
      value: out ? `${out.latest.ism.value}` : '—',
      rawValue: out?.latest.ism.value,
      change: out?.latest.ism.change,
      colorScheme: 'green-red',
      thresholds: { low: 0, high: 5 },
      sub: out ? (out.latest.ism.value >= 0 ? 'Expanding' : 'Contracting') : '',
    },
    {
      label: 'Ind. Prod YoY',
      value: out ? `${out.latest.industrialProd.yoy >= 0 ? '+' : ''}${out.latest.industrialProd.yoy}%` : '—',
      rawValue: out?.latest.industrialProd.yoy,
      change: out?.latest.industrialProd.yoy,
      colorScheme: 'green-red',
      thresholds: { low: 0, high: 3 },
      sub: out ? out.latest.industrialProd.date.slice(0, 7) : '',
    },
    {
      label: 'Michigan Sent.',
      value: out ? `${out.latest.michigan.value}` : '—',
      rawValue: out?.latest.michigan.value,
      change: out?.latest.michigan.change,
      colorScheme: 'green-red',
      thresholds: { low: 70, high: 90 },
      sub: 'Consumer confidence',
    },
    {
      label: 'Retail Sales MoM',
      value: out ? `${out.latest.retailSales.mom >= 0 ? '+' : ''}${out.latest.retailSales.mom}%` : '—',
      rawValue: out?.latest.retailSales.mom,
      change: out?.latest.retailSales.mom,
      colorScheme: 'green-red',
      thresholds: { low: 0, high: 0.5 },
      sub: out ? out.latest.retailSales.date.slice(0, 7) : '',
    },
  ]

  // ── Leading Indicators stat cards ───────────────────────────────────────
  const leadingMetrics: MetricItem[] = [
    {
      label: '10Y-2Y Spread',
      value: lead ? `${lead.latest.spread10y2y.value >= 0 ? '+' : ''}${lead.latest.spread10y2y.value}%` : '—',
      rawValue: lead?.latest.spread10y2y.value,
      colorScheme: 'green-red',
      thresholds: { low: 0, high: 0.5 },
      sub: lead?.latest.spread10y2y.date.slice(0, 7),
    },
    {
      label: '10Y-3M Spread',
      value: lead ? `${lead.latest.spread10y3m.value >= 0 ? '+' : ''}${lead.latest.spread10y3m.value}%` : '—',
      rawValue: lead?.latest.spread10y3m.value,
      colorScheme: 'green-red',
      thresholds: { low: 0, high: 0.5 },
      sub: lead?.latest.spread10y3m.date.slice(0, 7),
    },
    {
      label: 'CFNAI',
      value: lead ? `${lead.latest.cfnai.value >= 0 ? '+' : ''}${lead.latest.cfnai.value}` : '—',
      rawValue: lead?.latest.cfnai.value,
      change: lead?.latest.cfnai.value,
      colorScheme: 'green-red',
      thresholds: { low: -0.7, high: 0 },
      sub: lead ? (lead.latest.cfnai.value > 0 ? 'Above-trend growth' : 'Below-trend growth') : '',
    },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-10">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[#e0e0e0]">Economic Indicators</h1>
        <p className="text-sm text-[#666] mt-0.5">
          Inflation, employment, output & leading signals — US macro via FRED
        </p>
      </div>

      {/* ── Inflation ──────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeader
          title="Inflation"
          description="CPI, Core CPI, Core PCE and PPI year-over-year percentage change. Fed target: 2% Core PCE."
        />
        <MetricHeatmapStrip metrics={inflationMetrics} />
        <FREDTimeSeriesChart
          title="Inflation — Year-over-Year %"
          description="CPI, Core CPI, Core PCE, PPI — monthly YoY % change"
          height={240}
          series={[
            { key: 'cpi',     label: 'CPI',      color: '#3b82f6', data: inf?.cpiYoY     ?? [] },
            { key: 'coreCpi', label: 'Core CPI',  color: '#10b981', data: inf?.coreCpiYoY ?? [] },
            { key: 'corePce', label: 'Core PCE',  color: '#f59e0b', data: inf?.corePceYoY ?? [] },
            { key: 'ppi',     label: 'PPI',       color: '#8b5cf6', data: inf?.ppiYoY     ?? [] },
          ]}
          formatY={(v) => `${v.toFixed(1)}%`}
          referenceLines={[{ y: 2, label: '2% target', color: '#ef4444' }]}
          source="FRED: CPIAUCSL, CPILFESL, PCEPILFE, PPIACO"
          isLoading={isLoading}
          isError={isError}
        />
      </section>

      {/* ── Employment ─────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeader
          title="Employment"
          description="Labor market conditions — unemployment, payrolls, jobless claims, participation rate."
        />
        <MetricHeatmapStrip metrics={employmentMetrics} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AreaTimeChart
            title="Unemployment Rate"
            description="Seasonally adjusted — ~4% considered natural rate"
            data={emp?.unemployment ?? []}
            color="#3b82f6"
            formatY={(v) => `${v}%`}
            referenceY={4}
            referenceLabel="4% natural"
            source="FRED: UNRATE"
            isLoading={isLoading}
            isError={isError}
          />
          <FREDBarChart
            title="Nonfarm Payrolls MoM"
            description="Monthly change in total nonfarm employment (thousands)"
            data={emp?.nfpMoM ?? []}
            formatY={(v) => `${v >= 0 ? '+' : ''}${v.toLocaleString()}K`}
            referenceLines={[{ y: 0, label: '' }]}
            source="FRED: PAYEMS"
            isLoading={isLoading}
            isError={isError}
          />
          <FREDTimeSeriesChart
            title="Initial Jobless Claims"
            description="Weekly initial unemployment claims (thousands) + 4-week moving average"
            height={200}
            series={[
              { key: 'claims', label: 'Claims', color: '#ef4444', data: emp?.initialClaims ?? [] },
              { key: 'ma4',    label: '4W MA',  color: '#f59e0b', data: emp?.initialClaimsMA4 ?? [] },
            ]}
            formatY={(v) => `${v.toLocaleString()}K`}
            source="FRED: ICSA"
            isLoading={isLoading}
            isError={isError}
          />
          <AreaTimeChart
            title="Labor Force Participation Rate"
            description="Share of civilian non-institutional population in labor force"
            data={emp?.lfpr ?? []}
            color="#10b981"
            formatY={(v) => `${v}%`}
            source="FRED: CIVPART"
            isLoading={isLoading}
            isError={isError}
          />
        </div>
      </section>

      {/* ── Output & Sentiment ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeader
          title="Output & Sentiment"
          description="Manufacturing activity, industrial production, consumer sentiment, and retail spending."
        />
        <MetricHeatmapStrip metrics={outputMetrics} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FREDTimeSeriesChart
            title="OECD Mfg Business Confidence"
            description="OECD Business Tendency Survey — above 0 = positive sentiment, below 0 = negative"
            height={200}
            series={[
              { key: 'ism', label: 'Mfg Confidence', color: '#3b82f6', data: out?.ismPmi ?? [] },
            ]}
            formatY={(v) => v.toFixed(1)}
            referenceLines={[{ y: 0, label: '0 neutral', color: '#22c55e' }]}
            source="FRED: BSCICP02USM460S"
            isLoading={isLoading}
            isError={isError}
          />
          <AreaTimeChart
            title="Industrial Production YoY"
            description="Year-over-year % change in industrial output index"
            data={out?.industrialProdYoY ?? []}
            color="#8b5cf6"
            formatY={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
            referenceY={0}
            referenceLabel=""
            source="FRED: INDPRO"
            isLoading={isLoading}
            isError={isError}
          />
          <FREDTimeSeriesChart
            title="Michigan Consumer Sentiment"
            description="University of Michigan survey — index of consumer confidence"
            height={200}
            series={[
              { key: 'michigan', label: 'Michigan Sentiment', color: '#f59e0b', data: out?.michiganSentiment ?? [] },
            ]}
            formatY={(v) => v.toFixed(1)}
            source="FRED: UMCSENT"
            isLoading={isLoading}
            isError={isError}
          />
          <FREDBarChart
            title="Retail Sales MoM"
            description="Advance retail sales month-over-month % change"
            data={out?.retailSalesMoM ?? []}
            formatY={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
            referenceLines={[{ y: 0, label: '' }]}
            source="FRED: RSXFS"
            isLoading={isLoading}
            isError={isError}
          />
        </div>
      </section>

      {/* ── Leading Indicators ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeader
          title="Leading Indicators"
          description="Forward-looking signals — yield curve inversions and Chicago Fed broad activity index."
        />
        <MetricHeatmapStrip metrics={leadingMetrics} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <YieldCurveChart
            data10y2y={lead?.yieldCurve10y2y ?? []}
            data10y3m={lead?.yieldCurve10y3m ?? []}
            isLoading={isLoading}
            isError={isError}
          />
          <FREDBarChart
            title="Chicago Fed National Activity Index (CFNAI)"
            description="Above 0 = above-trend growth. Below −0.7 over 3 months signals possible recession."
            data={lead?.cfnai ?? []}
            height={220}
            formatY={(v) => v.toFixed(2)}
            referenceLines={[
              { y: 0,    label: '0',    color: '#555566' },
              { y: -0.7, label: '−0.7', color: '#ef4444' },
            ]}
            positiveColor="#22c55e"
            negativeColor="#ef4444"
            source="FRED: CFNAI"
            isLoading={isLoading}
            isError={isError}
          />
        </div>
      </section>

    </div>
  )
}
