import { useQuery } from '@tanstack/react-query'

export interface DominanceData {
  dominance: number
  totalMarketCap: number
}

async function fetchDominance(): Promise<DominanceData> {
  const res = await fetch('/api/dominance')
  if (!res.ok) throw new Error('Failed to fetch dominance data')
  return res.json() as Promise<DominanceData>
}

export function useDominance() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dominance'],
    queryFn: fetchDominance,
    staleTime: 300_000,
    retry: 2,
  })

  return { data, isLoading, isError }
}
