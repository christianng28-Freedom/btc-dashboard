import { NextResponse } from 'next/server'

export const revalidate = 300 // 5 minutes

export interface NewsItem {
  id: string
  title: string
  url: string
  source: string
  publishedAt: string
  sentiment: 'positive' | 'negative' | 'neutral'
}

interface FeedConfig {
  url: string
  source: string
}

const FEEDS: FeedConfig[] = [
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',      source: 'CoinDesk' },
  { url: 'https://cointelegraph.com/rss',                         source: 'CoinTelegraph' },
  { url: 'https://decrypt.co/feed',                              source: 'Decrypt' },
  { url: 'https://beincrypto.com/feed/',                         source: 'BeInCrypto' },
]

// Very lightweight RSS → item extraction (no external parser needed)
function parseRssItems(xml: string, source: string): NewsItem[] {
  const items: NewsItem[] = []
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]

    const title = extractTag(block, 'title')
    const link  = extractTag(block, 'link') || extractTag(block, 'guid')
    const pubDate = extractTag(block, 'pubDate') || extractTag(block, 'dc:date')

    if (!title || !link) continue

    // Filter to BTC-relevant items
    const text = (title + ' ' + (extractTag(block, 'description') ?? '')).toLowerCase()
    const btcRelated = /bitcoin|btc|\$btc|satoshi|halving|crypto|blockchain/.test(text)
    if (!btcRelated) continue

    const sentiment = inferSentiment(text)

    items.push({
      id: link,
      title: decodeEntities(title),
      url: link,
      source,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      sentiment,
    })
  }
  return items
}

function extractTag(xml: string, tag: string): string | null {
  // Handles <tag>value</tag> and <![CDATA[value]]>
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?</${tag}>`, 'si')
  const m = re.exec(xml)
  return m ? m[1].trim() : null
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8217;/g, "\u2019")
    .replace(/&#8216;/g, "\u2018")
    .replace(/&#8220;/g, "\u201C")
    .replace(/&#8221;/g, "\u201D")
}

const POSITIVE_TERMS = /surges?|rally|rallies|bullish|surge|soar|hits? (new|all.time)|breakthrough|adoption|approval|gains?|jumps?|rises?|rebounds?|record/i
const NEGATIVE_TERMS = /crash|crashes|drops?|falls?|tumbles?|bearish|ban|hack|exploit|lawsuit|crackdown|sell.off|plunges?|collapse|fear/i

function inferSentiment(text: string): NewsItem['sentiment'] {
  const pos = POSITIVE_TERMS.test(text)
  const neg = NEGATIVE_TERMS.test(text)
  if (pos && !neg) return 'positive'
  if (neg && !pos) return 'negative'
  return 'neutral'
}

async function fetchFeed(feed: FeedConfig): Promise<NewsItem[]> {
  const res = await fetch(feed.url, {
    next: { revalidate: 300 },
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; RSS reader)',
      Accept: 'application/rss+xml, application/xml, text/xml, */*',
    },
  })
  if (!res.ok) throw new Error(`${res.status}`)
  const xml = await res.text()
  return parseRssItems(xml, feed.source)
}

export async function GET() {
  const results = await Promise.allSettled(FEEDS.map(fetchFeed))

  const allItems: NewsItem[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') allItems.push(...r.value)
  }

  // Sort by date descending, deduplicate by URL
  const seen = new Set<string>()
  const deduped = allItems
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .filter((item) => {
      if (seen.has(item.url)) return false
      seen.add(item.url)
      return true
    })
    .slice(0, 20)

  return NextResponse.json(
    { items: deduped, source: 'rss' },
    { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=120' } },
  )
}
