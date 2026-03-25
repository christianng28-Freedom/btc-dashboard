'use client'
import { useMemo, useState } from 'react'
import { ASSET_CLASS_VALUES } from '@/lib/constants'

const ASSET_COLORS: Record<string, string> = {
  'Bitcoin': '#f97316',
  'Global Real Estate': '#8b6552',
  'Global Debt (Bonds)': '#6b7280',
  'Global Equities': '#3b82f6',
  'Global M2 Money Supply': '#16a34a',
  'Gold': '#ca8a04',
  'Art & Collectibles': '#7c3aed',
  'Silver': '#94a3b8',
  'All Commodities': '#b45309',
}

function fmt(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`
  if (v >= 1e9) return `$${(v / 1e9).toFixed(0)}B`
  return `$${v}`
}

function getDisplayName(name: string): string {
  return name.replace('Global ', '').replace(' (Bonds)', '').replace('All ', '')
}

function wrapDisplayName(name: string, boxW: number): string[] {
  const words = name.split(' ')
  if (words.length <= 1) return [name]
  const singleLineFontEst = (boxW * 0.82) / (name.length * 0.58)
  if (singleLineFontEst >= 14) return [name]
  const mid = Math.ceil(words.length / 2)
  const l1 = words.slice(0, mid).join(' ')
  const l2 = words.slice(mid).join(' ')
  return l2 ? [l1, l2] : [l1]
}

interface TreeNode {
  name: string
  size: number
  x: number
  y: number
  w: number
  h: number
}

function squarify(
  items: { name: string; size: number }[],
  x0: number,
  y0: number,
  w: number,
  h: number
): TreeNode[] {
  const result: TreeNode[] = []
  const sorted = [...items].sort((a, b) => b.size - a.size)
  const total = sorted.reduce((s, i) => s + i.size, 0)

  function worstRatio(
    row: { size: number }[],
    rowSum: number,
    rw: number,
    rh: number,
    rem: number
  ): number {
    const maxDim = Math.max(rw, rh)
    const minDim = Math.min(rw, rh)
    if (minDim <= 0 || rem <= 0 || rowSum <= 0) return Infinity
    const thick = (rowSum / rem) * maxDim
    if (thick <= 0) return Infinity
    return row.reduce((worst, item) => {
      const len = (item.size / rowSum) * minDim
      if (len <= 0) return worst
      return Math.max(worst, Math.max(thick / len, len / thick))
    }, 0)
  }

  function process(
    items: { name: string; size: number }[],
    x: number,
    y: number,
    rw: number,
    rh: number,
    rem: number
  ) {
    if (!items.length) return
    if (items.length === 1) {
      result.push({ ...items[0], x, y, w: rw, h: rh })
      return
    }

    const isWide = rw >= rh
    const maxDim = isWide ? rw : rh
    const minDim = isWide ? rh : rw

    let row: { name: string; size: number }[] = []
    let rowSum = 0
    let prevWorst = Infinity
    let cutIdx = 0

    for (let i = 0; i < items.length; i++) {
      const newRow = [...row, items[i]]
      const newRowSum = rowSum + items[i].size
      const newWorst = worstRatio(newRow, newRowSum, rw, rh, rem)

      if (!row.length || newWorst <= prevWorst) {
        row = newRow
        rowSum = newRowSum
        prevWorst = newWorst
        cutIdx = i + 1
      } else {
        break
      }
    }

    // Place the row as a strip
    const thick = (rowSum / rem) * maxDim
    let pos = 0

    for (const item of row) {
      const len = (item.size / rowSum) * minDim
      if (isWide) {
        result.push({ ...item, x, y: y + pos, w: thick, h: len })
      } else {
        result.push({ ...item, x: x + pos, y, w: len, h: thick })
      }
      pos += len
    }

    const remaining = items.slice(cutIdx)
    if (!remaining.length) return

    if (isWide) {
      process(remaining, x + thick, y, rw - thick, rh, rem - rowSum)
    } else {
      process(remaining, x, y + thick, rw, rh - thick, rem - rowSum)
    }
  }

  process(sorted, x0, y0, w, h, total)
  return result
}

interface Props {
  btcMarketCap: number
}

export function AssetTreemap({ btcMarketCap }: Props) {
  const [tooltip, setTooltip] = useState<{ name: string; size: number; x: number; y: number; above: boolean } | null>(null)

  const assets = useMemo(() => {
    const base = ASSET_CLASS_VALUES
      .filter(a => a.name !== 'Global Derivatives')
      .map(a => ({ name: a.name, size: a.value }))
    if (btcMarketCap > 0) {
      base.push({ name: 'Bitcoin', size: btcMarketCap })
    }
    return base
  }, [btcMarketCap])

  const total = assets.reduce((s, a) => s + a.size, 0)

  const W = 800
  const H = 310
  const nodes = useMemo(() => squarify(assets, 0, 0, W, H), [assets])

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex justify-between items-center mb-2 text-xs text-[#666]">
        <span>Block area proportional to market cap</span>
        <span className="font-mono text-[#999]">Total: {fmt(total)}</span>
      </div>
      <div className="flex-1 relative min-h-0">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="absolute inset-0 w-full h-full rounded"
          preserveAspectRatio="none"
          onMouseLeave={() => setTooltip(null)}
        >
          {nodes.map((node, i) => {
            const color = ASSET_COLORS[node.name] ?? '#3b82f6'
            const isBTC = node.name === 'Bitcoin'
            const textColor = node.name === 'Silver' ? '#1f2937' : '#f0f0f0'
            const isTiny = node.w < 40 || node.h < 25
            const isSmall = node.w < 70 || node.h < 44
            const displayName = getDisplayName(node.name)
            const cx = node.x + node.w / 2
            const cy = node.y + node.h / 2

            // Wrap long names onto 2 lines so font can be larger
            const lines = !isSmall ? wrapDisplayName(displayName, node.w) : [displayName]
            const maxLineLen = Math.max(...lines.map(l => l.length))

            // Font size: constrain by longest line width and box height
            const nameFontSize = Math.min(
              Math.max(9, (node.w * 0.82) / (maxLineLen * 0.58)),
              node.h * 0.30,
              28
            )
            const valueFontSize = Math.min(
              Math.max(9, nameFontSize * 0.72),
              node.h * 0.18,
              18
            )

            // Center name+value block as a unit (account for multi-line names)
            const lineHeight = nameFontSize * 1.2
            const nameBlockH = nameFontSize + (lines.length - 1) * lineHeight
            const lineSpacing = nameFontSize * 0.4
            const blockH = nameBlockH + lineSpacing + valueFontSize
            const firstNameY = cy - blockH / 2 + nameFontSize
            const valueY = firstNameY + (lines.length - 1) * lineHeight + lineSpacing + valueFontSize

            const shadow = { filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.7))', pointerEvents: 'none' as const }

            return (
              <g
                key={i}
                onMouseEnter={(e) => {
                  const svg = (e.currentTarget as SVGElement).ownerSVGElement
                  if (!svg) return
                  const rect = svg.getBoundingClientRect()
                  const scaleX = rect.width / W
                  const scaleY = rect.height / H
                  const above = node.y > H * 0.3
                  setTooltip({
                    name: node.name,
                    size: node.size,
                    x: (node.x + node.w / 2) * scaleX,
                    y: above ? node.y * scaleY : (node.y + node.h) * scaleY,
                    above,
                  })
                }}
                style={{ cursor: 'default' }}
              >
                <rect
                  x={node.x + 1}
                  y={node.y + 1}
                  width={node.w - 2}
                  height={node.h - 2}
                  fill={color}
                  fillOpacity={isBTC ? 1 : 0.78}
                  rx={3}
                  stroke="#0a0a0f"
                  strokeWidth={2}
                />
                {!isTiny && (
                  <>
                    {!isSmall && (
                      <text
                        textAnchor="middle"
                        fill={textColor}
                        fontSize={nameFontSize}
                        fontWeight="700"
                        style={shadow}
                      >
                        {lines.map((line, li) => (
                          <tspan key={li} x={cx} y={firstNameY + li * lineHeight}>
                            {line}
                          </tspan>
                        ))}
                      </text>
                    )}
                    <text
                      x={cx}
                      y={isSmall ? cy : valueY}
                      textAnchor="middle"
                      dominantBaseline={isSmall ? 'middle' : 'auto'}
                      fill={textColor}
                      fontSize={valueFontSize}
                      style={shadow}
                    >
                      {fmt(node.size)}
                    </text>
                  </>
                )}
              </g>
            )
          })}
        </svg>

        {tooltip && (
          <div
            className="absolute pointer-events-none z-10 bg-[#111120] border border-[#1a1a2e] rounded px-3 py-2 text-sm shadow-lg"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: tooltip.above ? 'translate(-50%, -110%)' : 'translate(-50%, 10%)',
            }}
          >
            <div className="font-medium text-[#e0e0e0]">{tooltip.name}</div>
            <div className="font-mono text-[#f97316]">{fmt(tooltip.size)}</div>
          </div>
        )}
      </div>
      <div className="text-[11px] text-[#3a3a4a] mt-2">
        Global Derivatives ($715T notional) excluded — leverage contracts not directly comparable to real asset market caps
      </div>
    </div>
  )
}
