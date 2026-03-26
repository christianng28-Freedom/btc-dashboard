'use client'

import { useState } from 'react'
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
  goldilocks:  { label: 'Goldilocks',  desc: 'Growth ↑  Inflation ↓  — Equities & BTC outperform',         growthUp: true,  inflationUp: false },
  reflation:   { label: 'Reflation',   desc: 'Growth ↑  Inflation ↑  — Real assets & commodities lead',    growthUp: true,  inflationUp: true  },
  stagflation: { label: 'Stagflation', desc: 'Growth ↓  Inflation ↑  — Most hostile macro environment',    growthUp: false, inflationUp: true  },
  deflation:   { label: 'Deflation',   desc: 'Growth ↓  Inflation ↓  — Bonds & quality equity outperform', growthUp: false, inflationUp: false },
}

const QUADRANT_GRID: EconomicQuadrant[][] = [
  ['goldilocks', 'reflation'],
  ['deflation',  'stagflation'],
]

// ── Quadrant detail data ───────────────────────────────────────────────────────

type AssetStance = 'overweight' | 'neutral' | 'underweight' | 'avoid'

interface QuadrantDetail {
  triggers: string[]
  assets: Array<{ name: string; stance: AssetStance; note: string }>
}

const QUADRANT_DETAIL: Record<EconomicQuadrant, QuadrantDetail> = {
  goldilocks: {
    triggers: [
      'Yield curve steepening (10Y-2Y turning positive)',
      'CPI declining toward or below 2.5% target',
      'PMI above 52 — manufacturing & services expanding',
      'Fed on hold or cutting; real yields falling',
      'Credit spreads tightening; HY OAS below 350 bps',
      'Strong employment; unemployment falling or stable',
      'Howell net liquidity expanding week-over-week',
    ],
    assets: [
      { name: 'Equities',    stance: 'overweight',  note: 'Growth & tech lead; highest EPS revision cycle. Broaden into cyclicals mid-cycle.' },
      { name: 'Bitcoin',     stance: 'overweight',  note: 'High beta to expanding liquidity; historically leads risk assets in early-mid bull.' },
      { name: 'Treasuries',  stance: 'neutral',     note: 'Hold duration; yield compression supports but equity beats in pure goldilocks.' },
      { name: 'Gold',        stance: 'neutral',     note: 'Holds value but underperforms risk assets when inflation is contained.' },
      { name: 'Cash',        stance: 'underweight', note: 'Opportunity cost too high — deploy into risk assets while the window is open.' },
    ],
  },
  reflation: {
    triggers: [
      'Commodity supply shock or fiscal stimulus surge',
      'Credit expansion — loan growth accelerating',
      'Fed behind the curve; real yields still negative',
      'Weak USD; capital flows into commodities',
      'CPI rising with PMI still above 50 (growth intact)',
      'M2 or global liquidity surging (Howell net liq +)',
      'Wage-price spiral beginning; services inflation sticky',
    ],
    assets: [
      { name: 'Gold',        stance: 'overweight',  note: 'Classic inflation hedge. Real assets outperform nominal. Dalio\'s core All Weather hold.' },
      { name: 'Bitcoin',     stance: 'overweight',  note: 'Highest beta to global M2 expansion; Howell: BTC leads by 6–12 months in reflation.' },
      { name: 'Equities',    stance: 'neutral',     note: 'Value/energy/commodity producers within equities. Avoid long-duration growth stocks.' },
      { name: 'Cash',        stance: 'underweight', note: 'Purchasing power erodes in inflation — minimize cash allocation.' },
      { name: 'Treasuries',  stance: 'avoid',       note: 'Nominal bonds suffer: rates rise + inflation erodes real returns. Switch to TIPS.' },
    ],
  },
  stagflation: {
    triggers: [
      'Energy/food supply shock with slowing PMI',
      'Central bank tightening into deteriorating growth',
      'Yield curve flat or inverted; CPI still elevated',
      'Declining corporate margins (cost push + weak demand)',
      'Geopolitical disruption impacting supply chains',
      'Unemployment rising while CPI above 4%',
      'Howell net liquidity draining (Fed QT + TGA rebuild)',
    ],
    assets: [
      { name: 'Gold',        stance: 'overweight',  note: 'Stagflation\'s only reliable safe haven. Dalio\'s top pick; real store of value.' },
      { name: 'Cash',        stance: 'overweight',  note: 'Capital preservation first. USD outperforms in risk-off even with moderate inflation.' },
      { name: 'Equities',    stance: 'underweight', note: 'Margin compression + multiple contraction = double hit. Defensive/utilities only.' },
      { name: 'Bitcoin',     stance: 'underweight', note: 'High-beta risk asset in a liquidity drain. Avoid until growth stabilizes.' },
      { name: 'Treasuries',  stance: 'avoid',       note: 'Worst of both worlds — lose to inflation AND recession risk. True stagflation trap.' },
    ],
  },
  deflation: {
    triggers: [
      'Debt deleveraging — private sector paying down debt',
      'Credit crisis or banking stress (HY OAS > 600 bps)',
      'Demand collapse; PMI falling sharply below 48',
      'Policy error — central bank tightening too long',
      'Asset price deflation feeding wealth effect contraction',
      'Unemployment rising; CPI and PCE falling below 1%',
      'Fed net liquidity collapsing (balance sheet run-off + TGA rising)',
    ],
    assets: [
      { name: 'Treasuries',  stance: 'overweight',  note: 'Long-duration bonds are the classic deflationary asset. Price up as rates fall.' },
      { name: 'Gold',        stance: 'neutral',     note: 'Holds value in uncertainty. Watch for policy pivot signal — then overweight.' },
      { name: 'Cash',        stance: 'neutral',     note: 'Purchasing power improves in deflation. Hold until Howell liquidity cycle turns.' },
      { name: 'Equities',    stance: 'underweight', note: 'Quality defensive only — utilities, staples. Cyclicals and growth reprice sharply.' },
      { name: 'Bitcoin',     stance: 'underweight', note: 'Liquidity withdrawal hammers high-beta. Wait for Fed pivot; Howell cycle is the signal.' },
    ],
  },
}

