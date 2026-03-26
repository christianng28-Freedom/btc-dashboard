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
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#3a3a52] whitespace-nowrap">
        {children}
      </h2>
      <div className="flex-1 h-px bg-gradient-to-r from-[#1a1a2e] to-transparent" />
    </div>
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
      <div className="flex items-end justify-between border-b border-[#13131f] pb-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#3a3a52] mb-1.5">
            BTC Command
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-[#e8e8f0]">Global Overview</h1>
          <p className="text-sm text-[#44445a] mt-1">Multi-asset macro snapshot</p>
        </div>
        {data && (
          <div className="text-[10px] font-mono text-[#333344] text-right">
            <div className="text-[#3a3a52]">FRED · Yahoo · Stooq · CoinGecko</div>
            <div className="mt-1 text-[#2a2a3a]">Refreshes every 30 min</div>
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

      {/* Market Regime */}
      <section>
        <SectionLabel>Market Regime</SectionLabel>
        {isLoading && <SkeletonBlock h="h-[520px]" />}
        {data && (
          <RiskRegimeBadge
            regimeScore={data.regimeScore}
            regimeLabel={data.regimeLabel}
            regimeQuadrant={data.regimeQuadrant}
            regimeAllocation={data.regimeAllocation}
            vix={data.vix}
            hyOAS={data.hyOAS}
            yieldCurve10y2y={data.yieldCurve10y2y}
            m2YoY={data.m2YoY}
            cpiYoY={data.cpiYoY}
            cpiYoYChange={data.cpiYoYChange}
            realYield10y={data.realYield10y}
            netLiquidityWoW={data.netLiquidityWoW}
          />
        )}
      </section>

      {/* Macro Calendar */}
      <section>
        <MacroCalendar maxItems={8} />
      </section>

    </div>
  )
}
