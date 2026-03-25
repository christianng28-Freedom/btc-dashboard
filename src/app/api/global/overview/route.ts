import { NextResponse } from 'next/server'
import { fetchFREDLatest, fetchFREDSeries } from '@/lib/api/fred'
import { fetchYahooFinanceDaily, fetchYahooFinanceQuote } from '@/lib/api/yahoo-finance'
import { fetchStooqDaily } from '@/lib/api/stooq'

export interface MarketSnap {
  price: number
  changePercent: number
  sparkline: { date: string; value: number }[]
}

export interface GlobalOverviewData {
  // Metric heatmap strip
  fedRate: number
  fedRateChange: number
  cpiYoY: number
  cpiYoYChange: number
  cpiDate: string
  unemployment: number
  unemploymentChange: number
  unemploymentDate: string
  m2YoY: number
  m2YoYChange: number
  m2Date: string
  tenYearYield: number
  tenYearYieldChange: number   // absolute change in yield points (e.g. +0.05 = +5 bps)
  tenYearDate: string
  dxy: number
  dxyChange: number
  dxyDate: string
  vix: number
  vixChange: number
  vixDate: string
  // Risk regime
  hyOAS: number
  yieldCurve10y2y: number
  regime: 'risk-on' | 'neutral' | 'risk-off'
  // Key markets
  markets: {
    sp500: MarketSnap
    nasdaq: MarketSnap
    gold: MarketSnap
    dxy: MarketSnap
    btc: MarketSnap
    tenY: MarketSnap
  }
}

function mapLatest(map: Map<string, number>): { value: number; date: string } | null {
  let last: { value: number; date: string } | null = null
  for (const [date, value] of map) last = { value, date }
  return last
}

function mapPrevValue(map: Map<string, number>): number | null {
  const entries = Array.from(map.entries())
  return entries.length >= 2 ? entries[entries.length - 2][1] : null
}

function mapToSparkline(map: Map<string, number>, n = 31): { date: string; value: number }[] {
  const entries = Array.from(map.entries())
  return entries.slice(-n).map(([date, value]) => ({ date, value }))
}

function computeRegime(vix: number, hyOAS: number, t10y2y: number): 'risk-on' | 'neutral' | 'risk-off' {
  if (vix > 28 || hyOAS > 550 || t10y2y < -0.75) return 'risk-off'
  if (vix < 18 && hyOAS < 400 && t10y2y > -0.25) return 'risk-on'
  return 'neutral'
}

