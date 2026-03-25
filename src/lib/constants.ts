export const HALVING_DATES = [
  { block: 210000, date: '2012-11-28', reward: 25 },
  { block: 420000, date: '2016-07-09', reward: 12.5 },
  { block: 630000, date: '2020-05-11', reward: 6.25 },
  { block: 840000, date: '2024-04-20', reward: 3.125 },
  { block: 1050000, date: '2028-04-xx', reward: 1.5625 }, // estimated
]

export const BLOCKS_PER_HALVING = 210000
export const APPROX_BLOCK_TIME_MINUTES = 10

export const COLOR_TOKENS = {
  bgPrimary: '#0a0a0f',
  bgPanel: '#0d0d14',
  bgCard: '#111120',
  bgCardHover: '#161630',
  borderDefault: '#1a1a2e',
  borderActive: '#3b82f6',
  textPrimary: '#e0e0e0',
  textSecondary: '#999999',
  textMuted: '#666666',
  accentBlue: '#3b82f6',
  accentGreen: '#22c55e',
  accentRed: '#ef4444',
  accentAmber: '#f59e0b',
  accentPurple: '#8b5cf6',
}

export const SCORE_LABELS: Record<string, string> = {
  strongBuy: 'Strong Buy',
  buy: 'Buy',
  neutral: 'Neutral',
  sell: 'Sell',
  strongSell: 'Strong Sell',
}

// Score ranges: 0-20 Strong Sell, 21-40 Sell, 41-60 Neutral, 61-80 Buy, 81-100 Strong Buy
export const SCORE_RANGES = [
  { min: 81, max: 100, label: 'Strong Buy', color: '#22c55e' },
  { min: 61, max: 80, label: 'Buy', color: '#86efac' },
  { min: 41, max: 60, label: 'Neutral', color: '#f59e0b' },
  { min: 21, max: 40, label: 'Sell', color: '#f87171' },
  { min: 0, max: 20, label: 'Strong Sell', color: '#ef4444' },
]

// lastUpdated: 2026-Q1
export const ASSET_CLASS_VALUES = [
  { name: 'Global Derivatives', value: 715_000_000_000_000, source: 'BIS' },
  { name: 'Global Real Estate', value: 330_000_000_000_000, source: 'Savills' },
  { name: 'Global Debt (Bonds)', value: 133_000_000_000_000, source: 'BIS' },
  { name: 'Global Equities', value: 115_000_000_000_000, source: 'WFE' },
  { name: 'Global M2 Money Supply', value: 105_000_000_000_000, source: 'Trading Economics' },
  { name: 'All Commodities', value: 6_000_000_000_000, source: 'Bloomberg' },
  { name: 'Gold', value: 29_700_000_000_000, source: 'World Gold Council' },
  { name: 'Art & Collectibles', value: 2_200_000_000_000, source: 'Art Basel' },
  { name: 'Silver', value: 1_400_000_000_000, source: 'Silver Institute' },
]

// lastUpdated: 2026-03-23 (static, update quarterly)
export const COMPANY_COMPARISONS = [
  { name: 'Apple', ticker: 'AAPL', mcap: 3_770_000_000_000 },
  { name: 'Microsoft', ticker: 'MSFT', mcap: 3_010_000_000_000 },
  { name: 'Nvidia', ticker: 'NVDA', mcap: 4_335_000_000_000 },
  { name: 'Amazon', ticker: 'AMZN', mcap: 2_250_000_000_000 },
  { name: 'Alphabet', ticker: 'GOOGL', mcap: 3_650_000_000_000 },
  { name: 'Saudi Aramco', ticker: '2222.SR', mcap: 1_601_000_000_000 },
  { name: 'Meta', ticker: 'META', mcap: 1_618_000_000_000 },
  { name: 'Berkshire Hathaway', ticker: 'BRK.B', mcap: 1_056_000_000_000 },
]

export const TIMEFRAMES = ['1h', '4h', '1d', '1w'] as const

// Confirmed historical Pi Cycle Top crossover dates (111DMA crossed above 350DMAx2)
export const PI_CYCLE_TOP_DATES: string[] = [
  '2013-11-30', // Cycle 1 top (~$1,150)
  '2017-12-17', // Cycle 2 top (~$19,700)
  '2021-04-12', // Cycle 3 top (~$63,000 — first crossover before the Nov ATH)
]
