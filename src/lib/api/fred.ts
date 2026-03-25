const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations'

export interface FREDObservation {
  date: string
  value: number
}

function getKey(): string {
  const key = process.env.FRED_API_KEY
  if (!key) throw new Error('FRED_API_KEY env var not set')
  return key
}

/**
 * Fetch all observations for a FRED series starting from a given date.
 * Returns a Map<date, value> for easy date-keyed lookups.
 */
export async function fetchFREDSeries(
  seriesId: string,
  startDate: string,
  revalidate = 3600,
): Promise<Map<string, number>> {
  const key = getKey()
  const url =
    `${FRED_BASE}?series_id=${seriesId}&api_key=${key}&file_type=json` +
    `&sort_order=asc&observation_start=${startDate}`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`FRED ${seriesId}: ${res.status} ${body.slice(0, 200)}`)
  }
  const json = (await res.json()) as { observations: { date: string; value: string }[] }
  const map = new Map<string, number>()
  for (const obs of json.observations) {
    if (obs.value !== '.') map.set(obs.date, parseFloat(obs.value))
  }
  return map
}

/**
 * Fetch the most recent N observations for a FRED series (descending order).
 * Returns an array sorted newest-first.
 */
export async function fetchFREDLatest(
  seriesId: string,
  limit: number,
  revalidate = 21600,
): Promise<FREDObservation[]> {
  const key = getKey()
  const url =
    `${FRED_BASE}?series_id=${seriesId}&api_key=${key}&file_type=json` +
    `&sort_order=desc&limit=${limit}`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`FRED ${seriesId}: ${res.status} ${body.slice(0, 200)}`)
  }
  const json = (await res.json()) as { observations: { date: string; value: string }[] }
  return json.observations
    .filter((o) => o.value !== '.')
    .map((o) => ({ date: o.date, value: parseFloat(o.value) }))
}

/**
 * Fetch multiple FRED series in parallel, all starting from the same date.
 * Returns a Record<seriesId, Map<date, value>>.
 */
export async function fetchMultipleFREDSeries(
  seriesIds: string[],
  startDate: string,
  revalidate = 3600,
): Promise<Record<string, Map<string, number>>> {
  const results = await Promise.all(
    seriesIds.map((id) => fetchFREDSeries(id, startDate, revalidate)),
  )
  return Object.fromEntries(seriesIds.map((id, i) => [id, results[i]]))
}
