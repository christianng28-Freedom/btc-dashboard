'use client'
import { ModuleHeader } from '@/components/layout/ModuleHeader'
import { useRef, useState, useEffect, useCallback } from 'react'

const SECTIONS = [
  { id: 'pricing-models', label: 'Pricing Models & Cycle-Phase Signals' },
  { id: 'holder-dynamics', label: 'Short-Term vs Long-Term Holder Dynamics' },
  { id: 'hodl-waves', label: 'Supply Age & HODL Waves' },
  { id: 'profit-loss', label: 'Profit / Loss, SOPR & Realised Cap' },
  { id: 'etfs', label: 'ETFs & Smart-Money Flows' },
  { id: 'miners', label: 'Miners & Liquidity' },
] as const

function SectionNav() {
  const [activeId, setActiveId] = useState<string>(SECTIONS[0].id)
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    // The scroll container is the closest ancestor with overflow-y-auto (<main>)
    const nav = navRef.current
    if (!nav) return
    let scrollContainer: HTMLElement | null = nav.parentElement
    while (scrollContainer && getComputedStyle(scrollContainer).overflowY !== 'auto') {
      scrollContainer = scrollContainer.parentElement
    }
    if (!scrollContainer) scrollContainer = document.documentElement

    const handleScroll = () => {
      const threshold = scrollContainer!.getBoundingClientRect().top + 120
      let current = SECTIONS[0].id
      for (const { id } of SECTIONS) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= threshold) {
          current = id
        }
      }
      setActiveId(current)
    }

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // set initial state
    return () => scrollContainer!.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <nav ref={navRef} className="sticky top-0 z-30 -mx-1 px-1 py-3 bg-[#0a0a1a]/90 backdrop-blur-md border-b border-[#1a1a2e] mb-6">
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => scrollTo(id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              activeId === id
                ? 'bg-[#f7931a]/15 text-[#f7931a] border border-[#f7931a]/30'
                : 'bg-[#111827] text-[#888] border border-[#1a1a2e] hover:text-white hover:border-[#333]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </nav>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-widest text-[#666] mb-4 flex items-center gap-2">
      <span className="w-4 h-px bg-[#2a2a3e]" />
      {children}
      <span className="flex-1 h-px bg-[#1a1a2e]" />
    </h2>
  )
}

const NATIVE_W = 1440
const NATIVE_H = 800

