import { NextResponse } from 'next/server'
import { fetchFREDSeries } from '@/lib/api/fred'

export type DataPoint = { date: string; value: number }

const CC_HISTODAY = 'https://min-api.cryptocompare.com/data/v2/histoday'

interface CCCandle { time: number; close: number }

async function fetchBtcWeekly(weeks: number): Promise<DataPoint[]> {
  const params = new URLSearchParams({
    fsym: 'BTC', tsym: 'USD',
    limit: String(weeks),
    aggregate: '7',
  })
  const res = await fetch(`${CC_HISTODAY}?${params}`, {
    signal: AbortSignal.timeout(10000),
    next: { revalidate: 3600 },
  })
  if (!res.ok) return []
  const json = (await res.json()) as { Response: string; Data: { Data: CCCandle[] } }
  if (json.Response !== 'Success') return []
  return json.Data.Data
    .filter((k) => k.close > 0)
    .map((k) => ({
      date:  new Date(k.time * 1000).toISOString().slice(0, 10),
      value: k.close,
    }))
}

export interface NetLiqPoint {
  date: string
  fedBalance: number  // $B
  tga: number         // $B
  rrp: number         // $B
  net: number         // $B
}

export interface LiquidityData {
  netLiquidity: {
    history: NetLiqPoint[]
    latest: NetLiqPoint & { changeWoW: number }
  }
  globalM2: {
    usHistory: DataPoint[]   // M2SL in $B
    usIndexed: DataPoint[]   // indexed to 100
    euIndexed: DataPoint[]
    jpIndexed: DataPoint[]
    cnIndexed: DataPoint[]
    usYoY: DataPoint[]
    euYoY: DataPoint[]
    jpYoY: DataPoint[]
    cnYoY: DataPoint[]
  }
  fedBalance: {
    total: DataPoint[]       // WALCL in $B
    treasuries: DataPoint[]  // TREAST in $B
    mbs: DataPoint[]         // WSHOMCB in $B
  }
  rrp: DataPoint[]           // RRPONTSYD in $B
  tga: DataPoint[]           // WTREGEN in $B
  creditGrowth: {
    totalBankCredit: DataPoint[]  // TOTBKCR in $B
    businessLoans: DataPoint[]    // BUSLOANS in $B
    totalYoY: DataPoint[]
    businessYoY: DataPoint[]
  }
  btcHistory: DataPoint[]
}

// ── helpers ────────────────────────────────────────────────────────────────

function mapToSorted(map: Map<string, number>): DataPoint[] {
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }))
}

function divBy(sorted: DataPoint[], divisor: number): DataPoint[] {
  return sorted.map((p) => ({
    date:  p.date,
    value: Math.round((p.value / divisor) * 100) / 100,
  }))
}

function findLastBefore(sorted: DataPoint[], targetDate: string): number {
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].date <= targetDate) return sorted[i].value
  }
  return 0
}

function yoyChange(sorted: DataPoint[]): DataPoint[] {
  const result: DataPoint[] = []
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i]
    const targetYear = new Date(p.date)
    targetYear.setFullYear(targetYear.getFullYear() - 1)
    const target    = targetYear.toISOString().slice(0, 10)
    const priorVal  = findLastBefore(sorted.slice(0, i), target)
    if (priorVal === 0) continue
    result.push({
      date:  p.date,
      value: Math.round(((p.value - priorVal) / Math.abs(priorVal)) * 10000) / 100,
    })
  }
  return result
}

function indexTo100(sorted: DataPoint[]): DataPoint[] {
  if (sorted.length === 0) return []
  const base = sorted[0].value
  if (base === 0) return []
  return sorted.map((p) => ({
    date:  p.date,
    value: Math.round((p.value / base) * 10000) / 100,
  }))
}

// ── route ──────────────────────────────────────────────────────────────────

