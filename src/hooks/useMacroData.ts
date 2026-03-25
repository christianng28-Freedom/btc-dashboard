'use client'
import { useQuery } from '@tanstack/react-query'
import type { MacroData } from '@/app/api/macro/route'

async function fetchMacro(): Promise<MacroData> {
  const res = await fetch('/api/macro')
  if (!res.ok) throw new Error(`Macro fetch failed: ${res.status}`)
  return res.json() as Promise<MacroData>
}

export function useMacroData() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['macro'],
    queryFn: fetchMacro,
    staleTime: 21_600_000, // 6 hours
    refetchInterval: 21_600_000,
  })
  return { data: data ?? null, isLoading, isError }
}