export async function GET() {
  try {
    if (!process.env.FRED_API_KEY) {
      return NextResponse.json({ error: 'FRED_API_KEY not configured' }, { status: 500 })
    }

    // Start date ~45 calendar days back for sparkline data (~31 trading days)
    const d45 = new Date()
    d45.setDate(d45.getDate() - 45)
    const startDate45 = d45.toISOString().split('T')[0]

    // Fetch all FRED and equity data in parallel
    const [
      fedRateObs,
      cpiObs,
      unrateObs,
      m2Obs,
      dgs10Map,
      dxyMap,
      vixMap,
      hyOASObs,
      t10y2yObs,
      sp500Map,
      nasdaqMap,
      goldMap,
      sp500Quote,
      nasdaqQuote,
      dxyQuote,
      btcRes,
    ] = await Promise.all([
      fetchFREDLatest('DFEDTARL', 2),
      fetchFREDLatest('CPIAUCSL', 14),
      fetchFREDLatest('UNRATE', 3),
      fetchFREDLatest('M2SL', 14),
      fetchFREDSeries('DGS10', startDate45, 3600),
      // DX-Y.NYB = ICE US Dollar Index (traditional DXY ~99), not FRED DTWEXBGS (~120)
      fetchYahooFinanceDaily('DX-Y.NYB', '3mo', 300),
      fetchFREDSeries('VIXCLS', startDate45, 3600),
      fetchFREDLatest('BAMLH0A0HYM2', 2),
      fetchFREDLatest('T10Y2Y', 2),
      fetchYahooFinanceDaily('^GSPC', '3mo', 300),
      fetchYahooFinanceDaily('^NDX', '3mo', 300),
      fetchStooqDaily('xauusd', 3600),
      fetchYahooFinanceQuote('^GSPC'),
      fetchYahooFinanceQuote('^NDX'),
      fetchYahooFinanceQuote('DX-Y.NYB'),
      fetch(
        'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=daily',
        { next: { revalidate: 300 }, headers: { Accept: 'application/json' } },
      ),
    ])

    // --- Fed Rate ---
    const fedRate = fedRateObs[0]?.value ?? 0
    const fedRatePrev = fedRateObs[1]?.value ?? fedRate

    // --- CPI YoY ---
    const cpiYoY =
      cpiObs[0] && cpiObs[12]
        ? ((cpiObs[0].value - cpiObs[12].value) / cpiObs[12].value) * 100
        : 0
    const cpiYoYPrev =
      cpiObs[1] && cpiObs[13]
        ? ((cpiObs[1].value - cpiObs[13].value) / cpiObs[13].value) * 100
        : cpiYoY

    // --- Unemployment ---
    const unemployment = unrateObs[0]?.value ?? 0
    const unemploymentPrev = unrateObs[1]?.value ?? unemployment

    // --- M2 YoY ---
    const m2YoY =
      m2Obs[0] && m2Obs[12]
        ? ((m2Obs[0].value - m2Obs[12].value) / m2Obs[12].value) * 100
        : 0
    const m2YoYPrev =
      m2Obs[1] && m2Obs[13]
        ? ((m2Obs[1].value - m2Obs[13].value) / m2Obs[13].value) * 100
        : m2YoY

    // --- 10Y Yield ---
    const dgs10Latest = mapLatest(dgs10Map)
    const dgs10PrevVal = mapPrevValue(dgs10Map)
    const tenYearChange =
      dgs10Latest && dgs10PrevVal != null ? dgs10Latest.value - dgs10PrevVal : 0

    // --- DXY (Yahoo Finance DX-Y.NYB = ICE US Dollar Index ~99) ---
    const dxyEntries = Array.from(dxyMap.entries()).slice(-31)
    const dxySparkline = dxyEntries.map(([date, value]) => ({ date, value }))
    const dxyChange1d = dxyQuote.changePercent

    // --- VIX ---
    const vixLatest = mapLatest(vixMap)
    const vixPrevVal = mapPrevValue(vixMap)
    const vixChange1d =
      vixLatest && vixPrevVal && vixPrevVal > 0
        ? ((vixLatest.value - vixPrevVal) / vixPrevVal) * 100
        : 0

    // --- Risk regime ---
    const hyOAS = hyOASObs[0]?.value ?? 350
    const t10y2y = t10y2yObs[0]?.value ?? 0
    const regime = computeRegime(vixLatest?.value ?? 20, hyOAS, t10y2y)

    // --- Market sparklines ---
    const sp500Sparkline = Array.from(sp500Map.entries()).slice(-31).map(([date, value]) => ({ date, value }))
    const nasdaqSparkline = Array.from(nasdaqMap.entries()).slice(-31).map(([date, value]) => ({ date, value }))
    const goldEntries = Array.from(goldMap.entries()).slice(-31)
    const goldSparkline = goldEntries.map(([date, value]) => ({ date, value }))
    const goldPrice = goldEntries[goldEntries.length - 1]?.[1] ?? 0
    const goldPrevPrice = goldEntries[goldEntries.length - 2]?.[1] ?? goldPrice
    const goldChange1d = goldPrevPrice > 0 ? ((goldPrice - goldPrevPrice) / goldPrevPrice) * 100 : 0
    const dgs10Sparkline = mapToSparkline(dgs10Map)

    // --- BTC sparkline ---
    let btcSparkline: { date: string; value: number }[] = []
    let btcPrice = 0
    let btcChange1d = 0
    if (btcRes.ok) {
      const btcJson = (await btcRes.json()) as { prices: [number, number][] }
      btcSparkline = btcJson.prices.map(([ts, price]) => ({
        date: new Date(ts).toISOString().split('T')[0],
        value: Math.round(price),
      }))
      if (btcSparkline.length >= 2) {
        btcPrice = btcSparkline[btcSparkline.length - 1].value
        const btcPrev = btcSparkline[btcSparkline.length - 2].value
        btcChange1d = btcPrev > 0 ? ((btcPrice - btcPrev) / btcPrev) * 100 : 0
      }
    }

    const data: GlobalOverviewData = {
      fedRate,
      fedRateChange: Math.round((fedRate - fedRatePrev) * 100) / 100,
      cpiYoY: Math.round(cpiYoY * 10) / 10,
      cpiYoYChange: Math.round((cpiYoY - cpiYoYPrev) * 10) / 10,
      cpiDate: cpiObs[0]?.date ?? '',
      unemployment,
      unemploymentChange: Math.round((unemployment - unemploymentPrev) * 10) / 10,
      unemploymentDate: unrateObs[0]?.date ?? '',
      m2YoY: Math.round(m2YoY * 10) / 10,
      m2YoYChange: Math.round((m2YoY - m2YoYPrev) * 10) / 10,
      m2Date: m2Obs[0]?.date ?? '',
      tenYearYield: dgs10Latest?.value ?? 0,
      tenYearYieldChange: Math.round(tenYearChange * 10000) / 10000,
      tenYearDate: dgs10Latest?.date ?? '',
      dxy: Math.round(dxyQuote.price * 100) / 100,
      dxyChange: Math.round(dxyChange1d * 10) / 10,
      dxyDate: dxyEntries[dxyEntries.length - 1]?.[0] ?? '',
      vix: Math.round((vixLatest?.value ?? 0) * 100) / 100,
      vixChange: Math.round(vixChange1d * 10) / 10,
      vixDate: vixLatest?.date ?? '',
      hyOAS,
      yieldCurve10y2y: t10y2y,
      regime,
      markets: {
        sp500: {
          price: sp500Quote.price,
          changePercent: Math.round(sp500Quote.changePercent * 10) / 10,
          sparkline: sp500Sparkline,
        },
        nasdaq: {
          price: nasdaqQuote.price,
          changePercent: Math.round(nasdaqQuote.changePercent * 10) / 10,
          sparkline: nasdaqSparkline,
        },
        gold: {
          price: goldPrice,
          changePercent: Math.round(goldChange1d * 10) / 10,
          sparkline: goldSparkline,
        },
        dxy: {
          price: Math.round(dxyQuote.price * 100) / 100,
          changePercent: Math.round(dxyChange1d * 10) / 10,
          sparkline: dxySparkline,
        },
        btc: {
          price: btcPrice,
          changePercent: Math.round(btcChange1d * 10) / 10,
          sparkline: btcSparkline,
        },
        tenY: {
          price: dgs10Latest?.value ?? 0,
          changePercent: Math.round(tenYearChange * 10000) / 10000,
          sparkline: dgs10Sparkline,
        },
      },
    }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600' },
    })
  } catch (err) {
    console.error('[/api/global/overview]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
