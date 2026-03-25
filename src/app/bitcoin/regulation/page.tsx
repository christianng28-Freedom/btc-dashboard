'use client'

import { ModuleHeader } from '@/components/layout/ModuleHeader'
import { RegulationTracker } from '@/components/adoption/RegulationTracker'
import { NationStateMap } from '@/components/adoption/NationStateMap'
import regulationEvents from '@/data/regulation-events.json'
import adoptionCountries from '@/data/nation-state-adoption.json'
import type { RegulationEvent } from '@/components/adoption/RegulationTracker'
import type { AdoptionCountry } from '@/components/adoption/NationStateMap'

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-widest text-[#666] mb-4 flex items-center gap-2">
      <span className="w-4 h-px bg-[#2a2a3e]" />
      {children}
      <span className="flex-1 h-px bg-[#1a1a2e]" />
    </h2>
  )
}

export default function RegulationPage() {
  const events = regulationEvents as RegulationEvent[]
  const countries = adoptionCountries as AdoptionCountry[]

  const bullishCount = events.filter((e) => e.sentiment === 'bullish').length
  const bearishCount = events.filter((e) => e.sentiment === 'bearish').length

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-10">
      <ModuleHeader
        title="Regulation & Adoption"
        description={`Global Bitcoin regulatory landscape and nation-state adoption tracker. ${bullishCount} bullish · ${bearishCount} bearish events tracked.`}
      />

      {/* Nation-State Adoption Map */}
      <section>
        <SectionTitle>Nation-State Adoption Map</SectionTitle>
        <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-5">
          <div className="text-xs uppercase tracking-widest text-[#666] font-mono mb-4">
            Country Classification by Regulatory Stance
          </div>
          <NationStateMap countries={countries} />
        </div>
      </section>

      {/* Regulation Timeline */}
      <section>
        <SectionTitle>Regulation Timeline</SectionTitle>
        <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-5">
          <div className="text-xs uppercase tracking-widest text-[#666] font-mono mb-4">
            Key Global Regulatory Events — Newest First
          </div>
          <RegulationTracker events={events} />
        </div>
      </section>
    </div>
  )
}
