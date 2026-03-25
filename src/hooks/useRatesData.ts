import { useQuery } from '@tanstack/react-query'
import type { RatesData } from '@/app/api/global/rates/route'

export function useRatesData() {
  return useQuery<RatesData>({
    queryKey: ['rates-data'],
    queryFn: async () => {
      const res = await fetch('/api/global/rates')
      if (!res.ok) throw new Error('Failed to fetch rates data')
      return res.json() as Promise<RatesData>
    },
    staleTime: 6 * 60 * 60 * 1000,  // 6 hours
    gcTime:    12 * 60 * 60 * 1000, // 12 hours
  })
}
