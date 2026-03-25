import { useQuery } from '@tanstack/react-query'

export interface HalvingData {
  blockHeight: number
  blocksRemaining: number
  estimatedNextHalvingDate: string
  epochProgressPct: number
  daysSinceLastHalving: number
  daysToNextHalving: number
}

async function fetchHalving(): Promise<HalvingData> {
  const res = await fetch('/api/halving')
  if (!res.ok) throw new Error('Failed to fetch halving data')
  return res.json() as Promise<HalvingData>
}

export function useHalving() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['halving'],
    queryFn: fetchHalving,
    staleTime: 300_000, // 5 min
    retry: 2,
  })

  return { data, isLoading, isError }
}
