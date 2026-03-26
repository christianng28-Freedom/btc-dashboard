'use client'

import type { EconomicQuadrant, RegimeAllocation } from '@/app/api/global/overview/route'

interface Props {
  regimeScore: number
  regimeLabel: string
  regimeQuadrant: EconomicQuadrant
  regimeAllocation: RegimeAllocation
  vix: number
  hyOAS: number
  yieldCurve10y2y: number
  m2YoY: number
  cpiYoY: number
  cpiYoYChange: number
  realYield10y: number
  netLiquidityWoW: number
  className?: string
}

function getScoreStyle(score: number): { color: string; bg: string; border: string } {
  if (score >= 7) return { color: '#22c55e', bg: '#0d2010', border: '#22c55e40' }
  if (score >= 5) return { color: '#f59e0b', bg: '#1a1400', border: '#f59e0b40' }
  if (score >= 3) return { color: '#f97316', bg: '#1a0e00', border: '#f9731640' }
  return { color: '#ef4444', bg: '#1a0d0d', border: '#ef444440' }
}

const QUADRANT_META: Record<EconomicQuadrant, { label: string; desc: string; growthUp: boolean; inflationUp: boolean }> = {
  goldilocks:  { label: 'Goldilocks',  desc: 'Growth ↑  Inflation ↓  — Equities & BTC outperform',        growthUp: true,  inflationUp: false },
  reflation:   { label: 'Reflation',   desc: 'Growth ↑  Inflation ↑  — Real assets & commodities lead',   growthUp: true,  inflationUp: true  },
  stagflation: { label: 'Stagflation', desc: 'Growth ↓  Inflation ↑  — Most hostile macro environment',   growthUp: false, inflationUp: true  },
  deflation:   { label: 'Deflation',   desc: 'Growth ↓  Inflation ↓  — Bonds & quality equity outperform', growthUp: false, inflationUp: false },
}

const QUADRANT_GRID: EconomicQuadrant[][] = [
  ['goldilocks', 'reflation'],
  ['deflation',  'stagflation'],
]

const ALLOCATION_COLORS: Record<keyof RegimeAllocation, string> = {
  equities:   '#3b82f6',
  treasuries: '#22c55e',
  bitcoin:    '#f59e0b',
  gold:       '#fbbf24',
  cash:       '#6b7280',
}

const ALLOCATION_LABELS: Record<keyof RegimeAllocation, string> = {
  equities:   'Equities',
  treasuries: 'Treasuries',
  bitcoin:    'Bitcoin',
  gold:       'Gold',
  cash:       'Cash',
}

type WisdomEntry = { author: string; quote: string; context: string }

