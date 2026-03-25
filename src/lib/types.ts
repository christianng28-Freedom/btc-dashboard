export interface OHLCV {
  time: number // Unix timestamp seconds
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface PriceData {
  price: number
  change: number
  changePercent: number
  high24h: number
  low24h: number
  volume24h: number
  timestamp: number
}

export interface CandleData {
  candles: OHLCV[]
  interval: TimeInterval
}

export type TimeInterval = '1h' | '4h' | '1d' | '1w'

export type ConnectionStatus = 'connecting' | 'live' | 'disconnected'

export type ScoreLabel = 'Strong Buy' | 'Buy' | 'Neutral' | 'Sell' | 'Strong Sell'

export interface CompositeScore {
  value: number // 0-100
  label: ScoreLabel
  components: {
    onChain?: number
    technical?: number
    fundamental?: number
  }
}

export interface OnChainMetrics {
  hashRate?: number
  difficulty?: number
  activeAddresses?: number
  blockHeight?: number
  mempoolSize?: number
  avgFeeRate?: number
}

export interface FearGreedData {
  value: number
  classification: string
  timestamp: number
  history: Array<{ value: number; timestamp: number }>
}

export interface TechnicalIndicators {
  rsi14?: number
  macdLine?: number
  macdSignal?: number
  macdHistogram?: number
  bb_upper?: number
  bb_middle?: number
  bb_lower?: number
  bb_bandwidth?: number
  stochRsi_k?: number
  stochRsi_d?: number
  ema21?: number
  ema55?: number
  ema200?: number
  sma50?: number
  sma200?: number
  goldenCross?: boolean
  deathCross?: boolean
}

export interface AlertRule {
  id: string
  label: string
  priority: 'high' | 'medium' | 'low'
  condition: boolean
  message: string
}

// ─── Global Macro / Shared Types ──────────────────────────────────────────────

/** A named time-series fetched from FRED */
export interface FREDTimeSeries {
  seriesId: string
  title?: string
  observations: { date: string; value: number }[]
}

/** Cross-sectional yield curve snapshot at a point in time */
export interface YieldCurveSnapshot {
  date: string
  m1: number | null   // DGS1MO
  m3: number | null   // DGS3MO
  m6: number | null   // DGS6MO
  y1: number | null   // DGS1
  y2: number | null   // DGS2
  y3: number | null   // DGS3
  y5: number | null   // DGS5
  y7: number | null   // DGS7
  y10: number | null  // DGS10
  y20: number | null  // DGS20
  y30: number | null  // DGS30
  spread10y2y: number | null  // 10Y − 2Y
  spread10y3m: number | null  // 10Y − 3M
}

/** A single global equity index with performance across timeframes */
export interface GlobalEquityIndex {
  symbol: string
  name: string
  price: number
  change1d: number
  change1w: number
  change1m: number
  change3m: number
  changeYtd: number
  change1y: number
  history: { date: string; value: number }[]
  lastUpdated: string
}

/** A commodity spot or futures price */
export interface CommodityPrice {
  symbol: string
  name: string
  unit: string        // e.g. "USD/troy oz", "USD/bbl"
  price: number
  change1d: number
  change1m: number
  change1y: number
  history: { date: string; value: number }[]
  lastUpdated: string
}

/** A forex pair with rate and performance history */
export interface ForexPair {
  pair: string        // e.g. "EURUSD"
  base: string        // e.g. "EUR"
  quote: string       // e.g. "USD"
  rate: number
  change1d: number
  change1m: number
  change1y: number
  history: { date: string; value: number }[]
  lastUpdated: string
}

/** US Net Liquidity = Fed Balance Sheet − TGA − RRP */
export interface NetLiquidity {
  date: string
  fedBalance: number    // WALCL (billions USD)
  tga: number           // WTREGEN (billions USD)
  rrp: number           // RRPONTSYD (billions USD)
  netLiquidity: number  // fedBalance − tga − rrp
}

/** Macro risk regime classification */
export type RiskRegime = 'risk-on' | 'neutral' | 'risk-off'
