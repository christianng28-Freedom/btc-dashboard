# Investment Command Centre — Product Requirements Document

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Target Users & Personas](#3-target-users--personas)
4. [Product Modules — Global Outlook](#4-product-modules--global-outlook)
5. [Product Modules — Bitcoin Outlook](#5-product-modules--bitcoin-outlook)
6. [Data Architecture](#6-data-architecture)
7. [Technical Architecture](#7-technical-architecture)
8. [UI/UX Wireframe Descriptions](#8-uiux-wireframe-descriptions)
9. [Composite Score Methodology (Bitcoin)](#9-composite-score-methodology-bitcoin)
10. [Phase Roadmap](#10-phase-roadmap)
11. [Success Metrics](#11-success-metrics)
12. [Risks & Mitigations](#12-risks--mitigations)
13. [Appendix: API Reference Table](#13-appendix-api-reference-table)

---

## 1. Executive Summary

**Investment Command Centre** is a comprehensive, institutional-grade analytics dashboard that combines global macro intelligence with deep Bitcoin-specific analysis into a single dark-themed web application. It replaces the workflow of juggling FRED, TradingView, Bloomberg terminals, Glassnode, LookIntoBitcoin, and macro news feeds by presenting global economic indicators, treasury markets, commodities, equities, forex, liquidity metrics, and Bitcoin cycle analytics in one unified interface.

The product is organised into two major sections:

- **Global Outlook** — Macro-economic indicators, treasury yields, commodities, global equities, forex, and liquidity flows. Purely data-driven with no composite scores — the analyst draws their own conclusions from the data.
- **Bitcoin Outlook** — On-chain, technical, and fundamental Bitcoin analysis fused into composite scores (On-Chain Health, Technical Strength, Fundamental Outlook) blended into a master **Conviction Score** that a power user can scan in under 60 seconds.

The product is built as a Next.js 16+ App Router application with TypeScript, Tailwind CSS, Lightweight Charts (TradingView open-source) for financial charts, Recharts for dashboard widgets, and TanStack Query for data management. It deploys on Vercel.

**Current state (Phase 1 — shipped)**: The Bitcoin Outlook section is fully operational with 5 tabs: Dashboard (composite scores, alerts, backtest engine), Technical Analysis (RSI, MACD, Stoch RSI, Bollinger Bands, Pi Cycle, 2-Year MA, Rainbow Chart, Halving Countdown, BTC Dominance, Relative Strength), Fundamental (Fear & Greed, Futures OI, Funding Rate, Macro Snapshot), Market Cap Context (asset comparison, What-If slider, log growth, network value), and On-Chain (iframed metrics). Data flows from Binance, CoinGecko, FRED, Mempool.space, Alternative.me, CoinMetrics, Blockchain.info, and Stooq via Next.js API routes with server-side caching and TanStack Query client-side management.

**Next phase (Phase 2)**: Build the Global Outlook section with 7 sub-pages, restructure navigation into two-tier grouped sidebar, rename from "BTC Command" to "Investment Command Centre", and move the landing page to the Global Overview.

---

## 2. Problem Statement

### The Fragmentation Tax

A sophisticated investment analyst's daily workflow currently requires:

| Task | Tool | Cost |
|---|---|---|
| Macro economic data (GDP, CPI, employment) | FRED + Bloomberg | Free / $$$ |
| Treasury yields & yield curve | FRED + TradingView | Free |
| Commodity prices (gold, oil, copper) | Bloomberg / TradingView | $$$ |
| Global equity indices | Bloomberg / Yahoo Finance | $$$ / Free |
| Global liquidity & central bank balance sheets | FRED + manual aggregation | Free |
| Forex & dollar index | TradingView / Bloomberg | Free / $$$ |
| On-chain Bitcoin metrics (MVRV, NUPL, SOPR) | Glassnode / CryptoQuant | $29-$799/mo |
| Bitcoin technical analysis (RSI, MACD, MAs) | TradingView | $0-$60/mo |
| Bitcoin cycle indicators (Pi Cycle, Rainbow, S2F) | LookIntoBitcoin | Free |
| ETF flows & institutional data | Bloomberg / manual tracking | $$$+ |
| Fear & Greed, sentiment | Alternative.me + Twitter | Free |
| Market cap comparisons | Manual spreadsheet | Free |

**Problems with this workflow**:
1. **Context switching**: 10+ tabs, 10+ mental models, no unified view.
2. **No macro-to-crypto bridge**: Macro data lives in one universe (FRED, Bloomberg) and crypto data in another (Glassnode, TradingView). The analyst must mentally connect Fed liquidity expansion → risk asset rally → Bitcoin outperformance.
3. **No synthesis layer for Bitcoin**: Each BTC tool shows its own metric in isolation. The analyst must mentally weight and combine contradictory signals.
4. **No composite score for Bitcoin**: "Is now a good time to accumulate?" requires synthesising 20+ metrics. No tool answers this question directly.
5. **Stale context**: Macro data, yield curve shifts, and liquidity changes are scattered across feeds with no structured integration.
6. **No cycle positioning**: The most valuable question — "Where are we in the cycle?" — requires cross-referencing on-chain, technical, fundamental, AND macro signals simultaneously.

### What Investment Command Centre Solves

One URL. Two outlooks. A 60-second scan of the Global Overview tells you the macro regime (risk-on, risk-off, tightening, easing). A click into Bitcoin Outlook tells you: "On-chain says accumulate, technicals are neutral, macro is turning favorable — conviction score 32/100 (Strong Value)."

---

## 3. Target Users & Personas

### Persona 1: "The Macro-Crypto Allocator" (Primary)

- **Role**: Portfolio manager or self-directed investor who allocates across asset classes including 5-30% in Bitcoin
- **Experience**: Deep TradFi background with growing crypto expertise. 2+ market cycles.
- **Current tools**: Bloomberg Terminal (or wishes they had one), FRED, TradingView, Glassnode free tier, CoinGecko
- **Pain**: Needs to see macro regime context (liquidity, rates, risk appetite) alongside Bitcoin-specific signals. Currently switches between 8+ tools.
- **Key need**: "Is the macro environment favorable for risk assets? And within that context, is Bitcoin specifically presenting value?"
- **Decision cadence**: Weekly/monthly allocation reviews

### Persona 2: "The Cycle Strategist" (Secondary)

- **Role**: Self-directed Bitcoin investor with $50K-$5M in BTC
- **Experience**: 2+ Bitcoin cycles, understands on-chain metrics conceptually but doesn't run nodes
- **Current tools**: Glassnode free tier, TradingView, LookIntoBitcoin, CT/Twitter for sentiment
- **Pain**: Spends 30-60 min/day checking 6 sources; wants a single dashboard to replace this ritual
- **Key need**: Cycle positioning — "Are we early, mid, or late cycle? Should I be accumulating or taking profit?"
- **Decision cadence**: Weekly rebalancing decisions

### Persona 3: "The Technical Trader" (Tertiary)

- **Role**: Active trader using TA for entry/exit timing across multiple asset classes
- **Experience**: Strong charting skills, uses TradingView daily
- **Current tools**: TradingView, Coinalyze, Binance, FRED
- **Pain**: Wants cycle-specific indicators alongside standard TA, with macro context
- **Key need**: Technical composite score with cycle overlay AND macro regime awareness
- **Decision cadence**: Daily/weekly position adjustments

---

## 4. Product Modules — Global Outlook

The Global Outlook section provides a comprehensive macro-economic view with no composite scores. It is purely data-driven — the analyst interprets the data. All Global Outlook pages live under the `/global/*` route namespace, except for the Overview which serves as the application landing page at `/`.

### Module G1 — Global Overview (Landing Page)

**Route**: `/`
**Purpose**: The macro pulse page. One screen that gives you the "state of the world" in 60 seconds.

#### G1.1 Macro Heatmap Strip

**Component**: `MetricHeatmapStrip` — a horizontal row of metric cards at the top of the page.

Each card displays:
- Metric name (label)
- Current value (large, mono font)
- Direction arrow (▲/▼) and change vs prior reading
- Conditional background colour: green tint = risk-on favorable, red tint = risk-off or tightening, neutral = grey

| Metric | FRED Series | Refresh | Display Format |
|---|---|---|---|
| Fed Funds Rate | `DFEDTARL` | 6h | X.XX% |
| CPI YoY | `CPIAUCSL` (computed) | 6h | X.X% |
| Unemployment | `UNRATE` | 6h | X.X% |
| M2 YoY | `M2SL` (computed) | 6h | +X.X% |
| 10Y Yield | `DGS10` | 6h | X.XX% |
| DXY | `DTWEXBGS` | 6h | XXX.XX |
| VIX | `VIXCLS` | 1h | XX.XX |

#### G1.2 Key Markets Snapshot

**Layout**: 6 mini-cards in a responsive row.

Each card shows: asset name, current price/level, 24h change (green/red), and a 30-day sparkline (Recharts `LineChart`, minimal, no axes).

| Market | Data Source | Symbol |
|---|---|---|
| S&P 500 | FRED | `SP500` |
| Nasdaq | FRED | `NASDAQCOM` |
| Gold | Stooq | `xauusd` |
| DXY | FRED | `DTWEXBGS` |
| BTC | Existing `/api/price` | — |
| 10Y Yield | FRED | `DGS10` |

#### G1.3 Risk Regime Indicator

**Component**: A single badge displaying the current macro risk regime.

- **Risk-On**: VIX < 18, HY OAS tightening, yield curve not inverted → Green badge
- **Neutral**: Mixed signals → Amber badge
- **Risk-Off**: VIX > 25, HY OAS widening, yield curve deeply inverted → Red badge

This is an informational label, NOT a composite score. Below the badge, a small breakdown shows the 3-4 inputs that informed the classification. The logic is simple categorical rules, not a weighted formula.

**Data inputs**: `VIXCLS`, `BAMLH0A0HYM2` (HY OAS), `T10Y2Y` (yield curve).

#### G1.4 Macro Calendar

**Component**: A compact list of the next 5-8 key macro events.

- Next FOMC meeting date + rate decision expectation
- Next CPI release date
- Next NFP (Non-Farm Payrolls) release date
- Next PCE release date
- Any other notable upcoming events

**Data**: Static JSON file (`data/macro-calendar.json`) with manual quarterly updates. Schema:
```
{ date: string, event: string, importance: "high"|"medium", notes?: string }
```

---

### Module G2 — Economic Indicators

**Route**: `/global/economic`
**Purpose**: Deep dive into the real economy indicators that drive monetary policy and risk appetite.

#### G2.1 Inflation

**Charts**: Multi-line time-series chart (Recharts `LineChart`), 5-year lookback. Horizontal reference line at 2% (Fed target).

| Metric | FRED Series | Computation | Colour |
|---|---|---|---|
| CPI YoY | `CPIAUCSL` | 12-month % change | `#ef4444` (red) |
| Core CPI YoY | `CPILFESL` | 12-month % change | `#f97316` (orange) |
| Core PCE YoY | `PCEPILFE` | Direct (already YoY) | `#8b5cf6` (purple) |
| PPI YoY | `PPIACO` | 12-month % change | `#3b82f6` (blue) |

**Stat cards** above chart: Latest reading for each metric with change vs prior month.

#### G2.2 Employment

**Layout**: 2×2 grid of chart panels.

| Metric | FRED Series | Chart Type | Notes |
|---|---|---|---|
| Unemployment Rate | `UNRATE` | Area chart | Reference line at natural rate (~4%) |
| Nonfarm Payrolls | `PAYEMS` | Bar chart (MoM change) | Green/red bars per month |
| Initial Jobless Claims | `ICSA` | Line chart | Include 4-week moving average |
| Labor Force Participation | `CIVPART` | Line chart | Long-term structural trend |

#### G2.3 Output & Sentiment

**Layout**: 2×2 grid of chart panels.

| Metric | FRED Series | Chart Type | Notes |
|---|---|---|---|
| ISM Manufacturing PMI | `NAPM` | Line chart | Reference line at 50 (expansion/contraction) |
| Industrial Production | `INDPRO` | Area chart (YoY % change) | — |
| Michigan Consumer Sentiment | `UMCSENT` | Line chart | Contrarian at extremes |
| Retail Sales | `RSXFS` | Bar chart (MoM % change) | — |

#### G2.4 Leading Indicators

**Layout**: Charts with dual-purpose views.

| Metric | FRED Series | Chart Type | Notes |
|---|---|---|---|
| Yield Curve (10Y-2Y) | `T10Y2Y` | Line chart | Zero reference line; shade negative (inverted) red |
| Yield Curve (10Y-3M) | `T10Y3M` | Line chart | Most reliable recession predictor |
| Chicago Fed CFNAI | `CFNAI` | Bar chart | Zero reference; negative = below-trend growth |

---

### Module G3 — Treasury & Rates

**Route**: `/global/rates`
**Purpose**: Yield curve analysis, interest rate environment, and credit conditions — critical for understanding the cost of capital and risk regime.

#### G3.1 Yield Curve Snapshot

**Component**: `YieldCurveChart` — a cross-sectional chart (NOT a time-series).

- **X-axis**: Maturity (1M, 3M, 6M, 1Y, 2Y, 3Y, 5Y, 7Y, 10Y, 20Y, 30Y)
- **Y-axis**: Yield (%)
- **Lines**: Current (solid white), 1 year ago (dashed blue), 2 years ago (dashed grey)
- **Inversion highlight**: When the curve inverts (shorter maturity yields higher than longer), highlight the inverted segment in red

**FRED Series**: `DGS1MO`, `DGS3MO`, `DGS6MO`, `DGS1`, `DGS2`, `DGS3`, `DGS5`, `DGS7`, `DGS10`, `DGS20`, `DGS30`

#### G3.2 Yield Curve History

**Chart**: Time-series line chart of 10Y-2Y and 10Y-3M spreads over 10+ years.

- Zero reference line (bold, horizontal)
- When spread is negative (inverted) → shade the area below zero in red
- Recession bars: grey vertical shaded areas for NBER recession dates (static data)
- Current value displayed as a stat card

**FRED Series**: `T10Y2Y`, `T10Y3M`

#### G3.3 Key Rates

**Layout**: Stat cards at top + multi-line time series below.

| Rate | FRED Series | Display |
|---|---|---|
| Fed Funds Target (upper) | `DFEDTARU` | X.XX% |
| 10-Year Treasury | `DGS10` | X.XX% |
| 20-Year Treasury | `DGS20` | X.XX% |
| 30-Year Treasury | `DGS30` | X.XX% |
| SOFR | `SOFR` | X.XX% |

#### G3.4 Credit Conditions

**Chart**: Multi-line time series of credit spreads.

| Metric | FRED Series | Colour | Notes |
|---|---|---|---|
| HY OAS | `BAMLH0A0HYM2` | `#ef4444` (red) | When this widens = stress |
| IG OAS | `BAMLC0A0CM` | `#3b82f6` (blue) | Investment grade spread |

**Zone interpretation**: HY OAS < 300bp = complacent; 300-500bp = normal; 500-700bp = stress; >700bp = crisis.

#### G3.5 MOVE Index

**Status**: Placeholder — attempt best-effort sourcing.

- **Primary**: FRED series `BAMLMOVE` (if available)
- **Fallback**: Yahoo Finance `^MOVE`
- **If unavailable**: Display "Coming Soon" placeholder card with description: "ICE BofA MOVE Index — measures implied volatility of US Treasury options. Think of it as VIX for the bond market."

If data is available: line chart with historical percentile annotation and zone coloring similar to VIX.

#### G3.6 Real Rates & Inflation Expectations

**Chart**: Dual-line time series.

| Metric | FRED Series | Colour | Interpretation |
|---|---|---|---|
| 10Y TIPS Real Yield | `DFII10` | `#22c55e` (green) | Deeply negative = bullish for risk assets/gold |
| 10Y Breakeven Inflation | `T10YIE` | `#f97316` (orange) | Market's inflation expectations |

---

### Module G4 — Commodities

**Route**: `/global/commodities`
**Purpose**: Precious metals, energy, and industrial commodities. Gold/silver correlation to Bitcoin matters. Energy prices drive inflation expectations. Copper signals economic health.

#### G4.1 Precious Metals

**Layout**: Stat cards (price, 24h change, 30d change) + line charts (1Y lookback).

| Commodity | Stooq Symbol | FRED Fallback | Notes |
|---|---|---|---|
| Gold (XAU/USD) | `xauusd` | `GOLDAMGBD228NLBM` (London fix, daily) | Primary precious metal |
| Silver (XAG/USD) | `xagusd` | — | — |
| Platinum (XPT/USD) | `xptusd` | — | — |
| Gold/Silver Ratio | Computed | Computed | Historically mean-reverts around 60-80 |

#### G4.2 Energy

**Layout**: Stat cards + line charts.

| Commodity | Primary Source | FRED Series | Notes |
|---|---|---|---|
| WTI Crude Oil | Stooq `cl.f` | `DCOILWTICO` | US benchmark |
| Brent Crude Oil | Stooq `bz.f` | `DCOILBRENTEU` | Global benchmark |
| Natural Gas | Stooq `ng.f` | `DNGPSP` (monthly) | — |

#### G4.3 Industrial & Agricultural

**Layout**: Stat cards + line charts.

| Commodity | Primary Source | FRED Series | Notes |
|---|---|---|---|
| Copper | Stooq `hg.f` | `PCOPPUSDM` (monthly) | "Dr. Copper" — leading economic indicator |
| Lumber | Stooq `ls.f` | — | Leads housing activity |

#### G4.4 Gold vs Bitcoin

**Component**: `DualAxisChart` — overlay of BTC price (left Y, log scale) and Gold price (right Y, linear).

- BTC price from existing data hooks
- Gold price from Stooq
- 90-day rolling correlation coefficient displayed as annotation
- 2-year lookback default

#### G4.5 Commodity Index Proxy

**Chart**: PPI All Commodities as a broad commodity price proxy.

- FRED Series: `PPIACO`
- Area chart, 5-year lookback
- YoY % change as a secondary panel

**Data source strategy**: Stooq CSV endpoint primary (already proven in codebase: `https://stooq.com/q/d/l/?s={symbol}&i=d`). FRED for monthly series. Yahoo Finance (`query1.finance.yahoo.com`) as fallback.

---

### Module G5 — Global Equities

**Route**: `/global/equities`
**Purpose**: Global risk appetite and relative performance across equity markets.

#### G5.1 US Indices

**Layout**: Stat cards (current level, 1D change %, 30D change %) + line charts (1Y lookback).

| Index | Primary Source | Symbol | FRED Series |
|---|---|---|---|
| S&P 500 | FRED | — | `SP500` |
| Nasdaq Composite | FRED | — | `NASDAQCOM` |
| Russell 2000 | Stooq | `^rut` | — |
| Dow Jones | Stooq | `^dji` | — |

#### G5.2 Volatility

**Chart**: VIX line chart with zone coloring.

| Zone | VIX Range | Background | Interpretation |
|---|---|---|---|
| Complacent | < 15 | Green tint | Low vol; risk-on |
| Normal | 15-25 | No tint | Typical range |
| Elevated | 25-35 | Amber tint | Caution |
| Fear | > 35 | Red tint | Panic; potential buying opportunity |

**FRED Series**: `VIXCLS`

#### G5.3 European Indices

**Layout**: Stat cards + line charts.

| Index | Stooq Symbol | Yahoo Fallback | Notes |
|---|---|---|---|
| Euro Stoxx 50 | `^stoxx50e` | `^STOXX50E` | Eurozone blue chips |
| DAX | `^dax` | `^GDAXI` | Germany |
| FTSE 100 | `^ftse` | `^FTSE` | UK |

#### G5.4 Asia-Pacific Indices

| Index | Stooq Symbol | Yahoo Fallback | Notes |
|---|---|---|---|
| Nikkei 225 | `^nkx` | `^N225` | Japan |
| Hang Seng | `^hsi` | `^HSI` | Hong Kong |
| Shanghai Composite | `000001.ss` | `000001.SS` | China mainland |
| ASX 200 | `^aord` | `^AXJO` | Australia |

#### G5.5 Crypto-Adjacent Equities

**Layout**: Stat cards with BTC correlation annotation + line charts.

| Equity | Stooq Symbol | Yahoo Fallback | Notes |
|---|---|---|---|
| MicroStrategy (MSTR) | `mstr.us` | `MSTR` | Largest corporate BTC holder |
| Marathon Digital (MARA) | `mara.us` | `MARA` | BTC miner |
| Riot Platforms (RIOT) | `riot.us` | `RIOT` | BTC miner |
| Coinbase (COIN) | `coin.us` | `COIN` | Crypto exchange |

Each card displays: price, 1D/30D change, and "BTC correlation (90d): X.XX" annotation computed from price data.

#### G5.6 Global Performance Table

**Component**: `PerformanceTable` — sortable table with heatmap-coloured cells.

| Column | Type | Notes |
|---|---|---|
| Index Name | Text | All indices from above |
| Current Level | Number | Latest price/level |
| 1D % | Heatmap cell | Green positive, red negative |
| 1W % | Heatmap cell | — |
| 1M % | Heatmap cell | — |
| 3M % | Heatmap cell | — |
| YTD % | Heatmap cell | — |
| 1Y % | Heatmap cell | — |

Sortable by any column. Default sort: 1D % descending.

---

### Module G6 — Forex

**Route**: `/global/forex`
**Purpose**: Currency markets and dollar strength. The US dollar is the world's reserve currency; its strength inversely correlates with risk assets including Bitcoin.

#### G6.1 Dollar Index (DXY)

**Chart**: Large line chart (primary feature of the page), 2-year lookback.

- FRED Series: `DTWEXBGS` (Trade-Weighted Dollar Index: Broad)
- Optional BTC price overlay on secondary Y-axis (log scale)
- Zone interpretation displayed as annotation:
  - DXY rising + risk-off → "Flight to safety"
  - DXY rising + US outperformance → "Dollar smile right side"
  - DXY falling → "Risk-on / global growth"

#### G6.2 Major Forex Pairs

**Layout**: 2×2 grid of chart panels with stat cards.

| Pair | Stooq Symbol | FRED Fallback | Notes |
|---|---|---|---|
| EUR/USD | `eurusd` | `DEXUSEU` | World's most traded pair |
| USD/JPY | `usdjpy` | `DEXJPUS` | Yen carry trade proxy |
| GBP/USD | `gbpusd` | `DEXUSUK` | — |
| AUD/USD | `audusd` | `DEXUSAL` | Risk-on / commodity currency |

Each panel: line chart (1Y lookback), current rate, 1D change, 30D change.

#### G6.3 Dollar Smile Framework

**Component**: Informational card (not a chart) explaining the Dollar Smile model:

- **Left side of smile**: Dollar strengthens during global risk-off / flight to safety
- **Bottom of smile**: Dollar weakens when global growth is strong and synchronized
- **Right side of smile**: Dollar strengthens when US economy outperforms rest of world

This is a static educational panel with a simple illustration, helping the analyst contextualise DXY movements.

---

### Module G7 — Liquidity & Flows

**Route**: `/global/liquidity`
**Purpose**: The single most important macro driver for Bitcoin and risk assets. Global liquidity is the tide that raises all boats.

#### G7.1 US Net Liquidity

**Component**: `NetLiquidityChart` — the centerpiece of this page.

**Formula**: `Net Liquidity = Fed Balance Sheet (WALCL) - Treasury General Account (WTREGEN) - Reverse Repo Facility (RRPONTSYD)`

**Chart**: Large time-series chart (5-year lookback). Dual-axis:
- Left Y: Net Liquidity (trillions USD)
- Right Y: BTC price (log scale)

Annotate major BTC tops/bottoms to visually demonstrate the correlation between net liquidity and Bitcoin price.

**FRED Series**: `WALCL` (weekly), `WTREGEN` (weekly), `RRPONTSYD` (daily)

**Computation**: Server-side in the API route. Align weekly and daily series to common dates via forward-fill. Return the derived net liquidity time series.

#### G7.2 Global M2

**Chart**: Multi-line time series (5-year lookback) showing M2 money supply for major economies, plus a composite sum.

| Economy | FRED Series | Colour | Notes |
|---|---|---|---|
| United States | `M2SL` | `#3b82f6` (blue) | Monthly, SA |
| Eurozone | `MANMM101EZM189S` | `#22c55e` (green) | Broad money, monthly |
| Japan | `MANMM101JPM189S` | `#ef4444` (red) | Broad money, monthly |
| China | `MANMM101CNM189S` | `#f97316` (orange) | Broad money, monthly |

**Second panel**: Global M2 YoY growth rate (computed: sum of all 4, then 12-month % change). Overlay with BTC price on secondary axis.

#### G7.3 Fed Balance Sheet Decomposition

**Chart**: Stacked area chart showing the composition of the Fed's balance sheet over time.

| Component | FRED Series | Colour |
|---|---|---|
| Total Assets | `WALCL` | Border line (not filled) |
| US Treasuries Held | `TREAST` | `#3b82f6` (blue) |
| Mortgage-Backed Securities | `WSHOMCB` | `#8b5cf6` (purple) |

**Annotation**: Mark the start/end of QE/QT phases.

#### G7.4 Reverse Repo & Treasury General Account

**Layout**: Two side-by-side charts.

**Reverse Repo (RRP)**:
- FRED Series: `RRPONTSYD`
- Area chart. When RRP drains (value decreases) → liquidity injection (bullish)
- Annotation: "RRP draining = liquidity entering system"

**Treasury General Account (TGA)**:
- FRED Series: `WTREGEN`
- Area chart. When TGA builds (value increases) → liquidity drain (bearish, money leaving system into Treasury coffers)
- Annotation: "TGA building = liquidity leaving system"

#### G7.5 Credit Growth

**Chart**: Multi-line time series.

| Metric | FRED Series | Colour | Notes |
|---|---|---|---|
| Total Bank Credit | `TOTBKCR` | `#3b82f6` (blue) | When banks expand credit = accommodative |
| Commercial & Industrial Loans | `BUSLOANS` | `#22c55e` (green) | Business borrowing demand |

YoY % change view as secondary panel.

---

## 5. Product Modules — Bitcoin Outlook

All Bitcoin Outlook pages live under the `/bitcoin/*` route namespace. These modules are fully built and operational.

### Module B1 — On-Chain Analysis

**Route**: `/bitcoin/on-chain`
**Purpose**: Track Bitcoin's blockchain-native health signals — the metrics that are unique to Bitcoin and have no TradFi equivalent.

#### B1.1 Core Metrics

Each metric renders as an interactive time-series chart (Lightweight Charts `LineSeries`) with the following shared UX:
- Time-range selector: 1M, 3M, 6M, 1Y, 2Y, 4Y (full cycle), All
- Tooltip on hover showing date, value, and contextual interpretation
- Info icon (?) opening an explainer panel: what the metric measures, why it matters, historical context
- Zone highlighting: coloured background bands marking historically significant ranges

##### MVRV Z-Score

- **Definition**: `MVRV Z-Score = (Market Cap - Realised Cap) / StdDev(Market Cap)`
- **Chart**: Line chart of Z-Score over time. Y-axis: -1 to 10. Background bands:
  - Green zone: Z < 0 (historically near cycle bottoms)
  - Yellow zone: 0 <= Z < 3 (fair value range)
  - Orange zone: 3 <= Z < 7 (increasingly overvalued)
  - Red zone: Z >= 7 (historically near cycle tops)
- **Overlay**: BTC price on secondary Y-axis (log scale, 50% opacity) for correlation reference.
- **Data source**: CoinMetrics (current MVP) or Glassnode API [future].

##### NUPL (Net Unrealised Profit/Loss)

- **Definition**: `NUPL = (Market Cap - Realised Cap) / Market Cap`
- **Chart**: Area chart with 5 colour-coded phases:
  - `NUPL < 0`: Red — "Capitulation"
  - `0 <= NUPL < 0.25`: Orange — "Hope / Fear"
  - `0.25 <= NUPL < 0.50`: Yellow — "Optimism / Anxiety"
  - `0.50 <= NUPL < 0.75`: Green — "Belief / Denial"
  - `NUPL >= 0.75`: Blue — "Euphoria / Greed"
- **Data source**: CoinMetrics (current).

##### Puell Multiple

- **Definition**: `Puell Multiple = Daily Issuance Value (USD) / 365-day MA of Daily Issuance Value`
- **Chart**: Line chart. Y-axis: 0 to 8+. Background bands:
  - Green zone: Puell < 0.5 (miners underpaid — historically bullish)
  - Red zone: Puell > 4.0 (miners overpaid — historically bearish)
- **Markers**: Vertical lines at halving dates (2012-11-28, 2016-07-09, 2020-05-11, 2024-04-19).
- **Data**: Computed from daily block reward x price / 365d MA.

##### Stock-to-Flow (S2F)

- **Definition**: `S2F Ratio = Current Stock / Annual Flow`. Model price: `Price = e^(a) * S2F^b` where a = -1.84, b = 3.36.
- **Chart**: Dual-axis. Primary: BTC price (log). Secondary: S2F model price (log). Deviation bands at +/-1 standard deviation.
- **Colour coding**: Price dots coloured by days since last halving.
- **Data**: Fully computed client-side from halving schedule + historical price data.
- **Disclaimer badge**: "S2F is a contested model. Past fit does not equal future accuracy."

##### Reserve Risk

- **Definition**: `Reserve Risk = Price / (HODL Bank)` where HODL Bank = cumulative opportunity cost of not selling.
- **Chart**: Line chart on log scale. Green zone: < 0.002. Red zone: > 0.02.
- **Data**: Glassnode [future].

##### Active Addresses (30d MA)

- **Definition**: Unique addresses participating in transactions per day, smoothed with 30-day moving average.
- **Chart**: Area chart. Overlay: 365-day MA for trend comparison.
- **Derived signal**: `Trend = (MA30 - MA365) / MA365`. Positive = growing; negative = declining.
- **Data**: Blockchain.info `/charts/n-unique-addresses?timespan=5years&format=json`.

##### Exchange Net Position Change

- **Definition**: Net BTC flowing into (+) or out of (-) known exchange wallets, 30-day rolling sum.
- **Chart**: Bar chart (green bars = net outflow/bullish, red bars = net inflow/bearish).
- **Data**: Glassnode or CryptoQuant [future].

##### Hash Rate & Difficulty Ribbon

- **Definition**: Hash Rate = total network computational power (EH/s). Difficulty Ribbon = multiple MAs of hash rate.
- **Chart**: Area chart of hash rate with ribbon overlay. Ribbon compression signals miner capitulation.
- **Data**: Blockchain.info + Mempool.space.

##### SOPR (Spent Output Profit Ratio)

- **Definition**: `SOPR = Sum(spent output value at spend time) / Sum(spent output value at creation time)`.
- **Chart**: Line chart of 7-day MA. Reference line at SOPR = 1.0 (breakeven).
- **Data**: Glassnode [future].

##### Long-Term Holder (LTH) vs Short-Term Holder (STH) Supply

- **Definition**: LTH = coins unmoved for > 155 days. STH = coins moved within 155 days.
- **Chart**: Stacked area chart (LTH = blue, STH = orange) as % of circulating supply.
- **Data**: Glassnode [future].

##### Realised Price

- **Definition**: `Realised Price = Realised Cap / Circulating Supply`. Aggregate cost basis of all Bitcoin.
- **Chart**: Line chart overlaid on spot price. Spot < realised price = historically a cycle bottom signal.
- **Data**: Glassnode [future].

##### Thermocap Multiple

- **Definition**: `Thermocap = Cumulative Miner Revenue (all time)`. `Thermocap Multiple = Market Cap / Thermocap`.
- **Chart**: Line chart. Horizontal lines at 8x, 16x, 32x multiples (historical cycle tops).
- **Data**: Computed from daily block reward x price [future].

#### B1.2 On-Chain Composite Score

A single 0-100 gauge displayed at the top of the On-Chain page. See [Section 9.1](#91-on-chain-composite-score) for formula.

- **Widget**: `GaugeChart` component with score, traffic-light colour, and one-sentence interpretation.
- **Breakdown**: Expandable panel showing each sub-indicator's raw value, normalised score (0-100), and weight contribution.
- **Unavailable indicators**: The gauge displays with available indicators only, re-normalising weights. A badge reads "Score based on X of 8 indicators."

---

### Module B2 — Technical Analysis

**Route**: `/bitcoin/technical`
**Purpose**: Full-featured interactive price chart with oscillators, momentum indicators, cycle tools, and relative strength analysis.

#### B2.1 Price Chart

**Component**: `CandlestickChart` (Lightweight Charts)

- **Default view**: Daily candlestick chart, BTC/USDT, full historical range (2013-present).
- **Timeframe selector**: 1H, 4H, 1D (default), 1W.
- **Chart type toggle**: Candlestick (default) / Line.
- **Y-axis**: Log scale toggle.
- **Crosshair**: Shows OHLCV + date on hover. Synced across all sub-panes.

##### Moving Average Overlays

User-togglable via a checkbox panel beside the chart.

| MA | Default | Colour | Style |
|---|---|---|---|
| 20 SMA | Off | `#8b5cf6` (purple) | Solid, 1px |
| 50 SMA | Off | `#ec4899` (pink) | Solid, 1px |
| 100 SMA | Off | `#f97316` (orange) | Solid, 1px |
| 200 SMA | Off | `#22c55e` (green) | Solid, 2px |
| 365 SMA | Off | `#06b6d4` (cyan) | Dashed, 1px |
| 21 EMA | On | `#3b82f6` (blue) | Solid, 1px |
| 55 EMA | On | `#ef4444` (red) | Solid, 1px |
| 200 EMA | On | `#22c55e` (green) | Solid, 2px |

##### Golden Cross / Death Cross Detection

- **Golden Cross**: 50 SMA crosses above 200 SMA.
- **Death Cross**: 50 SMA crosses below 200 SMA.
- **Display**: Chart marker with annotation label and date.

##### 200-Week Moving Average Heatmap

- **Chart**: Price line coloured by distance from 200-week MA.
- **Colour gradient**: Blue (below) → Green → Yellow → Orange → Red (far above).

#### B2.2 Oscillators & Momentum (Sub-Charts)

Rendered as `IndicatorSubchart` components stacked below the main price chart. Time axes are synchronised.

##### RSI (14)

- **Formula**: Wilder's smoothing. Y-axis fixed 0-100. Bands at 30/70.

##### MACD (12, 26, 9)

- MACD line (blue), Signal line (orange), Histogram bars (green/red).

##### Stochastic RSI

- %K (solid), %D (dashed). Y-axis 0-100. Bands at 20/80.

##### Bollinger Bands (20, 2)

- Overlaid on main price chart. Middle (dashed grey), Upper/Lower (solid grey), filled area (semi-transparent).
- **Squeeze detection**: Bandwidth below 120-period low → dot marker.

#### B2.3 Relative Strength

##### BTC / Gold Ratio

- **Data**: Gold from Stooq / FRED. BTC from existing hooks.
- **Chart**: Line chart with trend line and historical percentile rank.

##### BTC / S&P 500 Ratio

- **Data**: FRED `SP500`.

##### BTC / DXY Inverse

- **Data**: FRED `DTWEXBGS`. Dual-axis chart with 90-day rolling correlation.

##### BTC Dominance

- **Data**: CoinGecko `/global`.
- **Chart**: Area chart, Y-axis 30-80%.

#### B2.4 Cycle Tools

##### Pi Cycle Top Indicator

- 111-day MA and 350-day MA x 2. Cross = within 3 days of cycle top historically.
- Status widget showing current gap %.

##### 2-Year MA Multiplier

- 730-day SMA (floor) and 730-day SMA x 5 (ceiling).

##### Rainbow Chart

- Logarithmic regression bands with 8 labeled zones from "Fire Sale" to "Maximum Bubble Territory".

##### Halving Countdown

- Circular progress ring, blocks remaining, estimated date, historical cycle table.
- Data: Mempool.space.

#### B2.5 TA Composite Score

Horizontal badge: "Strong Sell | Sell | Neutral | Buy | Strong Buy" with numeric score (0-100). See [Section 9.2](#92-technical-composite-score).

---

### Module B3 — Fundamental Analysis

**Route**: `/bitcoin/fundamental`
**Purpose**: Aggregate qualitative and quantitative macro-fundamental signals that influence Bitcoin's price from outside the blockchain.

#### B3.1 Fear & Greed Index

- **Data**: Alternative.me.
- **Display**: Large circular gauge (0=Extreme Fear, 100=Extreme Greed) with 30-day sparkline.

#### B3.2 Futures Open Interest

- **Data**: Binance Futures.
- **Chart**: Line chart of OI over time with 90-day MA. Elevated leverage warning badge.

#### B3.3 Funding Rate

- **Data**: Binance Futures.
- **Display**: Card with current rate and annualised rate.

#### B3.4 Macro Snapshot

- **Data**: FRED API.
- **Display**: Card grid showing Fed Funds Rate, CPI YoY, M2 YoY, 10Y Yield.

#### B3.5 Regulation Tracker [Future]

- Vertical timeline of regulatory events with sentiment badges.

#### B3.6 ETF Flows Dashboard [Future]

- Daily net inflows/outflows for spot Bitcoin ETFs.

#### B3.7 Corporate Treasury Tracker [Future]

- Table of public companies holding BTC.

#### B3.8 Nation-State Adoption [Future]

- World map SVG with countries coloured by adoption tier.

#### B3.9 Fundamental Composite Score

See [Section 9.3](#93-fundamental-composite-score). Displayed as gauge at top of page.

---

### Module B4 — Bitcoin Market Cap in Context

**Route**: `/bitcoin/market-cap`
**Purpose**: Put Bitcoin's market cap in perspective against global asset classes.

#### B4.1 Asset Class Comparison Table & Bar Chart

| Asset Class | Estimated Global Value | BTC Market Cap as % | Source |
|---|---|---|---|
| Gold | $17.5T | auto-computed | World Gold Council |
| Silver | $1.4T | auto-computed | Silver Institute |
| All Commodities | $6.0T | auto-computed | Bloomberg estimate |
| Global Real Estate | $330T | auto-computed | Savills |
| Global Equities | $115T | auto-computed | WFE |
| Global Debt (Bonds) | $133T | auto-computed | BIS |
| Global Money Supply (M2) | $105T | auto-computed | Trading Economics |
| Global Derivatives (notional) | $715T | auto-computed | BIS |
| Art & Collectibles | $2.2T | auto-computed | Art Basel |

Horizontal bar chart (log scale) with BTC market cap overlay.

#### B4.2 "What If BTC Captured X%" Slider

- Dropdown: Select comparison asset.
- Slider: 0.1% to 100% (logarithmic scale).
- Outputs: Implied Market Cap, Implied BTC Price, Price Multiple.
- Presets: 1%, 5%, 10%, 25%, 50%, 100%.

#### B4.3 Logarithmic Growth Trajectory

- BTC market cap on log Y-axis with power-law regression and +/-1 sigma / +/-2 sigma bands.
- Milestone lines at $1T, $2T, $5T, $10T, $20T.

#### B4.4 Network Value Comparison

- Horizontal bar chart comparing BTC market cap to top companies (Apple, Microsoft, Nvidia, etc.).

---

### Module B5 — Dashboard Home & Synthesis

**Route**: `/bitcoin`
**Purpose**: The 60-second scan page. Everything a Bitcoin analyst needs at a glance.

#### B5.1 Top Bar (Global, persistent across all pages)

**Component**: `TopBar` — sticky, full-width.

- **Left**: "INVESTMENT COMMAND CENTRE" logo text.
- **Centre**: BTC price (large, mono font), 24h change (green/red), 7d change. Status dot.
- **Right**: Settings icon.

**Secondary info bar** (below TopBar on Bitcoin Dashboard only):
- Block height, time since last block, mempool size, avg transaction fee.
- Data: Mempool.space.

#### B5.2 Signal Summary Panel

4 gauge widgets in a row:

| Gauge | Label | Range | Source |
|---|---|---|---|
| 1 | On-Chain Health | 0-100 | Module B1 composite |
| 2 | Technical Score | 0-100 | Module B2 composite |
| 3 | Fundamental Score | 0-100 | Module B3 composite |
| 4 | **Conviction Score** | 0-100 | Weighted blend (see Section 9.4) |

Below: Template-based one-sentence summary.

#### B5.3 Key Alerts

Auto-generated list of up to 5 most significant signals currently firing. Sorted by priority and recency.

#### B5.4 Price Chart (Quick View)

Compact CandlestickChart (daily, last 6 months) with 21/55/200 EMA overlays. "Full Chart" link to `/bitcoin/technical`.

#### B5.5 Backtest Panel

- Strategy selector (4 EMA strategies)
- Stats grid: Total Return, Win Rate, Profit Factor, Max Drawdown, Buy & Hold comparison
- Equity curve mini-chart
- Trade log (expandable)

---

## 6. Data Architecture

### 6.1 Data Flow

```
External APIs (Binance, CoinGecko, FRED, Mempool.space, Alternative.me, CoinMetrics, Stooq, Yahoo Finance)
       |
  Next.js API Routes (/api/*)  <-- server-side, handles CORS, caching headers, API key injection
       |
  TanStack Query (client)  <-- manages cache, refetch intervals, stale-while-revalidate
       |
  lib/calc/* (client)  <-- computes derived indicators (RSI, MACD, composite scores)
       |
  React Components  <-- render charts, gauges, tables

  Binance WebSocket --> WebSocketProvider --> direct chart updates + query cache invalidation
```

### 6.2 Data Sources by Category

| Category | Primary Source | Fallback | Auth Required | Cost |
|---|---|---|---|---|
| Price & OHLCV | Binance REST + WS | CoinGecko | None | Free |
| Historical price (pre-2017) | CoinGecko | — | None | Free |
| Block data | Mempool.space | Blockchain.info | None | Free |
| Hash rate & difficulty | Blockchain.info | Mempool.space | None | Free |
| Fear & Greed | Alternative.me | — | None | Free |
| BTC Dominance | CoinGecko `/global` | — | None | Free |
| Futures OI & Funding | Binance Futures | — | None | Free |
| On-chain metrics (MVRV, NUPL) | CoinMetrics | Glassnode | API key | Free tier / $29+/mo |
| Macro (rates, CPI, M2, yields) | FRED | — | API key (free) | Free |
| Global equities (US) | FRED | Stooq | API key (free) | Free |
| Global equities (non-US) | Stooq | Yahoo Finance | None | Free |
| Commodities (daily) | Stooq | FRED (monthly) | None | Free |
| Forex pairs | Stooq | FRED | None | Free |
| Liquidity (Fed BS, TGA, RRP) | FRED | — | API key (free) | Free |
| Gold/SPX/DXY prices | FRED + Stooq | — | API key (free) | Free |
| Crypto-adjacent equities | Stooq | Yahoo Finance | None | Free |

### 6.3 API Routes

#### Existing (Bitcoin Outlook)

| Route | Purpose | Cache | Sources |
|---|---|---|---|
| `/api/price` | Current BTC/USDT price | 10s | Binance |
| `/api/candles` | BTC/USDT candlesticks | 60s | Binance |
| `/api/history` | 2000 days daily BTC history | 1h | Binance |
| `/api/history-extended` | 4000 days daily BTC history | 1h | Binance |
| `/api/fundamental` | Futures OI, funding rate | 5min | Binance Futures |
| `/api/fear-greed` | Fear & Greed Index | 1h | Alternative.me |
| `/api/macro` | Fed rate, CPI, M2, 10Y | 6h | FRED |
| `/api/dominance` | BTC market dominance | 5min | CoinGecko |
| `/api/market-cap` | BTC market cap snapshot | 5min | CoinGecko |
| `/api/nupl` | NUPL + MVRV | 6h | CoinMetrics |
| `/api/halving` | Halving countdown | 5min | Mempool.space |
| `/api/mempool-stats` | Mempool & block data | 1min | Mempool.space |
| `/api/relative-strength` | BTC vs Gold/SPX/DXY ratios | 1h | FRED + Stooq |

#### New (Global Outlook)

| Route | Purpose | Cache | Sources |
|---|---|---|---|
| `/api/global/overview` | Aggregated macro snapshot | 6h | FRED (7+ series) |
| `/api/global/economic` | Inflation, employment, output, leading indicators | 6h | FRED (12+ series) |
| `/api/global/rates` | Yield curve, credit spreads, real rates | 6h | FRED (15+ series) |
| `/api/global/commodities` | Precious metals, energy, industrial | 6h | Stooq + FRED |
| `/api/global/equities` | Global indices + crypto-adjacent stocks | 1h | FRED + Stooq + Yahoo |
| `/api/global/forex` | DXY + major forex pairs | 1h | FRED + Stooq |
| `/api/global/liquidity` | Net liquidity, Global M2, Fed BS, RRP, TGA | 6h | FRED (6+ series) |

### 6.4 Refresh Cadence

| Data Type | Server Cache (s-maxage) | Client staleTime | Client refetchInterval |
|---|---|---|---|
| Live BTC price | 10s | 5s | 10s |
| OHLCV candles | 60s (intraday), 300s (daily+) | 30s | None (WS updates) |
| On-chain metrics | 3600s (1h) | 30min | 60min |
| Fear & Greed | 3600s | 30min | 60min |
| Futures OI / Funding | 900s (15min) | 15min | 30min |
| Macro (FRED) | 21600s (6h) | 6h | 24h |
| Global equities | 3600s (1h) | 1h | 4h |
| Commodities | 21600s (6h) | 6h | 12h |
| Forex | 3600s (1h) | 1h | 4h |
| Liquidity (Fed BS/RRP/TGA) | 21600s (6h) | 6h | 12h |
| Market cap comparisons | 300s (5min) | 5min | 15min |
| Block height | 600s (10min) | 5min | 10min |

### 6.5 Caching Strategy

**Server-side** (Next.js API routes):
- Use `Cache-Control` headers with `s-maxage` and `stale-while-revalidate` for Vercel Edge caching.
- Example: `Cache-Control: public, s-maxage=21600, stale-while-revalidate=3600`

**Client-side** (TanStack Query):
- `staleTime`: How long data is considered fresh.
- `gcTime`: 10 minutes — keeps data in memory for tab switches.
- `refetchOnWindowFocus: true`.
- `retry: 2` with exponential backoff.

**WebSocket**:
- Updates the last candle in TanStack Query cache directly.

---

## 7. Technical Architecture

### 7.1 Tech Stack

| Layer | Technology | Version | Rationale |
|---|---|---|---|
| Framework | Next.js (App Router) | 16+ | SSR, API routes, file-based routing, Vercel-native |
| Language | TypeScript | 5.x | Type safety across data models |
| Styling | Tailwind CSS | 4.x | Utility-first, dark theme support |
| Price Charts | Lightweight Charts | 4.1.3 | TradingView quality, performant |
| Dashboard Charts | Recharts | 3.x | React-native, declarative |
| Data Fetching | TanStack Query | 5.x | Caching, deduplication, background refetching |
| Deployment | Vercel | — | Zero-config for Next.js |

### 7.2 Directory Structure

```
btc-dashboard/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root: providers, fonts, TopBar, NavSidebar
│   │   ├── page.tsx                      # Global Overview (landing page)
│   │   ├── loading.tsx                   # Global skeleton
│   │   ├── global/
│   │   │   ├── economic/
│   │   │   │   └── page.tsx              # Economic Indicators
│   │   │   ├── rates/
│   │   │   │   └── page.tsx              # Treasury & Rates
│   │   │   ├── commodities/
│   │   │   │   └── page.tsx              # Commodities
│   │   │   ├── equities/
│   │   │   │   └── page.tsx              # Global Equities
│   │   │   ├── forex/
│   │   │   │   └── page.tsx              # Forex
│   │   │   └── liquidity/
│   │   │       └── page.tsx              # Liquidity & Flows
│   │   ├── bitcoin/
│   │   │   ├── page.tsx                  # Bitcoin Dashboard Home (Module B5)
│   │   │   ├── technical/
│   │   │   │   └── page.tsx              # Technical Analysis (Module B2)
│   │   │   ├── fundamental/
│   │   │   │   └── page.tsx              # Fundamental Analysis (Module B3)
│   │   │   ├── market-cap/
│   │   │   │   └── page.tsx              # Market Cap Context (Module B4)
│   │   │   └── on-chain/
│   │   │       └── page.tsx              # On-Chain Analysis (Module B1)
│   │   └── api/
│   │       ├── price/route.ts
│   │       ├── candles/route.ts
│   │       ├── history/route.ts
│   │       ├── history-extended/route.ts
│   │       ├── fundamental/route.ts
│   │       ├── fear-greed/route.ts
│   │       ├── macro/route.ts
│   │       ├── dominance/route.ts
│   │       ├── market-cap/route.ts
│   │       ├── nupl/route.ts
│   │       ├── halving/route.ts
│   │       ├── mempool-stats/route.ts
│   │       ├── relative-strength/route.ts
│   │       ├── health/route.ts
│   │       └── global/
│   │           ├── overview/route.ts
│   │           ├── economic/route.ts
│   │           ├── rates/route.ts
│   │           ├── commodities/route.ts
│   │           ├── equities/route.ts
│   │           ├── forex/route.ts
│   │           └── liquidity/route.ts
│   ├── components/
│   │   ├── layout/
│   │   │   ├── TopBar.tsx
│   │   │   ├── NavSidebar.tsx            # Two-tier grouped navigation
│   │   │   ├── MainArea.tsx
│   │   │   └── ModuleHeader.tsx
│   │   ├── charts/
│   │   │   ├── CandlestickChart.tsx
│   │   │   ├── RSISubchart.tsx
│   │   │   ├── MACDSubchart.tsx
│   │   │   ├── StochRSISubchart.tsx
│   │   │   ├── PiCycleChart.tsx
│   │   │   ├── TwoYearMAChart.tsx
│   │   │   ├── RainbowChart.tsx
│   │   │   ├── MAHeatmapChart.tsx
│   │   │   ├── BTCDominanceChart.tsx
│   │   │   ├── RelativeStrengthChart.tsx
│   │   │   └── EquityCurve.tsx
│   │   ├── global/                       # New: Global Outlook components
│   │   │   ├── FREDTimeSeriesChart.tsx   # Generic multi-series FRED chart
│   │   │   ├── YieldCurveChart.tsx       # Cross-sectional yield curve
│   │   │   ├── DualAxisChart.tsx         # Two Y-axes overlay
│   │   │   ├── MetricHeatmapStrip.tsx    # Row of stat cards with coloring
│   │   │   ├── PerformanceTable.tsx      # Sortable heatmap table
│   │   │   ├── NetLiquidityChart.tsx     # Net liquidity vs BTC
│   │   │   ├── GlobalM2Chart.tsx         # Multi-economy M2
│   │   │   ├── RiskRegimeBadge.tsx       # Risk-On / Neutral / Risk-Off
│   │   │   ├── MacroCalendar.tsx         # Upcoming macro events
│   │   │   └── DollarSmileCard.tsx       # Educational forex card
│   │   ├── dashboard/
│   │   │   ├── SignalSummaryPanel.tsx
│   │   │   ├── SummaryText.tsx
│   │   │   └── KeyAlerts.tsx
│   │   ├── fundamental/
│   │   │   ├── FearGreedGauge.tsx
│   │   │   ├── FundingRateCard.tsx
│   │   │   ├── FuturesOIChart.tsx
│   │   │   └── MacroSnapshotCards.tsx
│   │   ├── market-cap/
│   │   │   ├── AssetComparisonTable.tsx
│   │   │   ├── AssetTreemap.tsx
│   │   │   ├── WhatIfSlider.tsx
│   │   │   ├── LogGrowthChart.tsx
│   │   │   └── NetworkValueChart.tsx
│   │   ├── widgets/
│   │   │   ├── HalvingCountdown.tsx
│   │   │   └── GaugeChart.tsx
│   │   ├── backtest/
│   │   │   ├── BacktestPanel.tsx
│   │   │   ├── EquityCurve.tsx
│   │   │   ├── TradeLog.tsx
│   │   │   ├── StrategySelector.tsx
│   │   │   └── Stats.tsx
│   │   └── shared/
│   │       ├── Skeleton.tsx
│   │       ├── Tooltip.tsx
│   │       ├── Badge.tsx
│   │       └── TimeframeSelector.tsx
│   ├── hooks/
│   │   ├── usePrice.ts
│   │   ├── useCandles.ts
│   │   ├── useWebSocket.ts
│   │   ├── useHistoricalData.ts
│   │   ├── useExtendedHistory.ts
│   │   ├── useTechnicalIndicators.ts
│   │   ├── useFundamentalData.ts
│   │   ├── useFearGreed.ts
│   │   ├── useDominance.ts
│   │   ├── useMarketCapData.ts
│   │   ├── useNuplData.ts
│   │   ├── useHalving.ts
│   │   ├── useMacroData.ts
│   │   ├── useRelativeStrength.ts
│   │   ├── useCompositeScore.ts
│   │   ├── useOnChainScore.ts
│   │   ├── useBacktest.ts
│   │   ├── useEconomicData.ts            # New: Global economic indicators
│   │   ├── useRatesData.ts               # New: Treasury & rates
│   │   ├── useCommoditiesData.ts         # New: Commodities
│   │   ├── useEquitiesData.ts            # New: Global equities
│   │   ├── useForexData.ts               # New: Forex pairs
│   │   ├── useLiquidityData.ts           # New: Liquidity & flows
│   │   └── useGlobalOverview.ts          # New: Overview aggregated data
│   ├── lib/
│   │   ├── api/
│   │   │   ├── fred.ts                   # Shared FRED fetcher (extracted)
│   │   │   ├── stooq.ts                  # Shared Stooq fetcher (extracted)
│   │   │   ├── yahoo-finance.ts          # New: Yahoo Finance fetcher (fallback)
│   │   │   ├── binance.ts
│   │   │   ├── coingecko.ts
│   │   │   ├── blockchain-info.ts
│   │   │   └── mempool.ts
│   │   ├── calc/
│   │   │   ├── ema.ts
│   │   │   ├── sma.ts
│   │   │   ├── rsi.ts
│   │   │   ├── macd.ts
│   │   │   ├── bollinger.ts
│   │   │   ├── stochastic-rsi.ts
│   │   │   ├── on-chain-scores.ts
│   │   │   ├── technical-scores.ts
│   │   │   ├── fundamental-scores.ts
│   │   │   ├── overall-score.ts
│   │   │   └── normalization.ts
│   │   ├── constants.ts
│   │   ├── types.ts
│   │   ├── format.ts
│   │   └── colors.ts
│   └── providers/
│       ├── QueryProvider.tsx
│       ├── ThemeProvider.tsx
│       └── WebSocketProvider.tsx
├── data/
│   ├── macro-calendar.json               # New: Upcoming macro events
│   ├── regulation-events.json
│   ├── corporate-treasuries.json
│   ├── etf-flows.json
│   └── asset-class-values.json
├── public/
│   └── favicon.ico
├── tailwind.config.ts
├── next.config.ts
├── tsconfig.json
└── package.json
```

### 7.3 Component Tree (Simplified)

```
RootLayout
├── QueryProvider
│   └── WebSocketProvider
│       ├── TopBar ("INVESTMENT COMMAND CENTRE", BTC price, status)
│       ├── NavSidebar (grouped: Global Outlook | Bitcoin Outlook)
│       └── <Page>
│           │
│           ├── / (Global Overview)
│           │   ├── MetricHeatmapStrip (Fed Rate, CPI, Unemployment, etc.)
│           │   ├── MarketsSnapshotGrid (S&P, Nasdaq, Gold, DXY, BTC, 10Y)
│           │   ├── RiskRegimeBadge
│           │   └── MacroCalendar
│           │
│           ├── /global/economic
│           │   ├── ModuleHeader
│           │   ├── InflationSection (FREDTimeSeriesChart × 4 series)
│           │   ├── EmploymentSection (4 chart panels)
│           │   ├── OutputSentimentSection (4 chart panels)
│           │   └── LeadingIndicatorsSection (3 chart panels)
│           │
│           ├── /global/rates
│           │   ├── ModuleHeader
│           │   ├── YieldCurveChart (cross-sectional)
│           │   ├── YieldCurveHistory (T10Y2Y, T10Y3M time series)
│           │   ├── KeyRatesCards + time series
│           │   ├── CreditConditionsChart (HY OAS, IG OAS)
│           │   ├── MOVEIndexPlaceholder
│           │   └── RealRatesChart (TIPS yield, breakeven)
│           │
│           ├── /global/commodities
│           │   ├── ModuleHeader
│           │   ├── PreciousMetalsGrid (Gold, Silver, Platinum, ratio)
│           │   ├── EnergyGrid (WTI, Brent, NatGas)
│           │   ├── IndustrialGrid (Copper, Lumber)
│           │   ├── DualAxisChart (Gold vs BTC)
│           │   └── CommodityIndexChart (PPI)
│           │
│           ├── /global/equities
│           │   ├── ModuleHeader
│           │   ├── USIndicesGrid (SPX, NDX, RUT, DJI)
│           │   ├── VIXChart (zone-coloured)
│           │   ├── EuropeanIndicesGrid (Stoxx, DAX, FTSE)
│           │   ├── AsiaIndicesGrid (Nikkei, HSI, SSE, ASX)
│           │   ├── CryptoEquitiesGrid (MSTR, MARA, RIOT, COIN)
│           │   └── PerformanceTable (all indices)
│           │
│           ├── /global/forex
│           │   ├── ModuleHeader
│           │   ├── DXYChart (large, with BTC overlay)
│           │   ├── ForexPairsGrid (EUR/USD, USD/JPY, GBP/USD, AUD/USD)
│           │   └── DollarSmileCard
│           │
│           ├── /global/liquidity
│           │   ├── ModuleHeader
│           │   ├── NetLiquidityChart (Fed BS - TGA - RRP, with BTC)
│           │   ├── GlobalM2Chart (US, EU, Japan, China + composite)
│           │   ├── FedBalanceSheetChart (stacked area)
│           │   ├── RRPChart + TGAChart (side by side)
│           │   └── CreditGrowthChart (bank credit, C&I loans)
│           │
│           ├── /bitcoin (Dashboard Home)
│           │   ├── SecondaryInfoBar
│           │   ├── SignalSummaryPanel (4 gauges)
│           │   ├── SummaryText
│           │   ├── KeyAlerts
│           │   ├── CandlestickChart (compact)
│           │   └── BacktestPanel
│           │
│           ├── /bitcoin/technical (full TA suite)
│           ├── /bitcoin/fundamental (F&G, OI, funding, macro)
│           ├── /bitcoin/market-cap (comparison, what-if, growth)
│           └── /bitcoin/on-chain (on-chain metrics)
```

### 7.4 State Management

**TanStack Query** handles all server state. No Redux/Zustand needed.

**React Context**:
- `WebSocketProvider`: Binance WS connection for live BTC price.
- `ThemeProvider`: Dark theme.

**Local state** (`useState` / `useLocalStorage`):
- Selected timeframe, enabled MA overlays, backtest strategies, chart type, log scale.

### 7.5 Key TypeScript Types

```typescript
// Existing types (Bitcoin-focused)
interface OHLCV { time: number; open: number; high: number; low: number; close: number; volume?: number; }
interface PriceData { price: number; change24h: number; changePercent24h: number; high24h: number; low24h: number; volume24h: number; timestamp: number; }
interface CompositeScores { onChain: number; technical: number; fundamental: number; overall: number; }

// New types (Global Outlook)
interface FREDTimeSeries {
  seriesId: string;
  label: string;
  data: { date: string; value: number }[];
  lastUpdated: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
}

interface YieldCurveSnapshot {
  date: string;
  yields: { maturity: string; tenor: number; yield: number }[];
}

interface GlobalEquityIndex {
  name: string;
  symbol: string;
  region: 'us' | 'europe' | 'asia' | 'crypto';
  current: number;
  change1d: number;
  change1w: number;
  change1m: number;
  change3m: number;
  changeYtd: number;
  change1y: number;
  sparkline: number[];  // 30 daily closes
}

interface CommodityPrice {
  name: string;
  symbol: string;
  price: number;
  change1d: number;
  change30d: number;
  history: { date: string; close: number }[];
}

interface ForexPair {
  pair: string;
  rate: number;
  change1d: number;
  change30d: number;
  history: { date: string; close: number }[];
}

interface NetLiquidity {
  date: string;
  fedBalanceSheet: number;
  tga: number;
  rrp: number;
  netLiquidity: number;  // = fedBalanceSheet - tga - rrp
  btcPrice?: number;
}

interface RiskRegime {
  regime: 'risk-on' | 'neutral' | 'risk-off';
  inputs: { metric: string; value: number; signal: 'positive' | 'neutral' | 'negative' }[];
}
```

### 7.6 Shared Utility Extraction

The FRED fetcher function is currently duplicated between `/api/macro/route.ts` and `/api/relative-strength/route.ts`. Extract into `src/lib/api/fred.ts`:

```typescript
// src/lib/api/fred.ts
export async function fetchFREDSeries(
  seriesId: string,
  options?: { observationStart?: string; observationEnd?: string; limit?: number }
): Promise<{ date: string; value: number }[]>

export async function fetchMultipleFREDSeries(
  seriesIds: string[]
): Promise<Record<string, { date: string; value: number }[]>>
```

Similarly, extract Stooq fetcher from `/api/relative-strength/route.ts` into `src/lib/api/stooq.ts`:

```typescript
// src/lib/api/stooq.ts
export async function fetchStooqDaily(
  symbol: string,
  options?: { days?: number }
): Promise<{ date: string; open: number; high: number; low: number; close: number; volume: number }[]>
```

---

## 8. UI/UX Wireframe Descriptions

### 8.1 Global Design System

**Colour Tokens** (dark theme):

| Token | Hex | Usage |
|---|---|---|
| `bg-primary` | `#0a0a0f` | Page background |
| `bg-panel` | `#0d0d14` | Sidebar, card containers |
| `bg-card` | `#111120` | Individual cards, chart backgrounds |
| `bg-card-hover` | `#161630` | Card hover state |
| `border-default` | `#1a1a2e` | Card borders, dividers |
| `border-active` | `#3b82f6` | Active tabs, focused inputs |
| `text-primary` | `#e0e0e0` | Main text |
| `text-secondary` | `#999999` | Labels, descriptions |
| `text-muted` | `#666666` | Timestamps, disabled text |
| `accent-blue` | `#3b82f6` | Primary accent, links |
| `accent-green` | `#22c55e` | Bullish, positive |
| `accent-red` | `#ef4444` | Bearish, negative |
| `accent-amber` | `#f59e0b` | Warning, neutral |
| `accent-purple` | `#8b5cf6` | Secondary accent |

**Typography**: Inter for UI; JetBrains Mono for numbers/prices.

**Spacing**: 4px grid. Cards: `p-4`. Gap between cards: `gap-4`. Sections: `gap-6`.

**Loading states**: Skeleton placeholders (`animate-pulse`). Never spinners.

### 8.2 Navigation Sidebar

```
┌──────────────────────┐
│  [ICC Logo]           │
│                       │
│  GLOBAL OUTLOOK       │  <-- muted, uppercase, 9px, tracking-wide
│  ─────────────────    │
│  ● Overview           │  <-- active = blue accent + bg highlight
│    Economic           │
│    Treasury & Rates   │
│    Commodities        │
│    Global Equities    │
│    Forex              │
│    Liquidity & Flows  │
│                       │
│  BITCOIN OUTLOOK      │  <-- second group heading
│  ─────────────────    │
│    Dashboard          │
│    Technical          │
│    Fundamental        │
│    Market Cap         │
│    On-Chain           │
│                       │
└──────────────────────┘
```

### 8.3 Global Overview Layout (`/`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ TopBar: [INVESTMENT COMMAND CENTRE]  [$XX,XXX ▲2.4%] [StatusDot] [⚙]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│  │Fed Rate  │ │CPI YoY  │ │Unemploy │ │M2 YoY   │ │10Y Yld  │  ...   │
│  │ 4.50%    │ │ 2.8% ▼  │ │ 4.1% ▲  │ │+4.2% ▲  │ │4.25% ▼  │         │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘         │
│                                                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────┐ │
│  │ S&P 500 │ │ Nasdaq  │ │ Gold    │ │ DXY     │ │ BTC     │ │10Y │ │
│  │ 5,892   │ │ 19,421  │ │ $2,178  │ │ 103.2   │ │$98,421  │ │4.25│ │
│  │ ▲ 0.8%  │ │ ▲ 1.2%  │ │ ▼ 0.3%  │ │ ▼ 0.1%  │ │ ▲ 2.4%  │ │▼.02│ │
│  │ [spark] │ │ [spark] │ │ [spark] │ │ [spark] │ │ [spark] │ │[sp]│ │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └────┘ │
│                                                                         │
│  ┌── Risk Regime ──┐  ┌── Macro Calendar ───────────────────────────┐  │
│  │                  │  │ Apr 30  FOMC Rate Decision         [HIGH]  │  │
│  │   [RISK-ON]      │  │ May 13  CPI Release               [HIGH]  │  │
│  │                  │  │ May 02  NFP Employment Report      [HIGH]  │  │
│  │  VIX: 14.2 ✓    │  │ May 30  Core PCE Release           [MED]   │  │
│  │  HY OAS: 310 ✓  │  │ Jun 11  FOMC Rate Decision         [HIGH]  │  │
│  │  Yield Curve: +  │  │                                             │  │
│  └──────────────────┘  └─────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 8.4 Economic Indicators Layout (`/global/economic`)

```
┌──────────────────────────────────────────────────────────────────┐
│ Module Header: Economic Indicators                                │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│ ── Inflation ──────────────────────────────────────────────────── │
│ ┌─ CPI: 2.8% ──┐ ┌─ Core CPI: 3.1% ┐ ┌─ Core PCE: 2.6% ──┐   │
│ └───────────────┘ └──────────────────┘ └─────────────────────┘   │
│ ┌────────────────────────────────────────────────────────────────┐│
│ │ [Multi-line chart: CPI, Core CPI, Core PCE, PPI]              ││
│ │ [Horizontal reference line at 2% Fed target]                   ││
│ │ [5-year lookback]                                              ││
│ └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│ ── Employment ─────────────────────────────────────────────────── │
│ ┌──────────────────┐ ┌──────────────────┐                         │
│ │ Unemployment Rate │ │ Nonfarm Payrolls │                         │
│ │ [Area chart]      │ │ [Bar chart, MoM] │                         │
│ │ 4.1%              │ │ +256K            │                         │
│ └──────────────────┘ └──────────────────┘                         │
│ ┌──────────────────┐ ┌──────────────────┐                         │
│ │ Jobless Claims    │ │ LFPR             │                         │
│ │ [Line + 4wk MA]  │ │ [Line chart]     │                         │
│ └──────────────────┘ └──────────────────┘                         │
│                                                                    │
│ ── Output & Sentiment ─────────────────────────────────────────── │
│ ┌──────────────────┐ ┌──────────────────┐                         │
│ │ ISM Mfg PMI      │ │ Ind. Production  │                         │
│ │ [Line, ref=50]   │ │ [Area, YoY]      │                         │
│ └──────────────────┘ └──────────────────┘                         │
│ ┌──────────────────┐ ┌──────────────────┐                         │
│ │ Consumer Sent.    │ │ Retail Sales     │                         │
│ │ [Line chart]      │ │ [Bar, MoM%]      │                         │
│ └──────────────────┘ └──────────────────┘                         │
│                                                                    │
│ ── Leading Indicators ─────────────────────────────────────────── │
│ ┌─────────────────────────────────┐ ┌──────────────────┐          │
│ │ Yield Curve (10Y-2Y & 10Y-3M)  │ │ CFNAI            │          │
│ │ [Dual line, red shading if <0]  │ │ [Bar chart]      │          │
│ └─────────────────────────────────┘ └──────────────────┘          │
└──────────────────────────────────────────────────────────────────┘
```

### 8.5 Treasury & Rates Layout (`/global/rates`)

```
┌──────────────────────────────────────────────────────────────────┐
│ Module Header: Treasury & Rates                                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│ ┌─ Yield Curve Snapshot ───────────────────────────────────────┐  │
│ │ [Cross-sectional chart: x=maturity, y=yield]                  │  │
│ │ [Lines: Current (white), 1Y ago (blue dash), 2Y ago (grey)]   │  │
│ │ [Red highlight on inverted segments]                           │  │
│ │ 1M  3M  6M  1Y  2Y  3Y  5Y  7Y  10Y  20Y  30Y              │  │
│ └───────────────────────────────────────────────────────────────┘  │
│                                                                    │
│ ┌─ Key Rates ──────────────────────────────────────────────────┐  │
│ │ Fed: 4.50%  │  10Y: 4.25%  │  20Y: 4.55%  │  30Y: 4.42%    │  │
│ └───────────────────────────────────────────────────────────────┘  │
│                                                                    │
│ ┌─ Yield Curve History ──────────┐ ┌─ Credit Conditions ───────┐ │
│ │ [10Y-2Y and 10Y-3M over time] │ │ [HY OAS + IG OAS lines]   │ │
│ │ [Red shading when inverted]    │ │ [Zone coloring for stress] │ │
│ │ [Recession bars in grey]       │ │                             │ │
│ └────────────────────────────────┘ └─────────────────────────────┘│
│                                                                    │
│ ┌─ MOVE Index ──────────────────┐ ┌─ Real Rates ───────────────┐ │
│ │ [Coming Soon]                  │ │ [TIPS yield + Breakeven]    │ │
│ │ ICE BofA MOVE Index — bond    │ │ [Dual line chart]           │ │
│ │ market implied volatility.     │ │                              │ │
│ └────────────────────────────────┘ └──────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

### 8.6 Commodities Layout (`/global/commodities`)

```
┌──────────────────────────────────────────────────────────────────┐
│ Module Header: Commodities                                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│ ── Precious Metals ────────────────────────────────────────────── │
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐   │
│ │ Gold $2,178      │ │ Silver $24.52    │ │ Gold/Silver: 88.8│   │
│ │ ▲ 0.5% (1d)     │ │ ▼ 0.3% (1d)     │ │ [Line chart]     │   │
│ │ [Line chart 1Y]  │ │ [Line chart 1Y]  │ │                  │   │
│ └──────────────────┘ └──────────────────┘ └──────────────────┘   │
│                                                                    │
│ ── Energy ─────────────────────────────────────────────────────── │
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐   │
│ │ WTI Crude $78.4  │ │ Brent $82.1      │ │ Nat Gas $2.84    │   │
│ │ [Line chart]     │ │ [Line chart]     │ │ [Line chart]     │   │
│ └──────────────────┘ └──────────────────┘ └──────────────────┘   │
│                                                                    │
│ ── Industrial ─────────────────────────────────────────────────── │
│ ┌──────────────────┐ ┌──────────────────┐                         │
│ │ Copper $4.12/lb  │ │ Lumber $528      │                         │
│ │ [Line chart]     │ │ [Line chart]     │                         │
│ └──────────────────┘ └──────────────────┘                         │
│                                                                    │
│ ┌─ Gold vs Bitcoin ────────────────────────────────────────────┐  │
│ │ [Dual-axis chart: BTC (left, log) vs Gold (right)]            │  │
│ │ [90d correlation: 0.42]                                        │  │
│ └───────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 8.7 Global Equities Layout (`/global/equities`)

```
┌──────────────────────────────────────────────────────────────────┐
│ Module Header: Global Equities                                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│ ── US Indices ─────────────────────────────────────────────────── │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│ │ S&P 500  │ │ Nasdaq   │ │ Russell  │ │ Dow      │              │
│ │ 5,892    │ │ 19,421   │ │ 2,234    │ │ 43,892   │              │
│ │ ▲ 0.8%   │ │ ▲ 1.2%   │ │ ▲ 0.4%   │ │ ▲ 0.6%   │              │
│ │ [spark]  │ │ [spark]  │ │ [spark]  │ │ [spark]  │              │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘              │
│                                                                    │
│ ── Volatility ─────────────────────────────────────────────────── │
│ ┌────────────────────────────────────────────────────────────────┐│
│ │ VIX: 14.2  [▓▓░░░░░░░░ Complacent]                            ││
│ │ [Line chart with zone coloring]                                 ││
│ └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│ ── Europe ──────── ── Asia-Pacific ──── ── Crypto Equities ───── │
│ ┌──────────┐       ┌──────────┐         ┌──────────┐             │
│ │ Stoxx 50 │       │ Nikkei   │         │ MSTR     │             │
│ │ DAX      │       │ Hang Seng│         │ MARA     │             │
│ │ FTSE     │       │ Shanghai │         │ RIOT     │             │
│ │ [charts] │       │ ASX 200  │         │ COIN     │             │
│ └──────────┘       └──────────┘         │ BTC corr │             │
│                                          └──────────┘             │
│                                                                    │
│ ── Global Performance Table ───────────────────────────────────── │
│ ┌──────────────────────────────────────────────────────────────┐  │
│ │ Index       │ Level  │ 1D%  │ 1W%  │ 1M%  │ 3M% │ YTD │ 1Y │  │
│ │ Nasdaq      │ 19,421 │ +1.2 │ +2.8 │ +5.4 │ ... │ ... │ .. │  │
│ │ S&P 500     │ 5,892  │ +0.8 │ +1.9 │ +3.2 │ ... │ ... │ .. │  │
│ │ ...         │        │      │      │      │     │     │    │  │
│ └──────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 8.8 Forex Layout (`/global/forex`)

```
┌──────────────────────────────────────────────────────────────────┐
│ Module Header: Forex                                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│ ┌─ DXY (Trade-Weighted Dollar Index) ──────────────────────────┐ │
│ │ Current: 103.2  │  1D: ▼ 0.1%  │  30D: ▼ 1.8%              │ │
│ │                                                                │ │
│ │ [Large line chart, 2Y lookback]                                │ │
│ │ [Optional BTC overlay on secondary axis]                       │ │
│ │                                                                │ │
│ └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│ ┌──────────────────┐ ┌──────────────────┐                         │
│ │ EUR/USD  1.0842  │ │ USD/JPY  151.24  │                         │
│ │ ▲ 0.2% (1d)     │ │ ▼ 0.3% (1d)     │                         │
│ │ [Line chart 1Y]  │ │ [Line chart 1Y]  │                         │
│ └──────────────────┘ └──────────────────┘                         │
│ ┌──────────────────┐ ┌──────────────────┐                         │
│ │ GBP/USD  1.2634  │ │ AUD/USD  0.6521  │                         │
│ │ ▲ 0.1% (1d)     │ │ ▲ 0.4% (1d)     │                         │
│ │ [Line chart 1Y]  │ │ [Line chart 1Y]  │                         │
│ └──────────────────┘ └──────────────────┘                         │
│                                                                    │
│ ┌─ Dollar Smile Framework ─────────────────────────────────────┐ │
│ │                                                                │ │
│ │  USD Strong ──┐         ┌── USD Strong                         │ │
│ │  (Risk-Off)    \       /   (US Outperforms)                    │ │
│ │                 \_____/                                         │ │
│ │                USD Weak                                         │ │
│ │              (Global Growth)                                    │ │
│ │                                                                │ │
│ │  Explanation of when/why the dollar strengthens or weakens.    │ │
│ └────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

### 8.9 Liquidity & Flows Layout (`/global/liquidity`)

```
┌──────────────────────────────────────────────────────────────────┐
│ Module Header: Liquidity & Flows                                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│ ┌─ US Net Liquidity ═══════════════════════════════════════════┐  │
│ │ Formula: Fed BS ($8.9T) - TGA ($0.7T) - RRP ($0.1T)         │  │
│ │        = Net Liquidity: $8.1T                                 │  │
│ │                                                                │  │
│ │ [Large dual-axis chart: Net Liquidity (left) vs BTC (right)]  │  │
│ │ [5-year lookback]                                              │  │
│ │ [Annotated BTC tops/bottoms showing correlation]               │  │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                    │
│ ┌─ Global M2 ─────────────────────────────────────────────────┐   │
│ │ [Multi-line: US (blue), EU (green), Japan (red), China (ora)]│   │
│ │ [Second panel: composite YoY growth rate]                     │   │
│ └───────────────────────────────────────────────────────────────┘   │
│                                                                    │
│ ┌─ Fed Balance Sheet ──────┐ ┌──────────────────────────────────┐ │
│ │ [Stacked area chart]      │ │ ┌─ RRP ────────┐ ┌─ TGA ──────┐│ │
│ │ Total: $8.9T              │ │ │ $0.1T         │ │ $0.7T      ││ │
│ │ Treasuries: $4.8T         │ │ │ [Area chart]  │ │[Area chart]││ │
│ │ MBS: $2.3T                │ │ │ "Draining =   │ │"Building = ││ │
│ │ [QE/QT phase annotations] │ │ │  liquidity +" │ │ liq. drain"││ │
│ └────────────────────────────┘ │ └──────────────┘ └────────────┘│ │
│                                 └──────────────────────────────────┘│
│                                                                    │
│ ┌─ Credit Growth ──────────────────────────────────────────────┐  │
│ │ [Multi-line: Bank Credit (blue), C&I Loans (green)]           │  │
│ │ [YoY % change panel below]                                    │  │
│ └───────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 8.10 Bitcoin Dashboard Layout (`/bitcoin`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ SecondaryBar: Block #XXX,XXX | Last block: Xm ago | Mempool: X.X vMB | Fee: XX sat/vB │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                  │
│  │ On-Chain  │ │Technical │ │Fundament.│ │ OVERALL  │                  │
│  │  Health   │ │  Score   │ │  Score   │ │CONVICTION│                  │
│  │   [72]    │ │  [Buy]   │ │   [58]   │ │   [64]   │                  │
│  │  gauge    │ │  gauge   │ │  gauge   │ │  gauge   │                  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘                  │
│                                                                         │
│  Summary: "Moderately overheated — MVRV approaching historical highs,  │
│            technicals bullish post-golden-cross, macro liquidity         │
│            expanding."                                                   │
│                                                                         │
│  ┌─ Key Alerts ───────────────────────────────────────────────────────┐ │
│  │ [Colour-coded alert cards]                                          │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌─ BTC/USDT (1D) ──────────────────────┐  ┌─ Backtest ────────────┐  │
│  │ [Candlestick chart with EMAs]         │  │ Strategy: EMA 21/55  │  │
│  │ [6-month compact view]                │  │ Return: +342%        │  │
│  │                                        │  │ Win Rate: 67%        │  │
│  │ [1H] [4H] [1D] [1W]   Full Chart ->  │  │ [Equity Curve]       │  │
│  └────────────────────────────────────────┘  └──────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Composite Score Methodology (Bitcoin)

Composite scores are Bitcoin-specific. The Global Outlook section is intentionally data-only — no composite scores.

### Score Philosophy

All three composite scores measure **market heat** on a 0-100 scale:
- **0** = Maximum value opportunity (historically near cycle bottoms)
- **50** = Neutral / fair value
- **100** = Maximum overvaluation (historically near cycle tops)

Low score = accumulate; high score = reduce exposure.

### Normalisation Functions (in `lib/calc/normalization.ts`)

**Min-Max**: `normalizeMinMax(value, min, max) = clamp((value - min) / (max - min), 0, 1) * 100`

**Sigmoid**: `normalizeSigmoid(value, center, steepness) = 100 / (1 + e^(-steepness * (value - center)))`

**Percentile Rank**: `percentileRank(value, sortedHistory) = (countBelow / totalCount) * 100`

### 9.1 On-Chain Composite Score

| # | Metric | Weight | Normalisation | 0 (Deep Value) | 100 (Extreme Heat) |
|---|---|---|---|---|---|
| 1 | MVRV Z-Score | 0.20 | `sigmoid(z, 3.0, 0.8)` | Z < 0 | Z > 7 |
| 2 | NUPL | 0.15 | `minMax(nupl, -0.2, 0.75)` | NUPL < 0 | NUPL > 0.75 |
| 3 | Puell Multiple | 0.10 | `sigmoid(puell, 1.5, 1.5)` | Puell < 0.5 | Puell > 4.0 |
| 4 | Reserve Risk | 0.10 | `sigmoid(log10(rr), -4.0, 2.0)` | RR < 0.0001 | RR > 0.02 |
| 5 | SOPR (7d MA) | 0.10 | `sigmoid(sopr, 1.0, 10.0)` | SOPR < 0.98 | SOPR > 1.05 |
| 6 | LTH Supply % | 0.10 | `1 - minMax(lth%, 0.55, 0.80)` | LTH > 80% | LTH < 55% |
| 7 | Exchange Net Flow (30d) | 0.10 | `sigmoid(flow/supply, 0, 500)` | Outflows | Inflows |
| 8 | Active Address Trend | 0.15 | `minMax((ma30-ma365)/ma365, -0.2, 0.3)` | Declining | Surging |

When metrics are unavailable: Re-normalise weights among available metrics.

### 9.2 Technical Composite Score

| # | Metric | Weight | Normalisation | 0 (Oversold) | 100 (Overbought) |
|---|---|---|---|---|---|
| 1 | RSI(14) | 0.15 | `minMax(rsi, 20, 80)` | RSI < 30 | RSI > 70 |
| 2 | MACD Histogram | 0.10 | `sigmoid(hist/price*1000, 0, 2)` | Deep negative | High positive |
| 3 | Price vs 200 SMA | 0.15 | `sigmoid((price-ma200)/ma200, 0.5, 3)` | Far below | Far above |
| 4 | Bollinger %B | 0.10 | `minMax(pctB, 0, 1) * 100` | Below lower | Above upper |
| 5 | Stochastic RSI %K | 0.10 | Direct (0-100) | < 20 | > 80 |
| 6 | Pi Cycle Proximity | 0.15 | Categorical (gap-based) | Gap > 30% | Gap <= 0% |
| 7 | 2-Year MA Position | 0.10 | `minMax(price, twoYrMA, twoYrMA*5)` | At floor | At 5x ceiling |
| 8 | BTC Dominance | 0.15 | `1 - minMax(dom, 40, 70)` | High dom | Low dom |

Display: 0-15 "Strong Buy", 15-35 "Buy", 35-65 "Neutral", 65-85 "Sell", 85-100 "Strong Sell".

### 9.3 Fundamental Composite Score

| # | Metric | Weight | Normalisation | 0 (Bullish) | 100 (Bearish) |
|---|---|---|---|---|---|
| 1 | Fear & Greed | 0.15 | Direct (0-100) | Extreme Fear | Extreme Greed |
| 2 | ETF Net Flows (30d) | 0.15 | `1 - sigmoid(flows_bn, 0, 0.3)` | Strong inflows | Strong outflows |
| 3 | Futures OI vs 90d Avg | 0.10 | `sigmoid((oi-avg90)/avg90, 0.2, 3)` | Low OI | High OI |
| 4 | Funding Rate (annualised) | 0.10 | `sigmoid(rate, 0, 100)` | Negative | Highly positive |
| 5 | Grayscale Premium | 0.10 | `1 - sigmoid(premium, -0.10, 10)` | Discount | Premium |
| 6 | M2 YoY Growth | 0.10 | `1 - sigmoid(m2_yoy, 0.05, 20)` | High growth | Low growth |
| 7 | Fed Funds Direction | 0.10 | Categorical | Rate cuts | Rate hikes |
| 8 | Regulation Sentiment | 0.10 | Categorical | Favorable | Restrictive |
| 9 | Corporate Adoption Trend | 0.10 | `1 - sigmoid(btc_change_90d%, 0, 5)` | Growing | Declining |

### 9.4 Overall Conviction Score

```
overallScore = 0.40 * onChainScore + 0.30 * technicalScore + 0.30 * fundamentalScore
```

When on-chain is unavailable: `0.55 * technicalScore + 0.45 * fundamentalScore`.

| Range | Label | Colour | Interpretation |
|---|---|---|---|
| 0-15 | MAXIMUM OPPORTUNITY | Deep green | Within 10% of cycle bottoms historically |
| 15-30 | Strong Value | Green | Accumulation zone |
| 30-45 | Moderate Value | Light green | Lean bullish |
| 45-55 | Neutral | Amber | Mixed signals |
| 55-70 | Moderately Overheated | Orange | Lean cautious |
| 70-85 | Significantly Overheated | Red | Reduce exposure |
| 85-100 | EXTREME CAUTION | Dark red | Within 10% of cycle tops historically |

---

## 10. Phase Roadmap

### Phase 1 (Shipped) — Bitcoin Outlook

All Bitcoin-specific modules are built and operational:

| Module | Status | Data Sources |
|---|---|---|
| Bitcoin Dashboard Home | Complete | All sources |
| Technical Analysis | Complete | Binance, CoinGecko, Mempool.space |
| Fundamental | Partial (3 of 9 indicators) | Alternative.me, Binance Futures, FRED |
| Market Cap | Complete | CoinGecko + static data |
| On-Chain | Partial (iframed) | CoinMetrics, Blockchain.info |
| Backtest Engine | Complete | Binance |

### Phase 2 (Next) — Global Outlook + Restructure

| Deliverable | Dependencies |
|---|---|
| Rename to "Investment Command Centre" | — |
| Restructure NavSidebar into two-tier grouped nav | — |
| Move BTC pages to `/bitcoin/*` routes | — |
| Global Overview landing page (`/`) | FRED API key |
| Economic Indicators page | FRED API key |
| Treasury & Rates page | FRED API key |
| Commodities page | Stooq (free) |
| Global Equities page | FRED + Stooq (free) |
| Forex page | FRED + Stooq (free) |
| Liquidity & Flows page | FRED API key |
| Extract shared FRED/Stooq utilities | — |
| New reusable chart components | — |

### Phase 3 (Future) — Enhanced Bitcoin + Platform

| Feature | Description |
|---|---|
| Full On-Chain module | All 12 metrics via Glassnode ($29/mo) |
| ETF Flows Dashboard | SoSoValue API or manual CSV |
| Corporate Treasury Tracker | BitcoinTreasuries.net |
| Regulation Tracker | Manual JSON curation |
| Nation-State Adoption Map | Manual JSON + SVG |
| MOVE Index (live data) | ICE BofA data source |
| User accounts | Save preferences, custom alerts |
| Push notifications | Threshold alerts via email/Telegram |
| Custom scoring weights | User-adjustable composite score weights |
| Historical score backtest | "What was the score at past cycle tops?" |
| AI-generated summaries | LLM-powered narrative from current data |
| Multi-asset scoring | ETH, SOL with same composite framework |
| Mobile app | React Native companion |

---

## 11. Success Metrics

### User Engagement (post-Phase 2)
| Metric | Target (90 days) | Measurement |
|---|---|---|
| Daily Active Users | 500+ | Vercel Analytics |
| Avg. session duration | > 120 seconds | Vercel Analytics |
| Pages per session | > 3.5 | Vercel Analytics |
| Return visit rate (7d) | > 40% | Vercel Analytics |
| Bounce rate | < 30% | Vercel Analytics |
| Global vs Bitcoin page split | ~40/60 | Vercel Analytics |

### Technical Performance
| Metric | Target | Measurement |
|---|---|---|
| Largest Contentful Paint (LCP) | < 1.5s (cached), < 3s (cold) | Lighthouse |
| First Input Delay (FID) | < 100ms | Web Vitals |
| Cumulative Layout Shift (CLS) | < 0.1 | Web Vitals |
| API route p95 latency | < 500ms | Vercel monitoring |
| WebSocket uptime | > 99% during market hours | Custom logging |

---

## 12. Risks & Mitigations

| # | Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|---|
| 1 | **FRED API rate limiting** — 120 req/min, 50+ series to fetch across Global pages | High | Medium | Batch requests per page. Cache 6h server-side. Use `Promise.allSettled` so one series failure doesn't block the page. |
| 2 | **Stooq reliability** — undocumented free service, no SLA | Medium | Medium | Yahoo Finance as fallback. `tryFetch` pattern with timeout. Graceful degradation: show available data, note missing. |
| 3 | **MOVE Index unavailability** — proprietary ICE/BofA data | Low | High | Show "Coming Soon" placeholder. VIX + credit spreads serve as proxy for market volatility. |
| 4 | **Data frequency mismatch** — FRED series vary (daily/weekly/monthly) | Medium | High | Normalise all data to daily frequency server-side via forward-fill. Charts handle mixed frequencies gracefully. |
| 5 | **Navigation complexity** — 12 pages vs original 5 | Medium | Medium | Two-tier grouping with clear headings. Active state highlighting. Collapsible groups on mobile. |
| 6 | **Binance API rate limiting** — heavy candle fetching | High | Medium | Server-side caching. Paginate historical fetches with delays. Exponential backoff. |
| 7 | **CoinGecko free tier throttling** — 10-30 req/min | Medium | High | Cache aggressively (5min stale). Batch requests. Fall back to Binance for price. |
| 8 | **Composite scores diverge from intuition** | High | Medium | Label scores as "heat" not "direction." Disclaimer about statistical positioning. Show breakdowns. |
| 9 | **Stale static data** — asset class values, macro calendar | Low | High | `lastUpdated` timestamps on all static data. Quarterly manual refresh. |
| 10 | **International equity data gaps** — non-US indices via Stooq may have delays | Low | Medium | Display data timestamps. Note "delayed data" where applicable. |

---

## 13. Appendix: API Reference Table

### Free APIs (No Authentication Required)

| API | Base URL | Endpoints Used | Rate Limit | Cost | Used For |
|---|---|---|---|---|---|
| **Binance REST** | `https://api.binance.com/api/v3` | `/klines`, `/ticker/24hr` | 6000 weight/min | Free | BTC OHLCV, 24h price |
| **Binance Futures** | `https://fapi.binance.com/fapi/v1` | `/openInterest`, `/fundingRate` | 2400 weight/min | Free | Futures OI, funding |
| **Binance WebSocket** | `wss://stream.binance.com:9443/ws` | `btcusdt@kline_{interval}` | 5 msg/sec | Free | Real-time candles |
| **CoinGecko** | `https://api.coingecko.com/api/v3` | `/coins/bitcoin`, `/global` | 10-30/min | Free | Market cap, dominance |
| **Alternative.me** | `https://api.alternative.me` | `/fng/?limit=30` | ~100/day | Free | Fear & Greed Index |
| **Blockchain.info** | `https://api.blockchain.info` | `/charts/*`, `/q/*` | ~100/5min | Free | Hash rate, addresses |
| **Mempool.space** | `https://mempool.space/api` | `/blocks/tip/height`, `/v1/fees/*` | ~100/10sec | Free | Block data, fees |
| **Stooq** | `https://stooq.com/q/d/l/` | `?s={symbol}&i=d` | Undocumented | Free | Gold, silver, oil, indices, forex |
| **Yahoo Finance** | `https://query1.finance.yahoo.com` | `/v8/finance/chart/{symbol}` | Undocumented | Free | Fallback for equities, commodities |

### Free APIs (API Key Required — Free Registration)

| API | Base URL | Key Series Used | Rate Limit | Cost | Used For |
|---|---|---|---|---|---|
| **FRED** | `https://api.stlouisfed.org/fred` | See below | 120 req/min | Free | All macro data |
| **CoinMetrics** | `https://community-api.coinmetrics.io` | `/timeseries/asset-metrics` | Varies | Free tier | MVRV, NUPL |

#### FRED Series Reference

**Economic Indicators:**
| Series ID | Name | Frequency | Used In |
|---|---|---|---|
| `CPIAUCSL` | CPI All Urban Consumers | Monthly | Economic, Overview |
| `CPILFESL` | Core CPI (ex Food & Energy) | Monthly | Economic |
| `PCEPILFE` | Core PCE Price Index | Monthly | Economic |
| `PPIACO` | PPI All Commodities | Monthly | Economic |
| `UNRATE` | Unemployment Rate | Monthly | Economic, Overview |
| `PAYEMS` | Nonfarm Payrolls | Monthly | Economic |
| `ICSA` | Initial Jobless Claims | Weekly | Economic |
| `CIVPART` | Labor Force Participation Rate | Monthly | Economic |
| `NAPM` | ISM Manufacturing PMI | Monthly | Economic |
| `INDPRO` | Industrial Production Index | Monthly | Economic |
| `UMCSENT` | Michigan Consumer Sentiment | Monthly | Economic |
| `RSXFS` | Retail Sales ex Food Services | Monthly | Economic |
| `T10Y2Y` | 10Y-2Y Treasury Spread | Daily | Economic, Rates |
| `T10Y3M` | 10Y-3M Treasury Spread | Daily | Economic, Rates |
| `CFNAI` | Chicago Fed National Activity Index | Monthly | Economic |

**Treasury & Rates:**
| Series ID | Name | Frequency | Used In |
|---|---|---|---|
| `DGS1MO` | 1-Month Treasury | Daily | Rates |
| `DGS3MO` | 3-Month Treasury | Daily | Rates |
| `DGS6MO` | 6-Month Treasury | Daily | Rates |
| `DGS1` | 1-Year Treasury | Daily | Rates |
| `DGS2` | 2-Year Treasury | Daily | Rates |
| `DGS3` | 3-Year Treasury | Daily | Rates |
| `DGS5` | 5-Year Treasury | Daily | Rates |
| `DGS7` | 7-Year Treasury | Daily | Rates |
| `DGS10` | 10-Year Treasury | Daily | Rates, Overview, Macro |
| `DGS20` | 20-Year Treasury | Daily | Rates |
| `DGS30` | 30-Year Treasury | Daily | Rates |
| `DFEDTARU` | Fed Funds Target (Upper) | Daily | Rates, Overview |
| `SOFR` | Secured Overnight Financing Rate | Daily | Rates |
| `BAMLH0A0HYM2` | HY Option-Adjusted Spread | Daily | Rates, Overview |
| `BAMLC0A0CM` | IG Option-Adjusted Spread | Daily | Rates |
| `BAMLMOVE` | MOVE Index (if available) | Daily | Rates |
| `DFII10` | 10Y TIPS Real Yield | Daily | Rates |
| `T10YIE` | 10Y Breakeven Inflation | Daily | Rates |

**Commodities:**
| Series ID | Name | Frequency | Used In |
|---|---|---|---|
| `GOLDAMGBD228NLBM` | Gold London Fix | Daily | Commodities (fallback) |
| `DCOILWTICO` | WTI Crude Oil | Daily | Commodities |
| `DCOILBRENTEU` | Brent Crude Oil | Daily | Commodities |
| `PCOPPUSDM` | Copper Price | Monthly | Commodities (fallback) |

**Equities & Volatility:**
| Series ID | Name | Frequency | Used In |
|---|---|---|---|
| `SP500` | S&P 500 Index | Daily | Equities, Overview |
| `NASDAQCOM` | Nasdaq Composite | Daily | Equities, Overview |
| `VIXCLS` | CBOE VIX | Daily | Equities, Overview |

**Liquidity:**
| Series ID | Name | Frequency | Used In |
|---|---|---|---|
| `M2SL` | M2 Money Supply (US) | Monthly | Liquidity, Overview, Macro |
| `WALCL` | Fed Balance Sheet Total Assets | Weekly | Liquidity |
| `WTREGEN` | Treasury General Account | Weekly | Liquidity |
| `RRPONTSYD` | Overnight Reverse Repo | Daily | Liquidity |
| `TREAST` | Treasuries Held by Fed | Weekly | Liquidity |
| `WSHOMCB` | MBS Held by Fed | Weekly | Liquidity |
| `MANMM101EZM189S` | Eurozone Broad Money | Monthly | Liquidity |
| `MANMM101JPM189S` | Japan Broad Money | Monthly | Liquidity |
| `MANMM101CNM189S` | China Broad Money | Monthly | Liquidity |
| `TOTBKCR` | Total Bank Credit | Weekly | Liquidity |
| `BUSLOANS` | Commercial & Industrial Loans | Weekly | Liquidity |

**Forex:**
| Series ID | Name | Frequency | Used In |
|---|---|---|---|
| `DTWEXBGS` | Trade-Weighted Dollar (Broad) | Daily | Forex, Overview |
| `DEXUSEU` | EUR/USD Exchange Rate | Daily | Forex (fallback) |
| `DEXJPUS` | USD/JPY Exchange Rate | Daily | Forex (fallback) |
| `DEXUSUK` | GBP/USD Exchange Rate | Daily | Forex (fallback) |
| `DEXUSAL` | AUD/USD Exchange Rate | Daily | Forex (fallback) |

### Stooq Symbols Reference

| Category | Symbol | Name |
|---|---|---|
| Precious Metals | `xauusd` | Gold |
| | `xagusd` | Silver |
| | `xptusd` | Platinum |
| Energy | `cl.f` | WTI Crude Futures |
| | `bz.f` | Brent Crude Futures |
| | `ng.f` | Natural Gas Futures |
| Industrial | `hg.f` | Copper Futures |
| | `ls.f` | Lumber Futures |
| US Indices | `^spx` | S&P 500 |
| | `^ndq` | Nasdaq |
| | `^rut` | Russell 2000 |
| | `^dji` | Dow Jones |
| European | `^stoxx50e` | Euro Stoxx 50 |
| | `^dax` | DAX |
| | `^ftse` | FTSE 100 |
| Asia-Pacific | `^nkx` | Nikkei 225 |
| | `^hsi` | Hang Seng |
| | `000001.ss` | Shanghai Composite |
| | `^aord` | ASX 200 |
| Crypto Equities | `mstr.us` | MicroStrategy |
| | `mara.us` | Marathon Digital |
| | `riot.us` | Riot Platforms |
| | `coin.us` | Coinbase |
| Forex | `eurusd` | EUR/USD |
| | `usdjpy` | USD/JPY |
| | `gbpusd` | GBP/USD |
| | `audusd` | AUD/USD |

### Client-Side Computed (No API)

| Metric | Inputs | Computation Location |
|---|---|---|
| All EMAs/SMAs | OHLCV candles | `lib/calc/ema.ts`, `lib/calc/sma.ts` |
| RSI(14) | Close prices | `lib/calc/rsi.ts` |
| MACD(12,26,9) | Close prices | `lib/calc/macd.ts` |
| Stochastic RSI | RSI values | `lib/calc/stochastic-rsi.ts` |
| Bollinger Bands(20,2) | Close prices | `lib/calc/bollinger.ts` |
| Pi Cycle (111/350x2) | Daily closes | `lib/calc/technical-scores.ts` |
| 2-Year MA Multiplier | Daily closes | `lib/calc/technical-scores.ts` |
| Rainbow Chart bands | Full price history | `lib/calc/technical-scores.ts` |
| S2F Model | Halving schedule + price | `lib/calc/on-chain-scores.ts` |
| "What If" slider | BTC mcap + static values | `WhatIfSlider.tsx` |
| Log growth regression | Full mcap history | Market cap page |
| All composite scores | Normalised sub-scores | `lib/calc/*-scores.ts` |
| Backtest engine | OHLCV + strategy signals | `hooks/useBacktest.ts` |
| Net Liquidity | Fed BS - TGA - RRP | `/api/global/liquidity` (server-side) |
| Gold/Silver Ratio | Gold / Silver prices | `/api/global/commodities` (server-side) |
| Global M2 Composite | Sum of 4 economies | `/api/global/liquidity` (server-side) |
| YoY % changes | Monthly FRED series | Respective API routes (server-side) |
