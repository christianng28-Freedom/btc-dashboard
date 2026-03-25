'use client'
import { useQuery } from '@tanstack/react-query'
import type { IndicesData } from '@/app/api/indices/route'

async function fetchIndices(): Promise<IndicesData> {
  const res = await fetch('/api/indices')
  if (!res.ok) throw new Error(`Indices fetch failed: ${res.status}`)
  return res.json() as Promise<IndicesData>
}

export function useIndices() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['indices'],
    queryFn: fetchIndices,
    staleTime: 180_000,
    refetchInterval: 180_000,
  })
  return { data: data ?? null, isLoading, isError }
}
