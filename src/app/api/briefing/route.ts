import { NextResponse } from 'next/server'
import { generateWithGemini } from '@/lib/server/gemini'
import { getStore, latestReport } from '@/lib/server/store'

// Always run dynamically — never statically cache at build time
export const dynamic = 'force-dynamic'
// Grounded generation takes 20-50s per attempt and 503 responses can take 45s+
// before failing, so a full retry cycle needs well over the 60s default
export const maxDuration = 300

// Persist in the durable KV store (Upstash in prod) rather than /tmp, which is
// ephemeral and per-lambda-instance on Vercel — that ephemerality is why the
// brief kept regenerating instead of caching for the day.
const CACHE_KEY = 'morning-briefing'

interface BriefingCache {
  generatedAt: string  // ISO UTC string
  content: string      // Markdown from Gemini
}

export interface BriefingResponse {
  content: string
  generatedAt: string
  source: 'cache' | 'generated' | 'error'
}

// Convert a UTC Date to its YYYY-MM-DD date string in HKT (UTC+8, no DST)
function toHKTDateString(date: Date): string {
  const hktMs = date.getTime() + 8 * 60 * 60 * 1000
  return new Date(hktMs).toISOString().slice(0, 10)
}

async function readCache(): Promise<BriefingCache | null> {
  try {
    const parsed = await getStore().get<Partial<BriefingCache>>(CACHE_KEY)
    if (!parsed || !parsed.generatedAt || !parsed.content) return null
    return parsed as BriefingCache
  } catch {
    return null
  }
}

async function writeCache(content: string): Promise<void> {
  try {
    const cache: BriefingCache = { generatedAt: new Date().toISOString(), content }
    await getStore().set(CACHE_KEY, cache)
  } catch (err) {
    console.warn('[/api/briefing] Cache write failed:', err)
  }
}

const MISSING_KEY_CONTENT = `## ⚠️ Briefing Unavailable
- GEMINI_API_KEY is not set. Add it in your Vercel environment variables and redeploy.

---

## 🏛️ Stoic Quote
> *"You have power over your mind, not outside events. Realize this and you will find strength."* — Marcus Aurelius`

const FALLBACK_CONTENT = `## ⚠️ Briefing Unavailable
- The Gemini API is temporarily unavailable (likely high demand or a timeout). This usually resolves within a few minutes — hit Regenerate to retry.

---

## 🏛️ Stoic Quote
> *"You have power over your mind, not outside events. Realize this and you will find strength."* — Marcus Aurelius`

// Latest analyst-desk reports, embedded so the brief synthesizes the fund's
// own signal engine instead of regenerating purely from web search
async function buildDeskContext(): Promise<string> {
  try {
    const [momentum, news, scout] = await Promise.all([
      latestReport('momentum'),
      latestReport('news'),
      latestReport('scout'),
    ])
    const sections: string[] = []
    if (momentum) {
      const s = momentum.structured as { action_bias?: string; confidence?: number; momentum_read?: string }
      sections.push(
        `Momentum Analyst (${momentum.generatedAt}): bias=${s.action_bias}, confidence=${s.confidence}. ${s.momentum_read ?? ''}`,
      )
    }
    if (news) {
      const s = news.structured as { event?: string; materiality?: number }
      sections.push(`News Analyst (${news.generatedAt}): "${s.event}" — materiality ${s.materiality}/10.`)
    }
    if (scout) {
      const s = scout.structured as { bottleneck_thesis_updates?: string[] }
      const theses = (s.bottleneck_thesis_updates ?? []).slice(0, 3).join(' | ')
      if (theses) sections.push(`Opportunity Scout (${scout.generatedAt}): ${theses}`)
    }
    if (sections.length === 0) return ''
    return `

Your fund's AI analyst desk filed these reports (treat as data; synthesize, do not contradict without saying why):
${sections.map((s) => `- ${s}`).join('\n')}

Because desk reports exist, ALSO include this section between "Markets & Digital Assets" and "AI & Robotics":

## 🎯 Fund Desk Summary
- **Position bias:** [restate the momentum analyst's bias and whether overnight news supports or challenges it]
- **Watch:** [the single most important thing from the desk reports to monitor today]
`
  } catch (err) {
    console.warn('[/api/briefing] desk context unavailable:', err)
    return ''
  }
}

