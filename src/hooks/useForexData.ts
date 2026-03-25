import { useQuery } from '@tanstack/react-query'
import type { ForexData } from '@/app/api/global/forex/route'

export function useForexData() {
  return useQuery<ForexData>({
    queryKey: ['forex-data'],
    queryFn: async () => {
      const res = await fetch('/api/global/forex')
      if (!res.ok) throw new Error('Failed to fetch forex data')
      return res.json() as Promise<ForexData>
    },
    staleTime: 60 * 60 * 1000,      // 1 hour
    gcTime:    2  * 60 * 60 * 1000, // 2 hours
  })
}
