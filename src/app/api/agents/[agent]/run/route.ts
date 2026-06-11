import { NextRequest, NextResponse } from 'next/server'
import { AGENTS } from '@/lib/agents'
import { runAgent, AgentLockedError } from '@/lib/agents/runner'

// Agent runs gather many upstream sources then call Gemini — allow headroom
export const maxDuration = 300
export const dynamic = 'force-dynamic'

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    // No secret configured: only allow in local dev, never in production
    return process.env.NODE_ENV !== 'production'
  }
  const header = request.headers.get('authorization')
  if (header === `Bearer ${secret}`) return true // Vercel cron format
  return request.nextUrl.searchParams.get('key') === secret // manual trigger
}

async function handle(request: NextRequest, agentName: string) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const def = AGENTS[agentName]
  if (!def) {
    return NextResponse.json(
      { error: `Unknown agent '${agentName}'. Available: ${Object.keys(AGENTS).join(', ')}` },
      { status: 404 },
    )
  }

  try {
    const { report } = await runAgent(def)
    return NextResponse.json({ ok: true, report })
  } catch (err) {
    if (err instanceof AgentLockedError) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    console.error(`[/api/agents/${agentName}/run]`, err)

    // Surface upstream LLM problems as what they are, not a generic 500
    const msg = err instanceof Error ? err.message : String(err)
    if (/quota|429/i.test(msg)) {
      return NextResponse.json(
        { error: 'Gemini API quota exhausted (free tier resets daily, or add billing to the key). The agent will run again once quota is available.' },
        { status: 429 },
      )
    }
    if (/503|UNAVAILABLE|high demand/i.test(msg)) {
      return NextResponse.json(
        { error: 'Gemini is overloaded right now (503 after retries) — try again in a few minutes.' },
        { status: 503 },
      )
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// Vercel cron triggers are GET; manual triggers may be POST
export async function GET(request: NextRequest, { params }: { params: Promise<{ agent: string }> }) {
  const { agent } = await params
  return handle(request, agent)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ agent: string }> }) {
  const { agent } = await params
  return handle(request, agent)
}
