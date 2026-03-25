import { useQuery } from '@tanstack/react-query'
import type { CommoditiesData } from '@/app/api/global/commodities/route'

export function useCommoditiesData() {
  return useQuery<CommoditiesData>({
    queryKey: ['commodities-data'],
    queryFn: async () => {
      const res = await fetch('/api/global/commodities')
      if (!res.ok) throw new Error('Failed to fetch commodities data')
      return res.json() as Promise<CommoditiesData>
    },
    staleTime: 60 * 60 * 1000,      // 1 hour
    gcTime:    2  * 60 * 60 * 1000, // 2 hours
  })
}
