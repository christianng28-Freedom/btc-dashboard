const BASE_URL = 'https://blockchain.info'

export interface AddressCountChart {
  values: Array<{ x: number; y: number }>
}

/**
 * Fetch current Bitcoin network hash rate (GH/s from blockchain.info).
 */
export async function fetchHashRate(): Promise<number> {
  const res = await fetch(`${BASE_URL}/q/hashrate`)
  if (!res.ok) throw new Error(`Blockchain.info hashrate error: ${res.status}`)
  const text = await res.text()
  return parseFloat(text)
}

/**
 * Fetch current Bitcoin mining difficulty.
 */
export async function fetchDifficulty(): Promise<number> {
  const res = await fetch(`${BASE_URL}/q/getdifficulty`)
  if (!res.ok) throw new Error(`Blockchain.info difficulty error: ${res.status}`)
  const text = await res.text()
  return parseFloat(text)
}

/**
 * Fetch unique address count chart data.
 */
export async function fetchAddressCount(): Promise<AddressCountChart> {
  const res = await fetch(`${BASE_URL}/charts/n-unique-addresses?format=json`)
  if (!res.ok) throw new Error(`Blockchain.info address count error: ${res.status}`)
  return res.json() as Promise<AddressCountChart>
}