const STANCE_STYLE: Record<AssetStance, { label: string; color: string; bg: string; border: string }> = {
  overweight:  { label: 'Overweight',  color: '#22c55e', bg: '#0d2010', border: '#22c55e40' },
  neutral:     { label: 'Neutral',     color: '#888899', bg: '#111120', border: '#33334455' },
  underweight: { label: 'Underweight', color: '#f97316', bg: '#1a0e00', border: '#f9731640' },
  avoid:       { label: 'Avoid',       color: '#ef4444', bg: '#1a0d0d', border: '#ef444440' },
}

// ── Allocation ─────────────────────────────────────────────────────────────────

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

// ── Wisdom ─────────────────────────────────────────────────────────────────────

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

// ── Sub-components ─────────────────────────────────────────────────────────────

function MetricCell({
  label, value, sub, subColor,
}: {
  label: string; value: string; sub?: string; subColor?: string
}) {
  const statusColor = subColor ?? '#444455'
  return (
    <div
      className="relative flex flex-col justify-between px-4 py-3 overflow-hidden group transition-all duration-200"
      style={{ background: `linear-gradient(160deg, #0c0c18 0%, #080810 100%)` }}
    >
      {/* Accent line at bottom */}
      <div
        className="absolute bottom-0 left-4 right-4 h-px opacity-40"
        style={{ backgroundColor: statusColor }}
      />

      {/* Label */}
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#3a3a52] mb-2">
        {label}
      </div>

      {/* Value */}
      <div className="text-xl font-bold font-mono leading-none text-[#dddde8]">
        {value}
      </div>

      {/* Status badge */}
      {sub && (
        <div className="flex items-center gap-1.5 mt-2.5">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: statusColor, boxShadow: `0 0 4px ${statusColor}` }}
          />
          <span
            className="text-[11px] font-semibold tracking-wide uppercase"
            style={{ color: statusColor }}
          >
            {sub}
          </span>
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

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

  // Quadrant expand state — default to active quadrant pre-expanded
  const [expandedQ, setExpandedQ] = useState<EconomicQuadrant | null>(regimeQuadrant)

  function toggleQuadrant(q: EconomicQuadrant) {
    setExpandedQ(prev => prev === q ? null : q)
  }

  const detail = expandedQ ? QUADRANT_DETAIL[expandedQ] : null
  const expandedMeta = expandedQ ? QUADRANT_META[expandedQ] : null

  return (
    <div
      className={`rounded-xl border p-5 space-y-4 ${className}`}
      style={{
        backgroundColor: style.bg,
        borderColor: style.border,
        boxShadow: `0 0 40px ${style.color}08, inset 0 1px 0 #ffffff06`,
      }}
    >
      {/* ── Section A: Header ─────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-mono text-[#555566] uppercase tracking-wider mb-1">
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
          <div className="text-xs font-mono text-[#555566] uppercase tracking-wider mb-0.5">
            Score
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black font-mono leading-none" style={{ color: style.color }}>
              {regimeScore.toFixed(1)}
            </span>
            <span className="text-sm font-mono text-[#444455]">/ 10</span>
          </div>
          <div className="mt-1 w-24 h-1.5 rounded-full bg-[#1a1a2e] overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${((regimeScore - 1) / 9) * 100}%`, backgroundColor: style.color }}
            />
          </div>
        </div>
      </div>

      {/* ── Section B: Dalio Quadrant ──────────────────────────── */}
      <div className="rounded-lg border border-[#1a1a2e] bg-[#0a0a12] overflow-hidden">
        <div className="px-3 py-3">
          {/* Header row */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs font-mono text-[#555566] uppercase tracking-wider mb-1">
                All Weather Quadrant · Ray Dalio
              </div>
              <div className="text-sm font-bold font-mono text-[#e0e0e0]">{qMeta.label}</div>
              <div className="text-xs font-mono text-[#666677] mt-0.5">{qMeta.desc}</div>
            </div>
            <div className="flex flex-col gap-1.5 items-end">
              <span className={`text-[11px] font-mono px-2.5 py-1 rounded-full border ${qMeta.growthUp ? 'text-[#22c55e] border-[#22c55e40] bg-[#0d2010]' : 'text-[#ef4444] border-[#ef444440] bg-[#1a0d0d]'}`}>
                Growth {qMeta.growthUp ? '↑' : '↓'}
              </span>
              <span className={`text-[11px] font-mono px-2.5 py-1 rounded-full border ${!qMeta.inflationUp ? 'text-[#22c55e] border-[#22c55e40] bg-[#0d2010]' : 'text-[#f97316] border-[#f9731640] bg-[#1a0e00]'}`}>
                Inflation {qMeta.inflationUp ? '↑' : '↓'}
              </span>
            </div>
          </div>

          {/* Axis labels + 2×2 grid */}
          <div>
            {/* Top axis label */}
            <div className="flex justify-between px-1 mb-1">
              <span className="text-[10px] font-mono text-[#4a4a66] uppercase tracking-widest">Inflation ↓</span>
              <span className="text-[10px] font-mono text-[#4a4a66] uppercase tracking-widest">Inflation ↑</span>
            </div>

            <div className="flex gap-1.5 items-stretch">
              {/* Left axis label — one label per row */}
              <div className="flex flex-col gap-1.5">
                <div className="h-[68px] flex items-center justify-center">
                  <span className="text-[9px] font-mono text-[#4a4a66] uppercase tracking-wider">G↑</span>
                </div>
                <div className="h-[68px] flex items-center justify-center">
                  <span className="text-[9px] font-mono text-[#4a4a66] uppercase tracking-wider">G↓</span>
                </div>
              </div>

              {/* 2×2 clickable quadrant grid — full width */}
              <div className="grid grid-cols-2 gap-1.5 flex-1">
                {QUADRANT_GRID.map((row, ri) =>
                  row.map((q, ci) => {
                    const isActive   = q === regimeQuadrant
                    const isExpanded = q === expandedQ
                    const meta       = QUADRANT_META[q]
                    return (
                      <button
                        key={`${ri}-${ci}`}
                        onClick={() => toggleQuadrant(q)}
                        className="h-[68px] rounded-lg flex flex-col items-center justify-center border text-center relative transition-all duration-200 hover:brightness-125 group"
                        style={
                          isActive
                            ? {
                                background: `linear-gradient(135deg, ${style.color}14 0%, ${style.color}08 100%)`,
                                borderColor: style.color,
                                boxShadow: `0 0 20px ${style.color}22, inset 0 1px 0 ${style.color}20`,
                              }
                            : isExpanded
                              ? { background: 'linear-gradient(135deg, #1a1a30 0%, #141428 100%)', borderColor: '#444466' }
                              : { background: 'linear-gradient(135deg, #0e0e1c 0%, #0a0a14 100%)', borderColor: '#1a1a2e' }
                        }
                      >
                        {isActive && (
                          <span
                            className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full animate-pulse"
                            style={{ backgroundColor: style.color, boxShadow: `0 0 6px ${style.color}` }}
                          />
                        )}
                        <span
                          className="text-sm font-mono font-bold leading-tight tracking-wide"
                          style={{ color: isActive ? style.color : isExpanded ? '#9999bb' : '#3a3a55' }}
                        >
                          {meta.label}
                        </span>
                        <span
                          className="text-[10px] font-mono mt-1 tracking-wider"
                          style={{ color: isActive ? `${style.color}90` : isExpanded ? '#555577' : '#383858' }}
                        >
                          {meta.growthUp ? 'G↑' : 'G↓'} · {meta.inflationUp ? 'I↑' : 'I↓'}
                        </span>
                        <span
                          className="text-[10px] mt-1"
                          style={{ color: isActive ? `${style.color}80` : isExpanded ? '#555577' : '#1e1e2c' }}
                        >
                          {isExpanded ? '▴' : '▾'}
                        </span>
                      </button>
                    )
                  }),
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Expand panel */}
        {detail && expandedMeta && (
          <div className="border-t border-[#1a1a2e] bg-[#060610] px-3 py-2.5">
            {/* Panel header */}
            <div className="text-xs font-mono text-[#555566] uppercase tracking-wider mb-2">
              {expandedMeta.label} — Detail
            </div>

            {/* Two-column: triggers | assets */}
            <div className="grid grid-cols-2 gap-4">
              {/* Triggers */}
              <div>
                <div className="text-[11px] font-mono text-[#444455] uppercase tracking-wider mb-1.5">
                  What triggers this regime
                </div>
                <ul className="space-y-0.5">
                  {detail.triggers.map((t, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-[#333344] text-[11px] font-mono mt-0.5 flex-shrink-0">•</span>
                      <span className="text-xs font-mono text-[#7777aa] leading-relaxed">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Asset focus */}
              <div>
                <div className="text-[11px] font-mono text-[#444455] uppercase tracking-wider mb-1.5">
                  Asset focus
                </div>
                <div className="space-y-1.5">
                  {detail.assets.map((a, i) => {
                    const ss = STANCE_STYLE[a.stance]
                    return (
                      <div key={i} className="flex items-start gap-2">
                        <span
                          className="text-xs font-mono font-bold px-2 py-0.5 rounded border flex-shrink-0 mt-0.5 w-24 text-center"
                          style={{ color: ss.color, backgroundColor: ss.bg, borderColor: ss.border }}
                        >
                          {ss.label}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-mono font-semibold text-[#c0c0d0]">{a.name}</div>
                          <div className="text-[11px] font-mono text-[#555566] leading-relaxed">{a.note}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Section C: 7-metric grid ───────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#3a3a52]">
            Signal Inputs
          </div>
          <div className="flex-1 h-px bg-[#1a1a2e]" />
        </div>
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid #1a1a2e', boxShadow: 'inset 0 1px 0 #ffffff06' }}
        >
          <div className="grid grid-cols-4 divide-x divide-[#1a1a2e]">
            <MetricCell
              label="VIX"
              value={vix.toFixed(1)}
              sub={vix < 18 ? 'Complacent' : vix < 25 ? 'Normal' : vix < 35 ? 'Elevated' : 'Fear'}
              subColor={vix < 18 ? '#22c55e' : vix < 25 ? '#6b7280' : vix < 35 ? '#f97316' : '#ef4444'}
            />
            <MetricCell
              label="HY OAS"
              value={`${hyOAS.toFixed(0)} bps`}
              sub={hyOAS < 350 ? 'Tight' : hyOAS < 500 ? 'Normal' : 'Wide'}
              subColor={hyOAS < 350 ? '#22c55e' : hyOAS < 500 ? '#6b7280' : '#ef4444'}
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
              subColor={realYield10y < 0 ? '#22c55e' : realYield10y < 1.5 ? '#6b7280' : realYield10y < 2.5 ? '#f97316' : '#ef4444'}
            />
          </div>
          <div className="grid grid-cols-3 divide-x divide-[#1a1a2e] border-t border-[#1a1a2e]">
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
              subColor={netLiquidityWoW >= 20 ? '#22c55e' : netLiquidityWoW <= -20 ? '#ef4444' : '#6b7280'}
            />
          </div>
        </div>
      </div>

      {/* ── Section D: Capital Allocation ─────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-xs font-mono text-[#555566] uppercase tracking-wider">
            Suggested Allocation
          </div>
          <div className="text-[11px] font-mono text-[#333344]">Illustrative · Not financial advice</div>
        </div>

        <div className="flex w-full h-2.5 rounded-full overflow-hidden mb-2">
          {allocKeys.map(key => (
            <div
              key={key}
              style={{ width: `${regimeAllocation[key]}%`, backgroundColor: ALLOCATION_COLORS[key] }}
              title={`${ALLOCATION_LABELS[key]}: ${regimeAllocation[key]}%`}
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {allocKeys.map(key => (
            <div key={key} className="flex items-center gap-1">
              <span
                className="inline-block w-2 h-2 rounded-sm flex-shrink-0"
                style={{ backgroundColor: ALLOCATION_COLORS[key] }}
              />
              <span className="text-xs font-mono text-[#888899]">
                {ALLOCATION_LABELS[key]} <span className="text-[#c0c0d0] font-bold">{regimeAllocation[key]}%</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section E: Wisdom ─────────────────────────────────── */}
      <div className="rounded-lg border border-[#1a1a2e] bg-[#0a0a12] px-3 py-2.5">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-mono text-[#9999aa] italic leading-relaxed">
              &ldquo;{wEntry.quote}&rdquo;
            </p>
            <div className="text-xs font-mono mt-1" style={{ color: style.color }}>
              — {wEntry.author}
            </div>
          </div>
          <div className="text-[11px] font-mono text-[#444455] leading-relaxed max-w-[45%] flex-shrink-0 pt-0.5">
            {wEntry.context}
          </div>
        </div>
      </div>
    </div>
  )
}
