import { NextResponse } from 'next/server'
import { fetchFREDSeries } from '@/lib/api/fred'
import { fetchYahooFinanceDaily, fetchYahooFinanceQuote } from '@/lib/api/yahoo-finance'

export type DataPoint = { date: string; value: number }

export interface YieldCurvePoint {
  maturity: string
  months: number
  current: number | null
  oneYearAgo: number | null
  twoYearsAgo: number | null
}

export interface RatesData {
  snapshot: {
    points: YieldCurvePoint[]
    currentDate: string
    oneYearAgoDate: string
    twoYearsAgoDate: string
  }
  spreads: {
    spread10y2y: DataPoint[]
    spread10y3m: DataPoint[]
    latest: {
      spread10y2y: { value: number; change: number; date: string }
      spread10y3m: { value: number; change: number; date: string }
    }
  }
  keyRates: {
    fedFunds: DataPoint[]
    fedFundsLower: DataPoint[]
    y2: DataPoint[]
    y10: DataPoint[]
    y20: DataPoint[]
    y30: DataPoint[]
    sofr: DataPoint[]
    latest: {
      fedFunds: { value: number; date: string }
      y2: { value: number; change: number; date: string }
      y10: { value: number; change: number; date: string }
      y20: { value: number; change: number; date: string }
      y30: { value: number; change: number; date: string }
      sofr: { value: number; date: string }
    }
  }
  credit: {
    hyOas: DataPoint[]
    igOas: DataPoint[]
    latest: {
      hyOas: { value: number; change: number; date: string }
      igOas: { value: number; change: number; date: string }
    }
  }
  realRates: {
    tipsReal10y: DataPoint[]
    breakeven10y: DataPoint[]
    latest: {
      tipsReal10y: { value: number; change: number; date: string }
      breakeven10y: { value: number; change: number; date: string }
    }
  }
  recessionBands: Array<{ start: string; end: string }>
  move: {
    history: DataPoint[]
    latest: { value: number; change: number; changePercent: number; date: string } | null
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function mapToArray(map: Map<string, number>): DataPoint[] {
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }))
}

function last(arr: DataPoint[]): DataPoint | undefined {
  return arr[arr.length - 1]
}

function prev(arr: DataPoint[]): DataPoint | undefined {
  return arr[arr.length - 2]
}

function r2(v: number): number {
  return Math.round(v * 100) / 100
}

/** Find the latest date <= targetDate in the map and return its value. */
function valueAtDate(
  map: Map<string, number>,
  targetDate: string,
): { date: string; value: number } | null {
  const sorted = Array.from(map.keys()).sort()
  let result: string | null = null
  for (const d of sorted) {
    if (d <= targetDate) result = d
    else break
  }
  if (!result) return null
  return { date: result, value: map.get(result)! }
}

function dateMinusYears(dateStr: string, years: number): string {
  const d = new Date(dateStr)
  d.setFullYear(d.getFullYear() - years)
  return d.toISOString().slice(0, 10)
}

function computeRecessionBands(
  map: Map<string, number>,
  startFilter: string,
): Array<{ start: string; end: string }> {
  const sorted = Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .filter(([d]) => d >= startFilter)
  const bands: Array<{ start: string; end: string }> = []
  let inRecession = false
  let start = ''
  for (const [date, value] of sorted) {
    if (value === 1 && !inRecession) {
      inRecession = true
      start = date
    } else if (value === 0 && inRecession) {
      inRecession = false
      bands.push({ start, end: date })
    }
  }
  if (inRecession && sorted.length > 0) {
    bands.push({ start, end: sorted[sorted.length - 1][0] })
  }
  return bands
}

