import { NextRequest, NextResponse } from 'next/server'
import { listReports } from '@/lib/server/store'
import { AGENTS } from '@/lib/agents'

export const dynamic = 'force-dynamic'

/**
 * GET /api/agents/reports?agent=momentum&limit=20
 * Without ?agent, returns the merged latest reports across all agents.
 */
export async function GET(request: NextRequest) {
  const agent = request.nextUrl.searchParams.get('agent')
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '20', 10) || 20, 60)

  try {
    if (agent) {
      if (!AGENTS[agent]) {
        return NextResponse.json({ error: `Unknown agent '${agent}'` }, { status: 404 })
      }
      const reports = await listReports(agent, limit)
      return NextResponse.json({ reports })
    }

    const all = await Promise.all(Object.keys(AGENTS).map((name) => listReports(name, limit)))
    const reports = all
      .flat()
      .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))
      .slice(0, limit)
    return NextResponse.json({ reports })
  } catch (err) {
    console.error('[/api/agents/reports]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
