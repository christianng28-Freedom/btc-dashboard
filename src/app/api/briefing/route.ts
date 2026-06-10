import { NextResponse } from 'next/server'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

// Always run dynamically — never statically cache at build time
export const dynamic = 'force-dynamic'
// Grounded generation takes 20-50s per attempt and 503 responses can take 45s+
// before failing, so a full retry cycle needs well over the 60s default
export const maxDuration = 300

// Vercel's serverless filesystem is read-only except /tmp
const CACHE_PATH = process.env.VERCEL ? '/tmp/morning-briefing.json' : join(process.cwd(), 'src/data/morning-briefing.json')

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

function readCache(): BriefingCache | null {
  try {
    const raw = readFileSync(CACHE_PATH, 'utf-8').trim()
    if (!raw || raw === '{}') return null
    const parsed = JSON.parse(raw) as Partial<BriefingCache>
    if (!parsed.generatedAt || !parsed.content) return null
    return parsed as BriefingCache
  } catch {
    return null
  }
}

function writeCache(content: string): void {
  try {
    const cache: BriefingCache = { generatedAt: new Date().toISOString(), content }
    writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8')
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

const BRIEFING_PROMPT = (todayHKT: string) => `You are a daily morning intelligence briefing assistant. Generate today's morning briefing for a technology entrepreneur and macro-focused investor based in Hong Kong.

Today's date is ${todayHKT} (Hong Kong Time).

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

async function callGeminiOnce(apiKey: string, todayHKT: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: BRIEFING_PROMPT(todayHKT) }],
        },
      ],
      tools: [{ google_search: {} }],
      generationConfig: {
        temperature: 0.3,
        // gemini-2.5-flash is a thinking model: thinking tokens count against
        // this budget (~1.7k observed), so 4000 left no room for the briefing
        maxOutputTokens: 16384,
        topP: 0.8,
        thinkingConfig: { thinkingBudget: 2048 },
      },
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error(`[/api/briefing] Gemini HTTP ${res.status}:`, errText)
    const err = new Error(`Gemini ${res.status}: ${errText}`)
    ;(err as Error & { retryable?: boolean }).retryable = res.status === 429 || res.status >= 500
    throw err
  }

  const json = await res.json()
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    console.error('[/api/briefing] Gemini response missing text:', JSON.stringify(json, null, 2))
    throw new Error('Gemini returned empty content')
  }
  return text as string
}

// Google intermittently returns 503 UNAVAILABLE ("high demand") on grounded
// requests — retry transient failures before giving up
async function callGemini(apiKey: string, todayHKT: string, attempts = 3): Promise<string> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await callGeminiOnce(apiKey, todayHKT)
    } catch (err) {
      lastErr = err
      const retryable = (err as Error & { retryable?: boolean }).retryable
      if (!retryable || i === attempts - 1) throw err
      console.warn(`[/api/briefing] Attempt ${i + 1}/${attempts} failed, retrying:`, (err as Error).message?.slice(0, 200))
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)))
    }
  }
  throw lastErr
}

export async function GET(request: Request) {
  const todayHKT = toHKTDateString(new Date())
  const apiKey = process.env.GEMINI_API_KEY
  const force = new URL(request.url).searchParams.get('force') === '1'

  // 1. Check cache (skip if ?force=1)
  const cache = readCache()
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
    const content = await callGemini(apiKey, todayHKT)
    writeCache(content)
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
