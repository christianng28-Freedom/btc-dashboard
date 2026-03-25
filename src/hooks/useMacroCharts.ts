'use client'
import { useQuery } from '@tanstack/react-query'
import type { MacroChartsData } from '@/app/api/macro-charts/route'

async function fetchMacroCharts(): Promise<MacroChartsData> {
  const res = await fetch('/api/macro-charts')
  if (!res.ok) throw new Error(`Macro charts fetch failed: ${res.status}`)
  return res.json() as Promise<MacroChartsData>
}

export function useMacroCharts() {
  return useQuery({
    queryKey: ['macro-charts'],
    queryFn: fetchMacroCharts,
    staleTime: 21_600_000, // 6 hours
    retry: 2,
  })
}
