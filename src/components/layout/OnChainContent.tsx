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
  const [collapsed, setCollapsed] = useState(false)
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
      let current: string = SECTIONS[0].id
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

  const activeLabel = SECTIONS.find(s => s.id === activeId)?.label ?? ''

  return (
    <nav ref={navRef} className="sticky top-0 z-30 -mx-1 px-1 bg-[#0a0a1a]/90 backdrop-blur-md border-b border-[#1a1a2e] mb-4">
      {/* Collapsed strip */}
      {collapsed ? (
        <div className="flex items-center justify-between py-2 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f7931a] flex-shrink-0" />
            <span className="text-xs font-medium text-[#f7931a] truncate">{activeLabel}</span>
          </div>
          <button
            onClick={() => setCollapsed(false)}
            className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded text-[10px] text-[#555] hover:text-[#888] border border-[#1a1a2e] hover:border-[#333] transition-colors"
            title="Show sections"
          >
            <span>Sections</span>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      ) : (
        /* Expanded nav */
        <div className="py-2.5">
          <div className="flex items-start gap-2">
            <div className="flex flex-wrap gap-2 flex-1">
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
            <button
              onClick={() => setCollapsed(true)}
              className="flex-shrink-0 flex items-center gap-1 px-2 py-1.5 rounded text-[10px] text-[#555] hover:text-[#888] border border-[#1a1a2e] hover:border-[#333] transition-colors mt-0.5"
              title="Collapse nav"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
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

// Every charts.checkonchain.com URL is an ~800-byte GitHub Pages wrapper whose
// only content is a nested iframe of the real Plotly document on
// charts-cdn.checkonchain.com (identical path). Embedding the CDN document
// directly removes one full navigation (DNS + TLS + a Fastly round trip) from
// each chart's critical path. The CDN sends no X-Frame-Options or
// frame-ancestors restriction. The "checkonchain.com" link below each chart
// keeps the canonical wrapper URL. If CheckOnChain ever locks the CDN down,
// set EMBED_CDN_DIRECTLY to false to go back through the wrapper.
const EMBED_CDN_DIRECTLY = true
const WRAPPER_ORIGIN = 'https://charts.checkonchain.com/'
const CDN_ORIGIN = 'https://charts-cdn.checkonchain.com/'

function embedUrl(src: string): string {
  return EMBED_CDN_DIRECTLY ? src.replace(WRAPPER_ORIGIN, CDN_ORIGIN) : src
}

// ---------------------------------------------------------------------------
// Load scheduler
//
// Each chart is a 0.5–1.5 MB (compressed) Plotly document served with
// Cache-Control: no-cache, plus Plotly.js and a render that all run on the one
// renderer main thread Chrome gives the checkonchain.com site. With native
// loading="lazy" the browser kicked off ~10 of them at once, so the charts on
// screen shared bandwidth with charts below the fold and queued behind each
// other's Plotly work: the first chart appeared late and the rest arrived in
// a random order. This queue starts at most MAX_CONCURRENT iframes at a time,
// closest to the viewport first, and frees a slot when the iframe fires load
// or after SLOT_TIMEOUT_MS, so one stalled origin response (observed at 30 s+
// for some charts) cannot hold everything else up.
// ---------------------------------------------------------------------------
const MAX_CONCURRENT = 3
const SLOT_TIMEOUT_MS = 10_000
// Start queueing charts this far outside the viewport (IntersectionObserver
// rootMargin) so the next row is usually ready before it scrolls into view.
const QUEUE_AHEAD_MARGIN = '50% 0px'

const pendingLoads = new Map<HTMLElement, () => void>()
let activeLoads = 0

function distanceFromViewport(el: HTMLElement): number {
  const rect = el.getBoundingClientRect()
  if (rect.bottom < 0) return -rect.bottom
  if (rect.top > window.innerHeight) return rect.top - window.innerHeight
  return 0
}

function pumpLoadQueue() {
  while (activeLoads < MAX_CONCURRENT && pendingLoads.size > 0) {
    const [next] = [...pendingLoads.keys()]
      .map((el) => ({ el, distance: distanceFromViewport(el), top: el.getBoundingClientRect().top }))
      .sort((a, b) => a.distance - b.distance || a.top - b.top)
    const start = pendingLoads.get(next.el)
    pendingLoads.delete(next.el)
    if (!start) continue
    activeLoads++
    start()
  }
}

function requestLoadSlot(el: HTMLElement, start: () => void) {
  pendingLoads.set(el, start)
  pumpLoadQueue()
}

function cancelLoadRequest(el: HTMLElement) {
  pendingLoads.delete(el)
}

function releaseLoadSlot() {
  activeLoads = Math.max(0, activeLoads - 1)
  pumpLoadQueue()
}

type LoadPhase = 'queued' | 'loading' | 'loaded'

function CheckOnChainIframe({ src, title }: { src: string; title: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [phase, setPhase] = useState<LoadPhase>('queued')
  const [attempt, setAttempt] = useState(0)
  const [slow, setSlow] = useState(false)
  const holdsSlot = useRef(false)

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

  const releaseSlot = useCallback(() => {
    if (!holdsSlot.current) return
    holdsSlot.current = false
    releaseLoadSlot()
  }, [])

  // Wait for a load slot while near the viewport. Withdraw when scrolled away
  // or hidden (a display:none panel reports no intersection) so the charts
  // actually on screen always go first.
  useEffect(() => {
    if (phase !== 'queued') return
    const el = wrapperRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1]
        if (!entry) return
        if (entry.isIntersecting) {
          requestLoadSlot(el, () => {
            holdsSlot.current = true
            setPhase('loading')
          })
        } else {
          cancelLoadRequest(el)
        }
      },
      { rootMargin: QUEUE_AHEAD_MARGIN },
    )
    observer.observe(el)
    return () => {
      observer.disconnect()
      cancelLoadRequest(el)
    }
  }, [phase])

  // Free the slot after a timeout so a stalled origin can't block the queue.
  // The frame keeps loading in the background; the user can also retry.
  useEffect(() => {
    if (phase !== 'loading') return
    const timer = setTimeout(() => {
      releaseSlot()
      setSlow(true)
    }, SLOT_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [phase, releaseSlot])

  // Never leave a slot held by an unmounted frame.
  useEffect(() => releaseSlot, [releaseSlot])

  const handleLoad = useCallback(() => {
    setPhase('loaded')
    setSlow(false)
    releaseSlot()
  }, [releaseSlot])

  const retry = useCallback(() => {
    releaseSlot()
    setSlow(false)
    setAttempt((n) => n + 1)
    setPhase('queued')
  }, [releaseSlot])

  // Derive a short label from the title (strip " – CheckOnChain" suffix)
  const label = title.replace(/\s*[–—-]\s*CheckOnChain$/i, '')
  const loaded = phase === 'loaded'

  return (
    <div className="flex flex-col gap-1">
      <div
        ref={wrapperRef}
        className="relative w-full rounded-lg overflow-hidden border border-[#1a1a2e]"
        style={{
          height: Math.round(NATIVE_H * scale),
          // The Plotly documents have no background of their own, so the
          // wrapper supplies the white paper once the chart is in; it stays
          // dark under the placeholder so nothing flashes white while loading.
          background: loaded ? '#ffffff' : '#0d0d14',
          transition: 'background-color 400ms ease-out',
        }}
      >
        {phase !== 'queued' && (
          <iframe
            key={attempt}
            src={embedUrl(src)}
            title={title}
            onLoad={handleLoad}
            scrolling="no"
            style={{
              width: NATIVE_W,
              height: NATIVE_H,
              border: 'none',
              display: 'block',
              colorScheme: 'light',
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              opacity: loaded ? 1 : 0,
              transition: 'opacity 400ms ease-out',
            }}
          />
        )}
        {!loaded && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <span
              className={`w-6 h-6 rounded-full border-2 border-[#1f2937] ${
                phase === 'loading' ? 'border-t-[#f7931a] animate-spin' : 'opacity-60'
              }`}
            />
            <div>
              <div className="text-[12px] font-medium text-[#8b8b9e]">{label}</div>
              <div className="mt-1 text-[10px] font-mono uppercase tracking-wider text-[#444455]">
                {phase === 'queued' ? 'Queued' : slow ? 'Slow response from CheckOnChain' : 'Loading chart'}
              </div>
            </div>
            {slow && (
              <button
                type="button"
                onClick={retry}
                className="px-3 py-1 rounded-md text-[10px] font-medium text-[#888] border border-[#2a2a3e] hover:text-white hover:border-[#444] transition-colors"
              >
                Retry
              </button>
            )}
          </div>
        )}
      </div>
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="self-end text-[10px] text-[#444] hover:text-[#888] transition-colors leading-none"
        title={`Open ${label} on CheckOnChain`}
      >
        checkonchain.com ↗
      </a>
    </div>
  )
}

export function OnChainContent() {
  return (
    <div className="space-y-10">
      <div className="-mb-6">
        <ModuleHeader
          title="On-Chain Analysis"
          description="Bitcoin on-chain metrics and network fundamentals."
        />
      </div>

      <SectionNav />

      {/* 1. Pricing Models & Cycle-Phase Signals */}
      <section id="pricing-models" className="scroll-mt-20">
        <SectionTitle>Pricing Models &amp; Cycle-Phase Signals</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CheckOnChainIframe
            src="https://charts.checkonchain.com/btconchain/pricing/pricing_mvrv_bands/pricing_mvrv_bands_light.html"
            title="MVRV Pricing Bands – CheckOnChain"
          />
          <CheckOnChainIframe
            src="https://charts.checkonchain.com/btconchain/unrealised/nupl_bycohort/nupl_bycohort_light.html"
            title="NUPL by Cohort – CheckOnChain"
          />
          <CheckOnChainIframe
            src="https://charts.checkonchain.com/btconchain/pricing/ism_pmi_bitcoin/ism_pmi_bitcoin_light.html"
            title="Log-Regression vs ISM PMIs – CheckOnChain"
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
