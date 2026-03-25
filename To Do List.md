# Investment Command Centre — To Do List

> Track progress across all stages. Check off tasks as completed.

---

## Phase 1: Bitcoin Outlook (SHIPPED)

### Stage 1: Foundation (Week 1)

#### Project Scaffold
- [x] Scaffold Next.js 14+ project with TypeScript + App Router
- [x] Install core dependencies: `lightweight-charts@4.1.3`, `recharts`, `@tanstack/react-query@5`
- [x] Configure `tsconfig.json` with strict mode
- [x] Configure Tailwind CSS dark theme with colour tokens from PRD (bg-primary `#0a0a0f`, bg-panel `#0d0d14`, etc.)
- [x] Set up Inter + JetBrains Mono fonts (Google Fonts)

#### Layout & Navigation
- [x] Build `RootLayout` (`src/app/layout.tsx`) — providers, fonts, global styles
- [x] Build `TopBar` component — logo, live BTC price, 24h change, status dot, nav links
- [x] Build `NavSidebar` component — module navigation links
- [x] Build `ModuleHeader` component — reusable page header with title + gauge

#### Providers
- [x] Create `QueryProvider` (TanStack Query v5 wrapper)
- [x] Create `ThemeProvider` (dark theme context)
- [x] Create `WebSocketProvider` — migrate Binance WS from `index.html`, auto-reconnect logic

#### Core API Routes
- [x] `/api/price/route.ts` — BTC/USDT 24hr ticker (Binance)
- [x] `/api/candles/route.ts` — OHLCV klines with timeframe param (Binance + CoinGecko pre-2017)
- [x] `/api/health/route.ts` — upstream API connectivity check
- [x] Implement `Cache-Control` headers (`s-maxage` + `stale-while-revalidate`) on all routes

#### Core Hooks
- [x] `usePrice` — live price via TanStack Query + WebSocket updates
- [x] `useCandles` — historical OHLCV with timeframe selector
- [x] `useWebSocket` — connection state, last price, last candle

#### Core API Client Libs
- [x] `lib/api/binance.ts` — REST + WS helpers
- [x] `lib/api/coingecko.ts` — market data, historical range, global stats
- [x] `lib/api/mempool.ts` — block height, fees, hashrate
- [x] `lib/api/blockchain-info.ts` — hash rate, difficulty, active addresses
- [x] `lib/api/alternative-me.ts` — Fear & Greed Index

#### Core Types & Utils
- [x] `lib/types.ts` — OHLCV, PriceData, OnChainMetrics, TechnicalIndicators, etc.
- [x] `lib/constants.ts` — asset class values, halving dates, colour tokens
- [x] `lib/format.ts` — number/currency/percentage formatters
- [x] `lib/colors.ts` — chart colour helpers

#### Chart Migration
- [x] Build `CandlestickChart` component (Lightweight Charts wrapper) — migrate from `index.html`
- [x] Timeframe selector: 1H, 4H, 1D, 1W
- [x] Chart type toggle: Candlestick / Line
- [x] Log scale toggle
- [x] Crosshair with OHLCV + date on hover

---

### Stage 2: Technical Analysis — Indicators (Week 2)

#### Calculation Modules
- [x] `lib/calc/ema.ts` — extract from `index.html` lines 275-287
- [x] `lib/calc/sma.ts` — simple moving average
- [x] `lib/calc/rsi.ts` — RSI(14) with Wilder's smoothing
- [x] `lib/calc/macd.ts` — MACD(12,26,9) line, signal, histogram
- [x] `lib/calc/bollinger.ts` — Bollinger Bands(20,2), %B, bandwidth, squeeze detection
- [x] `lib/calc/stochastic-rsi.ts` — StochRSI %K and %D
- [x] `lib/calc/normalization.ts` — minMax, sigmoid, percentileRank helpers

#### Chart Components
- [x] Build `IndicatorSubchart` component — generic sub-chart below main price chart
- [x] Implement time-axis sync (`subscribeVisibleLogicalRangeChange`)
- [x] RSI sub-chart — line 0-100, bands at 30/70, colour fills
- [x] MACD sub-chart — MACD line, signal line, histogram bars (green/red)
- [x] Stochastic RSI sub-chart — %K solid, %D dashed, bands at 20/80

