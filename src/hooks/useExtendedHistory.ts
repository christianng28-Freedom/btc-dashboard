import { useQuery } from '@tanstack/react-query'
import type { OHLCV } from '@/lib/types'

async function fetchExtendedHistory(): Promise<OHLCV[]> {
  const res = await fetch('/api/history-extended')
  if (!res.ok) throw new Error('Failed to fetch extended historical data')
  const data = (await res.json()) as { candles: OHLCV[] }
  return data.candles
}

export function useExtendedHistory() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['btc-history-extended'],
    queryFn: fetchExtendedHistory,
    staleTime: 3_600_000, // 1 hour
    retry: 2,
  })

  return {
    candles: data ?? [],
    isLoading,
    isError,
  }
}