function CheckOnChainIframe({ src, title }: { src: string; title: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      // Guard against display:none reporting 0 width — preserve last valid scale
      if (w > 0) setScale(w / NATIVE_W)
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={wrapperRef}
      className="w-full rounded-lg overflow-hidden border border-[#1a1a2e]"
      style={{ height: Math.round(NATIVE_H * scale), background: '#ffffff' }}
    >
      <iframe
        src={src}
        title={title}
        loading="eager"
        scrolling="no"
        style={{
          width: NATIVE_W,
          height: NATIVE_H,
          border: 'none',
          display: 'block',
          colorScheme: 'light',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      />
    </div>
  )
}

export function OnChainContent() {
  return (
    <div className="space-y-10">
      <ModuleHeader
        title="On-Chain Analysis"
        description="Bitcoin on-chain metrics and network fundamentals."
      />

      <SectionNav />

      {/* 1. Pricing Models & Cycle-Phase Signals */}
      <section id="pricing-models" className="scroll-mt-20">
        <SectionTitle>Pricing Models &amp; Cycle-Phase Signals</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CheckOnChainIframe
            src="https://charts.checkonchain.com/btconchain/pricing/pricing_mvrv_bands/pricing_mvrv_bands_light.html"
            title="Realised Price & MVRV – CheckOnChain"
          />
          <CheckOnChainIframe
            src="https://charts.checkonchain.com/btconchain/unrealised/nupl_bycohort/nupl_bycohort_light.html"
            title="NUPL by Cohort – CheckOnChain"
          />
          <CheckOnChainIframe
            src="https://charts.checkonchain.com/btconchain/pricing/ism_pmi_bitcoin/ism_pmi_bitcoin_light.html"
            title="Power Law Model – CheckOnChain"
          />
          <CheckOnChainIframe
            src="https://charts.checkonchain.com/btconchain/pricing/pricing_mayermultiple/pricing_mayermultiple_light.html"
            title="Mayer Multiple – CheckOnChain"
          />
          <CheckOnChainIframe
            src="https://charts.checkonchain.com/btconchain/pricing/pricing_magiclines/pricing_magiclines_light.html"
            title="Magic Lines (Key Moving Averages) – CheckOnChain"
          />
          <CheckOnChainIframe
            src="https://charts.checkonchain.com/btconchain/unrealised/mvrv_aviv_1/mvrv_aviv_1_light.html"
            title="True Market Mean & AVIV Ratio – CheckOnChain"
          />
        </div>
      </section>

      {/* 2. Short-Term vs Long-Term Holder Dynamics */}
      <section id="holder-dynamics" className="scroll-mt-20">
        <SectionTitle>Short-Term vs Long-Term Holder Dynamics</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CheckOnChainIframe
            src="https://charts.checkonchain.com/btconchain/supply/binaryspending_indicator/binaryspending_indicator_light.html"
            title="LTH Binary Spending Indicator – CheckOnChain"
          />
          <CheckOnChainIframe
            src="https://charts.checkonchain.com/btconchain/unrealised/mvrv_sth/mvrv_sth_light.html"
            title="STH MVRV & Cost Basis – CheckOnChain"
          />
          <CheckOnChainIframe
            src="https://charts.checkonchain.com/btconchain/supply/rhodl/rhodl_light.html"
            title="RHODL Ratio – CheckOnChain"
          />
        </div>
      </section>

      {/* 3. Supply Age & HODL Waves */}
      <section id="hodl-waves" className="scroll-mt-20">
        <SectionTitle>Supply Age &amp; HODL Waves</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CheckOnChainIframe
            src="https://charts.checkonchain.com/btconchain/supply/rcap_hodlwave_bycohort/rcap_hodlwave_bycohort_light.html"
            title="HODL Waves – CheckOnChain"
          />
          <CheckOnChainIframe
            src="https://charts.checkonchain.com/btconchain/supply/distribution_waves_0/distribution_waves_0_light.html"
            title="Wallet Waves – CheckOnChain"
          />
          <CheckOnChainIframe
            src="https://charts.checkonchain.com/btconchain/supply/breakdown_lthsth_pnl_0/breakdown_lthsth_pnl_0_light.html"
            title="LTH / STH Supply in Profit/Loss – CheckOnChain"
          />
        </div>
      </section>

      {/* 4. Profit / Loss, SOPR & Realised Cap */}
      <section id="profit-loss" className="scroll-mt-20">
        <SectionTitle>Profit / Loss, SOPR &amp; Realised Cap</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CheckOnChainIframe
            src="https://charts.checkonchain.com/btconchain/realised/sopr/sopr_light.html"
            title="SOPR – CheckOnChain"
          />
          <CheckOnChainIframe
            src="https://charts.checkonchain.com/btconchain/realised/sellsideriskratio_all/sellsideriskratio_all_light.html"
            title="Sell-Side Risk Ratio – CheckOnChain"
          />
          <CheckOnChainIframe
            src="https://charts.checkonchain.com/btconchain/pricing/pricing_realisedcap/pricing_realisedcap_light.html"
            title="Realised Cap – CheckOnChain"
          />
          <CheckOnChainIframe
            src="https://charts.checkonchain.com/btconchain/realised/netrealisedpnl_usd/netrealisedpnl_usd_light.html"
            title="Net Realised Profit/Loss (USD) – CheckOnChain"
          />
          <CheckOnChainIframe
            src="https://charts.checkonchain.com/btconchain/realised/netrealisedpnl_btc/netrealisedpnl_btc_light.html"
            title="Net Realised Profit/Loss (BTC) – CheckOnChain"
          />
          <CheckOnChainIframe
            src="https://charts.checkonchain.com/btconchain/urpd/urpd/urpd_light.html"
            title="URPD – CheckOnChain"
          />
        </div>
      </section>

      {/* 5. ETFs & Smart-Money Flows */}
      <section id="etfs" className="scroll-mt-20">
        <SectionTitle>ETFs &amp; Smart-Money Flows</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CheckOnChainIframe
            src="https://charts.checkonchain.com/btconchain/etfs/etf_balance_0/etf_balance_0_light.html"
            title="ETF AUM Balances (BTC) – CheckOnChain"
          />
          <CheckOnChainIframe
            src="https://charts.checkonchain.com/btconchain/etfs/etf_flows_1_1w/etf_flows_1_1w_light.html"
            title="Weekly ETF Inflows / Outflows (USD) – CheckOnChain"
          />
          <CheckOnChainIframe
            src="https://charts.checkonchain.com/btconchain/etfs/aggregate_volume/aggregate_volume_light.html"
            title="Aggregate Market Volume (Spot / Futures / ETF / On-Chain) – CheckOnChain"
          />
        </div>
      </section>

      {/* 6. Miners & Liquidity */}
      <section id="miners" className="scroll-mt-20">
        <SectionTitle>Miners &amp; Liquidity</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CheckOnChainIframe
            src="https://charts.checkonchain.com/btconchain/mining/puellmultiple/puellmultiple_light.html"
            title="Puell Multiple – CheckOnChain"
          />
          <CheckOnChainIframe
            src="https://charts.checkonchain.com/btconchain/mining/hashribbons/hashribbons_light.html"
            title="Hashrate Ribbons – CheckOnChain"
          />
          <CheckOnChainIframe
            src="https://charts.checkonchain.com/btconchain/mining/hashprice/hashprice_light.html"
            title="Hashprice – CheckOnChain"
          />
          <CheckOnChainIframe
            src="https://charts.checkonchain.com/btconchain/stablecoins/stablecoin_dominance_supply_0/stablecoin_dominance_supply_0_light.html"
            title="Stablecoin Aggregate Supply – CheckOnChain"
          />
          <CheckOnChainIframe
            src="https://charts.checkonchain.com/btconchain/stablecoins/stablecoin_netposchange_30/stablecoin_netposchange_30_light.html"
            title="Stablecoin Net Position Change – CheckOnChain"
          />
          <CheckOnChainIframe
            src="https://charts.checkonchain.com/btconchain/stablecoins/stablecoins_ssr_oscillator/stablecoins_ssr_oscillator_light.html"
            title="Stablecoin Supply Ratio Oscillator – CheckOnChain"
          />
        </div>
      </section>
    </div>
  )
}