#### Moving Average Overlays
- [x] MA overlay toggle panel (checkbox UI for all 8 MAs)
- [x] Render togglable MA LineSeries on main price chart (20/50/100/200/365 SMA, 21/55/200 EMA)
- [x] Default: 21 EMA, 55 EMA, 200 EMA on

#### Cross Detection
- [x] Golden Cross detection (50 SMA > 200 SMA)
- [x] Death Cross detection (50 SMA < 200 SMA)
- [x] Chart markers: green triangle (Golden), red triangle (Death) with annotations

#### Bollinger Bands Overlay
- [x] Render Bollinger Bands on main chart — middle (dashed grey), upper/lower (solid), filled area
- [x] BB Squeeze detection — bandwidth below 120-period low, dot marker

---

### Stage 3: Technical Analysis — Cycle Tools + Score (Week 3)

#### Cycle Tool Components
- [x] Pi Cycle Top Indicator chart — 111DMA + 350DMA x2 overlaid on price (log), gap % widget
- [x] 2-Year MA Multiplier chart — 730d SMA floor + 5x ceiling, green/red shaded zones
- [x] Rainbow Chart — log regression bands (8 colour zones), BTC price as white line
- [x] `HalvingCountdown` widget — progress ring, blocks remaining, estimated date, historical table
- [x] Halving API route using Mempool.space `/api/blocks/tip/height`

#### 200-Week MA Heatmap
- [x] Price line coloured by distance from 200-week MA (blue → green → yellow → red gradient)

#### Relative Strength Charts
- [x] BTC Dominance area chart (CoinGecko `/global`) + trend line + current value
- [x] BTC/Gold Ratio placeholder (static value, "Live data in V2" note)
- [x] BTC/S&P 500 Ratio placeholder
- [x] BTC/DXY Inverse placeholder

#### Technical Composite Score
- [x] `lib/calc/technical-scores.ts` — normalise all 8 indicators, weighted sum
- [x] Pi Cycle proximity score logic (gap-based buckets)
- [x] Build `GaugeChart` component (Recharts) — score, colour fill, label
- [x] Display mapping: Strong Buy / Buy / Neutral / Sell / Strong Sell
- [x] `useTechnicalIndicators` hook

#### Page Assembly
- [x] Assemble complete `/technical/page.tsx` — header, controls, price chart, subchart panes, cycle tools grid, relative strength grid

---

### Stage 4: Market Cap + Backtest Migration (Week 4)

#### Market Cap Context Module
- [x] `AssetComparisonTable` — 9 asset classes with static values + live BTC mcap %
- [x] Horizontal bar chart (log scale) — asset values with BTC overlay
- [x] `WhatIfSlider` — dropdown (asset), logarithmic slider (0.1%-100%), implied price + multiple
- [x] Quick preset buttons: 1%, 5%, 10%, 25%, 50%, 100%
- [x] Log Growth Trajectory chart — BTC mcap on log Y, power-law regression, +/-1σ/2σ bands, milestone lines
- [x] Network Value Comparison horizontal bar chart — top companies + BTC + ETH
- [x] `/api/market-cap/route.ts` — CoinGecko market cap + circulating supply
- [x] `useMarketCapData` hook
- [x] Assemble `/market-cap/page.tsx`

#### Backtest Engine Migration
- [x] Migrate backtest logic from `index.html` into `hooks/useBacktest.ts`
- [x] `StrategySelector` component — 4 EMA crossover strategies, togglable
- [x] `BacktestStats` component — total return, win rate, profit factor, max DD, buy & hold comparison
- [x] `TradeLog` component — expandable trade history table
- [x] `EquityCurve` component — equity over time mini-chart
- [x] Build `BacktestPanel` (compact version for Dashboard Home)

---

### Stage 5: Fundamental + Dashboard Home (Week 5)

