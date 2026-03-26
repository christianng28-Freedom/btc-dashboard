import type { DataPoint } from '@/app/api/global/economic/route'
import { fetchFREDSeries } from './fred'

/**
 * Implement this interface to swap PMI data sources without touching UI code.
 *
 * Scale note:
 *   FRED/OECD series use a 0-centered scale (>0 = expanding, <0 = contracting).
 *   ISM / S&P Global PMI use a 50-centered scale (>50 = expanding, <50 = contracting).
 *   Match `neutralThreshold` and chart referenceLines to whichever scale you use.
 */
export interface PMIProvider {
  fetchUSManufacturing(startDate: string): Promise<DataPoint[]>
  fetchUSServices(startDate: string): Promise<DataPoint[]>
  fetchGlobalComposite(startDate: string): Promise<DataPoint[]>
  /** The expansion/contraction threshold — 0 for OECD, 50 for ISM/S&P Global */
  readonly neutralThreshold: number
}

function fredMapToPoints(map: Map<string, number>): DataPoint[] {
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }))
}

/**
 * Free OECD implementation via FRED — no extra API key required beyond FRED_API_KEY.
 * Uses OECD Business Tendency Survey series (0-centered scale).
 */
export const fredPMIProvider: PMIProvider = {
  neutralThreshold: 0,

  async fetchUSManufacturing(startDate) {
    return fredMapToPoints(await fetchFREDSeries('BSCICP02USM460S', startDate, 21600))
  },

  async fetchUSServices(startDate) {
    return fredMapToPoints(await fetchFREDSeries('BSCICP03USM460S', startDate, 21600))
  },

  async fetchGlobalComposite(startDate) {
    return fredMapToPoints(await fetchFREDSeries('BSCICP02OTQ460S', startDate, 21600))
  },
}

/*
  To upgrade to real ISM / S&P Global PMI (50-threshold):

  Option A — Trading Economics (free tier: 1-month-lagged data):
    1. Sign up at tradingeconomics.com, get an API key.
    2. Set TRADING_ECONOMICS_API_KEY in .env.local.
    3. Implement TradingEconomicsPMIProvider below with neutralThreshold = 50.
    4. Swap `fredPMIProvider` for your new provider in route.ts.
    5. Update chart referenceLines from { y: 0 } to { y: 50 }.

  Option B — ISM direct / Bloomberg / Refinitiv:
    Requires paid subscription; implement similarly.

  Example stub for Trading Economics:

  export const tradingEconomicsPMIProvider: PMIProvider = {
    neutralThreshold: 50,
    async fetchUSManufacturing(startDate) {
      const res = await fetch(
        `https://api.tradingeconomics.com/indicators/ISM Manufacturing PMI?c=${process.env.TRADING_ECONOMICS_API_KEY}&f=json&d1=${startDate}`,
        { next: { revalidate: 21600 } }
      )
      const json = await res.json()
      return json.map((r: { DateTime: string; Value: number }) => ({
        date: r.DateTime.slice(0, 10),
        value: r.Value,
      }))
    },
    // ... fetchUSServices, fetchGlobalComposite similarly
  }
*/
