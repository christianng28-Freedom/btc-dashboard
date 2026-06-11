import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/server/store'
import { getWatchlist } from '@/lib/agents/momentum'
import { getProposals, type WatchlistProposal } from '@/lib/agents/scout'

export const dynamic = 'force-dynamic'

const WATCHLIST_KEY = 'watchlist:equities'
const PROPOSALS_KEY = 'watchlist:proposals'

/** GET /api/agents/watchlist — current watchlist + pending proposals */
export async function GET() {
  try {
    const [watchlist, proposals] = await Promise.all([getWatchlist(), getProposals()])
    return NextResponse.json({ watchlist, proposals })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

/**
 * POST /api/agents/watchlist
 * { decision: 'approve' | 'reject', ticker: string, action: 'add' | 'remove' }
 * Only the user approves — agents can only queue proposals.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      decision?: 'approve' | 'reject'
      ticker?: string
      action?: 'add' | 'remove'
    }
    if (!body.decision || !body.ticker || !body.action) {
      return NextResponse.json({ error: 'decision, ticker, action are required' }, { status: 400 })
    }

    const kv = getStore()
    const ticker = body.ticker.toUpperCase()
    const proposals = await getProposals()
    const remaining = proposals.filter((p: WatchlistProposal) => !(p.ticker === ticker && p.action === body.action))
    await kv.set(PROPOSALS_KEY, remaining)

    if (body.decision === 'approve') {
      const watchlist = await getWatchlist()
      const next =
        body.action === 'add'
          ? Array.from(new Set([...watchlist, ticker]))
          : watchlist.filter((t) => t !== ticker)
      await kv.set(WATCHLIST_KEY, next)
      return NextResponse.json({ ok: true, watchlist: next, proposals: remaining })
    }

    return NextResponse.json({ ok: true, proposals: remaining })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