#### Fundamental Analysis — MVP Indicators
- [x] Fear & Greed gauge — large circular gauge, classification label, 30d sparkline
- [x] `/api/fear-greed/route.ts` — Alternative.me proxy with caching
- [x] `useFearGreed` hook
- [x] Futures OI line chart + 90d MA + "Elevated leverage" warning badge
- [x] Funding Rate metric card
- [x] `/api/fundamental/route.ts` — Binance Futures OI + funding rate
- [x] `useFundamentalData` hook
- [x] Macro snapshot placeholder cards (Fed Rate, CPI, M2, 10Y — hardcoded values)

#### Fundamental Composite Score (Partial)
- [x] `lib/calc/fundamental-scores.ts` — normalise 3 of 9 indicators (Fear & Greed, OI, Funding)
- [x] Display "(3 of 9 indicators)" badge

#### Overall Conviction Score
- [x] `lib/calc/overall-score.ts` — weighted blend (fallback: 55% TA + 45% Fundamental)
- [x] `useCompositeScore` hook

#### Dashboard Home (`/`)
- [x] Signal Summary Panel — 4 `GaugeChart` widgets (On-Chain placeholder, TA, Fundamental, Overall)
- [x] Template-based summary text (5 score-range interpretations)
- [x] Key Alerts component — auto-generated top 5 signals with priority colour-coding
- [x] Alert rules engine (`AlertRule` interface, threshold evaluation)
- [x] Secondary Info Bar — block height, time since last block, mempool size, avg fee
- [x] Price chart (compact) — 6-month daily candles with 21/55/200 EMA, "Full Chart" link
- [x] Backtest panel (compact) — strategy selector + stats + equity curve + trade log link
- [x] Assemble `/page.tsx` (Dashboard Home)

#### Fundamental Page Assembly
- [x] Assemble `/fundamental/page.tsx` — header, Fear & Greed, macro snapshot, futures/funding, placeholders for V2 sections

---

### Stage 6: Polish + Deploy (Week 6)

#### Loading & Error States
- [ ] Loading skeletons for Dashboard Home
- [ ] Loading skeletons for Technical Analysis page
- [ ] Loading skeletons for Market Cap page
- [ ] Loading skeletons for Fundamental page
- [ ] Loading skeletons for On-Chain page
- [ ] Error boundaries with fallback UI on all pages

#### UX Polish
- [ ] Tooltip explainers (?) on all metrics — what it measures, why it matters
- [ ] Shared components: `Skeleton`, `Tooltip`, `Badge`, `ToggleSwitch`, `TimeframeSelector`, `StatusDot`
- [ ] Info panels on on-chain metrics (historical context, zone highlighting)

#### Performance
- [ ] Lazy-load below-fold charts with `IntersectionObserver`
- [ ] Memoize calculation functions (`useMemo` on indicator computations)
- [ ] Verify Lightweight Charts handles 10+ years of daily data smoothly

#### Deployment
- [ ] Vercel deployment configuration
- [ ] Environment variables setup (if any API keys needed)
- [ ] `next.config.ts` — image domains, headers, rewrites
- [ ] Favicon + meta tags

#### Testing & Verification
- [ ] Unit tests: all `lib/calc/*` functions (RSI, MACD, EMA, SMA, Bollinger, composite scores)
- [ ] Visual verification: compare chart outputs vs TradingView for same timeframe
- [ ] API health endpoint: verify all upstream connectivity
- [ ] Score sanity check: manually compute composite for a known date and compare
- [ ] WebSocket verification: live price matches Binance within 2 seconds
- [ ] Responsive testing at 1920, 1440, 1024, 768, 375px
- [ ] Lighthouse: > 90 desktop, > 75 mobile

---

## Phase 2: Global Outlook + Restructure (NEXT)

### Stage 7: Restructure & Shared Infrastructure

#### Rebrand & Navigation
- [x] Rename from "BTC Command" to "Investment Command Centre" across all UI
- [x] Update `TopBar` — logo text to "INVESTMENT COMMAND CENTRE"
- [x] Restructure `NavSidebar` into two-tier grouped navigation (Global Outlook | Bitcoin Outlook)
- [x] Move Bitcoin pages from `/` to `/bitcoin/*` routes
- [x] Set Global Overview as new landing page at `/`