const WISDOM: Record<EconomicQuadrant, WisdomEntry[]> = {
  goldilocks: [
    {
      author: 'Howard Marks',
      quote: 'The biggest investing errors come not from factors that are informational or analytical, but from those that are psychological.',
      context: 'Goldilocks tempts overconfidence. Maintain position sizing discipline.',
    },
    {
      author: 'Stanley Druckenmiller',
      quote: 'The key is not to be right all the time, but to make a lot when you are right.',
      context: 'Risk-on environments reward concentration. Size into your highest-conviction ideas.',
    },
    {
      author: 'Michael Howell',
      quote: 'Global liquidity is the tide that lifts all boats — or sinks them.',
      context: 'When net liquidity expands, risk assets outperform. Monitor the Fed balance sheet, TGA, and RRP.',
    },
  ],
  reflation: [
    {
      author: 'Ray Dalio',
      quote: 'Gold is the most internationally accepted currency. When the debt cycle peaks, gold wins.',
      context: 'Reflation erodes bond real returns. Hard assets, commodities, and Bitcoin absorb excess liquidity.',
    },
    {
      author: 'Stanley Druckenmiller',
      quote: "Earnings don't move the overall market; it's the Federal Reserve Board — focus on the Fed.",
      context: 'In reflation, watch whether the Fed is behind or ahead of the curve. Liquidity expansion drives BTC.',
    },
    {
      author: 'Michael Howell',
      quote: 'Bitcoin is the purest expression of the global liquidity cycle — it has the highest beta to net liquidity of any asset class.',
      context: 'In reflation, expanding global M2 historically precedes BTC outperformance by 6–12 months.',
    },
  ],
  stagflation: [
    {
      author: 'Ray Dalio',
      quote: 'In stagflation you want things that store value — gold, commodities, inflation-linked bonds. Equities suffer.',
      context: 'Reduce equity duration. Short-duration assets and real stores of value preserve purchasing power.',
    },
    {
      author: 'Howard Marks',
      quote: 'Being too far ahead of your time is indistinguishable from being wrong.',
      context: 'Stagflation can persist. Do not fight the macro with heroic equity or crypto positioning.',
    },
    {
      author: 'Michael Howell',
      quote: 'When central banks tighten into slowing growth, liquidity drains. Risk assets reprice sharply.',
      context: 'Falling net liquidity in stagflation = double headwind for BTC and equities.',
    },
  ],
  deflation: [
    {
      author: 'Ray Dalio',
      quote: 'In a beautiful deleveraging, central banks print money to offset private sector debt reduction. Long-duration bonds and quality equity win initially.',
      context: 'Deflation rewards long-duration Treasuries. Watch for the policy pivot that restarts liquidity.',
    },
    {
      author: 'Howard Marks',
      quote: 'The most dangerous thing is to buy something at the peak of its popularity.',
      context: 'Deflation is when consensus growth assumptions prove wrong. Risk assets reprice to fair value.',
    },
    {
      author: 'Michael Howell',
      quote: 'The global liquidity cycle bottoms 6–12 months before risk assets bottom. Watch the turn — it is the most important macro signal.',
      context: 'In deflation, the pivot in net liquidity (Fed balance sheet expansion) is the buy signal.',
    },
  ],
}

function MetricCell({
  label,
  value,
  sub,
  subColor,
}: {
  label: string
  value: string
  sub?: string
  subColor?: string
}) {
  return (
    <div className="text-center px-2 py-2">
      <div className="text-[9px] font-mono text-[#555566] uppercase tracking-wider">{label}</div>
      <div className="text-xs font-mono font-bold text-[#c0c0d0] mt-0.5">{value}</div>
      {sub && (
        <div className="text-[8px] font-mono mt-0.5" style={{ color: subColor ?? '#444455' }}>
          {sub}
        </div>
      )}
    </div>
  )
}

