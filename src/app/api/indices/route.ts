import { NextResponse } from 'next/server'

export interface IndexQuote {
  price: number
  change: number
  changePercent: number
}

export interface IndicesData {
  spx: IndexQuote
  ndx: IndexQuote
  gold: IndexQuote
  sol: IndexQuote
}

async function fetchYahooQuote(symbol: string): Promise<IndexQuote> {
  const encoded = encodeURIComponent(symbol)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1d&range=1d`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; btc-dashboard/1.0)' },
    next: { revalidate: 180 },
  })
  if (!res.ok) throw new Error(`Yahoo Finance fetch failed for ${symbol}: ${res.status}`)
  const json = await res.json() as {
    chart: { result: Array<{ meta: {
      regularMarketPrice: number
      regularMarketChange: number
      regularMarketChangePercent: number
      previousClose?: number
      chartPreviousClose?: number
    } }> | null }
  }
  const meta = json.chart?.result?.[0]?.meta
  if (!meta) throw new Error(`No data returned for ${symbol}`)

  const price = meta.regularMarketPrice ?? 0
  let change = meta.regularMarketChange ?? 0
  let changePercent = meta.regularMarketChangePercent ?? 0

  // If the API returns 0% change, calculate it from previousClose
  const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? 0
  if (changePercent === 0 && prevClose > 0 && price > 0) {
    change = price - prevClose
    changePercent = (change / prevClose) * 100
  }

  return { price, change, changePercent }
}

export async function GET() {
  try {
    const [spx, ndx, gold, sol] = await Promise.all([
      fetchYahooQuote('^GSPC'),
      fetchYahooQuote('^NDX'),
      fetchYahooQuote('GC=F'),
      fetchYahooQuote('SOL-USD'),
    ])
    const data: IndicesData = { spx, ndx, gold, sol }
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=180, stale-while-revalidate=360' },
    })
  } catch (err) {
    console.error('[/api/indices]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
