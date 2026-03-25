import { useQuery } from '@tanstack/react-query'
import type { OHLCV } from '@/lib/types'

async function fetchHistory(): Promise<OHLCV[]> {
  const res = await fetch('/api/history')
  if (!res.ok) throw new Error('Failed to fetch historical data')
  const data = (await res.json()) as { candles: OHLCV[] }
  return data.candles
}

export function useHistoricalData() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['btc-history'],
    queryFn: fetchHistory,
    staleTime: 3_600_000, // 1 hour
    retry: 2,
  })

  return {
    candles: data ?? [],
    isLoading,
    isError,
  }
}
