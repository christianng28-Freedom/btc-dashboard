'use client'

type Regime = 'risk-on' | 'neutral' | 'risk-off'

interface Props {
  regime: Regime
  vix: number
  hyOAS: number
  yieldCurve10y2y: number
  className?: string
}

const REGIME_CONFIG: Record<Regime, { label: string; color: string; bg: string; border: string; dot: string }> = {
  'risk-on': {
    label: 'Risk-On',
    color: '#22c55e',
    bg: '#0d2010',
    border: '#22c55e40',
    dot: '#22c55e',
  },
  neutral: {
    label: 'Neutral',
    color: '#f59e0b',
    bg: '#1a1400',
    border: '#f59e0b40',
    dot: '#f59e0b',
  },
  'risk-off': {
    label: 'Risk-Off',
    color: '#ef4444',
    bg: '#1a0d0d',
    border: '#ef444440',
    dot: '#ef4444',
  },
}

function SupportMetric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="text-center">
      <div className="text-[9px] font-mono text-[#555566] uppercase tracking-wider">{label}</div>
      <div className="text-xs font-mono font-bold text-[#c0c0d0] mt-0.5">{value}</div>
      {sub && <div className="text-[8px] font-mono text-[#444455]">{sub}</div>}
    </div>
  )
}

export function RiskRegimeBadge({ regime, vix, hyOAS, yieldCurve10y2y, className = '' }: Props) {
  const cfg = REGIME_CONFIG[regime]

  return (
    <div
      className={`rounded-xl border p-4 ${className}`}
      style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[9px] font-mono text-[#555566] uppercase tracking-wider mb-1">
            Risk Regime
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: cfg.dot }}
            />
            <span className="text-lg font-bold font-mono" style={{ color: cfg.color }}>
              {cfg.label}
            </span>
          </div>
        </div>
        <div
          className="text-[9px] font-mono font-semibold uppercase tracking-widest px-2 py-1 rounded border"
          style={{ color: cfg.color, backgroundColor: `${cfg.color}15`, borderColor: cfg.border }}
        >
          {regime === 'risk-on' ? 'Appetite' : regime === 'risk-off' ? 'Aversion' : 'Balanced'}
        </div>
      </div>

      {/* Support metrics */}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[#1a1a2e]">
        <SupportMetric
          label="VIX"
          value={vix.toFixed(1)}
          sub={vix < 18 ? 'Complacent' : vix < 25 ? 'Normal' : vix < 35 ? 'Elevated' : 'Fear'}
        />
        <SupportMetric
          label="HY OAS"
          value={`${hyOAS.toFixed(0)} bps`}
          sub={hyOAS < 350 ? 'Tight' : hyOAS < 500 ? 'Normal' : 'Wide'}
        />
        <SupportMetric
          label="10Y-2Y"
          value={`${yieldCurve10y2y >= 0 ? '+' : ''}${yieldCurve10y2y.toFixed(2)}%`}
          sub={yieldCurve10y2y < -0.5 ? 'Inverted' : yieldCurve10y2y < 0 ? 'Flat' : 'Normal'}
        />
      </div>
    </div>
  )
}
