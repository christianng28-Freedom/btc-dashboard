import { useQuery } from '@tanstack/react-query'
import type { LiquidityData } from '@/app/api/global/liquidity/route'

export function useLiquidityData() {
  return useQuery<LiquidityData>({
    queryKey: ['liquidity-data'],
    queryFn:  async () => {
      const res = await fetch('/api/global/liquidity')
      if (!res.ok) throw new Error('Failed to fetch liquidity data')
      return res.json() as Promise<LiquidityData>
    },
    staleTime: 60 * 60 * 1000,       // 1 hour
    gcTime:    2  * 60 * 60 * 1000,  // 2 hours
  })
}
