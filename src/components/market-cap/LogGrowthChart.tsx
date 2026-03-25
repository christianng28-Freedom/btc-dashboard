'use client'
import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer, Legend
} from 'recharts'
import type { OHLCV } from '@/lib/types'

interface Props {
  candles: OHLCV[]
}

const GENESIS_UNIX = 1230768000 // ~2009-01-03

function daysSinceGenesis(unix: number): number {
  return Math.max(1, (unix - GENESIS_UNIX) / 86400)
}

// Approximate BTC circulating supply at a given unix timestamp
function getBTCSupply(unix: number): number {
  const secondsPerBlock = 600
  const blocksElapsed = Math.max(0, (unix - GENESIS_UNIX) / secondsPerBlock)
  let supply = 0
  let blockStart = 0
  let reward = 50
  while (blockStart < blocksElapsed) {
    const halvingBlock = Math.floor(blockStart / 210000) * 210000 + 210000
    const blocksInEpoch = Math.min(halvingBlock, blocksElapsed) - blockStart
    supply += blocksInEpoch * reward
    blockStart = halvingBlock
    reward /= 2
    if (reward < 1e-8) break
  }
  return Math.min(supply, 21_000_000)
}

function powerLawRegression(logX: number[], logY: number[]) {
  const n = logX.length
  if (n < 2) return { slope: 0, intercept: 0, sigma: 0 }
  const sumX = logX.reduce((s, v) => s + v, 0)
  const sumY = logY.reduce((s, v) => s + v, 0)
  const sumXY = logX.reduce((s, v, i) => s + v * logY[i], 0)
  const sumX2 = logX.reduce((s, v) => s + v * v, 0)
  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return { slope: 0, intercept: 0, sigma: 0 }
  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  const predicted = logX.map(x => slope * x + intercept)
  const sigma = Math.sqrt(logY.reduce((s, y, i) => s + Math.pow(y - predicted[i], 2), 0) / n)
  return { slope, intercept, sigma }
}

const MILESTONES = [
  { value: 1e12, label: '$1T' },
  { value: 2e12, label: '$2T' },
  { value: 5e12, label: '$5T' },
  { value: 1e13, label: '$10T' },
  { value: 2e13, label: '$20T' },
]

function fmtMcap(v: number) {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(0)}T`
  if (v >= 1e9) return `$${(v / 1e9).toFixed(0)}B`
  return `$${v}`
}

function fmtYear(unix: number) {
  return new Date(unix * 1000).getFullYear().toString()
}

// Downsample to at most N points, keeping first/last
function downsample<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr
  const step = arr.length / n
  return Array.from({ length: n }, (_, i) => arr[Math.round(i * step)])
}

export function LogGrowthChart({ candles }: Props) {
  const chartData = useMemo(() => {
    if (candles.length < 100) return null

    // Compute market caps
    const mcapData = candles
      .filter(c => c.close > 0)
      .map(c => ({
        unix: c.time,
        days: daysSinceGenesis(c.time),
        mcap: c.close * getBTCSupply(c.time),
      }))
      .filter(d => d.days > 300) // skip early noisy data

    const logX = mcapData.map(d => Math.log10(d.days))
    const logY = mcapData.map(d => Math.log10(d.mcap))

    const { slope, intercept, sigma } = powerLawRegression(logX, logY)

    // Generate smooth regression lines from first data point to 2028
    const endUnix = 1830384000 // ~2028-01-01
    const startDays = mcapData[0].days
    const endDays = daysSinceGenesis(endUnix)
    const numPoints = 200
    const regressionLine = Array.from({ length: numPoints }, (_, i) => {
      const days = startDays * Math.pow(endDays / startDays, i / (numPoints - 1))
      const logMcap = slope * Math.log10(days) + intercept
      const unix = GENESIS_UNIX + days * 86400
      return {
        unix,
        reg: Math.pow(10, logMcap),
        reg1up: Math.pow(10, logMcap + sigma),
        reg1dn: Math.pow(10, logMcap - sigma),
        reg2up: Math.pow(10, logMcap + 2 * sigma),
        reg2dn: Math.pow(10, logMcap - 2 * sigma),
      }
    })

    // Downsample actual data
    const sampled = downsample(mcapData, 500).map(d => ({ unix: d.unix, actual: d.mcap }))

    // Merge actual + regression (keyed by unix)
    const merged: Record<number, { unix: number; actual?: number; reg?: number; reg1up?: number; reg1dn?: number; reg2up?: number; reg2dn?: number }> = {}
    for (const d of sampled) merged[d.unix] = { unix: d.unix, actual: d.actual }
    for (const r of regressionLine) {
      const key = Math.round(r.unix / 86400) * 86400
      merged[key] = { ...merged[key], ...r, unix: key }
    }

    return Object.values(merged).sort((a, b) => a.unix - b.unix)
  }, [candles])

  if (!chartData) {
    return (
      <div className="h-80 flex items-center justify-center text-[#666] text-sm">
        Loading market cap history…
      </div>
    )
  }

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
          <XAxis
            dataKey="unix"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={fmtYear}
            tick={{ fill: '#666', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            scale="log"
            domain={['auto', 'auto']}
            tickFormatter={fmtMcap}
            tick={{ fill: '#666', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={54}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0]?.payload as { unix: number; actual?: number; reg?: number }
              return (
                <div className="bg-[#111120] border border-[#1a1a2e] rounded px-3 py-2 text-sm">
                  <div className="text-[#666] text-xs mb-1">
                    {new Date(d.unix * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </div>
                  {d.actual != null && <div className="text-[#e0e0e0]">Market Cap: {fmtMcap(d.actual)}</div>}
                  {d.reg != null && <div className="text-[#3b82f6]">Regression: {fmtMcap(d.reg)}</div>}
                </div>
              )
            }}
            cursor={{ stroke: '#ffffff22' }}
          />
          {/* Milestone reference lines */}
          {MILESTONES.map(m => (
            <ReferenceLine
              key={m.label}
              y={m.value}
              stroke="#ffffff18"
              strokeDasharray="4 4"
              label={{ value: m.label, fill: '#555', fontSize: 10, position: 'insideRight' }}
            />
          ))}
          {/* ±2σ bands */}
          <Line dataKey="reg2up" stroke="#3b82f622" strokeWidth={1} dot={false} strokeDasharray="3 3" connectNulls legendType="none" name="+2σ" />
          <Line dataKey="reg2dn" stroke="#3b82f622" strokeWidth={1} dot={false} strokeDasharray="3 3" connectNulls legendType="none" name="-2σ" />
          {/* ±1σ bands */}
          <Line dataKey="reg1up" stroke="#3b82f644" strokeWidth={1} dot={false} strokeDasharray="2 2" connectNulls legendType="none" name="+1σ" />
          <Line dataKey="reg1dn" stroke="#3b82f644" strokeWidth={1} dot={false} strokeDasharray="2 2" connectNulls legendType="none" name="-1σ" />
          {/* Regression line */}
          <Line dataKey="reg" stroke="#3b82f6" strokeWidth={1.5} dot={false} strokeDasharray="6 3" connectNulls name="Power-Law Regression" />
          {/* Actual market cap */}
          <Line dataKey="actual" stroke="#f97316" strokeWidth={1.5} dot={false} connectNulls name="BTC Market Cap" />
          <Legend
            iconType="line"
            iconSize={12}
            wrapperStyle={{ fontSize: '11px', color: '#666', paddingTop: '6px' }}
            formatter={(v) => <span style={{ color: '#999' }}>{v}</span>}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
