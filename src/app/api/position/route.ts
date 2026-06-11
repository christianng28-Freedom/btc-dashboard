import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/server/store'

export const dynamic = 'force-dynamic'

const POSITION_KEY = 'position:journal'

export interface PositionJournal {
  btcUsd: number
  totalPortfolioUsd: number
  updatedAt: string
}

/** GET /api/position — the user's logged position (null until first save) */
export async function GET() {
  try {
    const position = await getStore().get<PositionJournal>(POSITION_KEY)
    return NextResponse.json({ position })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

/** POST /api/position { btcUsd, totalPortfolioUsd } */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { btcUsd?: number; totalPortfolioUsd?: number }
    if (
      typeof body.btcUsd !== 'number' ||
      typeof body.totalPortfolioUsd !== 'number' ||
      body.btcUsd < 0 ||
      body.totalPortfolioUsd <= 0 ||
      body.btcUsd > body.totalPortfolioUsd
    ) {
      return NextResponse.json(
        { error: 'btcUsd and totalPortfolioUsd must be valid (0 <= btcUsd <= totalPortfolioUsd, total > 0)' },
        { status: 400 },
      )
    }
    const position: PositionJournal = {
      btcUsd: body.btcUsd,
      totalPortfolioUsd: body.totalPortfolioUsd,
      updatedAt: new Date().toISOString(),
    }
    await getStore().set(POSITION_KEY, position)
    return NextResponse.json({ position })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