// ── route ────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    if (!process.env.FRED_API_KEY) {
      return NextResponse.json({ error: 'FRED_API_KEY not configured' }, { status: 500 })
    }

    const [
      dgs1moMap, dgs3moMap, dgs6moMap, dgs1Map, dgs2Map, dgs3Map,
      dgs5Map, dgs7Map, dgs10Map, dgs20Map, dgs30Map,
      t10y2yMap, t10y3mMap,
      dfedtaruMap, dfedtarlMap, sofrMap,
      bamlhyMap, bamlcigMap,
      dfii10Map, t10yieMap,
      usrecMap,
      moveMap, moveQuote,
    ] = await Promise.all([
      fetchFREDSeries('DGS1MO',       '2015-01-01', 21600),
      fetchFREDSeries('DGS3MO',       '2015-01-01', 21600),
      fetchFREDSeries('DGS6MO',       '2015-01-01', 21600),
      fetchFREDSeries('DGS1',         '2015-01-01', 21600),
      fetchFREDSeries('DGS2',         '2015-01-01', 21600),
      fetchFREDSeries('DGS3',         '2015-01-01', 21600),
      fetchFREDSeries('DGS5',         '2015-01-01', 21600),
      fetchFREDSeries('DGS7',         '2015-01-01', 21600),
      fetchFREDSeries('DGS10',        '2015-01-01', 21600),
      fetchFREDSeries('DGS20',        '2015-01-01', 21600),
      fetchFREDSeries('DGS30',        '2015-01-01', 21600),
      fetchFREDSeries('T10Y2Y',       '2015-01-01', 21600),
      fetchFREDSeries('T10Y3M',       '2015-01-01', 21600),
      fetchFREDSeries('DFEDTARU',     '2015-01-01', 21600),
      fetchFREDSeries('DFEDTARL',     '2015-01-01', 21600),
      fetchFREDSeries('SOFR',         '2018-04-01', 21600),
      fetchFREDSeries('BAMLH0A0HYM2', '2015-01-01', 21600),
      fetchFREDSeries('BAMLC0A0CM',   '2015-01-01', 21600),
      fetchFREDSeries('DFII10',       '2015-01-01', 21600),
      fetchFREDSeries('T10YIE',       '2015-01-01', 21600),
      fetchFREDSeries('USREC',        '2015-01-01', 86400),
      fetchYahooFinanceDaily('^MOVE', '5y', 21600).catch(() => new Map<string, number>()),
      fetchYahooFinanceQuote('^MOVE').catch(() => null),
    ])

    // ── Yield Curve Snapshot ─────────────────────────────────────────────
    const dgs10Arr    = mapToArray(dgs10Map)
    const currentDate = last(dgs10Arr)?.date ?? new Date().toISOString().slice(0, 10)
    const oneYearAgoTarget  = dateMinusYears(currentDate, 1)
    const twoYearsAgoTarget = dateMinusYears(currentDate, 2)

    const MATURITIES: Array<{ label: string; months: number; map: Map<string, number> }> = [
      { label: '1M',  months: 1,   map: dgs1moMap },
      { label: '3M',  months: 3,   map: dgs3moMap },
      { label: '6M',  months: 6,   map: dgs6moMap },
      { label: '1Y',  months: 12,  map: dgs1Map   },
      { label: '2Y',  months: 24,  map: dgs2Map   },
      { label: '3Y',  months: 36,  map: dgs3Map   },
      { label: '5Y',  months: 60,  map: dgs5Map   },
      { label: '7Y',  months: 84,  map: dgs7Map   },
      { label: '10Y', months: 120, map: dgs10Map  },
      { label: '20Y', months: 240, map: dgs20Map  },
      { label: '30Y', months: 360, map: dgs30Map  },
    ]

    const snapshotPoints: YieldCurvePoint[] = MATURITIES.map(({ label, months, map }) => ({
      maturity:    label,
      months,
      current:     valueAtDate(map, currentDate)?.value        ?? null,
      oneYearAgo:  valueAtDate(map, oneYearAgoTarget)?.value   ?? null,
      twoYearsAgo: valueAtDate(map, twoYearsAgoTarget)?.value  ?? null,
    }))

    const oneYearAgoDate  = valueAtDate(dgs10Map, oneYearAgoTarget)?.date  ?? oneYearAgoTarget
    const twoYearsAgoDate = valueAtDate(dgs10Map, twoYearsAgoTarget)?.date ?? twoYearsAgoTarget

    // ── Spreads ──────────────────────────────────────────────────────────
    const spread10y2yArr = mapToArray(t10y2yMap)
    const spread10y3mArr = mapToArray(t10y3mMap)

    // ── Key Rates ────────────────────────────────────────────────────────
    const fedFundsArr      = mapToArray(dfedtaruMap)
    const fedFundsLowerArr = mapToArray(dfedtarlMap)
    const dgs2Arr     = mapToArray(dgs2Map)
    const dgs20Arr    = mapToArray(dgs20Map)
    const dgs30Arr    = mapToArray(dgs30Map)
    const sofrArr     = mapToArray(sofrMap)

    // ── Credit ───────────────────────────────────────────────────────────
    const hyOasArr = mapToArray(bamlhyMap)
    const igOasArr = mapToArray(bamlcigMap)

    // ── Real Rates ───────────────────────────────────────────────────────
    const tipsReal10yArr  = mapToArray(dfii10Map)
    const breakeven10yArr = mapToArray(t10yieMap)

    // ── Recession Bands ──────────────────────────────────────────────────
    const recessionBands = computeRecessionBands(usrecMap, '2015-01-01')

    // ── MOVE Index ───────────────────────────────────────────────────────
    const moveArr = mapToArray(moveMap)
    const moveLatest = moveQuote
      ? {
          value:         r2(moveQuote.price),
          change:        r2(moveQuote.price - moveQuote.previousClose),
          changePercent: r2(moveQuote.changePercent),
          date:          last(moveArr)?.date ?? '',
        }
      : null

    const data: RatesData = {
      snapshot: {
        points:           snapshotPoints,
        currentDate,
        oneYearAgoDate,
        twoYearsAgoDate,
      },
      spreads: {
        spread10y2y: spread10y2yArr,
        spread10y3m: spread10y3mArr,
        latest: {
          spread10y2y: {
            value:  r2(last(spread10y2yArr)?.value ?? 0),
            change: r2((last(spread10y2yArr)?.value ?? 0) - (prev(spread10y2yArr)?.value ?? 0)),
            date:   last(spread10y2yArr)?.date ?? '',
          },
          spread10y3m: {
            value:  r2(last(spread10y3mArr)?.value ?? 0),
            change: r2((last(spread10y3mArr)?.value ?? 0) - (prev(spread10y3mArr)?.value ?? 0)),
            date:   last(spread10y3mArr)?.date ?? '',
          },
        },
      },
      keyRates: {
        fedFunds:      fedFundsArr,
        fedFundsLower: fedFundsLowerArr,
        y2:            dgs2Arr,
        y10:      dgs10Arr,
        y20:      dgs20Arr,
        y30:      dgs30Arr,
        sofr:     sofrArr,
        latest: {
          fedFunds: {
            value: r2(last(fedFundsArr)?.value ?? 0),
            date:  last(fedFundsArr)?.date ?? '',
          },
          y2: {
            value:  r2(last(dgs2Arr)?.value ?? 0),
            change: r2((last(dgs2Arr)?.value ?? 0) - (prev(dgs2Arr)?.value ?? 0)),
            date:   last(dgs2Arr)?.date ?? '',
          },
          y10: {
            value:  r2(last(dgs10Arr)?.value ?? 0),
            change: r2((last(dgs10Arr)?.value ?? 0) - (prev(dgs10Arr)?.value ?? 0)),
            date:   last(dgs10Arr)?.date ?? '',
          },
          y20: {
            value:  r2(last(dgs20Arr)?.value ?? 0),
            change: r2((last(dgs20Arr)?.value ?? 0) - (prev(dgs20Arr)?.value ?? 0)),
            date:   last(dgs20Arr)?.date ?? '',
          },
          y30: {
            value:  r2(last(dgs30Arr)?.value ?? 0),
            change: r2((last(dgs30Arr)?.value ?? 0) - (prev(dgs30Arr)?.value ?? 0)),
            date:   last(dgs30Arr)?.date ?? '',
          },
          sofr: {
            value: r2(last(sofrArr)?.value ?? 0),
            date:  last(sofrArr)?.date ?? '',
          },
        },
      },
      credit: {
        hyOas: hyOasArr,
        igOas: igOasArr,
        latest: {
          hyOas: {
            value:  r2(last(hyOasArr)?.value ?? 0),
            change: r2((last(hyOasArr)?.value ?? 0) - (prev(hyOasArr)?.value ?? 0)),
            date:   last(hyOasArr)?.date ?? '',
          },
          igOas: {
            value:  r2(last(igOasArr)?.value ?? 0),
            change: r2((last(igOasArr)?.value ?? 0) - (prev(igOasArr)?.value ?? 0)),
            date:   last(igOasArr)?.date ?? '',
          },
        },
      },
      realRates: {
        tipsReal10y:  tipsReal10yArr,
        breakeven10y: breakeven10yArr,
        latest: {
          tipsReal10y: {
            value:  r2(last(tipsReal10yArr)?.value ?? 0),
            change: r2((last(tipsReal10yArr)?.value ?? 0) - (prev(tipsReal10yArr)?.value ?? 0)),
            date:   last(tipsReal10yArr)?.date ?? '',
          },
          breakeven10y: {
            value:  r2(last(breakeven10yArr)?.value ?? 0),
            change: r2((last(breakeven10yArr)?.value ?? 0) - (prev(breakeven10yArr)?.value ?? 0)),
            date:   last(breakeven10yArr)?.date ?? '',
          },
        },
      },
      recessionBands,
      move: {
        history: moveArr,
        latest:  moveLatest,
      },
    }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=21600, stale-while-revalidate=43200' },
    })
  } catch (err) {
    console.error('[/api/global/rates]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
