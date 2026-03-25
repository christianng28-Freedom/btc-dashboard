'use client'

import Link from 'next/link'
import { useGlobalOverview } from '@/hooks/useGlobalOverview'
import { MetricHeatmapStrip, MetricItem } from '@/components/widgets/MetricHeatmapStrip'
import { KeyMarketsSnapshot } from '@/components/global/KeyMarketsSnapshot'
import { RiskRegimeBadge } from '@/components/global/RiskRegimeBadge'
import { MacroCalendar } from '@/components/global/MacroCalendar'

// ── Skeleton helpers ──────────────────────────────────────────────────────────

function SkeletonBlock({ h = 'h-10', className = '' }: { h?: string; className?: string }) {
  return (
    <div className={`${h} ${className} bg-[#111120] rounded-lg animate-pulse`} />
  )
}

function MetricStripSkeleton() {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 7 }).map((_, i) => (
        <SkeletonBlock key={i} h="h-14" className="flex-1 min-w-[90px]" />
      ))}
    </div>
  )
}

function MarketsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonBlock key={i} h="h-24" />
      ))}
    </div>
  )
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#444455] mb-3">
      {children}
    </h2>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function GlobalOverview() {
  const { data, isLoading, isError } = useGlobalOverview()

  // Build metric heatmap items from live data
  const metrics: MetricItem[] = data
    ? [
        {
          label: 'Fed Rate',
          value: `${data.fedRate.toFixed(2)}%`,
          rawValue: data.fedRate,
          change: data.fedRateChange,
          colorScheme: 'red-green',
          thresholds: { low: 2, high: 5 },
          sub: 'DFEDTARL',
        },
        {
          label: 'CPI YoY',
          value: `${data.cpiYoY.toFixed(1)}%`,
          rawValue: data.cpiYoY,
          change: data.cpiYoYChange,
          colorScheme: 'red-green',
          thresholds: { low: 2, high: 4 },
          sub: 'CPIAUCSL',
        },
        {
          label: 'Unemployment',
          value: `${data.unemployment.toFixed(1)}%`,
          rawValue: data.unemployment,
          change: data.unemploymentChange,
          colorScheme: 'red-green',
          thresholds: { low: 4.5, high: 6 },
          sub: 'UNRATE',
        },
        {
          label: 'M2 YoY',
          value: `${data.m2YoY.toFixed(1)}%`,
          rawValue: data.m2YoY,
          change: data.m2YoYChange,
          colorScheme: 'green-red',
          thresholds: { low: 0, high: 5 },
          sub: 'M2SL',
        },
        {
          label: '10Y Yield',
          value: `${data.tenYearYield.toFixed(2)}%`,
          rawValue: data.tenYearYield,
          change: data.tenYearYieldChange,
          colorScheme: 'red-green',
          thresholds: { low: 3, high: 5 },
          sub: 'DGS10',
        },
        {
          label: 'DXY',
          value: data.dxy.toFixed(2),
          rawValue: data.dxy,
          change: data.dxyChange,
          colorScheme: 'neutral',
          sub: 'DX-Y.NYB',
        },
        {
          label: 'VIX',
          value: data.vix.toFixed(1),
          rawValue: data.vix,
          change: data.vixChange,
          colorScheme: 'red-green',
          thresholds: { low: 18, high: 28 },
          sub: 'VIXCLS',
        },
      ]
    : []

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e0e0e0]">Global Overview</h1>
          <p className="text-sm text-[#666] mt-0.5">Multi-asset macro snapshot</p>
        </div>
        {data && (
          <div className="text-[9px] font-mono text-[#444455] text-right">
            <div>FRED · Yahoo · Stooq · CoinGecko</div>
            <div className="mt-0.5 text-[#333344]">Refreshes every 30 min</div>
          </div>
        )}
      </div>

      {/* Macro Metric Heatmap Strip */}
      <section>
        <SectionLabel>Macro Snapshot</SectionLabel>
        {isLoading && <MetricStripSkeleton />}
        {isError && (
          <div className="text-xs text-[#ef4444] font-mono py-3">
            Failed to load macro data — check FRED_API_KEY configuration.
          </div>
        )}
        {data && <MetricHeatmapStrip metrics={metrics} />}
      </section>

      {/* Key Markets Snapshot */}
      <section>
        <SectionLabel>Key Markets — 30d</SectionLabel>
        {isLoading && <MarketsSkeleton />}
        {data && <KeyMarketsSnapshot markets={data.markets} />}
      </section>

      {/* Risk Regime + Macro Calendar */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Risk Regime */}
          <div>
            <SectionLabel>Market Regime</SectionLabel>
            {isLoading && <SkeletonBlock h="h-32" />}
            {data && (
              <RiskRegimeBadge
                regime={data.regime}
                vix={data.vix}
                hyOAS={data.hyOAS}
                yieldCurve10y2y={data.yieldCurve10y2y}
              />
            )}
          </div>
          {/* Macro Calendar */}
          <div>
            <MacroCalendar maxItems={6} />
          </div>
        </div>
      </section>
    </div>
  )
}
