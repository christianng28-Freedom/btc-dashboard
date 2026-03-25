'use client'
import { useMacroData } from '@/hooks/useMacroData'

const TREND_ICONS = { up: '↑', down: '↓', flat: '→' }

function formatDate(isoDate: string): string {
  if (!isoDate) return ''
  const [year, month] = isoDate.split('-')
  const d = new Date(parseInt(year), parseInt(month) - 1)
  return d.toLocaleString('en-US', { month: 'short', year: 'numeric' })
}

function formatM2(billions: number): string {
  if (billions >= 1000) return `$${(billions / 1000).toFixed(1)}T`
  return `$${billions.toFixed(0)}B`
}

export function MacroSnapshotCards() {
  const { data, isLoading, isError } = useMacroData()

  const metrics = data
    ? [
        {
          label: 'Fed Funds Rate',
          value: `${data.fedFundsLower.toFixed(2)}–${data.fedFundsUpper.toFixed(2)}%`,
          sub: 'Target range',
          trend: 'flat' as const,
          trendColor: '#f59e0b',
        },
        {
          label: 'US CPI (YoY)',
          value: `${data.cpiYoY.toFixed(1)}%`,
          sub: formatDate(data.cpiDate),
          trend: data.cpiYoY < 2.5 ? ('down' as const) : data.cpiYoY > 3.5 ? ('up' as const) : ('flat' as const),
          trendColor: data.cpiYoY < 2.5 ? '#22c55e' : data.cpiYoY > 3.5 ? '#ef4444' : '#f59e0b',
        },
        {
          label: 'PCE (YoY)',
          value: `${data.pceYoY.toFixed(1)}%`,
          sub: formatDate(data.pceDate),
          trend: data.pceYoY < 2.0 ? ('down' as const) : data.pceYoY > 3.0 ? ('up' as const) : ('flat' as const),
          trendColor: data.pceYoY < 2.0 ? '#22c55e' : data.pceYoY > 3.0 ? '#ef4444' : '#f59e0b',
        },
        {
          label: 'M2 Money Supply',
          value: formatM2(data.m2Billions),
          sub: `${formatDate(data.m2Date)}, YoY ${data.m2YoY >= 0 ? '+' : ''}${data.m2YoY.toFixed(1)}%`,
          trend: data.m2YoY > 3 ? ('up' as const) : data.m2YoY < 0 ? ('down' as const) : ('flat' as const),
          trendColor: data.m2YoY > 3 ? '#22c55e' : data.m2YoY < 0 ? '#ef4444' : '#f59e0b',
        },
        {
          label: '10Y Treasury Yield',
          value: `${data.tenYearYield.toFixed(2)}%`,
          sub: formatDate(data.tenYearDate),
          trend: 'flat' as const,
          trendColor: '#f59e0b',
        },
        {
          label: 'DXY (Broad)',
          value: `${data.dxy.toFixed(2)}`,
          sub: formatDate(data.dxyDate),
          trend: 'flat' as const,
          trendColor: '#f59e0b',
        },
      ]
    : null

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {isLoading && (
          <>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg px-4 py-3 space-y-1 animate-pulse">
                <div className="h-2 w-24 bg-[#1a1a2e] rounded" />
                <div className="h-5 w-20 bg-[#1a1a2e] rounded mt-2" />
                <div className="h-2 w-16 bg-[#1a1a2e] rounded" />
              </div>
            ))}
          </>
        )}
        {isError && (
          <div className="col-span-3 text-[#555] text-xs font-mono py-2">
            Failed to load macro data — check FRED API key
          </div>
        )}
        {metrics?.map((m) => (
          <div
            key={m.label}
            className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg px-4 py-3 space-y-1"
          >
            <div className="text-[#666] text-xs font-mono">{m.label}</div>
            <div className="flex items-center gap-1.5">
              <span className="text-[#e0e0e0] font-mono font-bold text-base">{m.value}</span>
              <span className="text-sm font-mono font-semibold" style={{ color: m.trendColor }}>
                {TREND_ICONS[m.trend]}
              </span>
            </div>
            <div className="text-[#555] text-[10px] font-mono">{m.sub}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-[#444] font-mono">
        <span className="text-[#3b82f6]">ℹ</span>
        Live data via FRED API · Updates every 6h
      </div>
    </div>
  )
}