export async function GET() {
  const now    = new Date()
  const d5y    = new Date(now); d5y.setFullYear(d5y.getFullYear() - 5)
  const d6y    = new Date(now); d6y.setFullYear(d6y.getFullYear() - 6)
  const start5 = d5y.toISOString().slice(0, 10)
  const start6 = d6y.toISOString().slice(0, 10)

  try {
    const [
      walclR, wtregenR, rrpR,
      treasR, mbsR,
      m2slR, euM2R, jpM2R, cnM2R,
      totbkcrR, busloansR,
      btcR,
    ] = await Promise.allSettled([
      // Net liquidity components
      fetchFREDSeries('WALCL',             start5, 3600),  // Fed BS, millions USD
      fetchFREDSeries('WTREGEN',           start5, 3600),  // TGA, millions USD
      fetchFREDSeries('RRPONTSYD',         start5, 3600),  // RRP, billions USD
      // Fed BS decomposition
      fetchFREDSeries('TREAST',            start5, 3600),  // Treasuries, millions USD
      fetchFREDSeries('WSHOMCB',           start5, 3600),  // MBS, millions USD
      // Global M2 (need 6y for 5y of YoY)
      fetchFREDSeries('M2SL',             start6, 3600),  // US M2, billions USD
      fetchFREDSeries('MANMM101EZM189S',  start6, 86400), // Eurozone narrow money, millions EUR
      fetchFREDSeries('MANMM101JPM189S',  start6, 86400), // Japan narrow money, millions JPY
      fetchFREDSeries('MANMM101CNM189S',  start6, 86400), // China narrow money, billions CNY
      // Credit
      fetchFREDSeries('TOTBKCR',          start5, 3600),  // Total bank credit, billions USD
      fetchFREDSeries('BUSLOANS',         start5, 3600),  // C&I loans, billions USD
      // BTC weekly ~5y via CryptoCompare (works on Vercel; Binance klines are geo-blocked)
      fetchBtcWeekly(300),
    ])

    const g = (r: PromiseSettledResult<Map<string, number>>): DataPoint[] =>
      r.status === 'fulfilled' ? mapToSorted(r.value) : []

    // ── Net Liquidity ────────────────────────────────────────────────────
    // WALCL & WTREGEN are in millions → divide by 1000 for billions
    // RRPONTSYD is already in billions
    const walclArr   = divBy(g(walclR),   1000)
    const wtregenArr = divBy(g(wtregenR), 1000)
    const rrpArr     = g(rrpR)

    const netLiqHistory: NetLiqPoint[] = walclArr.map((p) => {
      const tga = findLastBefore(wtregenArr, p.date)
      const rrp = findLastBefore(rrpArr,     p.date)
      return {
        date:       p.date,
        fedBalance: p.value,
        tga,
        rrp,
        net:        Math.round((p.value - tga - rrp) * 100) / 100,
      }
    })

    const lastNL = netLiqHistory.at(-1) ?? { date: '', fedBalance: 0, tga: 0, rrp: 0, net: 0 }
    const prevNL = netLiqHistory.at(-5) ?? lastNL
    const changeWoW =
      prevNL.net !== 0
        ? Math.round(((lastNL.net - prevNL.net) / Math.abs(prevNL.net)) * 10000) / 100
        : 0

    // ── Fed BS decomposition ─────────────────────────────────────────────
    const treasArr = divBy(g(treasR), 1000)
    const mbsArr   = divBy(g(mbsR),   1000)

    // ── Global M2 ────────────────────────────────────────────────────────
    const m2usArr  = g(m2slR)                    // billions USD
    const m2euArr  = divBy(g(euM2R), 1000)       // millions EUR → billions EUR
    const m2jpArr  = divBy(g(jpM2R), 1_000_000)  // millions JPY → trillions JPY
    const m2cnArr  = g(cnM2R)                    // billions CNY

    // ── Credit Growth ────────────────────────────────────────────────────
    const totbkcrArr  = g(totbkcrR)
    const busloansArr = g(busloansR)

    // ── BTC price ────────────────────────────────────────────────────────
    const btcHistory: DataPoint[] =
      btcR.status === 'fulfilled' ? btcR.value : []

    // ── Assemble response ────────────────────────────────────────────────
    const body: LiquidityData = {
      netLiquidity: {
        history: netLiqHistory,
        latest:  { ...lastNL, changeWoW },
      },
      globalM2: {
        usHistory:  m2usArr,
        usIndexed:  indexTo100(m2usArr),
        euIndexed:  indexTo100(m2euArr),
        jpIndexed:  indexTo100(m2jpArr),
        cnIndexed:  indexTo100(m2cnArr),
        usYoY:      yoyChange(m2usArr),
        euYoY:      yoyChange(m2euArr),
        jpYoY:      yoyChange(m2jpArr),
        cnYoY:      yoyChange(m2cnArr),
      },
      fedBalance: {
        total:      walclArr,
        treasuries: treasArr,
        mbs:        mbsArr,
      },
      rrp: rrpArr,
      tga: wtregenArr,
      creditGrowth: {
        totalBankCredit: totbkcrArr,
        businessLoans:   busloansArr,
        totalYoY:        yoyChange(totbkcrArr),
        businessYoY:     yoyChange(busloansArr),
      },
      btcHistory,
    }

    return NextResponse.json(body, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
