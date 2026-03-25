'use client'
import { useState, useCallback } from 'react'
import { ASSET_CLASS_VALUES } from '@/lib/constants'
import { formatPrice, formatCompact } from '@/lib/format'

interface Props {
  btcPrice: number
  circulatingSupply: number
}

const PRESETS = [1, 5, 10, 25, 50, 100]

// Logarithmic slider: maps 0-100 slider value → 0.1% to 100%
function sliderToPercent(sliderVal: number): number {
  // log scale from 0.1 to 100
  const min = Math.log10(0.1)
  const max = Math.log10(100)
  return Math.pow(10, min + (sliderVal / 100) * (max - min))
}

function percentToSlider(pct: number): number {
  const min = Math.log10(0.1)
  const max = Math.log10(100)
  return ((Math.log10(pct) - min) / (max - min)) * 100
}

export function WhatIfSlider({ btcPrice, circulatingSupply }: Props) {
  const [selectedAsset, setSelectedAsset] = useState(ASSET_CLASS_VALUES[6].name) // Gold
  const [sliderVal, setSliderVal] = useState(percentToSlider(10)) // default 10%

  const asset = ASSET_CLASS_VALUES.find(a => a.name === selectedAsset) ?? ASSET_CLASS_VALUES[6]
  const capturePercent = sliderToPercent(sliderVal)
  const targetMcap = asset.value * (capturePercent / 100)
  const impliedPrice = circulatingSupply > 0 ? targetMcap / circulatingSupply : 0
  const priceMultiple = btcPrice > 0 ? impliedPrice / btcPrice : 0

  const setPreset = useCallback((pct: number) => {
    setSliderVal(percentToSlider(pct))
  }, [])

  return (
    <div className="space-y-5">
      {/* Asset selector */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[#666] text-sm">Compare against:</span>
        <select
          value={selectedAsset}
          onChange={e => setSelectedAsset(e.target.value)}
          className="bg-[#111120] border border-[#1a1a2e] text-[#e0e0e0] text-sm rounded px-3 py-1.5 outline-none focus:border-[#3b82f6] cursor-pointer"
        >
          {ASSET_CLASS_VALUES.map(a => (
            <option key={a.name} value={a.name}>{a.name} (${formatCompact(a.value)})</option>
          ))}
        </select>
      </div>

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map(p => (
          <button
            key={p}
            onClick={() => setPreset(p)}
            className={`px-3 py-1 rounded text-sm border transition-colors cursor-pointer ${
              Math.abs(capturePercent - p) < 0.5
                ? 'bg-[#f97316] border-[#f97316] text-white'
                : 'bg-transparent border-[#2a2a3e] text-[#999] hover:border-[#444] hover:text-[#ccc]'
            }`}
          >
            {p}%
          </button>
        ))}
      </div>

      {/* Slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-[#666]">
          <span>0.1%</span>
          <span className="text-[#f97316] font-mono font-medium">{capturePercent.toFixed(capturePercent < 1 ? 2 : 1)}% capture</span>
          <span>100%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={0.5}
          value={sliderVal}
          onChange={e => setSliderVal(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer bg-[#1a1a2e] accent-[#f97316]"
        />
      </div>

      {/* Result display */}
      <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-4 space-y-3">
        <div className="text-[#666] text-sm">
          If BTC captures {capturePercent.toFixed(capturePercent < 1 ? 2 : 1)}% of {asset.name}&apos;s ${formatCompact(asset.value)}:
        </div>
        <div className="flex flex-wrap gap-6">
          <div>
            <div className="text-[#666] text-xs mb-1">Target Market Cap</div>
            <div className="text-[#e0e0e0] font-mono font-medium">${formatCompact(targetMcap)}</div>
          </div>
          <div>
            <div className="text-[#666] text-xs mb-1">Implied BTC Price</div>
            <div className="text-[#f97316] font-mono text-xl font-bold">
              {impliedPrice > 0 ? formatPrice(impliedPrice) : '—'}
            </div>
          </div>
          <div>
            <div className="text-[#666] text-xs mb-1">Multiple from Current</div>
            <div className={`font-mono font-bold text-lg ${priceMultiple >= 1 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
              {priceMultiple > 0 ? `${priceMultiple.toFixed(1)}×` : '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
