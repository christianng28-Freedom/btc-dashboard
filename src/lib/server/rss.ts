/**
 * Lightweight RSS fetching/parsing for the analyst agents (no external
 * parser dependency — same approach as /api/news).
 */

export interface RssItem {
  title: string
  url: string
  source: string
  publishedAt: string // ISO
  description: string
}

function extractTag(xml: string, tag: string): string | null {
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
}

function stripHtml(str: string): string {
  return str.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export async function fetchRssItems(url: string, source: string, revalidate = 600): Promise<RssItem[]> {
  const res = await fetch(url, {
    next: { revalidate },
    signal: AbortSignal.timeout(10000),
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; RSS reader)',
      Accept: 'application/rss+xml, application/xml, text/xml, */*',
    },
  })
  if (!res.ok) throw new Error(`RSS ${source}: ${res.status}`)
  const xml = await res.text()

  const items: RssItem[] = []
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi
  let match: RegExpExecArray | null
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]
    const title = extractTag(block, 'title')
    const link = extractTag(block, 'link') || extractTag(block, 'guid')
    if (!title || !link) continue
    const pubDate = extractTag(block, 'pubDate') || extractTag(block, 'dc:date')
    const description = extractTag(block, 'content:encoded') ?? extractTag(block, 'description') ?? ''
    items.push({
      title: decodeEntities(stripHtml(title)),
      url: link,
      source,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      description: decodeEntities(stripHtml(description)),
    })
  }
  return items
}

/** Fetch several feeds in parallel, tolerating individual failures. */
export async function fetchManyFeeds(
  feeds: Array<{ url: string; source: string }>,
): Promise<{ items: RssItem[]; failed: string[] }> {
  const results = await Promise.allSettled(feeds.map((f) => fetchRssItems(f.url, f.source)))
  const items: RssItem[] = []
  const failed: string[] = []
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') items.push(...r.value)
    else failed.push(feeds[i].source)
  })
  items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
  return { items, failed }
}
