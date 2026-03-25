'use client'
import { useQuery } from '@tanstack/react-query'
import type { OHLCV, TimeInterval } from '@/lib/types'

interface ApiCandlesResponse {
  candles: OHLCV[]
}

async function fetchCandles(
  interval: TimeInterval,
  limit: number
): Promise<ApiCandlesResponse> {
  const res = await fetch(`/api/candles?interval=${interval}&limit=${limit}`)
  if (!res.ok) throw new Error(`Candles fetch failed: ${res.status}`)
  return res.json() as Promise<ApiCandlesResponse>
}

/**
 * Fetches /api/candles for the given timeframe and limit.
 */
export function useCandles(
  timeframe: TimeInterval = '1d',
  limit = 500
): { candles: OHLCV[]; isLoading: boolean; isError: boolean } {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['candles', timeframe, limit],
    queryFn: () => fetchCandles(timeframe, limit),
    staleTime: 60_000,
  })

  return {
    candles: data?.candles ?? [],
    isLoading,
    isError,
  }
}
