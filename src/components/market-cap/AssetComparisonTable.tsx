'use client'
import { ASSET_CLASS_VALUES } from '@/lib/constants'
import { formatCompact } from '@/lib/format'

interface Props {
  btcMarketCap: number
}

export function AssetComparisonTable({ btcMarketCap }: Props) {
  const sorted = [...ASSET_CLASS_VALUES].sort((a, b) => b.value - a.value)
  const totalTAM = ASSET_CLASS_VALUES.reduce((s, a) => s + a.value, 0)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#1a1a2e]">
            <th className="text-left py-2 pr-4 text-[#666] font-normal">Asset Class</th>
            <th className="text-right py-2 pr-4 text-[#666] font-normal">Est. Global Value</th>
            <th className="text-right py-2 pr-4 text-[#666] font-normal">BTC as % of Asset</th>
            <th className="text-right py-2 text-[#666] font-normal">Source</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((asset) => {
            const pct = btcMarketCap > 0 ? (btcMarketCap / asset.value) * 100 : 0
            return (
              <tr key={asset.name} className="border-b border-[#111122] hover:bg-[#111120] transition-colors">
                <td className="py-2 pr-4 text-[#e0e0e0]">{asset.name}</td>
                <td className="py-2 pr-4 text-right font-mono text-[#999]">
                  ${formatCompact(asset.value)}
                </td>
                <td className="py-2 pr-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 bg-[#1a1a2e] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#f97316] rounded-full"
                        style={{ width: `${Math.min(pct * 10, 100)}%` }}
                      />
                    </div>
                    <span className="font-mono text-[#f97316] w-14 text-right">
                      {pct < 0.01 ? '<0.01' : pct.toFixed(2)}%
                    </span>
                  </div>
                </td>
                <td className="py-2 text-right text-[#555] text-xs">{asset.source}</td>
              </tr>
            )
          })}
          <tr className="border-t border-[#2a2a3e] bg-[#0d0d14]">
            <td className="py-2 pr-4 text-[#999] font-medium">Total Addressable Market</td>
            <td className="py-2 pr-4 text-right font-mono text-[#999]">
              ${formatCompact(totalTAM)}
            </td>
            <td className="py-2 pr-4 text-right font-mono text-[#f97316]">
              {btcMarketCap > 0 ? ((btcMarketCap / totalTAM) * 100).toFixed(3) : '—'}%
            </td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  )
}
