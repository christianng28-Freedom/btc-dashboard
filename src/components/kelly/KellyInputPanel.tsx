'use client'

import { useRef, useState } from 'react'

// ─── NumericInput (copied from CAGR page pattern) ───────────────────────────

interface NumericInputProps {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
  prefix?: string
  suffix?: string
  accentColor?: string
  className?: string
  decimals?: number
  thousands?: boolean
}

function NumericInput({
  value,
  onChange,
  step = 1,
  min = -Infinity,
  max = Infinity,
  prefix,
  suffix,
  accentColor = '#3b82f6',
  className = '',
  decimals,
  thousands = false,
}: NumericInputProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const liveValue = useRef(value)
  liveValue.current = value
  // Track whether the text field is focused to avoid reformatting mid-edit
  const [focused, setFocused] = useState(false)

  function clamp(v: number) { return Math.min(max, Math.max(min, v)) }

  function startRepeat(dir: 1 | -1) {
    onChange(clamp(liveValue.current + dir * step))
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        onChange(clamp(liveValue.current + dir * step))
      }, 80)
    }, 380)
  }

  function stopRepeat() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  // For thousands mode use type="text" so we can show commas
  const displayValue = thousands
    ? focused
      ? String(value)                                          // raw number while editing
      : value.toLocaleString('en-US')                        // formatted when blurred
    : decimals !== undefined
      ? value.toFixed(decimals)
      : String(value)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Strip commas before parsing
    const stripped = e.target.value.replace(/,/g, '')
    const raw = thousands || decimals === undefined ? parseInt(stripped, 10) : parseFloat(stripped)
    if (!isNaN(raw)) onChange(clamp(raw))
  }

  return (
    <div className={`flex items-center bg-[#080B10] border border-[#1a1a2e] rounded-lg overflow-hidden transition-colors duration-200 focus-within:border-white/[0.14] ${className}`}>
      {prefix && (
        <span className="pl-3 pr-1 text-[13px] font-semibold flex-shrink-0 select-none" style={{ color: accentColor }}>
          {prefix}
        </span>
      )}
      <input
        type={thousands ? 'text' : 'number'}
        value={displayValue}
        onFocus={() => thousands && setFocused(true)}
        onBlur={() => thousands && setFocused(false)}
        onChange={handleChange}
        inputMode={thousands ? 'numeric' : undefined}
        className={`flex-1 min-w-0 bg-transparent py-2.5 text-[14px] font-semibold text-white focus:outline-none
          [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
          ${prefix ? 'pl-0 pr-0' : 'pl-3 pr-0'}`}
      />
      {suffix && (
        <span className="pr-2 text-[12px] text-[#666] flex-shrink-0 select-none">{suffix}</span>
      )}
      <div className="flex flex-col flex-shrink-0" style={{ borderLeft: '1px solid #1e2130' }}>
        {([1, -1] as const).map(dir => (
          <button
            key={dir}
            type="button"
            tabIndex={-1}
            onMouseDown={() => startRepeat(dir)}
            onMouseUp={stopRepeat}
            onTouchStart={e => { e.preventDefault(); startRepeat(dir) }}
            onTouchEnd={stopRepeat}
            className="group/btn flex items-center justify-center w-9 h-[21px] transition-all duration-150 active:scale-95 border-b last:border-b-0"
            style={{
              borderColor: '#1e2130',
              background: dir === 1
                ? 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)'
                : 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.04) 100%)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = dir === 1
                ? `linear-gradient(180deg, ${accentColor}28 0%, ${accentColor}14 100%)`
                : `linear-gradient(180deg, ${accentColor}14 0%, ${accentColor}28 100%)`
            }}
            onMouseLeave={e => {
              stopRepeat()
              ;(e.currentTarget as HTMLButtonElement).style.background = dir === 1
                ? 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)'
                : 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.04) 100%)'
            }}
          >
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {dir === 1
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              }
            </svg>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type RiskProfile = 'conservative' | 'moderate' | 'aggressive'
export type ScenarioKey = 'bull' | 'base' | 'bear' | 'custom'

