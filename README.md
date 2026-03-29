# BTC Command — Investment Command Centre

An institutional-grade, multi-asset investment analytics dashboard that consolidates the functionality of 10+ separate tools (FRED, TradingView, Glassnode, Bloomberg, LookIntoBitcoin) into a single dark-themed web application.

Built for portfolio managers and sophisticated investors who need macro context and crypto cycle intelligence in one interface.

---

## Features

### Bitcoin Outlook
- **Dashboard** — Composite conviction score, key alerts, and backtesting engine
- **Technical Analysis** — RSI, MACD, Stochastic RSI, Bollinger Bands, Pi Cycle, 2-Year MA, Rainbow Chart, BTC Dominance, Relative Strength
- **Fundamental** — Fear & Greed gauge, Futures Open Interest, Funding Rate, macro snapshot cards
- **Market Cap Context** — Asset bar charts, treemaps, comparisons, What-If slider, log growth charts, network value analysis
- **On-Chain** — Integrated on-chain metrics
- **Regulation** — Nation-state adoption tracker, regulation events timeline

### Global Outlook
- **Economic** — CPI, unemployment, Fed rates, M2 metrics via FRED
- **Equities** — Global indices performance
- **Commodities** — Gold, oil, copper, and more
- **Forex** — FX pairs, dollar index (DXY)
- **Rates** — Treasury yields, yield curve snapshot
- **Liquidity** — Central bank balance sheets, money supply flows

### Scoring Engine
A composite conviction scoring system (0–100) with labels: **Strong Buy / Buy / Neutral / Sell / Strong Sell**

| Score | Source |
|---|---|
| Technical Score | RSI, MACD, Stochastic RSI, Bollinger Bands, moving averages |
| On-Chain Score | MVRV, SOPR, NUPL, exchange flows |
| Fundamental Score | Fear & Greed, futures OI, funding rates, macro indicators |
| Overall Score | Blended composite of the three above |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 with App Router |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Charts | Lightweight Charts (TradingView), Recharts |
| Data | TanStack React Query v5 |
| Maps | react-simple-maps |
| Deployment | Vercel |

---

## Data Sources

| Source | Data |
|---|---|
| Binance | BTC/USDT price, futures Open Interest, funding rates |
| CryptoCompare | OHLCV candlestick data (1h, 4h, 1d, 1w) |
| CoinGecko | Market cap, global crypto metrics |
| FRED | CPI, unemployment, Fed rates, M2, Treasury yields |
| Yahoo Finance | Global equity indices, forex, commodities |
| Blockchain.info | Hash rate, difficulty, address count |
| Mempool.space | Mempool size, fee rates |
| Alternative.me | Fear & Greed Index |
| Stooq | Commodity and index fallback data |
| Google Gemini | Morning briefing generation, news feed |

---

## Project Structure

```
src/
├── app/
│   ├── api/              # 30+ server-side API proxy routes
│   ├── bitcoin/          # Bitcoin section pages
│   │   ├── page.tsx      # Dashboard
│   │   ├── technical/
│   │   ├── fundamental/
│   │   ├── on-chain/
│   │   ├── market-cap/
│   │   └── regulation/
│   ├── global/           # Global macro pages (6 sub-pages)
│   └── page.tsx          # Home overview
├── components/
│   ├── layout/           # Navigation, sidebar, headers
│   ├── charts/           # 15+ chart types
│   ├── dashboard/        # Summary panels, alerts
│   ├── fundamental/      # Fear/Greed, OI, funding rate cards
│   ├── global/           # Macro calendar, briefing, news
│   ├── market-cap/       # Asset comparison, treemaps, What-If slider
│   ├── adoption/         # Nation-state map, regulation tracker
│   ├── backtest/         # Backtesting engine
│   └── widgets/          # Gauge charts, halving countdown
├── hooks/                # 30+ custom React hooks
├── lib/
│   ├── api/              # External API wrappers
│   └── calc/             # Technical analysis algorithms
├── providers/            # React Query, Theme, WebSocket
└── data/                 # Static JSON (calendar, events, regulation)
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [FRED API key](https://fred.stlouisfed.org/docs/api/api_key.html) (free)
- A [Google Gemini API key](https://aistudio.google.com/app/apikey) (for briefing/news features)

### Installation

```bash
git clone <repo-url>
cd btc-dashboard
npm install
```

### Environment Variables

Create a `.env.local` file in the root:

```env
FRED_API_KEY=your_fred_api_key
GEMINI_API_KEY=your_gemini_api_key
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm start
```

---

## Deployment

The project is configured for [Vercel](https://vercel.com) with extended function timeouts for data-heavy routes:

| Route | Max Duration |
|---|---|
| `/api/history` | 30s |
| `/api/history-extended` | 30s |
| `/api/nupl` | 60s |
| `/api/fundamental` | 30s |

Deploy with:

```bash
vercel --prod
```

Or connect the repository to a Vercel project for automatic deployments on push.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run dev:clean` | Clean `.next` cache and start dev server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
