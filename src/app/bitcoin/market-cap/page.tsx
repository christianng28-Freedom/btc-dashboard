'use client'
import { ModuleHeader } from '@/components/layout/ModuleHeader'
import { AssetComparisonTable } from '@/components/market-cap/AssetComparisonTable'
import { AssetTreemap } from '@/components/market-cap/AssetTreemap'
import { WhatIfSlider } from '@/components/market-cap/WhatIfSlider'
import { LogGrowthChart } from '@/components/market-cap/LogGrowthChart'
import { NetworkValueChart } from '@/components/market-cap/NetworkValueChart'
import { useMarketCapData } from '@/hooks/useMarketCapData'
import { useExtendedHistory } from '@/hooks/useExtendedHistory'
import { formatPrice, formatCompact, formatChange } from '@/lib/format'

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-widest text-[#666] mb-4 flex items-center gap-2">
      <span className="w-4 h-px bg-[#2a2a3e]" />
      {children}
      <span className="flex-1 h-px bg-[#1a1a2e]" />
    </h2>
  )
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg px-4 py-3">
      <div className="text-[#666] text-xs mb-1">{label}</div>
      <div className="text-[#e0e0e0] font-mono font-semibold text-lg">{value}</div>
      {sub && <div className="text-[#555] text-xs mt-0.5">{sub}</div>}
    </div>
  )
}

export default function MarketCapPage() {
  const { data: mcap, isLoading, isError } = useMarketCapData()
  const { candles } = useExtendedHistory()

  const btcMarketCap = mcap?.marketCap ?? 0
  const btcPrice = mcap?.price ?? 0
  const circulatingSupply = mcap?.circulatingSupply ?? 19_700_000
  const ethMarketCap = mcap?.ethMarketCap ?? 380_000_000_000

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-10">
      <ModuleHeader
        title="Market Cap Context"
        description="Put Bitcoin's market cap in perspective — how big can it get?"
      />

      {/* Live stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="BTC Market Cap"
          value={btcMarketCap > 0 ? `$${formatCompact(btcMarketCap)}` : '—'}
          sub={isLoading ? 'Loading…' : isError ? 'Error' : undefined}
        />
        <MetricCard
          label="BTC Price"
          value={btcPrice > 0 ? formatPrice(btcPrice) : '—'}
          sub={mcap ? formatChange(mcap.change24h) + ' 24h' : undefined}
        />
        <MetricCard
          label="Circulating Supply"
          value={circulatingSupply > 0 ? `${(circulatingSupply / 1e6).toFixed(3)}M BTC` : '—'}
          sub={`of 21M max`}
        />
        <MetricCard
          label="ATH"
          value={mcap?.ath ? formatPrice(mcap.ath) : '—'}
          sub={btcPrice && mcap?.ath ? `${((btcPrice / mcap.ath - 1) * 100).toFixed(1)}% from ATH` : undefined}
        />
      </div>

      {/* Asset Class Comparison */}
      <section>
        <SectionTitle>Asset Class Comparison</SectionTitle>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-5">
            <AssetComparisonTable btcMarketCap={btcMarketCap} />
          </div>
          <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-5 flex flex-col">
            <AssetTreemap btcMarketCap={btcMarketCap} />
          </div>
        </div>
      </section>

      {/* What If Slider */}
      <section>
        <SectionTitle>What If BTC Captured X%?</SectionTitle>
        <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-5 max-w-2xl">
          <WhatIfSlider btcPrice={btcPrice} circulatingSupply={circulatingSupply} />
        </div>
      </section>

      {/* Logarithmic Growth Trajectory */}
      <section>
        <SectionTitle>Logarithmic Growth Trajectory</SectionTitle>
        <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-5">
          <div className="text-xs text-[#666] mb-3">
            Power-law regression on BTC market cap vs days since genesis (log-log). Bands show ±1σ and ±2σ.
          </div>
          <LogGrowthChart candles={candles} />
        </div>
      </section>

      {/* Network Value Comparison */}
      <section>
        <SectionTitle>Network Value vs Top Companies</SectionTitle>
        <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-5">
          <div className="text-xs text-[#666] mb-3">
            Company figures are static as of March 23, 2026 — BTC and ETH are live.
          </div>
          <NetworkValueChart btcMarketCap={btcMarketCap} ethMarketCap={ethMarketCap} />
        </div>
      </section>
    </div>
  )
}
