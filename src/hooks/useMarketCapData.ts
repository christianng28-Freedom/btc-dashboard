import { useQuery } from '@tanstack/react-query'
import type { MarketCapData } from '@/app/api/market-cap/route'

async function fetchMarketCapData(): Promise<MarketCapData> {
  const res = await fetch('/api/market-cap')
  if (!res.ok) throw new Error('Failed to fetch market cap data')
  return res.json() as Promise<MarketCapData>
}

export function useMarketCapData() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['market-cap'],
    queryFn: fetchMarketCapData,
    staleTime: 300_000, // 5 minutes
    refetchInterval: 900_000, // 15 minutes
    retry: 2,
  })

  return { data, isLoading, isError }
}
