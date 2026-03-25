'use client'

import { useState, useMemo } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'

export interface AdoptionCountry {
  name: string
  alpha2: string
  numericCode: string
  tier: string
  tierLabel: string
  since: string | null
  details: string
  flag: string
}

interface Props {
  countries: AdoptionCountry[]
}

const TIER_COLORS: Record<string, string> = {
  'legal-tender': '#f59e0b',
  'permissive': '#22c55e',
  'neutral': '#3b82f6',
  'restrictive': '#f97316',
  'banned': '#ef4444',
}

const TIER_BG: Record<string, string> = {
  'legal-tender': '#1f1000',
  'permissive': '#0a1f0e',
  'neutral': '#0a0f1f',
  'restrictive': '#1f0e00',
  'banned': '#1f0a0a',
}

const TIER_BORDER: Record<string, string> = {
  'legal-tender': '#4d3000',
  'permissive': '#1a4d24',
  'neutral': '#1a2a4d',
  'restrictive': '#4d2800',
  'banned': '#4d1a1a',
}

const LEGEND_TIERS = [
  { tier: 'legal-tender', label: 'Legal Tender' },
  { tier: 'permissive', label: 'Permissive' },
  { tier: 'neutral', label: 'Neutral' },
  { tier: 'restrictive', label: 'Restrictive' },
  { tier: 'banned', label: 'Banned' },
]

function formatSince(since: string | null): string | null {
  if (!since) return null
  return new Date(since).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function NationStateMap({ countries }: Props) {
  const [selected, setSelected] = useState<AdoptionCountry | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Build a lookup: numericCode -> AdoptionCountry
  const countryMap = useMemo(() => {
    const m: Record<string, AdoptionCountry> = {}
    for (const c of countries) {
      m[c.numericCode] = c
    }
    return m
  }, [countries])

  function getFill(geoId: string): string {
    const country = countryMap[geoId]
    if (!country) return '#1e2030'
    return TIER_COLORS[country.tier] ?? '#1e2030'
  }

  function getHoverFill(geoId: string): string {
    const base = getFill(geoId)
    // Slightly brighter on hover - use opacity trick via a lighter hex
    return base === '#1e2030' ? '#2a2d45' : base
  }

  return (
    <div>
      {/* Map */}
      <div className="relative rounded-lg overflow-hidden" style={{ backgroundColor: '#05070a' }}>
        <ComposableMap
          projectionConfig={{ scale: 145, center: [0, 10] }}
          width={800}
          height={400}
          style={{ width: '100%', height: 'auto' }}
        >
          <Geographies geography="/world-110m.json">
            {({ geographies }) =>
              geographies.map((geo) => {
                const geoId = String(geo.id)
                const isHovered = hoveredId === geoId
                const fill = isHovered ? getHoverFill(geoId) : getFill(geoId)
                const hasData = geoId in countryMap

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fill}
                    stroke="#0d0d20"
                    strokeWidth={0.4}
                    style={{
                      default: { outline: 'none' },
                      hover: { outline: 'none', cursor: hasData ? 'pointer' : 'default' },
                      pressed: { outline: 'none' },
                    }}
                    onClick={() => {
                      const country = countryMap[geoId]
                      if (country) setSelected(selected?.numericCode === geoId ? null : country)
                    }}
                    onMouseEnter={() => setHoveredId(geoId)}
                    onMouseLeave={() => setHoveredId(null)}
                  />
                )
              })
            }
          </Geographies>
        </ComposableMap>
      </div>

      {/* Selected country info panel */}
      {selected && (
        <div
          className="mt-3 rounded-lg border p-4 transition-all"
          style={{
            backgroundColor: TIER_BG[selected.tier] ?? '#0d0d14',
            borderColor: TIER_BORDER[selected.tier] ?? '#1a1a2e',
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl leading-none">{selected.flag}</span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[14px] font-semibold text-[#e0e0e0]">{selected.name}</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider font-semibold"
                    style={{
                      color: TIER_COLORS[selected.tier] ?? '#666',
                      backgroundColor: `${TIER_COLORS[selected.tier] ?? '#666'}18`,
                      border: `1px solid ${TIER_BORDER[selected.tier] ?? '#333'}`,
                    }}
                  >
                    {selected.tierLabel}
                  </span>
                  {selected.since && (
                    <span className="text-[9px] font-mono text-[#555566]">Since {formatSince(selected.since)}</span>
                  )}
                </div>
                <p className="text-[12px] text-[#999] leading-relaxed mt-1.5 max-w-2xl">{selected.details}</p>
              </div>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-[#444455] hover:text-[#999] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {!selected && (
        <div className="mt-2 text-[10px] font-mono text-[#333344] text-center">
          Click a highlighted country for details
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-[#1a1a2e]">
        <span className="text-[9px] font-mono text-[#333344] uppercase tracking-wider mr-1">Tier</span>
        {LEGEND_TIERS.map(({ tier, label }) => (
          <div key={tier} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: TIER_COLORS[tier] }} />
            <span className="text-[10px] font-mono text-[#555566]">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-[#1e2030]" />
          <span className="text-[10px] font-mono text-[#555566]">No Data</span>
        </div>
      </div>
    </div>
  )
}
