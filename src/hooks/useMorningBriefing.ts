'use client'

import { useQuery } from '@tanstack/react-query'
import type { BriefingResponse } from '@/app/api/briefing/route'

export function useMorningBriefing() {
  return useQuery<BriefingResponse>({
    queryKey: ['morning-briefing'],
    queryFn: async () => {
      const res = await fetch('/api/briefing')
      if (!res.ok) throw new Error(`Briefing fetch failed: ${res.status}`)
      return res.json() as Promise<BriefingResponse>
    },
    staleTime: 60 * 60 * 1000,    // 1 hour — server enforces HKT-day cache
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
