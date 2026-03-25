'use client'
import { useQuery } from '@tanstack/react-query'
import type { FundamentalData } from '@/app/api/fundamental/route'

async function fetchFundamental(): Promise<FundamentalData> {
  const res = await fetch('/api/fundamental')
  if (!res.ok) throw new Error(`Fundamental fetch failed: ${res.status}`)
  return res.json() as Promise<FundamentalData>
}

export interface FundamentalDataResult {
  data: FundamentalData | null
  isLoading: boolean
  isError: boolean
}

export function useFundamentalData(): FundamentalDataResult {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['fundamental'],
    queryFn: fetchFundamental,
    staleTime: 300_000, // 5 minutes
    refetchInterval: 300_000,
  })

  return { data: data ?? null, isLoading, isError }
}