#### Shared Data Utilities
- [x] Extract FRED fetcher into `src/lib/api/fred.ts` — `fetchFREDSeries()` + `fetchMultipleFREDSeries()`
- [x] Extract Stooq fetcher into `src/lib/api/stooq.ts` — `fetchStooqDaily()`
- [x] Create Yahoo Finance fallback fetcher `src/lib/api/yahoo-finance.ts`
- [x] Set up FRED API key in environment variables

#### New Shared Types
- [x] `FREDTimeSeries` interface
- [x] `YieldCurveSnapshot` interface
- [x] `GlobalEquityIndex` interface
- [x] `CommodityPrice` interface
- [x] `ForexPair` interface
- [x] `NetLiquidity` interface
- [x] `RiskRegime` interface

#### Reusable Global Components
- [x] `FREDTimeSeriesChart` — generic multi-series FRED chart component
- [x] `DualAxisChart` — two Y-axes overlay chart
- [x] `MetricHeatmapStrip` — horizontal row of stat cards with conditional colouring

---

### Stage 8: Global Overview (Landing Page — `/`)

#### API Route
- [x] `/api/global/overview/route.ts` — aggregated macro snapshot (FRED: `DFEDTARL`, `CPIAUCSL`, `UNRATE`, `M2SL`, `DGS10`, `DTWEXBGS`, `VIXCLS`)

#### Components
- [x] `MetricHeatmapStrip` — Fed Rate, CPI YoY, Unemployment, M2 YoY, 10Y Yield, DXY, VIX with direction arrows and conditional colour tints
- [x] Key Markets Snapshot — 6 mini-cards (S&P 500, Nasdaq, Gold, DXY, BTC, 10Y Yield) with 30-day sparklines
- [x] `RiskRegimeBadge` — Risk-On / Neutral / Risk-Off based on VIX, HY OAS (`BAMLH0A0HYM2`), yield curve (`T10Y2Y`)
- [x] `MacroCalendar` — compact list of next 5-8 macro events from `data/macro-calendar.json`

#### Data & Hooks
- [x] Create `data/macro-calendar.json` — static JSON with upcoming FOMC, CPI, NFP, PCE dates
- [x] `useGlobalOverview` hook

#### Page Assembly
- [x] Assemble `/page.tsx` (Global Overview landing page)

---

### Stage 9: Economic Indicators (`/global/economic`)

#### API Route
- [x] `/api/global/economic/route.ts` — inflation, employment, output, leading indicators (12+ FRED series)

#### Inflation Section
- [x] Multi-line time-series chart (CPI `CPIAUCSL`, Core CPI `CPILFESL`, Core PCE `PCEPILFE`, PPI `PPIACO`) with 2% Fed target reference line
- [x] Stat cards with latest reading + change vs prior month

#### Employment Section (2×2 grid)
- [x] Unemployment Rate area chart (`UNRATE`) with ~4% natural rate reference
- [x] Nonfarm Payrolls MoM bar chart (`PAYEMS`)
- [x] Initial Jobless Claims line chart (`ICSA`) with 4-week MA
- [x] Labor Force Participation line chart (`CIVPART`)

#### Output & Sentiment Section (2×2 grid)
- [x] ISM Manufacturing PMI line chart (`NAPM`) with 50 reference line
- [x] Industrial Production YoY area chart (`INDPRO`)
- [x] Michigan Consumer Sentiment line chart (`UMCSENT`)
- [x] Retail Sales MoM bar chart (`RSXFS`)

#### Leading Indicators Section
- [x] Yield Curve chart (10Y-2Y `T10Y2Y` + 10Y-3M `T10Y3M`) with red shading below zero
- [x] Chicago Fed CFNAI bar chart (`CFNAI`)

#### Hook & Page
- [x] `useEconomicData` hook
- [x] Assemble `/global/economic/page.tsx`

---

### Stage 10: Treasury & Rates (`/global/rates`)

#### API Route
- [x] `/api/global/rates/route.ts` — yield curve, credit spreads, real rates (15+ FRED series)

#### Yield Curve Snapshot
- [x] `YieldCurveChart` — cross-sectional chart (x=maturity, y=yield), current + 1Y ago + 2Y ago lines, red inversion highlights
- [x] FRED series: `DGS1MO`, `DGS3MO`, `DGS6MO`, `DGS1`, `DGS2`, `DGS3`, `DGS5`, `DGS7`, `DGS10`, `DGS20`, `DGS30`

