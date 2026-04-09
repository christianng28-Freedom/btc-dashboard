import { NextResponse } from 'next/server'

type ServiceStatus = 'ok' | 'error'

interface ServiceHealth {
  status: ServiceStatus
  latencyMs?: number
  error?: string
}

interface HealthResponse {
  yahooFinance: ServiceHealth
  coingecko: ServiceHealth
  mempool: ServiceHealth
  timestamp: number
}

async function checkService(url: string): Promise<ServiceHealth> {
  const start = Date.now()
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    })
    if (!res.ok) {
      return { status: 'error', error: `HTTP ${res.status}` }
    }
    return { status: 'ok', latencyMs: Date.now() - start }
  } catch (err) {
    return {
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

// GET /api/health
// Check connectivity to Yahoo Finance, CoinGecko, and Mempool.space
export async function GET() {
  const [yahooFinance, coingecko, mempool] = await Promise.all([
    checkService('https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?range=1d&interval=1d'),
    checkService('https://api.coingecko.com/api/v3/ping'),
    checkService('https://mempool.space/api/blocks/tip/height'),
  ])

  const response: HealthResponse = {
    yahooFinance,
    coingecko,
    mempool,
    timestamp: Date.now(),
  }

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