export function RiskRegimeBadge({
  regimeScore,
  regimeLabel,
  regimeQuadrant,
  regimeAllocation,
  vix,
  hyOAS,
  yieldCurve10y2y,
  m2YoY,
  cpiYoY,
  cpiYoYChange,
  realYield10y,
  netLiquidityWoW,
  className = '',
}: Props) {
  const style  = getScoreStyle(regimeScore)
  const qMeta  = QUADRANT_META[regimeQuadrant]
  const wisdom = WISDOM[regimeQuadrant]
  const wEntry = wisdom[Math.floor(Date.now() / 3_600_000) % wisdom.length]

  const allocKeys = Object.keys(regimeAllocation) as (keyof RegimeAllocation)[]

  return (
    <div
      className={`rounded-xl border p-4 space-y-4 ${className}`}
      style={{ backgroundColor: style.bg, borderColor: style.border }}
    >
      {/* ── Section A: Header ─────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[9px] font-mono text-[#555566] uppercase tracking-wider mb-1">
            Risk Regime
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-2 h-2 rounded-full animate-pulse flex-shrink-0"
              style={{ backgroundColor: style.color }}
            />
            <span className="text-base font-bold font-mono" style={{ color: style.color }}>
              {regimeLabel}
            </span>
          </div>
        </div>

        {/* Score */}
        <div className="text-right">
          <div className="text-[9px] font-mono text-[#555566] uppercase tracking-wider mb-0.5">
            Score
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black font-mono leading-none" style={{ color: style.color }}>
              {regimeScore.toFixed(1)}
            </span>
            <span className="text-sm font-mono text-[#444455]">/ 10</span>
          </div>
          {/* Score bar */}
          <div className="mt-1 w-24 h-1.5 rounded-full bg-[#1a1a2e] overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${((regimeScore - 1) / 9) * 100}%`, backgroundColor: style.color }}
            />
          </div>
        </div>
      </div>

      {/* ── Section B: Dalio Quadrant ──────────────────────────── */}
      <div className="rounded-lg border border-[#1a1a2e] p-3 bg-[#0a0a12]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[9px] font-mono text-[#555566] uppercase tracking-wider mb-1">
              All Weather Quadrant · Ray Dalio
            </div>
            <div className="text-sm font-bold font-mono text-[#e0e0e0]">{qMeta.label}</div>
            <div className="text-[10px] font-mono text-[#666677] mt-0.5">{qMeta.desc}</div>
          </div>

          {/* 2×2 quadrant grid */}
          <div className="grid grid-cols-2 gap-0.5 flex-shrink-0">
            {QUADRANT_GRID.map((row, ri) =>
              row.map((q, ci) => {
                const active = q === regimeQuadrant
                const meta   = QUADRANT_META[q]
                return (
                  <div
                    key={`${ri}-${ci}`}
                    className="w-16 h-8 rounded flex items-center justify-center border text-center"
                    style={
                      active
                        ? { backgroundColor: `${style.color}20`, borderColor: style.color }
                        : { backgroundColor: '#111120', borderColor: '#1a1a2e' }
                    }
                  >
                    <span
                      className="text-[8px] font-mono font-semibold leading-tight px-1"
                      style={{ color: active ? style.color : '#444455' }}
                    >
                      {meta.label}
                    </span>
                  </div>
                )
              }),
            )}
          </div>
        </div>

        {/* Growth / Inflation direction pills */}
        <div className="flex gap-2 mt-2">
          <span className={`text-[8px] font-mono px-2 py-0.5 rounded-full border ${qMeta.growthUp ? 'text-[#22c55e] border-[#22c55e40] bg-[#0d2010]' : 'text-[#ef4444] border-[#ef444440] bg-[#1a0d0d]'}`}>
            Growth {qMeta.growthUp ? '↑' : '↓'}
          </span>
          <span className={`text-[8px] font-mono px-2 py-0.5 rounded-full border ${!qMeta.inflationUp ? 'text-[#22c55e] border-[#22c55e40] bg-[#0d2010]' : 'text-[#f97316] border-[#f9731640] bg-[#1a0e00]'}`}>
            Inflation {qMeta.inflationUp ? '↑' : '↓'}
          </span>
        </div>
      </div>

      {/* ── Section C: 7-metric grid ───────────────────────────── */}
      <div>
        <div className="text-[9px] font-mono text-[#555566] uppercase tracking-wider mb-2">
          Signal Inputs
        </div>
        <div className="grid grid-cols-4 gap-0 divide-x divide-[#1a1a2e] border border-[#1a1a2e] rounded-lg overflow-hidden">
          <MetricCell
            label="VIX"
            value={vix.toFixed(1)}
            sub={vix < 18 ? 'Complacent' : vix < 25 ? 'Normal' : vix < 35 ? 'Elevated' : 'Fear'}
            subColor={vix < 18 ? '#22c55e' : vix < 25 ? '#aaa' : vix < 35 ? '#f97316' : '#ef4444'}
          />
          <MetricCell
            label="HY OAS"
            value={`${hyOAS.toFixed(0)} bps`}
            sub={hyOAS < 350 ? 'Tight' : hyOAS < 500 ? 'Normal' : 'Wide'}
            subColor={hyOAS < 350 ? '#22c55e' : hyOAS < 500 ? '#aaa' : '#ef4444'}
          />
          <MetricCell
            label="10Y-2Y"
            value={`${yieldCurve10y2y >= 0 ? '+' : ''}${yieldCurve10y2y.toFixed(2)}%`}
            sub={yieldCurve10y2y < -0.5 ? 'Inverted' : yieldCurve10y2y < 0 ? 'Flat' : 'Normal'}
            subColor={yieldCurve10y2y < -0.5 ? '#ef4444' : yieldCurve10y2y < 0 ? '#f97316' : '#22c55e'}
          />
          <MetricCell
            label="Real Yield"
            value={`${realYield10y >= 0 ? '+' : ''}${realYield10y.toFixed(2)}%`}
            sub={realYield10y < 0 ? 'Stimulative' : realYield10y < 1.5 ? 'Neutral' : realYield10y < 2.5 ? 'Restrictive' : 'Very Tight'}
            subColor={realYield10y < 0 ? '#22c55e' : realYield10y < 1.5 ? '#aaa' : realYield10y < 2.5 ? '#f97316' : '#ef4444'}
          />
        </div>
        <div className="grid grid-cols-3 gap-0 divide-x divide-[#1a1a2e] border border-t-0 border-[#1a1a2e] rounded-b-lg overflow-hidden">
          <MetricCell
            label="M2 YoY"
            value={`${m2YoY >= 0 ? '+' : ''}${m2YoY.toFixed(1)}%`}
            sub={m2YoY < 0 ? 'Contracting' : m2YoY < 3 ? 'Slow' : m2YoY < 8 ? 'Expanding' : 'Surge'}
            subColor={m2YoY < 0 ? '#ef4444' : m2YoY < 3 ? '#f97316' : '#22c55e'}
          />
          <MetricCell
            label="CPI YoY"
            value={`${cpiYoY.toFixed(1)}%`}
            sub={`${cpiYoYChange >= 0 ? '↑' : '↓'} ${cpiYoY < 2.5 ? 'Contained' : cpiYoY < 4 ? 'Elevated' : 'High'}`}
            subColor={cpiYoY < 2.5 ? '#22c55e' : cpiYoY < 4 ? '#f97316' : '#ef4444'}
          />
          <MetricCell
            label="Net Liq WoW"
            value={`${netLiquidityWoW >= 0 ? '+' : ''}$${Math.abs(netLiquidityWoW).toFixed(0)}B`}
            sub={netLiquidityWoW >= 20 ? 'Expanding' : netLiquidityWoW <= -20 ? 'Draining' : 'Flat'}
            subColor={netLiquidityWoW >= 20 ? '#22c55e' : netLiquidityWoW <= -20 ? '#ef4444' : '#aaa'}
          />
        </div>
      </div>

      {/* ── Section D: Capital Allocation ─────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[9px] font-mono text-[#555566] uppercase tracking-wider">
            Suggested Allocation
          </div>
          <div className="text-[8px] font-mono text-[#333344]">Illustrative · Not financial advice</div>
        </div>

        {/* Stacked bar */}
        <div className="flex w-full h-3 rounded-full overflow-hidden mb-2">
          {allocKeys.map(key => (
            <div
              key={key}
              style={{ width: `${regimeAllocation[key]}%`, backgroundColor: ALLOCATION_COLORS[key] }}
              title={`${ALLOCATION_LABELS[key]}: ${regimeAllocation[key]}%`}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {allocKeys.map(key => (
            <div key={key} className="flex items-center gap-1">
              <span
                className="inline-block w-2 h-2 rounded-sm flex-shrink-0"
                style={{ backgroundColor: ALLOCATION_COLORS[key] }}
              />
              <span className="text-[9px] font-mono text-[#888899]">
                {ALLOCATION_LABELS[key]} <span className="text-[#c0c0d0] font-bold">{regimeAllocation[key]}%</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section E: Wisdom ─────────────────────────────────── */}
      <div className="rounded-lg border border-[#1a1a2e] bg-[#0a0a12] p-3">
        <div className="text-[9px] font-mono text-[#555566] uppercase tracking-wider mb-2">
          Regime Wisdom
        </div>
        <p className="text-[10px] font-mono text-[#9999aa] italic leading-relaxed">
          &ldquo;{wEntry.quote}&rdquo;
        </p>
        <div className="text-[9px] font-mono mt-1.5" style={{ color: style.color }}>
          — {wEntry.author}
        </div>
        <div className="text-[8px] font-mono text-[#444455] mt-1 leading-relaxed">
          {wEntry.context}
        </div>
      </div>
    </div>
  )
}
