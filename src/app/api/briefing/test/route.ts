import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not found in environment' }, { status: 500 })
  }

  // Quick test call with gemini-2.5-flash
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Say "API key works" in 5 words.' }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 20 },
      }),
    })

    const json = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: `Gemini HTTP ${res.status}`, detail: json }, { status: 500 })
    }

    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text
    return NextResponse.json({ success: true, model: 'gemini-2.5-flash', keyPrefix: apiKey.slice(0, 10) + '...', response: text })

  } catch (err) {
    return NextResponse.json({ error: 'Fetch failed', detail: String(err) }, { status: 500 })
  }
}
