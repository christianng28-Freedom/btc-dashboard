'use client'
import { useQuery } from '@tanstack/react-query'
import type { FundamentalData, OIDataPoint } from '@/lib/types/fundamental'

const BYBIT_BASE = 'https://api.bybit.com'
const FAPI_BASE = 'https://fapi.binance.com'

async function fetchFromBybit(): Promise<FundamentalData> {
  const [oiRes, tickerRes] = await Promise.all([
    fetch(
      `${BYBIT_BASE}/v5/market/open-interest?category=linear&symbol=BTCUSDT&intervalTime=1d&limit=100`,
      { signal: AbortSignal.timeout(10000) }
    ),
    fetch(
      `${BYBIT_BASE}/v5/market/tickers?category=linear&symbol=BTCUSDT`,
      { signal: AbortSignal.timeout(10000) }
    ),
  ])

  if (!oiRes.ok) throw new Error(`Bybit OI error: ${oiRes.status}`)
  if (!tickerRes.ok) throw new Error(`Bybit ticker error: ${tickerRes.status}`)

  const oiJson = (await oiRes.json()) as {
    result: { list: Array<{ openInterest: string; timestamp: string }> }
  }
  const tickerJson = (await tickerRes.json()) as {
    result: {
      list: Array<{
        fundingRate: string
        nextFundingTime: string
        openInterestValue: string
        lastPrice: string
      }>
    }
  }

  const ticker = tickerJson.result.list[0]
  const btcPrice = parseFloat(ticker.lastPrice)

  // Bybit OI list is newest-first; reverse to chronological order
  const oiHistory: OIDataPoint[] = oiJson.result.list
    .slice()
    .reverse()
    .map((d) => {
      const oiBtc = parseFloat(d.openInterest)
      return {
        timestamp: parseInt(d.timestamp, 10),
        oi: oiBtc,
        oiValue: oiBtc * btcPrice,
      }
    })

  const recent90 = oiHistory.slice(-90)
  const oi90dMA = recent90.reduce((sum, d) => sum + d.oiValue, 0) / recent90.length
  const currentOI = oiHistory.length > 0 ? oiHistory[oiHistory.length - 1].oiValue : 0
  const oiDeviationPct = oi90dMA > 0 ? ((currentOI - oi90dMA) / oi90dMA) * 100 : 0
  const currentFundingRate = parseFloat(ticker.fundingRate)
  const annualisedFundingRate = currentFundingRate * 3 * 365 * 100
  const nextFundingTime = parseInt(ticker.nextFundingTime, 10)

  return {
    oiHistory,
    currentOI,
    oi90dMA,
    oiDeviationPct,
    currentFundingRate,
    nextFundingTime,
    annualisedFundingRate,
    lastUpdated: new Date().toISOString(),
  }
}

async function fetchFromBinance(): Promise<FundamentalData> {
  const [oiRes, fundingRes] = await Promise.all([
    fetch(`${FAPI_BASE}/futures/data/openInterestHist?symbol=BTCUSDT&period=1d&limit=100`, {
      signal: AbortSignal.timeout(10000),
    }),
    fetch(`${FAPI_BASE}/fapi/v1/premiumIndex?symbol=BTCUSDT`, {
      signal: AbortSignal.timeout(10000),
    }),
  ])

  if (!oiRes.ok) throw new Error(`Binance OI error: ${oiRes.status}`)
  if (!fundingRes.ok) throw new Error(`Binance funding error: ${fundingRes.status}`)

  const oiRaw = (await oiRes.json()) as Array<{
    sumOpenInterest: string
    sumOpenInterestValue: string
    timestamp: number
  }>

  const fundingRaw = (await fundingRes.json()) as {
    lastFundingRate: string
    nextFundingTime: number
  }

  const oiHistory: OIDataPoint[] = oiRaw.map((d) => ({
    timestamp: d.timestamp,
    oi: parseFloat(d.sumOpenInterest),
    oiValue: parseFloat(d.sumOpenInterestValue),
  }))

  const recent90 = oiHistory.slice(-90)
  const oi90dMA = recent90.reduce((sum, d) => sum + d.oiValue, 0) / recent90.length
  const currentOI = oiHistory.length > 0 ? oiHistory[oiHistory.length - 1].oiValue : 0
  const oiDeviationPct = oi90dMA > 0 ? ((currentOI - oi90dMA) / oi90dMA) * 100 : 0
  const currentFundingRate = parseFloat(fundingRaw.lastFundingRate)
  const annualisedFundingRate = currentFundingRate * 3 * 365 * 100

  return {
    oiHistory,
    currentOI,
    oi90dMA,
    oiDeviationPct,
    currentFundingRate,
    nextFundingTime: fundingRaw.nextFundingTime,
    annualisedFundingRate,
    lastUpdated: new Date().toISOString(),
  }
}

async function fetchFundamental(): Promise<FundamentalData> {
  try {
    return await fetchFromBybit()
  } catch (bybitErr) {
    console.warn('Bybit fetch failed, trying Binance:', bybitErr)
    return await fetchFromBinance()
  }
}

export interface FundamentalDataResult {
  data: FundamentalData | null
  isLoading: boolean
  isError: boolean
}

export function useFundamentalData(): FundamentalDataResult {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['fundamental'],
    queryFn: fetchFundamental,
    staleTime: 300_000,
    refetchInterval: 300_000,
  })

  return { data: data ?? null, isLoading, isError }
}
