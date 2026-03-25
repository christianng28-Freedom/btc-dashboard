'use client'
import { useEffect, useRef, useState } from 'react'
import {
  createChart,
  IChartApi,
  ColorType,
  UTCTimestamp,
  LineStyle,
} from 'lightweight-charts'
import type { NuplDataPoint, NuplPhase } from '@/app/api/nupl/route'

interface NuplChartProps {
  data: NuplDataPoint[]
  height?: number
}

// Matches CheckOnChain phase colours exactly
const PHASES: {
  key: NuplPhase
  label: string
  color: string
  min: number
  max: number
}[] = [
  { key: 'euphoria',    label: 'Euphoria-Greed', color: '#3182ce', min:  0.75, max:  Infinity },
  { key: 'belief',      label: 'Belief-Denial',  color: '#38b2ac', min:  0.5,  max:  0.75 },
  { key: 'optimism',    label: 'Optimism',        color: '#ed8936', min:  0.25, max:  0.5  },
  { key: 'hope',        label: 'Hope-Fear',       color: '#ecc94b', min:  0,    max:  0.25 },
  { key: 'capitulation',label: 'Capitulation',    color: '#fc8181', min: -Infinity, max: 0 },
]

// Phase threshold lines drawn on the NUPL axis
const THRESHOLDS = [
  { value: 0.75, color: '#3182ce' },
  { value: 0.5,  color: '#38b2ac' },
  { value: 0.25, color: '#ed8936' },
  { value: 0,    color: '#a0aec0' },
]

type Zoom = 'all' | '5y' | '2y' | '1y'
const ZOOM_BTNS: { key: Zoom; label: string; days: number }[] = [
  { key: 'all', label: 'All',  days: 0   },
  { key: '5y',  label: '5Y',   days: 1825 },
  { key: '2y',  label: '2Y',   days: 730  },
  { key: '1y',  label: '1Y',   days: 365  },
]

