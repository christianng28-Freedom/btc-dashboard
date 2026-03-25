const BASE_URL = 'https://mempool.space'

export interface MempoolFees {
  fastestFee: number
  halfHourFee: number
  hourFee: number
  economyFee: number
  minimumFee: number
}

export interface MempoolInfo {
  count: number
  vsize: number
  total_fee: number
  fee_histogram: [number, number][]
}

/**
 * Fetch the current Bitcoin block height.
 */
export async function fetchBlockHeight(): Promise<number> {
  const res = await fetch(`${BASE_URL}/api/blocks/tip/height`)
  if (!res.ok) throw new Error(`Mempool block height error: ${res.status}`)
  const text = await res.text()
  return parseInt(text, 10)
}

/**
 * Fetch recommended fee rates (sat/vB).
 */
export async function fetchFees(): Promise<MempoolFees> {
  const res = await fetch(`${BASE_URL}/api/v1/fees/recommended`)
  if (!res.ok) throw new Error(`Mempool fees error: ${res.status}`)
  return res.json() as Promise<MempoolFees>
}

/**
 * Fetch current mempool info.
 */
export async function fetchMempoolInfo(): Promise<MempoolInfo> {
  const res = await fetch(`${BASE_URL}/api/mempool`)
  if (!res.ok) throw new Error(`Mempool info error: ${res.status}`)
  return res.json() as Promise<MempoolInfo>
}
