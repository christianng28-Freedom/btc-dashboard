import { NextResponse } from 'next/server'
import { fetchBlockHeight, fetchFees, fetchMempoolInfo } from '@/lib/api/mempool'

const MEMPOOL_BASE = 'https://mempool.space'

export interface MempoolStats {
  blockHeight: number
  lastBlockTime: number | null   // unix timestamp (seconds)
  timeSinceBlock: number | null  // seconds ago
  mempoolCount: number
  mempoolVsize: number           // vbytes
  fastFee: number                // sat/vB
  halfHourFee: number
  economyFee: number
}

export async function GET() {
  try {
    const [height, fees, mempool, blocksRes] = await Promise.all([
      fetchBlockHeight(),
      fetchFees(),
      fetchMempoolInfo(),
      fetch(`${MEMPOOL_BASE}/api/v1/blocks`, { next: { revalidate: 60 } }),
    ])

    let lastBlockTime: number | null = null
    if (blocksRes.ok) {
      const blocks = (await blocksRes.json()) as Array<{ timestamp: number }>
      if (blocks.length > 0) lastBlockTime = blocks[0].timestamp
    }

    const timeSinceBlock = lastBlockTime
      ? Math.floor(Date.now() / 1000) - lastBlockTime
      : null

    const data: MempoolStats = {
      blockHeight: height,
      lastBlockTime,
      timeSinceBlock,
      mempoolCount: mempool.count,
      mempoolVsize: mempool.vsize,
      fastFee: fees.fastestFee,
      halfHourFee: fees.halfHourFee,
      economyFee: fees.economyFee,
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
      },
    })
  } catch (err) {
    console.error('mempool-stats route error:', err)
    return NextResponse.json({ error: 'Failed to fetch mempool stats' }, { status: 502 })
  }
}
