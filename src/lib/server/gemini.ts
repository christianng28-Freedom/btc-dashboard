/**
 * Shared Gemini client for the briefing route and the analyst agents.
 * Extracted from /api/briefing — one retry policy, one place to swap models.
 */

const GEMINI_MODEL = 'gemini-2.5-flash'

export interface GeminiOptions {
  /** Enable Google Search grounding (slower, for research prompts) */
  useSearch?: boolean
  temperature?: number
  maxOutputTokens?: number
  thinkingBudget?: number
  attempts?: number
}

async function callOnce(apiKey: string, prompt: string, opts: GeminiOptions): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        ...(opts.useSearch ? { tools: [{ google_search: {} }] } : {}),
        generationConfig: {
          temperature: opts.temperature ?? 0.3,
          // gemini-2.5-flash is a thinking model: thinking tokens count against
          // this budget, so leave generous headroom above the thinking budget
          maxOutputTokens: opts.maxOutputTokens ?? 16384,
          topP: 0.8,
          thinkingConfig: { thinkingBudget: opts.thinkingBudget ?? 2048 },
        },
      }),
    })
  } catch (err) {
    // Network-level failures (DNS flakes, TLS interception) are transient —
    // retry them like 5xx instead of giving up on the first attempt
    const wrapped = new Error(`Gemini network error: ${err instanceof Error ? err.message : String(err)}`)
    ;(wrapped as Error & { retryable?: boolean }).retryable = true
    throw wrapped
  }

  if (!res.ok) {
    const errText = await res.text()
    console.error(`[gemini] HTTP ${res.status}:`, errText.slice(0, 500))
    const err = new Error(`Gemini ${res.status}: ${errText.slice(0, 200)}`)
    ;(err as Error & { retryable?: boolean }).retryable = res.status === 429 || res.status >= 500
    throw err
  }

  const json = await res.json()
  const text = json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('')
  if (!text) {
    console.error('[gemini] response missing text:', JSON.stringify(json).slice(0, 500))
    throw new Error('Gemini returned empty content')
  }
  return text as string
}

/**
 * Generate text with retry on transient failures (429 / 5xx — Google
 * intermittently returns 503 UNAVAILABLE on grounded requests).
 * Throws if GEMINI_API_KEY is unset.
 */
export async function generateWithGemini(prompt: string, opts: GeminiOptions = {}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')

  const attempts = opts.attempts ?? 3
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await callOnce(apiKey, prompt, opts)
    } catch (err) {
      lastErr = err
      const retryable = (err as Error & { retryable?: boolean }).retryable
      if (!retryable || i === attempts - 1) throw err
      console.warn(`[gemini] attempt ${i + 1}/${attempts} failed, retrying:`, (err as Error).message?.slice(0, 200))
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)))
    }
  }
  throw lastErr
}

/**
 * Extract a JSON object from an LLM response that may wrap it in a fenced
 * code block or surround it with prose.
 */
export function extractJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1] : text
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in model response')
  }
  return JSON.parse(candidate.slice(start, end + 1)) as T
}