interface Props {
  expectedReturn: number
  riskFreeRate: number
  volatility: number
  portfolioSize: number
  riskProfile: RiskProfile
  activeScenario: ScenarioKey
  onExpectedReturnChange: (v: number) => void
  onRiskFreeRateChange: (v: number) => void
  onVolatilityChange: (v: number) => void
  onPortfolioSizeChange: (v: number) => void
  onRiskProfileChange: (v: RiskProfile) => void
  onScenarioChange: (s: ScenarioKey) => void
}

// ─── Component ──────────────────────────────────────────────────────────────

const SCENARIO_PILLS: { key: ScenarioKey; label: string; color: string }[] = [
  { key: 'bull', label: 'Bull', color: '#22c55e' },
  { key: 'base', label: 'Base', color: '#3b82f6' },
  { key: 'bear', label: 'Bear', color: '#ef4444' },
  { key: 'custom', label: 'Custom', color: '#f59e0b' },
]

const RISK_PROFILES: { key: RiskProfile; label: string }[] = [
  { key: 'conservative', label: 'Conservative' },
  { key: 'moderate', label: 'Moderate' },
  { key: 'aggressive', label: 'Aggressive' },
]

export function KellyInputPanel({
  expectedReturn,
  riskFreeRate,
  volatility,
  portfolioSize,
  riskProfile,
  activeScenario,
  onExpectedReturnChange,
  onRiskFreeRateChange,
  onVolatilityChange,
  onPortfolioSizeChange,
  onRiskProfileChange,
  onScenarioChange,
}: Props) {
  return (
    <div className="bg-[#0d1018] border border-[#1a1a2e] rounded-xl p-5 space-y-5">
      {/* Scenario Presets */}
      <div className="space-y-2">
        <label className="text-[#666] text-xs font-medium uppercase tracking-wider">Scenario</label>
        <div className="flex gap-2 flex-wrap">
          {SCENARIO_PILLS.map(s => (
            <button
              key={s.key}
              onClick={() => onScenarioChange(s.key)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200 cursor-pointer"
              style={{
                borderColor: activeScenario === s.key ? s.color : '#1a1a2e',
                background: activeScenario === s.key ? `${s.color}18` : 'transparent',
                color: activeScenario === s.key ? s.color : '#999',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <label className="text-[#666] text-xs font-medium">Expected Annual Return</label>
          <NumericInput
            value={expectedReturn}
            onChange={onExpectedReturnChange}
            step={5}
            min={-50}
            max={200}
            suffix="%"
            accentColor="#22c55e"
          />
          <p className="text-[#444] text-[10px]">Typical: 15-80%</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-[#666] text-xs font-medium">Risk-Free Rate</label>
          <NumericInput
            value={riskFreeRate}
            onChange={onRiskFreeRateChange}
            step={0.5}
            min={0}
            max={20}
            decimals={1}
            suffix="%"
            accentColor="#60a5fa"
          />
          <p className="text-[#444] text-[10px]">Current T-bill ~4.5%</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-[#666] text-xs font-medium">Annualized Volatility</label>
          <NumericInput
            value={volatility}
            onChange={onVolatilityChange}
            step={5}
            min={10}
            max={200}
            suffix="%"
            accentColor="#f59e0b"
          />
          <p className="text-[#444] text-[10px]">BTC historical: 50-90%</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-[#666] text-xs font-medium">Portfolio Size</label>
          <NumericInput
            value={portfolioSize}
            onChange={onPortfolioSizeChange}
            step={10000}
            min={100}
            max={100000000}
            prefix="$"
            accentColor="#a78bfa"
            thousands
          />
        </div>
      </div>

      {/* Risk Profile */}
      <div className="space-y-2">
        <label className="text-[#666] text-xs font-medium uppercase tracking-wider">Risk Profile</label>
        <div className="inline-flex bg-[#060810] border border-[#1a1a2e] rounded-lg p-0.5">
          {RISK_PROFILES.map(rp => (
            <button
              key={rp.key}
              onClick={() => onRiskProfileChange(rp.key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer ${
                riskProfile === rp.key
                  ? 'bg-[#1a1a2e] text-white'
                  : 'text-[#666] hover:text-[#999]'
              }`}
            >
              {rp.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