#### Yield Curve History
- [x] Time-series chart of 10Y-2Y and 10Y-3M spreads (10+ years), red shading when inverted, recession bars

#### Key Rates
- [x] Stat cards + multi-line chart: Fed Funds (`DFEDTARU`), 10Y (`DGS10`), 20Y (`DGS20`), 30Y (`DGS30`), SOFR (`SOFR`)

#### Credit Conditions
- [x] HY OAS (`BAMLH0A0HYM2`) + IG OAS (`BAMLC0A0CM`) multi-line chart with zone interpretation

#### MOVE Index
- [x] Placeholder card — "Coming Soon" with description (ICE BofA MOVE Index)

#### Real Rates & Inflation Expectations
- [x] Dual-line chart: 10Y TIPS Real Yield (`DFII10`) + 10Y Breakeven Inflation (`T10YIE`)

#### Hook & Page
- [x] `useRatesData` hook
- [x] Assemble `/global/rates/page.tsx`

---

### Stage 11: Commodities (`/global/commodities`)

#### API Route
- [x] `/api/global/commodities/route.ts` — precious metals, energy, industrial (Stooq + FRED)

#### Precious Metals
- [x] Gold (`xauusd` / `GOLDAMGBD228NLBM`), Silver (`xagusd`), Platinum (`xptusd`) — stat cards + 1Y line charts
- [x] Gold/Silver Ratio computed chart

#### Energy
- [x] WTI Crude (`cl.f` / `DCOILWTICO`), Brent (`bz.f` / `DCOILBRENTEU`), Natural Gas (`ng.f` / `DNGPSP`) — stat cards + line charts

#### Industrial & Agricultural
- [x] Copper (`hg.f` / `PCOPPUSDM`) + Lumber (`ls.f`) — stat cards + line charts

#### Gold vs Bitcoin
- [x] `DualAxisChart` — BTC price (left Y) + Gold price (right Y), 90d rolling correlation

#### Commodity Index Proxy
- [x] PPI All Commodities (`PPIACO`) area chart with YoY % change secondary panel

#### Hook & Page
- [x] `useCommoditiesData` hook
- [x] Assemble `/global/commodities/page.tsx`

---

### Stage 12: Global Equities (`/global/equities`)

#### API Route
- [x] `/api/global/equities/route.ts` — global indices + crypto-adjacent stocks (FRED + Stooq + Yahoo)

#### US Indices
- [x] S&P 500 (`SP500`), Nasdaq (`NASDAQCOM`), Russell 2000 (`^rut`), Dow Jones (`^dji`) — stat cards + 1Y line charts

#### Volatility
- [x] VIX line chart (`VIXCLS`) with zone colouring: Complacent (<15), Normal (15-25), Elevated (25-35), Fear (>35)

#### European Indices
- [x] Euro Stoxx 50 (`^stoxx50e`), DAX (`^dax`), FTSE 100 (`^ftse`) — stat cards + line charts

#### Asia-Pacific Indices
- [x] Nikkei 225 (`^nkx`), Hang Seng (`^hsi`), Shanghai Composite (`000001.ss`), ASX 200 (`^aord`) — stat cards + line charts

#### Crypto-Adjacent Equities
- [x] MSTR (`mstr.us`), MARA (`mara.us`), RIOT (`riot.us`), COIN (`coin.us`) — stat cards with 90d BTC correlation

#### Global Performance Table
- [x] `PerformanceTable` — sortable table with heatmap cells (1D, 1W, 1M, 3M, YTD, 1Y %), default sort 1D desc

#### Hook & Page
- [x] `useEquitiesData` hook
- [x] Assemble `/global/equities/page.tsx`

---

### Stage 13: Forex (`/global/forex`)

#### API Route
- [x] `/api/global/forex/route.ts` — DXY + major pairs (FRED + Stooq)

#### Dollar Index (DXY)
- [x] Large line chart (`DTWEXBGS`), 2Y lookback, optional BTC price overlay on secondary Y, zone annotations

