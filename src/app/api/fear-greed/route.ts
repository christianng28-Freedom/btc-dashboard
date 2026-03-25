import { NextResponse } from 'next/server'
import { fetchFearGreed } from '@/lib/api/alternative-me'

export async function GET() {
  try {
    const data = await fetchFearGreed(31)
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
      },
    })
  } catch (err) {
    console.error('fear-greed route error:', err)
    return NextResponse.json({ error: 'Failed to fetch Fear & Greed data' }, { status: 502 })
  }
}
