import { useQuery } from '@tanstack/react-query'
import type { NuplDataPoint } from '@/app/api/nupl/route'

export function useNuplData() {
  return useQuery<NuplDataPoint[]>({
    queryKey: ['nupl'],
    queryFn: async () => {
      const res = await fetch('/api/nupl')
      if (!res.ok) throw new Error('Failed to fetch NUPL data')
      const json = await res.json()
      return json.data as NuplDataPoint[]
    },
    staleTime: 1000 * 60 * 60 * 6, // 6 hours
    retry: 2,
  })
}
