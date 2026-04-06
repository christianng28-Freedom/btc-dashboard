'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'

// ─── Types ───────────────────────────────────────────────────────────────────

interface TooltipPayloadEntry {
  name: string
  value: number
  color: string
  dataKey: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
  startYear: number
  btcPrice: number
  btcHoldings: number
  activeTab: 'price' | 'portfolio'
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_CAGRS = [10, 20, 30, 40, 50, 60]
const MILESTONE_YEARS = [2030, 2035, 2040]

const CAGR_COLORS: Record<number, string> = {
  10: '#60a5fa',
  20: '#34d399',
  30: '#fbbf24',
  40: '#f87171',
  50: '#a78bfa',
  60: '#fb923c',
}
const CUSTOM_COLORS = ['#e879f9', '#38bdf8', '#4ade80', '#facc15', '#f472b6', '#818cf8']

const PRESET_PRICES = [
  { label: '$50k', value: 50000 },
  { label: '$75k', value: 75000 },
  { label: '$87.5k', value: 87500 },
  { label: '$100k', value: 100000 },
  { label: '$150k', value: 150000 },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcFuturePrice(startPrice: number, cagr: number, yearsElapsed: number): number {
  return startPrice * Math.pow(1 + cagr / 100, yearsElapsed)
}

function formatValue(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`
}

function formatAxisValue(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`
  return `$${n}`
}

function getCagrColor(cagr: number, customIndex: number): string {
  return CAGR_COLORS[cagr] ?? CUSTOM_COLORS[customIndex % CUSTOM_COLORS.length]
}

// ─── NumericInput ─────────────────────────────────────────────────────────────

interface NumericInputProps {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
  prefix?: string
  accentColor?: string
  className?: string
  decimals?: number
  placeholder?: string
}

function NumericInput({
  value,
  onChange,
  step = 1,
  min = -Infinity,
  max = Infinity,
  prefix,
  accentColor = '#34d399',
  className = '',
  decimals,
  placeholder,
}: NumericInputProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef  = useRef<ReturnType<typeof setTimeout>  | null>(null)
  const liveValue   = useRef(value)
  liveValue.current = value

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
    if (timeoutRef.current)  clearTimeout(timeoutRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  return (
    <div
      className={`flex items-center bg-[#080B10] border border-[#1a1a2e] rounded-lg overflow-hidden transition-colors duration-200 focus-within:border-white/[0.14] ${className}`}
    >
      {prefix && (
        <span className="pl-3 pr-1 text-[13px] font-semibold flex-shrink-0 select-none" style={{ color: accentColor }}>
          {prefix}
        </span>
      )}
      <input
        type="number"
        value={decimals !== undefined ? value.toFixed(decimals) : value}
        placeholder={placeholder}
        onChange={e => {
          const raw = decimals !== undefined ? parseFloat(e.target.value) : parseInt(e.target.value, 10)
          if (!isNaN(raw)) onChange(clamp(raw))
        }}
        className={`flex-1 min-w-0 bg-transparent py-2.5 text-[14px] font-semibold text-white focus:outline-none
          [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
          ${prefix ? 'pl-0 pr-0' : 'pl-3 pr-0'}`}
      />
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
            <svg
              className="w-2.5 h-2.5 transition-all duration-150"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
              style={{ color: 'rgba(255,255,255,0.45)' }}
            >
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

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomChartTooltip({ active, payload, label, startYear, btcPrice, btcHoldings, activeTab }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null
  const year = parseInt(label ?? '0')
  const yearsElapsed = year - startYear

  return (
    <div className="bg-[#0d1018] border border-[#1a1a2e] rounded-lg p-3 shadow-2xl min-w-[220px]">
      <div className="text-[11px] text-white/50 font-mono mb-2 uppercase tracking-wider">{label}</div>
      {payload.map((entry) => {
        const cagr = parseFloat(entry.dataKey.replace('cagr_', ''))
        const formula = activeTab === 'price'
          ? `$${btcPrice.toLocaleString()} × (1 + ${cagr}%)^${yearsElapsed}`
          : `$${btcPrice.toLocaleString()} × (1 + ${cagr}%)^${yearsElapsed} × ${btcHoldings} BTC`
        return (
          <div key={entry.dataKey} className="flex flex-col gap-0.5 mb-2 last:mb-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: entry.color }} />
              <span className="text-[12px] font-semibold text-white">{formatValue(entry.value)}</span>
              <span className="text-[11px] text-white/50 ml-auto">{entry.name}</span>
            </div>
            <div className="text-[10px] text-white/30 font-mono pl-4">{formula}</div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CagrPage() {
  // Inputs
  const [btcPrice, setBtcPrice] = useState(87500)
  const [btcHoldings, setBtcHoldings] = useState(8)
  const [startYear, setStartYear] = useState(2026)
  const [endYear, setEndYear] = useState(2040)
  const [selectedCAGRs, setSelectedCAGRs] = useState<number[]>([10, 20, 30, 40, 50, 60])
  const [customCagrInput, setCustomCagrInput] = useState('')
  const [customCagrs, setCustomCagrs] = useState<number[]>([])
  const [activeTab, setActiveTab] = useState<'price' | 'portfolio'>('price')
  const [logScale, setLogScale] = useState(true)
  const [whatIfYear, setWhatIfYear] = useState(2030)
  const [whatIfTarget, setWhatIfTarget] = useState(1000000)
  const [copyFeedback, setCopyFeedback] = useState('')

  const initialPortfolioValue = btcPrice * btcHoldings
  const allCagrs = useMemo(() => [...selectedCAGRs, ...customCagrs].sort((a, b) => a - b), [selectedCAGRs, customCagrs])
  const years = useMemo(() => {
    const ys: number[] = []
    for (let y = startYear; y <= endYear; y++) ys.push(y)
    return ys
  }, [startYear, endYear])

  // Chart data
  const chartData = useMemo(() => years.map(year => {
    const point: Record<string, number | string> = { year }
    allCagrs.forEach(cagr => {
      const price = calcFuturePrice(btcPrice, cagr, year - startYear)
      point[`cagr_${cagr}`] = activeTab === 'price' ? price : price * btcHoldings
    })
    return point
  }), [years, allCagrs, btcPrice, startYear, btcHoldings, activeTab])

  // CAGR color lookup with custom index
  const getCagrColorMemo = useCallback((cagr: number) => {
    const customIdx = customCagrs.indexOf(cagr)
    return getCagrColor(cagr, customIdx)
  }, [customCagrs])

  // Toggle standard CAGR checkbox
  function toggleCagr(cagr: number) {
    setSelectedCAGRs(prev =>
      prev.includes(cagr) ? prev.filter(c => c !== cagr) : [...prev, cagr]
    )
  }

  // Add custom CAGR
  function addCustomCagr() {
    const val = parseFloat(customCagrInput)
    if (!isNaN(val) && val > 0 && val <= 500 && !allCagrs.includes(val)) {
      setCustomCagrs(prev => [...prev, val])
      setCustomCagrInput('')
    }
  }

  function removeCustomCagr(cagr: number) {
    setCustomCagrs(prev => prev.filter(c => c !== cagr))
  }

  // Reset
  function reset() {
    setBtcPrice(87500)
    setBtcHoldings(8)
    setStartYear(2026)
    setEndYear(2040)
    setSelectedCAGRs([10, 20, 30, 40, 50, 60])
    setCustomCagrs([])
    setCustomCagrInput('')
    setLogScale(false)
    setWhatIfYear(2030)
    setWhatIfTarget(1000000)
  }

  // Export CSV
  function exportCSV() {
    const rows: string[] = []
    // Price section
    rows.push('BTC PRICE PROJECTIONS')
    rows.push(['BTC Price', 'Year', ...allCagrs.map(c => `${c}% CAGR`)].join(','))
    rows.push([`$${btcPrice}`, startYear, ...allCagrs.map(c => calcFuturePrice(btcPrice, c, 0).toFixed(2))].join(','))
    years.slice(1).forEach(year => {
      rows.push(['', year, ...allCagrs.map(c => calcFuturePrice(btcPrice, c, year - startYear).toFixed(2))].join(','))
    })
    rows.push('')
    // Portfolio section
    rows.push('PORTFOLIO VALUE PROJECTIONS')
    rows.push(['BTC Price', 'Year', `BTC #`, 'BTC Total', ...allCagrs.map(c => `${c}% CAGR`)].join(','))
    rows.push([`$${btcPrice}`, startYear, btcHoldings, `$${initialPortfolioValue}`, ...allCagrs.map(c => (calcFuturePrice(btcPrice, c, 0) * btcHoldings).toFixed(2))].join(','))
    years.slice(1).forEach(year => {
      rows.push(['', year, '', '', ...allCagrs.map(c => (calcFuturePrice(btcPrice, c, year - startYear) * btcHoldings).toFixed(2))].join(','))
    })

    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'btc-cagr-analysis.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Copy table to clipboard
  function copyTable() {
    const headers = ['Year', ...allCagrs.map(c => `${c}%`)]
    const tableRows = years.map(year => {
      const values = allCagrs.map(cagr => {
        const price = calcFuturePrice(btcPrice, cagr, year - startYear)
        const val = activeTab === 'price' ? price : price * btcHoldings
        return formatValue(val)
      })
      return [year.toString(), ...values].join('\t')
    })
    const text = [headers.join('\t'), ...tableRows].join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopyFeedback('Copied!')
      setTimeout(() => setCopyFeedback(''), 2000)
    })
  }

  // What-If calculation
  const requiredCagr = useMemo(() => {
    const yearsElapsed = whatIfYear - startYear
    if (yearsElapsed <= 0 || btcPrice <= 0) return null
    const cagr = (Math.pow(whatIfTarget / btcPrice, 1 / yearsElapsed) - 1) * 100
    return cagr > 0 ? cagr : null
  }, [whatIfYear, whatIfTarget, btcPrice, startYear])

  // Summary: first year each CAGR hits $1M (price or portfolio)
  const milestoneData = useMemo(() => {
    return allCagrs.map(cagr => {
      let firstMillionYear: number | null = null
      for (const year of years) {
        const price = calcFuturePrice(btcPrice, cagr, year - startYear)
        const val = activeTab === 'price' ? price : price * btcHoldings
        if (val >= 1_000_000 && firstMillionYear === null) {
          firstMillionYear = year
        }
      }
      const milestones: Record<number, number> = {}
      MILESTONE_YEARS.forEach(my => {
        if (my >= startYear && my <= endYear) {
          const price = calcFuturePrice(btcPrice, cagr, my - startYear)
          milestones[my] = activeTab === 'price' ? price : price * btcHoldings
        }
      })
      return { cagr, firstMillionYear, milestones }
    })
  }, [allCagrs, years, btcPrice, startYear, btcHoldings, activeTab, endYear])

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">BTC CAGR Analysis</h1>
          <p className="text-[13px] text-white/40 mt-1">
            Project Bitcoin price &amp; portfolio value across compounding annual growth rates
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={copyTable}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1a1a2e] bg-[#0d1018] hover:border-[#2a2a3e] text-[12px] text-white/60 hover:text-white/90 transition-all duration-150"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            {copyFeedback || 'Copy Table'}
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1a1a2e] bg-[#0d1018] hover:border-[#2a2a3e] text-[12px] text-white/60 hover:text-white/90 transition-all duration-150"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1a1a2e] bg-[#0d1018] hover:border-[#2a2a3e] text-[12px] text-white/60 hover:text-white/90 transition-all duration-150"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset
          </button>
        </div>
      </div>

      {/* ── Input Panel ─────────────────────────────────────────────────────── */}
      <div className="bg-[#0d1018] border border-[#1a1a2e] rounded-xl p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Starting BTC Price */}
          <div className="space-y-2">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">
              Starting BTC Price
            </label>
            <NumericInput
              value={btcPrice}
              onChange={v => setBtcPrice(Math.max(1, v))}
              step={500}
              min={1}
              prefix="$"
              accentColor="#34d399"
              className="w-full"
            />
            <div className="flex items-center bg-[#060810] border border-[#1a1a2e] rounded-lg p-0.5 gap-0">
              {PRESET_PRICES.map(p => {
                const isActive = btcPrice === p.value
                return (
                  <button
                    key={p.value}
                    onClick={() => setBtcPrice(p.value)}
                    className="relative px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-200 flex-1 text-center"
                    style={isActive ? {
                      background: 'linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(5,150,105,0.10) 100%)',
                      color: '#34d399',
                      boxShadow: '0 0 0 1px rgba(52,211,153,0.35), 0 2px 8px rgba(52,211,153,0.12)',
                    } : {
                      color: 'rgba(255,255,255,0.3)',
                    }}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* BTC Holdings */}
          <div className="space-y-2">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">
              BTC Holdings
            </label>
            <NumericInput
              value={btcHoldings}
              onChange={v => setBtcHoldings(Math.max(0.001, v))}
              step={0.1}
              min={0.001}
              decimals={3}
              accentColor="#34d399"
              className="w-full"
            />
            <div className="text-[11px] text-white/30">
              Portfolio Value:{' '}
              <span className="text-emerald-400 font-semibold">{formatValue(initialPortfolioValue)}</span>
            </div>
          </div>

          {/* Start Year */}
          <div className="space-y-2">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">
              Start Year
            </label>
            <NumericInput
              value={startYear}
              onChange={v => setStartYear(Math.min(endYear - 1, v))}
              step={1}
              min={2000}
              max={endYear - 1}
              accentColor="#34d399"
              className="w-full"
            />
          </div>

          {/* End Year */}
          <div className="space-y-2">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">
              End Year
            </label>
            <NumericInput
              value={endYear}
              onChange={v => setEndYear(Math.max(startYear + 1, v))}
              step={1}
              min={startYear + 1}
              max={2100}
              accentColor="#34d399"
              className="w-full"
            />
          </div>
        </div>

        {/* CAGR Selector */}
        <div className="mt-5 pt-5 border-t border-[#1a1a2e]">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">
              CAGR Scenarios
            </span>
            <div className="flex items-center gap-1.5 group relative">
              <svg className="w-3.5 h-3.5 text-white/25 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="absolute bottom-full left-0 mb-2 w-64 bg-[#0d1018] border border-[#1a1a2e] rounded-lg p-3 text-[11px] text-white/60 hidden group-hover:block z-10 shadow-2xl">
                Future Value = Start Price × (1 + CAGR%)^(Year − Start Year)
                <br /><br />
                Historical BTC CAGR (2014–2024) ≈ 60–80%
                <br /><span className="text-white/30">Past performance is not indicative of future results.</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {DEFAULT_CAGRS.map(cagr => {
              const isOn = selectedCAGRs.includes(cagr)
              const color = getCagrColor(cagr, 0)
              return (
                <button
                  key={cagr}
                  onClick={() => toggleCagr(cagr)}
                  className="relative flex items-center gap-2 pl-3 pr-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-200 select-none"
                  style={isOn ? {
                    background: `linear-gradient(135deg, ${color}22 0%, ${color}0d 100%)`,
                    boxShadow: `0 0 0 1px ${color}55, 0 2px 12px ${color}18`,
                    color,
                  } : {
                    background: 'rgba(255,255,255,0.03)',
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.07)',
                    color: 'rgba(255,255,255,0.28)',
                  }}
                >
                  {/* LED dot */}
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-200"
                    style={isOn
                      ? { background: color, boxShadow: `0 0 6px 1px ${color}` }
                      : { background: 'rgba(255,255,255,0.15)' }
                    }
                  />
                  {cagr}%
                </button>
              )
            })}
            {/* Custom CAGRs */}
            {customCagrs.map((cagr, idx) => {
              const color = CUSTOM_COLORS[idx % CUSTOM_COLORS.length]
              return (
                <div
                  key={cagr}
                  className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full text-[12px] font-semibold"
                  style={{
                    background: `linear-gradient(135deg, ${color}22 0%, ${color}0d 100%)`,
                    boxShadow: `0 0 0 1px ${color}55`,
                    color,
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: color, boxShadow: `0 0 6px 1px ${color}` }}
                  />
                  {cagr}%
                  <button
                    onClick={() => removeCustomCagr(cagr)}
                    className="ml-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] transition-all duration-150 hover:bg-white/10"
                    style={{ color }}
                  >
                    ×
                  </button>
                </div>
              )
            })}
            {/* Add custom */}
            <div className="flex items-center gap-1.5 ml-1">
              <div className="relative">
                <input
                  type="number"
                  placeholder="Custom %"
                  value={customCagrInput}
                  onChange={e => setCustomCagrInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustomCagr()}
                  className="w-24 bg-[#080B10] border border-[#1a1a2e] rounded-full px-3 py-1.5 text-[12px] text-white/60 focus:outline-none focus:border-white/20 transition-colors placeholder-white/20
                    [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <button
                onClick={addCustomCagr}
                className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[12px] text-white/45 hover:text-white/80 hover:bg-white/[0.07] hover:border-white/20 transition-all duration-150"
              >
                + Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Table Section ───────────────────────────────────────────────────── */}
      <div className="bg-[#0d1018] border border-[#1a1a2e] rounded-xl overflow-hidden">
        {/* Tab Toggle */}
        <div className="flex items-center border-b border-[#1a1a2e]">
          {(['price', 'portfolio'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 sm:flex-none px-6 py-3.5 text-[13px] font-semibold transition-all duration-150 relative ${
                activeTab === tab
                  ? 'text-white'
                  : 'text-white/35 hover:text-white/60'
              }`}
            >
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-t-full" />
              )}
              {tab === 'price' ? 'Price Assessment' : 'Portfolio Assessment'}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="border-b border-[#1a1a2e]">
                {activeTab === 'portfolio' && (
                  <th className="px-4 py-3 text-left font-semibold text-white/40 text-[11px] uppercase tracking-wider whitespace-nowrap border-r border-[#1a1a2e] min-w-[100px]">
                    BTC Info
                  </th>
                )}
                <th className={`px-4 py-3 text-left font-semibold text-white/40 text-[11px] uppercase tracking-wider whitespace-nowrap ${activeTab === 'portfolio' ? '' : 'border-r border-[#1a1a2e]'}`}>
                  {activeTab === 'price' ? (
                    <span className="text-emerald-400">${btcPrice.toLocaleString()}</span>
                  ) : ''}
                  <span className="ml-1">Year</span>
                </th>
                {allCagrs.map(cagr => (
                  <th
                    key={cagr}
                    className="px-4 py-3 text-right font-semibold text-[11px] uppercase tracking-wider whitespace-nowrap"
                    style={{ color: getCagrColorMemo(cagr) }}
                  >
                    {cagr}%
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {years.map((year, yearIdx) => (
                <tr
                  key={year}
                  className={`border-b border-[#1a1a2e]/50 transition-colors hover:bg-white/[0.02] ${yearIdx === 0 ? 'bg-white/[0.015]' : ''}`}
                >
                  {/* Portfolio info column */}
                  {activeTab === 'portfolio' && (
                    <td className="px-4 py-2.5 border-r border-[#1a1a2e] whitespace-nowrap">
                      {yearIdx === 0 ? (
                        <div className="space-y-0.5">
                          <div className="text-[11px] text-white/50">
                            <span className="text-white/30">BTC Price</span>{' '}
                            <span className="text-emerald-400 font-semibold">${btcPrice.toLocaleString()}</span>
                          </div>
                          <div className="text-[11px] text-white/50">
                            <span className="text-white/30">BTC #</span>{' '}
                            <span className="text-white font-semibold">{btcHoldings}</span>
                          </div>
                          <div className="text-[11px] text-white/50">
                            <span className="text-white/30">BTC Total</span>{' '}
                            <span className="text-emerald-400 font-semibold">{formatValue(initialPortfolioValue)}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-white/20 text-[11px]">—</span>
                      )}
                    </td>
                  )}
                  {/* Year */}
                  <td className={`px-4 py-2.5 font-semibold whitespace-nowrap ${activeTab === 'price' ? 'border-r border-[#1a1a2e]' : ''}`}>
                    <span className={yearIdx === 0 ? 'text-white' : 'text-white/60'}>{year}</span>
                  </td>
                  {/* CAGR values */}
                  {allCagrs.map(cagr => {
                    const price = calcFuturePrice(btcPrice, cagr, year - startYear)
                    const val = activeTab === 'price' ? price : price * btcHoldings
                    const isMillion = val >= 1_000_000

                    return (
                      <td
                        key={cagr}
                        title={`${year}: $${btcPrice.toLocaleString()} × (1 + ${cagr}%)^${year - startYear}${activeTab === 'portfolio' ? ` × ${btcHoldings} BTC` : ''} = ${formatValue(val)}`}
                        className={`px-4 py-2.5 text-right font-mono font-semibold whitespace-nowrap transition-colors ${
                          isMillion
                            ? 'bg-emerald-600/25 text-emerald-300'
                            : 'text-white/70'
                        }`}
                      >
                        {isMillion ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                            {formatValue(val)}
                          </span>
                        ) : (
                          formatValue(val)
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Legend */}
        <div className="px-4 py-2.5 border-t border-[#1a1a2e] flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-white/40">
            <span className="w-3 h-3 rounded bg-emerald-600/25 border border-emerald-500/30" />
            ≥ $1,000,000
          </span>
          <span className="text-[11px] text-white/20">|</span>
          <span className="text-[11px] text-white/30">Hover cells for formula detail</span>
        </div>
      </div>

      {/* ── Summary Cards ───────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white/40 mb-3">
          {activeTab === 'price' ? 'Price' : 'Portfolio'}{' '}Milestones &amp; Projections
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {milestoneData.map(({ cagr, firstMillionYear, milestones }) => (
            <div
              key={cagr}
              className="bg-[#0d1018] border border-[#1a1a2e] rounded-xl p-4 space-y-3"
              style={{ borderTopColor: getCagrColorMemo(cagr) }}
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: getCagrColorMemo(cagr) }} />
                <span className="text-[13px] font-bold" style={{ color: getCagrColorMemo(cagr) }}>{cagr}% CAGR</span>
              </div>

              <div className="space-y-1">
                <div className="text-[10px] text-white/30 uppercase tracking-wider">First hits $1M</div>
                <div className={`text-[13px] font-semibold ${firstMillionYear ? 'text-emerald-400' : 'text-white/30'}`}>
                  {firstMillionYear ? firstMillionYear : 'Beyond range'}
                </div>
              </div>

              {MILESTONE_YEARS.filter(my => my >= startYear && my <= endYear).map(my => (
                <div key={my} className="space-y-0.5">
                  <div className="text-[10px] text-white/30 uppercase tracking-wider">{my}</div>
                  <div className={`text-[12px] font-semibold ${milestones[my] >= 1_000_000 ? 'text-emerald-400' : 'text-white/60'}`}>
                    {milestones[my] ? formatValue(milestones[my]) : '—'}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Chart Section ───────────────────────────────────────────────────── */}
      <div className="bg-[#0d1018] border border-[#1a1a2e] rounded-xl p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[14px] font-semibold text-white">
            {activeTab === 'price' ? 'BTC Price Projections' : 'Portfolio Value Projections'}
          </h2>
          <button
            onClick={() => setLogScale(s => !s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-semibold transition-all duration-150 ${
              logScale
                ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                : 'border-[#1a1a2e] text-white/40 hover:text-white/70 hover:border-white/20'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7h16M4 12h8m-8 5h4" />
            </svg>
            Log Scale
          </button>
        </div>
        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
            <XAxis
              dataKey="year"
              stroke="#ffffff15"
              tick={{ fill: '#ffffff50', fontSize: 11 }}
              tickLine={false}
            />
            <YAxis
              scale={logScale ? 'log' : 'linear'}
              domain={logScale ? ['auto', 'auto'] : [0, 'auto']}
              stroke="#ffffff15"
              tick={{ fill: '#ffffff50', fontSize: 11 }}
              tickLine={false}
              tickFormatter={formatAxisValue}
              width={72}
              allowDataOverflow={false}
            />
            <Tooltip
              content={
                <CustomChartTooltip
                  startYear={startYear}
                  btcPrice={btcPrice}
                  btcHoldings={btcHoldings}
                  activeTab={activeTab}
                />
              }
            />
            <Legend
              formatter={(value: string) => {
                const cagr = parseFloat(value.replace('cagr_', ''))
                const finalYear = years[years.length - 1]
                const price = calcFuturePrice(btcPrice, cagr, finalYear - startYear)
                const val = activeTab === 'price' ? price : price * btcHoldings
                return (
                  <span style={{ color: getCagrColorMemo(cagr), fontSize: 12 }}>
                    {cagr}% → {formatValue(val)}
                  </span>
                )
              }}
            />
            <ReferenceLine
              y={1_000_000}
              stroke="#22c55e"
              strokeDasharray="6 3"
              strokeOpacity={0.5}
              label={{ value: '$1M', fill: '#22c55e', fontSize: 11, opacity: 0.7 }}
            />
            {allCagrs.map(cagr => (
              <Line
                key={cagr}
                type="monotone"
                dataKey={`cagr_${cagr}`}
                name={`cagr_${cagr}`}
                stroke={getCagrColorMemo(cagr)}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 0 }}
                isAnimationActive={true}
                animationDuration={400}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── What-If Calculator ──────────────────────────────────────────────── */}
      <div className="bg-[#0d1018] border border-[#1a1a2e] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <h2 className="text-[14px] font-semibold text-white">What-If Calculator</h2>
          <span className="text-[12px] text-white/30 ml-1">Required CAGR to hit a target</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">
              Target {activeTab === 'price' ? 'BTC Price' : 'Portfolio Value'}
            </label>
            <NumericInput
              value={whatIfTarget}
              onChange={v => setWhatIfTarget(Math.max(1, v))}
              step={100000}
              min={1}
              prefix="$"
              accentColor="#fbbf24"
              className="w-full"
            />
            <div className="flex items-center bg-[#060810] border border-[#1a1a2e] rounded-lg p-0.5 gap-0">
              {[500000, 1000000, 5000000, 10000000].map(v => {
                const isActive = whatIfTarget === v
                return (
                  <button
                    key={v}
                    onClick={() => setWhatIfTarget(v)}
                    className="relative flex-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-200 text-center whitespace-nowrap"
                    style={isActive ? {
                      background: 'linear-gradient(135deg, rgba(245,158,11,0.18) 0%, rgba(217,119,6,0.10) 100%)',
                      color: '#fbbf24',
                      boxShadow: '0 0 0 1px rgba(251,191,36,0.35), 0 2px 8px rgba(251,191,36,0.12)',
                    } : {
                      color: 'rgba(255,255,255,0.3)',
                    }}
                  >
                    {formatValue(v)}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">
              By Target Year
            </label>
            <NumericInput
              value={whatIfYear}
              onChange={v => setWhatIfYear(Math.max(startYear + 1, v))}
              step={1}
              min={startYear + 1}
              max={2100}
              accentColor="#fbbf24"
              className="w-full"
            />
          </div>
          <div className="bg-[#080B10] border border-[#1a1a2e] rounded-xl p-4 text-center">
            <div className="text-[11px] text-white/40 uppercase tracking-wider mb-1">Required CAGR</div>
            {requiredCagr !== null ? (
              <div>
                <span
                  className="text-3xl font-bold"
                  style={{
                    color: requiredCagr > 100 ? '#f87171' : requiredCagr > 60 ? '#fbbf24' : '#34d399'
                  }}
                >
                  {requiredCagr.toFixed(1)}%
                </span>
                <div className="text-[11px] text-white/30 mt-1 font-mono">
                  {formatValue(activeTab === 'price' ? whatIfTarget : whatIfTarget)} by {whatIfYear}
                </div>
              </div>
            ) : (
              <span className="text-white/30 text-[13px]">—</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Disclaimer ──────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-2 px-4 py-3 bg-white/[0.02] border border-white/[0.05] rounded-lg">
        <svg className="w-3.5 h-3.5 text-white/25 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-[11px] text-white/30 leading-relaxed">
          <span className="text-white/50 font-semibold">Historical Context:</span> Bitcoin&apos;s CAGR from 2014–2024 was approximately 60–80%.{' '}
          Formula: Future Value = Starting Price × (1 + CAGR)^(Year − Start Year).{' '}
          Past performance is not indicative of future results. This tool is for educational and planning purposes only.
        </p>
      </div>

      {/* ── Historical Returns Reference ─────────────────────────────────────── */}
      <a
        href="https://casebitcoin.com/charts"
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center justify-between gap-4 px-5 py-4 bg-[#0d1117] border border-[#f7931a]/30 rounded-xl hover:border-[#f7931a]/70 hover:bg-[#f7931a]/[0.06] transition-all duration-200"
      >
        <div className="flex items-center gap-3.5">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#f7931a]/10 flex items-center justify-center border border-[#f7931a]/20 group-hover:bg-[#f7931a]/20 transition-colors">
            <svg className="w-4.5 h-4.5 text-[#f7931a]" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <div>
            <div className="text-[13px] font-semibold text-white/90 group-hover:text-white transition-colors">
              Bitcoin Historical Returns &amp; CAGR Charts
            </div>
            <div className="text-[11px] text-white/40 mt-0.5">
              Every rolling return, drawdown, and CAGR period — visualized on <span className="text-[#f7931a]/70">casebitcoin.com</span>
            </div>
          </div>
        </div>
        <svg className="w-4 h-4 text-white/30 group-hover:text-[#f7931a]/70 flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>

    </div>
  )
}
