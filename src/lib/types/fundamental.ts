export interface OIDataPoint {
  timestamp: number
  oi: number       // sumOpenInterest (in BTC)
  oiValue: number  // sumOpenInterestValue (in USD)
}

export interface FundamentalData {
  oiHistory: OIDataPoint[]         // last 100 days of daily OI
  currentOI: number                // current OI in USD
  oi90dMA: number                  // 90-day MA of OI in USD
  oiDeviationPct: number           // (current - 90dMA) / 90dMA * 100
  currentFundingRate: number       // e.g. 0.0001 = 0.01%
  nextFundingTime: number          // ms timestamp
  annualisedFundingRate: number    // currentFundingRate * 3 * 365 * 100 (%)
  lastUpdated: string
}
