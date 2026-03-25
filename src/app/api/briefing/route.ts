import { NextResponse } from 'next/server'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

// Always run dynamically — never statically cache at build time
export const dynamic = 'force-dynamic'

const CACHE_PATH = join(process.cwd(), 'src/data/morning-briefing.json')

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

const FALLBACK_CONTENT = `## ⚠️ Briefing Unavailable
- Unable to generate morning briefing. Check that GEMINI_API_KEY is set in your environment and try refreshing.

---

## 🏛️ Stoic Quote
> *"You have power over your mind, not outside events. Realize this and you will find strength."* — Marcus Aurelius`

const BRIEFING_PROMPT = (todayHKT: string) => `You are a daily morning intelligence briefing assistant. Generate today's morning briefing for a technology entrepreneur and macro-focused investor based in Hong Kong.

Today's date is ${todayHKT} (Hong Kong Time).

Use your search capabilities to gather real-time data for each section. Be factual and data-driven. Format your entire response in Markdown with exactly these sections in this order:

## 🌤️ HK Weather Today
- **Current:** [conditions and temperature in °C]
- **High/Low:** [temperatures]
- **Outlook:** [brief summary for the day]

---

## 📈 Markets & Digital Assets
Provide 4 key market updates. For each use this exact sub-bullet format:
- **[Asset / Index / Story]:**
  - **What happened:** [3–5 sentences on the move or development, include latest price and % move]
  - **Why it matters:** [1 sentence on relevance to broader markets]

Cover a mix of: major equity indices (S&P 500, Nasdaq, Hang Seng), macro themes (Fed, rates, DXY), and crypto/digital assets (BTC, ETH, and any notable development).

---

## 🤖 AI & Robotics
Provide 4 key developments from the past 24–48 hours. For each use this exact sub-bullet format:
- **[Headline]:**
  - **Summary:** [3–5 sentences describing what happened and who is involved]
  - **Significance:** [1 sentence on why this matters to the field or industry]

Cover a mix of: model releases, funding/M&A, robotics hardware breakthroughs, policy/regulation, and enterprise AI adoption.

---

## 🏛️ Stoic Quote
> *"[quote in full]"* — [Philosopher name]

[1–2 sentence modern application of the principle for a builder or investor]

Draw from Marcus Aurelius, Epictetus, Seneca, Cato, Zeno, or Musonius Rufus. Vary the selection — do not default to the most commonly cited quotes.`

async function callGemini(apiKey: string, todayHKT: string): Promise<string> {
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
        maxOutputTokens: 3000,
        topP: 0.8,
      },
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error(`[/api/briefing] Gemini HTTP ${res.status}:`, errText)
    throw new Error(`Gemini ${res.status}: ${errText}`)
  }

  const json = await res.json()
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    console.error('[/api/briefing] Gemini response missing text:', JSON.stringify(json, null, 2))
    throw new Error('Gemini returned empty content')
  }
  return text as string
}

export async function GET() {
  const todayHKT = toHKTDateString(new Date())
  const apiKey = process.env.GEMINI_API_KEY

  // 1. Check cache
  const cache = readCache()
  if (cache && toHKTDateString(new Date(cache.generatedAt)) === todayHKT) {
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
      content: FALLBACK_CONTENT,
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
