import { useQuery } from '@tanstack/react-query'
import type { EquitiesData } from '@/app/api/global/equities/route'

export function useEquitiesData() {
  return useQuery<EquitiesData>({
    queryKey: ['equities-data'],
    queryFn: async () => {
      const res = await fetch('/api/global/equities')
      if (!res.ok) throw new Error('Failed to fetch equities data')
      return res.json() as Promise<EquitiesData>
    },
    staleTime: 60 * 60 * 1000,      // 1 hour
    gcTime:    2  * 60 * 60 * 1000, // 2 hours
  })
}