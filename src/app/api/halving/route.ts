import { NextResponse } from 'next/server'
import { fetchBlockHeight } from '@/lib/api/mempool'

const NEXT_HALVING_BLOCK = 1_050_000
const LAST_HALVING_BLOCK = 840_000
const BLOCKS_PER_HALVING = 210_000
const APPROX_BLOCK_TIME_MINUTES = 10
const LAST_HALVING_DATE = '2024-04-20'

export async function GET() {
  try {
    const blockHeight = await fetchBlockHeight()
    const blocksRemaining = Math.max(0, NEXT_HALVING_BLOCK - blockHeight)
    const minutesRemaining = blocksRemaining * APPROX_BLOCK_TIME_MINUTES
    const estimatedDate = new Date(Date.now() + minutesRemaining * 60 * 1000)
    const epochProgress = Math.min(1, (blockHeight - LAST_HALVING_BLOCK) / BLOCKS_PER_HALVING)
    const lastHalvingTimestamp = new Date(LAST_HALVING_DATE).getTime()
    const daysSinceLastHalving = Math.floor((Date.now() - lastHalvingTimestamp) / (1000 * 60 * 60 * 24))
    const daysToNextHalving = Math.round(minutesRemaining / 60 / 24)

    return NextResponse.json(
      {
        blockHeight,
        blocksRemaining,
        estimatedNextHalvingDate: estimatedDate.toISOString().split('T')[0],
        epochProgressPct: epochProgress * 100,
        daysSinceLastHalving,
        daysToNextHalving,
      },
      { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } }
    )
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
