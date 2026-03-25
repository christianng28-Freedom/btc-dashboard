import { NextResponse } from 'next/server'
import { fetchFREDLatest } from '@/lib/api/fred'

export interface MacroData {
  fedFundsLower: number
  fedFundsUpper: number
  cpiYoY: number
  cpiDate: string
  pceYoY: number
  pceDate: string
  m2Billions: number
  m2YoY: number
  m2Date: string
  tenYearYield: number
  tenYearDate: string
  dxy: number
  dxyDate: string
}

export async function GET() {
  try {
    if (!process.env.FRED_API_KEY) {
      return NextResponse.json({ error: 'FRED_API_KEY not configured' }, { status: 500 })
    }

    // Fetch all series in parallel
    const [fedLower, fedUpper, cpiObs, m2Obs, tenYObs, pceObs, dxyObs] = await Promise.all([
      fetchFREDLatest('DFEDTARL', 1),   // Fed funds target lower bound (daily)
      fetchFREDLatest('DFEDTARU', 1),   // Fed funds target upper bound (daily)
      fetchFREDLatest('CPIAUCSL', 14),  // CPI — need 13 months for YoY
      fetchFREDLatest('M2SL', 14),      // M2 — need 13 months for YoY
      fetchFREDLatest('DGS10', 5),      // 10Y yield (daily, skip weekends)
      fetchFREDLatest('PCEPI', 14),     // PCE Price Index — 13 months for YoY
      fetchFREDLatest('DTWEXBGS', 5),   // Broad dollar index (DXY proxy, weekly)
    ])

    // Fed funds range
    const fedFundsLower = fedLower[0]?.value ?? 0
    const fedFundsUpper = fedUpper[0]?.value ?? 0

    // CPI YoY: latest vs 12 months prior
    const cpiLatest = cpiObs[0]
    const cpiPrior = cpiObs[12]
    const cpiYoY = cpiLatest && cpiPrior
      ? ((cpiLatest.value - cpiPrior.value) / cpiPrior.value) * 100
      : 0

    // PCE YoY
    const pceLatest = pceObs[0]
    const pcePrior = pceObs[12]
    const pceYoY = pceLatest && pcePrior
      ? ((pceLatest.value - pcePrior.value) / pcePrior.value) * 100
      : 0

    // M2 YoY
    const m2Latest = m2Obs[0]
    const m2Prior = m2Obs[12]
    const m2YoY = m2Latest && m2Prior
      ? ((m2Latest.value - m2Prior.value) / m2Prior.value) * 100
      : 0

    // 10Y yield — most recent available
    const tenY = tenYObs[0]

    // DXY (broad) — most recent available
    const dxyLatest = dxyObs[0]

    const data: MacroData = {
      fedFundsLower,
      fedFundsUpper,
      cpiYoY: Math.round(cpiYoY * 10) / 10,
      cpiDate: cpiLatest?.date ?? '',
      pceYoY: Math.round(pceYoY * 10) / 10,
      pceDate: pceLatest?.date ?? '',
      m2Billions: m2Latest?.value ?? 0,
      m2YoY: Math.round(m2YoY * 10) / 10,
      m2Date: m2Latest?.date ?? '',
      tenYearYield: tenY?.value ?? 0,
      tenYearDate: tenY?.date ?? '',
      dxy: Math.round((dxyLatest?.value ?? 0) * 100) / 100,
      dxyDate: dxyLatest?.date ?? '',
    }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=21600, stale-while-revalidate=43200' },
    })
  } catch (err) {
    console.error('[/api/macro]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
