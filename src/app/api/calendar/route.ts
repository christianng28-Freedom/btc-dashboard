import { NextResponse } from 'next/server'
import calendarData from '@/data/macro-calendar.json'

// Revalidate once per week — Next.js ISR handles refreshing automatically
export const revalidate = 604800

interface CalendarEvent {
  date: string
  event: string
  period: string
  category: string
  description: string
  impact?: string
  source?: string
}

interface FinnhubEconomicEvent {
  country: string
  event: string
  impact: string
  time: string
  actual: number | null
  estimate: number | null
  prev: number | null
  unit: string
}

// Map Finnhub event names → our canonical schema
const EVENT_MAP: { pattern: RegExp; event: string; category: string; description: string }[] = [
  { pattern: /FOMC|Federal Funds Rate/i,  event: 'FOMC',         category: 'fomc',       description: 'Federal Open Market Committee Rate Decision' },
  { pattern: /Nonfarm Payrolls/i,          event: 'NFP',          category: 'employment', description: 'Non-Farm Payrolls' },
  { pattern: /Unemployment Rate/i,         event: 'Unemployment', category: 'employment', description: 'US Unemployment Rate' },
  { pattern: /PCE Price Index/i,           event: 'PCE',          category: 'inflation',  description: 'Personal Consumption Expenditures Price Index' },
  { pattern: /\bCPI\b/i,                   event: 'CPI',          category: 'inflation',  description: 'Consumer Price Index' },
  { pattern: /\bPPI\b/i,                   event: 'PPI',          category: 'inflation',  description: 'Producer Price Index' },
  { pattern: /Retail Sales/i,              event: 'Retail Sales', category: 'employment', description: 'US Retail Sales MoM' },
]

function mapFinnhubEvent(e: FinnhubEconomicEvent): CalendarEvent | null {
  // Only US high-impact events
  if (e.country !== 'US' || e.impact !== 'high') return null

  const mapping = EVENT_MAP.find((m) => m.pattern.test(e.event))
  if (!mapping) return null

  // Finnhub time format: "YYYY-MM-DD HH:MM:SS"
  const date = e.time.split(' ')[0]
  const d = new Date(date + 'T00:00:00Z')
  const period = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })

  return {
    date,
    event: mapping.event,
    period,
    category: mapping.category,
    description: mapping.description,
    impact: e.impact,
    source: 'finnhub',
  }
}

async function fetchFinnhubCalendar(apiKey: string, from: string, to: string): Promise<CalendarEvent[]> {
  const url = `https://finnhub.io/api/v1/calendar/economic?from=${from}&to=${to}&token=${apiKey}`
  const res = await fetch(url, { next: { revalidate: 604800 } })
  if (!res.ok) throw new Error(`Finnhub ${res.status}`)

  const json = (await res.json()) as { economicCalendar?: FinnhubEconomicEvent[] }
  const events = json.economicCalendar ?? []

  const mapped = events
    .map(mapFinnhubEvent)
    .filter((e): e is CalendarEvent => e !== null)
    .sort((a, b) => a.date.localeCompare(b.date))

  // Deduplicate by date + event name
  const seen = new Set<string>()
  return mapped.filter((e) => {
    const key = `${e.date}-${e.event}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function GET() {
  const today = new Date().toISOString().split('T')[0]

  const finnhubKey = process.env.FINNHUB_API_KEY
  if (finnhubKey) {
    try {
      const sixMonths = new Date()
      sixMonths.setMonth(sixMonths.getMonth() + 6)
      const to = sixMonths.toISOString().split('T')[0]

      const events = await fetchFinnhubCalendar(finnhubKey, today, to)
      if (events.length > 0) {
        return NextResponse.json(
          { events, source: 'finnhub', refreshedAt: new Date().toISOString() },
          { headers: { 'Cache-Control': 's-maxage=604800, stale-while-revalidate=86400' } },
        )
      }
    } catch (err) {
      console.warn('[/api/calendar] Finnhub failed, falling back to static data:', err)
    }
  }

  // Static fallback — filter to upcoming events only
  const staticEvents = (calendarData as CalendarEvent[])
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))

  return NextResponse.json(
    { events: staticEvents, source: 'static', refreshedAt: null },
    { headers: { 'Cache-Control': 's-maxage=604800, stale-while-revalidate=86400' } },
  )
}
