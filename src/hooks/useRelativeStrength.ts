import { useQuery } from '@tanstack/react-query'

export interface RatioPoint {
  date: string
  ratio: number
  btc: number
  asset: number
}

export interface RelativeStrengthData {
  gold: RatioPoint[]
  spx: RatioPoint[]
  dxy: RatioPoint[]
}

async function fetchRelativeStrength(): Promise<RelativeStrengthData> {
  const res = await fetch('/api/relative-strength')
  if (!res.ok) throw new Error('Failed to fetch relative strength data')
  return res.json() as Promise<RelativeStrengthData>
}

export function useRelativeStrength() {
  return useQuery({
    queryKey: ['relative-strength'],
    queryFn: fetchRelativeStrength,
    staleTime: 3_600_000,
    retry: 2,
  })
}
