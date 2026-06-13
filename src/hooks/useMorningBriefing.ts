'use client'

import { useQuery } from '@tanstack/react-query'
import type { BriefingResponse } from '@/app/api/briefing/route'

async function fetchBriefing(): Promise<BriefingResponse> {
  const res = await fetch('/api/briefing')
  if (!res.ok) throw new Error(`Briefing fetch failed: ${res.status}`)
  return res.json() as Promise<BriefingResponse>
}

export function useMorningBriefing() {
  return useQuery<BriefingResponse>({
    queryKey: ['morning-briefing'],
    queryFn: fetchBriefing,
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