export function NuplChart({ data, height = 460 }: NuplChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef     = useRef<IChartApi | null>(null)
  const [activeZoom, setActiveZoom] = useState<Zoom>('all')

  const latest      = data[data.length - 1]
  const currentPhase = latest ? PHASES.find((p) => p.key === latest.phase) : null

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return

    // ── Build per-phase data arrays ───────────────────────────────────────
    // Each data point is added to its phase's series.
    // At transitions the boundary point is also added to the *outgoing* phase
    // so the two segments share a coordinate and the line appears unbroken.
    const phasePoints: Record<NuplPhase, { time: UTCTimestamp; value: number }[]> = {
      euphoria: [], belief: [], optimism: [], hope: [], capitulation: [],
    }

    for (let i = 0; i < data.length; i++) {
      const d  = data[i]
      const pt = { time: d.time as UTCTimestamp, value: d.nupl }
      phasePoints[d.phase].push(pt)

      // First point of a new phase → also append to previous phase's array
      if (i > 0 && data[i - 1].phase !== d.phase) {
        phasePoints[data[i - 1].phase].push(pt)
      }
    }

    // ── Create chart ──────────────────────────────────────────────────────
    const chart = createChart(containerRef.current, {
      width:  containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor:  '#4a5568',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize:   11,
      },
      grid: {
        vertLines: { color: '#e8edf2' },
        horzLines: { color: '#e8edf2' },
      },
      leftPriceScale: {
        visible:     true,
        mode:        1, // logarithmic
        borderColor: '#cbd5e0',
      },
      rightPriceScale: {
        visible:     true,
        mode:        0, // linear
        borderColor: '#cbd5e0',
        scaleMargins: { top: 0.05, bottom: 0.1 },
      },
      timeScale: {
        borderColor:  '#cbd5e0',
        timeVisible:  false,
      },
      crosshair: {
        vertLine: { color: '#a0aec0', labelBackgroundColor: '#4a5568' },
        horzLine: { color: '#a0aec0', labelBackgroundColor: '#4a5568' },
      },
    })
    chartRef.current = chart

    // ── Price line (left log axis) ────────────────────────────────────────
    chart.addLineSeries({
      color:             '#1a202c',
      lineWidth:         1,
      priceScaleId:      'left',
      priceLineVisible:  false,
      lastValueVisible:  false,
    }).setData(data.map((d) => ({ time: d.time as UTCTimestamp, value: d.price })))

    // ── NUPL phase series (right linear axis) ─────────────────────────────
    for (const phase of PHASES) {
      const pts = phasePoints[phase.key]
      if (pts.length === 0) continue
      chart.addLineSeries({
        color:            phase.color,
        lineWidth:        2,
        priceScaleId:     'right',
        priceLineVisible: false,
        lastValueVisible: false,
      }).setData(pts)
    }

    // ── Phase threshold horizontal lines ──────────────────────────────────
    // Attach to a hidden 1-point series so we can use createPriceLine on the right axis
    const anchorSeries = chart.addLineSeries({
      priceScaleId:     'right',
      color:            'transparent',
      lineWidth:        1,
      priceLineVisible: false,
      lastValueVisible: false,
      visible:          false,
    })
    anchorSeries.setData([{ time: data[0].time as UTCTimestamp, value: 0 }])

    for (const t of THRESHOLDS) {
      anchorSeries.createPriceLine({
        price:             t.value,
        color:             t.color,
        lineWidth:         1,
        lineStyle:         LineStyle.Dashed,
        axisLabelVisible:  false,
      })
    }

    chart.timeScale().fitContent()

    // ── ResizeObserver ────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      if (containerRef.current)
        chart.resize(containerRef.current.clientWidth, height)
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
    }
  }, [data, height])

  function applyZoom(zoom: Zoom) {
    setActiveZoom(zoom)
    const chart = chartRef.current
    if (!chart) return
    if (zoom === 'all') { chart.timeScale().fitContent(); return }
    const days = ZOOM_BTNS.find((z) => z.key === zoom)!.days
    const now  = Math.floor(Date.now() / 1000) as UTCTimestamp
    chart.timeScale().setVisibleRange({
      from: (now - days * 86400) as UTCTimestamp,
      to:   now,
    })
  }

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a2e]">
        <div>
          <div className="text-xs font-bold text-[#e0e0e0] font-mono">
            Net Unrealized Profit/Loss (NUPL)
          </div>
          <div className="text-[10px] text-[#555566] font-mono">
            Market phase via on-chain realized cap · CoinMetrics
          </div>
        </div>
        {latest && currentPhase && (
          <div className="text-right">
            <div className="text-[10px] text-[#555566] font-mono uppercase tracking-widest">
              Current NUPL
            </div>
            <div
              className="text-sm font-bold font-mono"
              style={{ color: currentPhase.color }}
            >
              {latest.nupl.toFixed(3)}
              <span className="text-[10px] font-normal ml-1.5">
                {currentPhase.label}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Zoom controls */}
      <div className="flex gap-1 px-4 py-2 border-b border-[#1a1a2e]">
        {ZOOM_BTNS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => applyZoom(key)}
            className={`text-[10px] font-mono px-2 py-0.5 rounded transition-colors ${
              activeZoom === key
                ? 'bg-[#1a1a2e] text-[#e0e0e0]'
                : 'text-[#555566] hover:text-[#999] hover:bg-[#161630]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Chart canvas — white background matches CheckOnChain */}
      <div ref={containerRef} style={{ height, background: '#ffffff' }} />

      {/* Legend */}
      <div className="px-4 py-2.5 border-t border-[#1a1a2e] bg-[#0d0d14]">
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          <span className="text-[10px] font-mono text-[#555566]">
            <span className="text-[#1a202c]">—</span> Price [USD]
          </span>
          {PHASES.map((p) => (
            <span key={p.key} className="text-[10px] font-mono text-[#555566]">
              <span style={{ color: p.color }}>—</span> {p.label}
            </span>
          ))}
        </div>
        <div className="mt-1 text-[9px] font-mono text-[#333344]">
          Source: CoinMetrics Community API · Dashed lines = phase thresholds (0, 0.25, 0.5, 0.75)
        </div>
      </div>
    </div>
  )
}
