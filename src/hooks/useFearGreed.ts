'use client'
import { useQuery } from '@tanstack/react-query'
import type { FearGreedResponse, FearGreedEntry } from '@/lib/api/alternative-me'

async function fetchFearGreed(): Promise<FearGreedResponse> {
  const res = await fetch('/api/fear-greed')
  if (!res.ok) throw new Error(`Fear & Greed fetch failed: ${res.status}`)
  return res.json() as Promise<FearGreedResponse>
}

export interface FearGreedResult {
  current: FearGreedEntry | null
  sparkline: FearGreedEntry[]  // 30 days, oldest → newest
  isLoading: boolean
  isError: boolean
}

export function useFearGreed(): FearGreedResult {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['fear-greed'],
    queryFn: fetchFearGreed,
    staleTime: 3_600_000, // 1 hour
  })

  // API returns newest first; reverse for chronological sparkline
  const all = data?.data ?? []
  const current = all[0] ?? null
  const sparkline = all.slice(0, 30).reverse()

  return { current, sparkline, isLoading, isError }
}
