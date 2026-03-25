import { NextResponse } from 'next/server'
import { fetchFREDSeries } from '@/lib/api/fred'

export type DataPoint = { date: string; value: number }

export interface EconomicData {
  inflation: {
    cpiYoY: DataPoint[]
    coreCpiYoY: DataPoint[]
    corePceYoY: DataPoint[]
    ppiYoY: DataPoint[]
    latest: {
      cpi: { yoy: number; mom: number; date: string }
      coreCpi: { yoy: number; mom: number; date: string }
      corePce: { yoy: number; mom: number; date: string }
      ppi: { yoy: number; mom: number; date: string }
    }
  }
  employment: {
    unemployment: DataPoint[]
    nfpMoM: DataPoint[]
    initialClaims: DataPoint[]
    initialClaimsMA4: DataPoint[]
    lfpr: DataPoint[]
    latest: {
      unemployment: { value: number; change: number; date: string }
      nfp: { value: number; date: string }
      claims: { value: number; ma4: number; date: string }
      lfpr: { value: number; change: number; date: string }
    }
  }
  output: {
    ismPmi: DataPoint[]
    industrialProdYoY: DataPoint[]
    michiganSentiment: DataPoint[]
    retailSalesMoM: DataPoint[]
    latest: {
      ism: { value: number; change: number; date: string }
      industrialProd: { yoy: number; date: string }
      michigan: { value: number; change: number; date: string }
      retailSales: { mom: number; date: string }
    }
  }
  leading: {
    yieldCurve10y2y: DataPoint[]
    yieldCurve10y3m: DataPoint[]
    cfnai: DataPoint[]
    latest: {
      spread10y2y: { value: number; date: string }
      spread10y3m: { value: number; date: string }
      cfnai: { value: number; date: string }
    }
  }
}

// ── helpers ────────────────────────────────────────────────────────────────

function mapToArray(map: Map<string, number>): DataPoint[] {
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }))
}

/** YoY % change for a monthly index series (e.g. CPI, INDPRO). */
function computeYoY(sorted: DataPoint[]): DataPoint[] {
  const map = new Map(sorted.map((p) => [p.date, p.value]))
  const result: DataPoint[] = []
  for (const p of sorted) {
    const yr = parseInt(p.date.slice(0, 4))
    const priorKey = `${yr - 1}${p.date.slice(4)}`
    const prior = map.get(priorKey)
    if (prior != null && prior !== 0) {
      result.push({
        date: p.date,
        value: Math.round(((p.value - prior) / Math.abs(prior)) * 1000) / 10,
      })
    }
  }
  return result
}

/** Absolute MoM change (e.g. NFP in thousands). */
function computeMoMChange(sorted: DataPoint[]): DataPoint[] {
  return sorted.slice(1).map((p, i) => ({
    date: p.date,
    value: Math.round((p.value - sorted[i].value) * 10) / 10,
  }))
}

/** MoM % change (e.g. retail sales). */
function computeMoMPct(sorted: DataPoint[]): DataPoint[] {
  return sorted.slice(1).map((p, i) => {
    const prior = sorted[i].value
    return {
      date: p.date,
      value: prior !== 0 ? Math.round(((p.value - prior) / Math.abs(prior)) * 1000) / 10 : 0,
    }
  })
}

/** 4-period moving average. */
function compute4PMA(sorted: DataPoint[]): DataPoint[] {
  const result: DataPoint[] = []
  for (let i = 3; i < sorted.length; i++) {
    const avg =
      (sorted[i].value + sorted[i - 1].value + sorted[i - 2].value + sorted[i - 3].value) / 4
    result.push({ date: sorted[i].date, value: Math.round(avg) })
  }
  return result
}

function r1(v: number): number {
  return Math.round(v * 10) / 10
}

function last(arr: DataPoint[]): DataPoint | undefined {
  return arr[arr.length - 1]
}

function prev(arr: DataPoint[]): DataPoint | undefined {
  return arr[arr.length - 2]
}

