/**
 * National NHS news, pulled automatically.
 *
 * This is the feature that stops a practice website going stale. Staff never
 * have to write a news post to keep the site looking alive: NHS England's own
 * feed does it for them.
 *
 * Deliberately dependency free. RSS is simple enough to parse with a few
 * regexes, and adding an XML library to a site that fetches one document an
 * hour is not a trade worth making.
 */

export interface NewsItem {
  title: string
  link: string
  /** ISO string, or empty when the feed omitted a date. */
  published: string
  summary: string
  categories: string[]
  source: string
}

const DEFAULT_FEED = 'https://www.england.nhs.uk/feed/'

/** One hour. NHS syndication terms ask for a refresh at least every 7 days. */
const REVALIDATE_SECONDS = 3600

function decodeEntities(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#8217;/g, '’')
    .replace(/&#8216;/g, '‘')
    .replace(/&#8220;/g, '“')
    .replace(/&#8221;/g, '”')
    .replace(/&#8211;/g, '–')
    .replace(/&#8230;/g, '…')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&')
}

function stripTags(input: string): string {
  return decodeEntities(input)
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function firstTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
  return match ? decodeEntities(match[1]).trim() : ''
}

function allTags(block: string, tag: string): string[] {
  const out: string[] = []
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi')
  let match: RegExpExecArray | null
  while ((match = re.exec(block)) !== null) {
    const value = stripTags(match[1])
    if (value) out.push(value)
  }
  return out
}

function toIso(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

function sourceName(feedUrl: string): string {
  try {
    const host = new URL(feedUrl).hostname.replace(/^www\./, '')
    if (host === 'england.nhs.uk') return 'NHS England'
    if (host === 'digital.nhs.uk') return 'NHS England Digital'
    if (host.endsWith('nhs.uk')) return 'NHS'
    return host
  } catch {
    return 'News'
  }
}

function parseFeed(xml: string, feedUrl: string): NewsItem[] {
  const source = sourceName(feedUrl)
  const items: NewsItem[] = []

  // RSS 2.0
  const rssBlocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || []
  for (const block of rssBlocks) {
    const title = stripTags(firstTag(block, 'title'))
    const link = firstTag(block, 'link')
    if (!title || !link) continue
    items.push({
      title,
      link,
      published: toIso(firstTag(block, 'pubDate')),
      summary: stripTags(firstTag(block, 'description')),
      categories: allTags(block, 'category'),
      source,
    })
  }

  if (items.length) return items

  // Atom
  const atomBlocks = xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || []
  for (const block of atomBlocks) {
    const title = stripTags(firstTag(block, 'title'))
    const hrefMatch = block.match(/<link[^>]*href=["']([^"']+)["']/i)
    const link = hrefMatch ? hrefMatch[1] : ''
    if (!title || !link) continue
    items.push({
      title,
      link,
      published: toIso(firstTag(block, 'updated') || firstTag(block, 'published')),
      summary: stripTags(firstTag(block, 'summary') || firstTag(block, 'content')),
      categories: [],
      source,
    })
  }

  return items
}

async function fetchOne(feedUrl: string): Promise<NewsItem[]> {
  try {
    const res = await fetch(feedUrl, {
      headers: {
        // Some NHS endpoints reject requests with no user agent.
        'User-Agent': 'SimpleSurgery/1.0 (GP practice website; +https://simplesurgery.co.uk)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
      },
      next: { revalidate: REVALIDATE_SECONDS, tags: ['nhs-news'] },
    })

    if (!res.ok) {
      console.warn(`[simple-surgery] news feed ${feedUrl} returned ${res.status}`)
      return []
    }

    return parseFeed(await res.text(), feedUrl)
  } catch (err) {
    // A feed being down must never break a page a patient needs.
    console.warn(`[simple-surgery] news feed ${feedUrl} failed:`, err)
    return []
  }
}

/**
 * Fetches and merges every configured feed, newest first.
 * Always resolves. Returns an empty array rather than throwing.
 */
export async function getNationalNews(
  feedUrls: string[] = [DEFAULT_FEED],
  limit = 8,
): Promise<NewsItem[]> {
  const urls = feedUrls.filter((u) => /^https?:\/\//i.test(u.trim()))
  if (!urls.length) return []

  const results = await Promise.all(urls.map(fetchOne))
  const seen = new Set<string>()

  return results
    .flat()
    .filter((item) => {
      if (seen.has(item.link)) return false
      seen.add(item.link)
      return true
    })
    .sort((a, b) => (b.published || '').localeCompare(a.published || ''))
    .slice(0, Math.max(0, limit))
}

export { DEFAULT_FEED }
