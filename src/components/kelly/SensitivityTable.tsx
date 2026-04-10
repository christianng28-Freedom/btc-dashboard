'use client'

import type { SensitivityCell } from '@/lib/calc/kelly'

interface Props {
  grid: SensitivityCell[]
  currentReturnPct: number
  currentVolPct: number
}

const OFFSETS = [-10, -5, 0, 5, 10]

function getAllocColor(kellyPct: number): string {
  if (kellyPct <= 0) return 'rgba(239, 68, 68, 0.15)'
  if (kellyPct <= 25) return 'rgba(34, 197, 94, 0.15)'
  if (kellyPct <= 50) return 'rgba(34, 197, 94, 0.25)'
  if (kellyPct <= 75) return 'rgba(245, 158, 11, 0.15)'
  if (kellyPct <= 100) return 'rgba(245, 158, 11, 0.25)'
  return 'rgba(239, 68, 68, 0.25)'
}

function getTextColor(kellyPct: number): string {
  if (kellyPct <= 0) return '#ef4444'
  if (kellyPct <= 50) return '#22c55e'
  if (kellyPct <= 100) return '#f59e0b'
  return '#ef4444'
}

export function SensitivityTable({ grid, currentReturnPct, currentVolPct }: Props) {
  // Build a lookup map
  const lookup = new Map<string, SensitivityCell>()
  for (const cell of grid) {
    lookup.set(`${cell.returnPct.toFixed(1)}_${cell.volPct.toFixed(1)}`, cell)
  }

  const volHeaders = OFFSETS.map(off => currentVolPct + off)
  const returnRows = OFFSETS.map(off => currentReturnPct + off)

  return (
    <div className="bg-[#0d1018] border border-[#1a1a2e] rounded-xl p-5">
      <h3 className="text-[#e0e0e0] text-sm font-semibold mb-1">Sensitivity Analysis</h3>
      <p className="text-[#666] text-xs mb-4">
        Full Kelly allocation (%) varying expected return and volatility by &plusmn;10%
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left px-3 py-2 text-[#666] text-xs font-medium">
                Return \ Vol
              </th>
              {volHeaders.map((vol, i) => (
                <th
                  key={i}
                  className={`text-center px-3 py-2 text-xs font-medium font-mono ${
                    OFFSETS[i] === 0 ? 'text-[#3b82f6]' : 'text-[#666]'
                  }`}
                >
                  {vol.toFixed(0)}%
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {returnRows.map((ret, ri) => (
              <tr key={ri} className="border-t border-[#1a1a2e]/40">
                <td className={`px-3 py-2 font-mono text-xs font-medium ${
                  OFFSETS[ri] === 0 ? 'text-[#3b82f6]' : 'text-[#666]'
                }`}>
                  {ret.toFixed(0)}%
                </td>
                {volHeaders.map((vol, ci) => {
                  const key = `${ret.toFixed(1)}_${vol.toFixed(1)}`
                  const cell = lookup.get(key)
                  const kellyPct = cell?.kellyPct ?? 0
                  const isCurrent = OFFSETS[ri] === 0 && OFFSETS[ci] === 0
                  return (
                    <td
                      key={ci}
                      className={`text-center px-3 py-2 font-mono text-xs font-semibold transition-colors ${
                        isCurrent ? 'ring-1 ring-[#3b82f6] rounded' : ''
                      }`}
                      style={{
                        backgroundColor: getAllocColor(kellyPct),
                        color: getTextColor(kellyPct),
                      }}
                    >
                      {kellyPct.toFixed(0)}%
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