#### Major Forex Pairs (2×2 grid)
- [x] EUR/USD (`eurusd` / `DEXUSEU`), USD/JPY (`usdjpy` / `DEXJPUS`), GBP/USD (`gbpusd` / `DEXUSUK`), AUD/USD (`audusd` / `DEXUSAL`) — 1Y line charts + stat cards

#### Dollar Smile Framework
- [x] `DollarSmileCard` — static educational panel explaining the Dollar Smile model

#### Hook & Page
- [x] `useForexData` hook
- [x] Assemble `/global/forex/page.tsx`

---

### Stage 14: Liquidity & Flows (`/global/liquidity`)

#### API Route
- [x] `/api/global/liquidity/route.ts` — net liquidity, Global M2, Fed BS, RRP, TGA (FRED: `WALCL`, `WTREGEN`, `RRPONTSYD`, `M2SL`, `MANMM101EZM189S`, `MANMM101JPM189S`, `MANMM101CNM189S`, `TREAST`, `WSHOMCB`, `TOTBKCR`, `BUSLOANS`)

#### US Net Liquidity
- [x] `NetLiquidityChart` — Net Liquidity = Fed BS (`WALCL`) - TGA (`WTREGEN`) - RRP (`RRPONTSYD`), dual-axis with BTC price (log), annotate major tops/bottoms

#### Global M2
- [x] `GlobalM2Chart` — multi-line (US, Eurozone, Japan, China M2) + composite sum
- [x] Global M2 YoY growth rate panel with BTC price overlay

#### Fed Balance Sheet Decomposition
- [x] Stacked area chart: Total Assets (`WALCL`), Treasuries (`TREAST`), MBS (`WSHOMCB`), annotate QE/QT phases

#### Reverse Repo & TGA
- [x] RRP (`RRPONTSYD`) area chart — "RRP draining = liquidity entering system"
- [x] TGA (`WTREGEN`) area chart — "TGA building = liquidity leaving system"

#### Credit Growth
- [x] Total Bank Credit (`TOTBKCR`) + C&I Loans (`BUSLOANS`) multi-line chart + YoY % change panel

#### Hook & Page
- [x] `useLiquidityData` hook
- [x] Assemble `/global/liquidity/page.tsx`

---

## Phase 2 Remaining: Bitcoin Enhancements

### Live Macro Data (FRED Integration)
- [x] US Federal Funds Rate step chart + next FOMC widget
- [x] US CPI / PCE YoY line chart + widget
- [x] M2 Money Supply dual-axis chart (M2 vs BTC price)
- [x] US 10-Year Treasury Yield chart + widget

### Live Relative Strength
- [x] BTC/Gold Ratio live chart with trend line
- [x] BTC/S&P 500 Ratio live chart
- [x] BTC/DXY Inverse dual-axis chart + 90d correlation

### Full Composite Scores
- [x] Full Fundamental Composite Score (9/9 indicators)
- [x] Full On-Chain Composite Score (8/8 indicators)
- [x] Full Overall Conviction Score (all 3 modules weighted: 40% on-chain, 30% TA, 30% fundamental)

---

## Phase 3: Enhanced Bitcoin + Platform (FUTURE)

### Regulation & Adoption
- [ ] Regulation Tracker — vertical timeline with sentiment badges, region filter
- [ ] Nation-State Adoption Map — SVG world map, colour-coded tiers, click popovers
- [ ] Curated JSON data files (`regulation-events.json`, etc.)

### ETF & Institutional
- [ ] ETF Flows Dashboard — daily net inflows/outflows for spot Bitcoin ETFs
- [ ] Corporate Treasury Tracker — table of public companies holding BTC

### News & Events
- [ ] News feed (CryptoPanic API)
- [ ] Events calendar (FOMC dates, CPI releases, ETF deadlines, halving)

### Platform Features
- [ ] User accounts — save preferences, custom alerts, watchlists
- [ ] Push notifications — threshold alerts via email/Telegram/Discord
- [ ] Custom scoring weights — user-adjustable composite weights
- [ ] Multi-asset support — ETH, SOL, major alts
- [ ] Historical score backtest — "What was the conviction score at past tops/bottoms?"
- [ ] AI-generated summaries — LLM-powered narrative from current data
- [ ] Mobile app — React Native companion
- [ ] MOVE Index live data (ICE BofA source)