// ── route ─────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    if (!process.env.FRED_API_KEY) {
      return NextResponse.json({ error: 'FRED_API_KEY not configured' }, { status: 500 })
    }

    const settled = await Promise.allSettled([
      fetchFREDSeries('CPIAUCSL',        '2014-01-01', 21600),
      fetchFREDSeries('CPILFESL',        '2014-01-01', 21600),
      fetchFREDSeries('PCEPILFE',        '2014-01-01', 21600),
      fetchFREDSeries('PPIACO',          '2014-01-01', 21600),
      fetchFREDSeries('UNRATE',          '2015-01-01', 21600),
      fetchFREDSeries('PAYEMS',          '2015-01-01', 21600),
      fetchFREDSeries('ICSA',            '2016-01-01', 21600),
      fetchFREDSeries('CIVPART',         '2015-01-01', 21600),
      fetchFREDSeries('BSCICP02USM460S', '2015-01-01', 21600), // OECD Mfg Business Confidence (replaced discontinued CHPMINDX)
      fetchFREDSeries('INDPRO',          '2014-01-01', 21600),
      fetchFREDSeries('UMCSENT',         '2015-01-01', 21600),
      fetchFREDSeries('RSXFS',           '2014-01-01', 21600),
      fetchFREDSeries('T10Y2Y',          '2016-01-01', 21600),
      fetchFREDSeries('T10Y3M',          '2016-01-01', 21600),
      fetchFREDSeries('CFNAI',           '2015-01-01', 21600),
    ])
    const emptyMap = () => new Map<string, number>()
    const getMap = (r: PromiseSettledResult<Map<string, number>>) =>
      r.status === 'fulfilled' ? r.value : emptyMap()
    const [
      cpiMap, coreCpiMap, corePceMap, ppiMap,
      unempMap, payemsMap, icsaMap, civpartMap,
      napmMap, indproMap, umcsentMap, rsxfsMap,
      t10y2yMap, t10y3mMap, cfnaiMap,
    ] = settled.map(getMap)

    // ── Inflation ───────────────────────────────────────────────────────
    const cpiArr     = mapToArray(cpiMap)
    const coreCpiArr = mapToArray(coreCpiMap)
    const corePceArr = mapToArray(corePceMap)
    const ppiArr     = mapToArray(ppiMap)

    const cpiYoY     = computeYoY(cpiArr)
    const coreCpiYoY = computeYoY(coreCpiArr)
    const corePceYoY = computeYoY(corePceArr)
    const ppiYoY     = computeYoY(ppiArr)

    const cpiMoM     = computeMoMPct(cpiArr)
    const coreCpiMoM = computeMoMPct(coreCpiArr)
    const corePceMoM = computeMoMPct(corePceArr)
    const ppiMoM     = computeMoMPct(ppiArr)

    // ── Employment ──────────────────────────────────────────────────────
    const unemploymentArr  = mapToArray(unempMap)
    const payemsArr        = mapToArray(payemsMap)
    const nfpMoMArr        = computeMoMChange(payemsArr)   // thousands of persons
    const icsaArr          = mapToArray(icsaMap)           // weekly, thousands
    const icsaMA4Arr       = compute4PMA(icsaArr)
    const civpartArr       = mapToArray(civpartMap)

    // ── Output & Sentiment ──────────────────────────────────────────────
    const ismArr           = mapToArray(napmMap)
    const indproArr        = mapToArray(indproMap)
    const indproYoYArr     = computeYoY(indproArr)
    const umcsentArr       = mapToArray(umcsentMap)
    const rsxfsArr         = mapToArray(rsxfsMap)
    const rsxfsMoMArr      = computeMoMPct(rsxfsArr)

    // ── Leading Indicators ──────────────────────────────────────────────
    const t10y2yArr  = mapToArray(t10y2yMap)
    const t10y3mArr  = mapToArray(t10y3mMap)
    const cfnaiArr   = mapToArray(cfnaiMap)

    const data: EconomicData = {
      inflation: {
        cpiYoY,
        coreCpiYoY,
        corePceYoY,
        ppiYoY,
        latest: {
          cpi:     { yoy: r1(last(cpiYoY)?.value ?? 0),     mom: r1(last(cpiMoM)?.value ?? 0),     date: last(cpiYoY)?.date ?? '' },
          coreCpi: { yoy: r1(last(coreCpiYoY)?.value ?? 0), mom: r1(last(coreCpiMoM)?.value ?? 0), date: last(coreCpiYoY)?.date ?? '' },
          corePce: { yoy: r1(last(corePceYoY)?.value ?? 0), mom: r1(last(corePceMoM)?.value ?? 0), date: last(corePceYoY)?.date ?? '' },
          ppi:     { yoy: r1(last(ppiYoY)?.value ?? 0),     mom: r1(last(ppiMoM)?.value ?? 0),     date: last(ppiYoY)?.date ?? '' },
        },
      },
      employment: {
        unemployment:     unemploymentArr,
        nfpMoM:           nfpMoMArr,
        initialClaims:    icsaArr,
        initialClaimsMA4: icsaMA4Arr,
        lfpr:             civpartArr,
        latest: {
          unemployment: {
            value:  r1(last(unemploymentArr)?.value ?? 0),
            change: r1((last(unemploymentArr)?.value ?? 0) - (prev(unemploymentArr)?.value ?? 0)),
            date:   last(unemploymentArr)?.date ?? '',
          },
          nfp: {
            value: r1(last(nfpMoMArr)?.value ?? 0),
            date:  last(nfpMoMArr)?.date ?? '',
          },
          claims: {
            value: Math.round(last(icsaArr)?.value ?? 0),
            ma4:   Math.round(last(icsaMA4Arr)?.value ?? 0),
            date:  last(icsaArr)?.date ?? '',
          },
          lfpr: {
            value:  r1(last(civpartArr)?.value ?? 0),
            change: r1((last(civpartArr)?.value ?? 0) - (prev(civpartArr)?.value ?? 0)),
            date:   last(civpartArr)?.date ?? '',
          },
        },
      },
      output: {
        ismPmi:            ismArr,
        industrialProdYoY: indproYoYArr,
        michiganSentiment: umcsentArr,
        retailSalesMoM:    rsxfsMoMArr,
        latest: {
          ism: {
            value:  r1(last(ismArr)?.value ?? 0),
            change: r1((last(ismArr)?.value ?? 0) - (prev(ismArr)?.value ?? 0)),
            date:   last(ismArr)?.date ?? '',
          },
          industrialProd: {
            yoy:  r1(last(indproYoYArr)?.value ?? 0),
            date: last(indproYoYArr)?.date ?? '',
          },
          michigan: {
            value:  r1(last(umcsentArr)?.value ?? 0),
            change: r1((last(umcsentArr)?.value ?? 0) - (prev(umcsentArr)?.value ?? 0)),
            date:   last(umcsentArr)?.date ?? '',
          },
          retailSales: {
            mom:  r1(last(rsxfsMoMArr)?.value ?? 0),
            date: last(rsxfsMoMArr)?.date ?? '',
          },
        },
      },
      leading: {
        yieldCurve10y2y: t10y2yArr,
        yieldCurve10y3m: t10y3mArr,
        cfnai:           cfnaiArr,
        latest: {
          spread10y2y: { value: r1(last(t10y2yArr)?.value ?? 0), date: last(t10y2yArr)?.date ?? '' },
          spread10y3m: { value: r1(last(t10y3mArr)?.value ?? 0), date: last(t10y3mArr)?.date ?? '' },
          cfnai:       { value: r1(last(cfnaiArr)?.value ?? 0),  date: last(cfnaiArr)?.date ?? '' },
        },
      },
    }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=21600, stale-while-revalidate=43200' },
    })
  } catch (err) {
    console.error('[/api/global/economic]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
