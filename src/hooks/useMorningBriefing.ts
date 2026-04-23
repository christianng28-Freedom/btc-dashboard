'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { BriefingResponse } from '@/app/api/briefing/route'

async function fetchBriefing(force = false): Promise<BriefingResponse> {
  const url = force ? '/api/briefing?force=1' : '/api/briefing'
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Briefing fetch failed: ${res.status}`)
  return res.json() as Promise<BriefingResponse>
}

export function useMorningBriefing() {
  const queryClient = useQueryClient()
  const query = useQuery<BriefingResponse>({
    queryKey: ['morning-briefing'],
    queryFn: () => fetchBriefing(false),
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  })

  async function forceRegenerate(): Promise<BriefingResponse> {
    const fresh = await fetchBriefing(true)
    queryClient.setQueryData(['morning-briefing'], fresh)
    return fresh
  }

  return { ...query, forceRegenerate }
}
