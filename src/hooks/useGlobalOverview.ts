'use client'

import { useQuery } from '@tanstack/react-query'
import type { GlobalOverviewData } from '@/app/api/global/overview/route'

export function useGlobalOverview() {
  return useQuery<GlobalOverviewData>({
    queryKey: ['global-overview'],
    queryFn: async () => {
      const res = await fetch('/api/global/overview')
      if (!res.ok) throw new Error(`Global overview fetch failed: ${res.status}`)
      return res.json() as Promise<GlobalOverviewData>
    },
    staleTime: 30 * 60 * 1000,      // 30 minutes — matches server cache
    refetchOnWindowFocus: false,
    retry: 2,
  })
}
