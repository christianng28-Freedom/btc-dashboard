import { useQuery } from '@tanstack/react-query'
import type { EconomicData } from '@/app/api/global/economic/route'

export function useEconomicData() {
  return useQuery<EconomicData>({
    queryKey: ['economic-data'],
    queryFn: async () => {
      const res = await fetch('/api/global/economic')
      if (!res.ok) throw new Error('Failed to fetch economic data')
      return res.json() as Promise<EconomicData>
    },
    staleTime: 6 * 60 * 60 * 1000,  // 6 hours
    gcTime:    12 * 60 * 60 * 1000, // 12 hours
  })
}