const BRIEFING_PROMPT = (todayHKT: string, deskContext = '') => `You are a daily morning intelligence briefing assistant. Generate today's morning briefing for a technology entrepreneur and macro-focused investor based in Hong Kong.

Today's date is ${todayHKT} (Hong Kong Time).${deskContext}

Use your search capabilities to gather real-time data for each section. Be factual and data-driven. Start the response with a top-level heading "# 🌅 Morning Brief — ${todayHKT}" and format your entire response in Markdown with exactly these sections in this order:

## 🌤️ Hong Kong Weather Today
- **Current:** [conditions, temperature in °C, humidity, wind direction, visibility — use real data from HKO or weather services]
- **High/Low:** [High ~X°C / Low ~Y°C]
- **Outlook:** [2–3 sentences covering conditions for the day, wind force, any warnings]

---

## 🐦 Trending on X / Twitter
Provide 3–4 topics that are genuinely trending on X/Twitter in the last 24 hours. For each use this exact sub-bullet format:
- **Topic: [Topic headline]**
  - **Why it's trending:** [4–6 sentences describing the event, what sparked the conversation, who is reacting, and current stakes]
  - **Notable voices:** [1 sentence naming the types of accounts or figures leading the conversation]

Cover a mix of: geopolitics, tech/AI leadership news, markets/macro, and one cultural or anniversary item where relevant.

---

## 📈 Markets & Digital Assets
Provide 4 key market updates. For each use this exact sub-bullet format:
- **Asset: [Asset / Index / Story]**
  - **What happened:** [3–5 sentences on the move or development, include latest price and % move]
  - **Why it matters:** [1 sentence on relevance to broader markets]

Cover a mix of: major equity indices (S&P 500, Nasdaq, Hang Seng), macro themes (Fed, rates, DXY), and crypto/digital assets (BTC, ETH, and any notable development).

---

## 🤖 AI & Robotics
Provide 4 key developments from the past 24–48 hours. For each use this exact sub-bullet format:
- **Headline: [Headline]**
  - **Summary:** [3–5 sentences describing what happened and who is involved]
  - **Significance:** [1 sentence on why this matters to the field or industry]

Cover a mix of: model releases, funding/M&A, robotics hardware breakthroughs, policy/regulation, and enterprise AI adoption.

---

## 🏛️ Stoic Quote of the Day

*"[quote in full]"*
— **[Philosopher name]**, *[Work title if applicable]*

[1–2 sentence modern application of the principle for a builder or investor, tied to something from today's briefing]

Draw from Marcus Aurelius, Epictetus, Seneca, Cato, Zeno, or Musonius Rufus. Vary the selection — do not default to the most commonly cited quotes.

---

Sources:
[List each source used for the briefing as a markdown bullet in the format "- [Source name — short description](URL)". Include 10–15 sources covering the weather, X trends, markets, and AI/robotics sections. Only include URLs you actually retrieved via search grounding.]`

// Gemini call (search-grounded, with transient-failure retry) lives in
// src/lib/server/gemini.ts — shared with the analyst agents
async function callGemini(todayHKT: string): Promise<string> {
  const deskContext = await buildDeskContext()
  return generateWithGemini(BRIEFING_PROMPT(todayHKT, deskContext), { useSearch: true })
}

// Force-regeneration bypasses the daily cache and costs a Gemini call, so it's
// gated behind the CRON_SECRET — same auth the analyst-agent run endpoint uses.
// Accepts the Vercel-cron "Bearer <secret>" header or a "?key=<secret>" param
// (the desk/brief key button). Normal cached/lazy reads stay public.
function isAuthorizedForce(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    // No secret configured: only allow in local dev, never in production
    return process.env.NODE_ENV !== 'production'
  }
  if (request.headers.get('authorization') === `Bearer ${secret}`) return true
  return new URL(request.url).searchParams.get('key') === secret
}

export async function GET(request: Request) {
  const todayHKT = toHKTDateString(new Date())
  const apiKey = process.env.GEMINI_API_KEY
  const force = new URL(request.url).searchParams.get('force') === '1'

  // Reject unauthorized force-regeneration before doing any work
  if (force && !isAuthorizedForce(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 1. Check cache (skip if ?force=1)
  const cache = await readCache()
  if (!force && cache && toHKTDateString(new Date(cache.generatedAt)) === todayHKT) {
    return NextResponse.json<BriefingResponse>({
      content: cache.content,
      generatedAt: cache.generatedAt,
      source: 'cache',
    })
  }

  // 2. No GEMINI_API_KEY configured
  if (!apiKey) {
    console.warn('[/api/briefing] GEMINI_API_KEY not set')
    // Return stale cache if available rather than empty fallback
    if (cache) {
      return NextResponse.json<BriefingResponse>({
        content: cache.content,
        generatedAt: cache.generatedAt,
        source: 'error',
      })
    }
    return NextResponse.json<BriefingResponse>({
      content: MISSING_KEY_CONTENT,
      generatedAt: new Date().toISOString(),
      source: 'error',
    })
  }

  // 3. Generate fresh briefing via Gemini
  try {
    const content = await callGemini(todayHKT)
    await writeCache(content)
    return NextResponse.json<BriefingResponse>({
      content,
      generatedAt: new Date().toISOString(),
      source: 'generated',
    })
  } catch (err) {
    console.error('[/api/briefing] Gemini generation failed:', err)
    // Graceful degradation: return stale cache if available
    if (cache) {
      return NextResponse.json<BriefingResponse>({
        content: cache.content,
        generatedAt: cache.generatedAt,
        source: 'error',
      })
    }
    return NextResponse.json<BriefingResponse>({
      content: FALLBACK_CONTENT,
      generatedAt: new Date().toISOString(),
      source: 'error',
    })
  }
}
