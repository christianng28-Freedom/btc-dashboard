'use client'
import { useQuery } from '@tanstack/react-query'
import { useWebSocket } from './useWebSocket'
import type { PriceData } from '@/lib/types'

interface ApiPriceResponse {
  price: number
  change: number
  changePercent: number
  high: number
  low: number
  volume: number
}

async function fetchPrice(): Promise<ApiPriceResponse> {
  const res = await fetch('/api/price')
  if (!res.ok) throw new Error(`Price fetch failed: ${res.status}`)
  return res.json() as Promise<ApiPriceResponse>
}

/**
 * Fetches /api/price every 60s via TanStack Query.
 * Merges WebSocket live price updates on top of the REST data.
 */
export function usePrice(): PriceData & { isLoading: boolean; isError: boolean } {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['price'],
    queryFn: fetchPrice,
    refetchInterval: 60_000,
  })

  const { lastPrice, priceChange, priceChangePercent } = useWebSocket()

  return {
    price: lastPrice ?? data?.price ?? 0,
    change: priceChange ?? data?.change ?? 0,
    changePercent: priceChangePercent ?? data?.changePercent ?? 0,
    high24h: data?.high ?? 0,
    low24h: data?.low ?? 0,
    volume24h: data?.volume ?? 0,
    timestamp: Date.now(),
    isLoading,
    isError,
  }
}
