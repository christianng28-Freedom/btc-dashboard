const BASE_URL = 'https://api.alternative.me'

export interface FearGreedEntry {
  value: string
  value_classification: string
  timestamp: string
  time_until_update?: string
}

export interface FearGreedResponse {
  name: string
  data: FearGreedEntry[]
  metadata: { error: string | null }
}

/**
 * Fetch Fear & Greed Index data.
 * @param limit - Number of days to fetch (default 30)
 */
export async function fetchFearGreed(limit = 30): Promise<FearGreedResponse> {
  const res = await fetch(`${BASE_URL}/fng/?limit=${limit}`, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`Alternative.me fear & greed error: ${res.status}`)
  return res.json() as Promise<FearGreedResponse>
}
