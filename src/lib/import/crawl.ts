import { targetFor, type PageTarget } from './content'
import { anchors, tidy } from './html'
import { fetchPage, normaliseUrl, type FetchedPage } from './fetch'

/**
 * Deciding which pages of a practice website are worth reading.
 *
 * Practice sites run to hundreds of pages and almost all of the facts worth
 * importing live on five of them: home, contact, opening times, about, and the
 * staff list. So this is not a crawler in the general sense. It looks at the
 * home page's own links, and at the sitemap if there is one, scores what it
 * finds, and fetches the best handful.
 *
 * The budget is deliberately small. A practice sitting in the admin panel
 * waiting for this will accept ten seconds and not ninety, and no practice
 * website should be hammered by a tool that claims to be helping.
 */

/**
 * Pages fetched for facts: name, phone, hours, links.
 */
const MAX_FACT_PAGES = 10

/**
 * Further pages fetched only for their wording, one per template page that
 * could receive it. Twenty is roughly a full practice site's worth of content
 * pages, and at a tenth of a second each it is not a burden on their server.
 */
const MAX_CONTENT_PAGES = 20

/** URL or link-text fragments worth following, best first. */
const WANTED: { pattern: RegExp; score: number; kind: PageKind }[] = [
  { pattern: /contact|find-us|how-to-find|location|get-in-touch/i, score: 100, kind: 'contact' },
  { pattern: /opening|hours|times|when-we-are-open|surgery-hours/i, score: 95, kind: 'hours' },
  { pattern: /about|practice-info|surgery-information|welcome|who-we-are/i, score: 80, kind: 'about' },
  { pattern: /staff|team|our-doctors|clinicians|meet-the|partners|gps?\b/i, score: 75, kind: 'team' },
  { pattern: /appointment|booking|consult|book-/i, score: 70, kind: 'appointments' },
  { pattern: /prescription|repeat-medic|medication|pharmacy/i, score: 65, kind: 'prescriptions' },
  { pattern: /services|clinics|what-we-offer/i, score: 45, kind: 'services' },
  { pattern: /new-patient|register|joining/i, score: 40, kind: 'register' },
]

export type PageKind =
  | 'home'
  | 'contact'
  | 'hours'
  | 'about'
  | 'team'
  | 'appointments'
  | 'prescriptions'
  | 'services'
  | 'register'

export interface CrawledPage extends FetchedPage {
  kind: PageKind
  /**
   * The template page this one's wording could go into, if any.
   *
   * A page can be both: the appointments page is read for its online request
   * link and offered for its prose, and is fetched once for both.
   */
  target?: PageTarget
}

/** Things that are never worth fetching, however they score. */
const SKIP =
  /\.(pdf|docx?|xlsx?|pptx?|jpe?g|png|gif|svg|webp|zip|mp4|mp3|ics)(\?|$)|^mailto:|^tel:|\/wp-(admin|content|json)\/|\/feed\/?$|#/i

function scoreFor(url: string, text: string): { score: number; kind: PageKind } | null {
  const haystack = `${url} ${text}`
  for (const { pattern, score, kind } of WANTED) {
    if (pattern.test(haystack)) return { score, kind }
  }
  return null
}

/** Same registrable site, so a link to nhs.uk or Facebook is not followed. */
function sameSite(a: URL, b: URL): boolean {
  const strip = (h: string) => h.toLowerCase().replace(/^www\./, '')
  return strip(a.hostname) === strip(b.hostname)
}

async function sitemapUrls(origin: URL): Promise<string[]> {
  const found: string[] = []

  for (const path of ['/sitemap.xml', '/sitemap_index.xml', '/wp-sitemap.xml']) {
    const page = await fetchPage(new URL(path, origin))
    if (!page) continue

    const locs = [...page.html.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((m) => tidy(m[1]))
    if (!locs.length) continue

    // A sitemap index points at more sitemaps. Follow one level, no further.
    const nested = locs.filter((l) => /sitemap.*\.xml$/i.test(l)).slice(0, 3)
    for (const child of nested) {
      const sub = await fetchPage(child)
      if (!sub) continue
      found.push(...[...sub.html.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((m) => tidy(m[1])))
    }

    found.push(...locs.filter((l) => !/sitemap.*\.xml$/i.test(l)))
    if (found.length) break
  }

  return found
}

/**
 * Fetches the home page and the most promising handful of others.
 *
 * The home page is mandatory: if it cannot be read there is nothing to import
 * and the caller should say so rather than return an empty result.
 */
export async function crawl(input: string): Promise<CrawledPage[]> {
  const start = normaliseUrl(input)
  const home = await fetchPage(start)
  if (!home) return []

  const homeUrl = new URL(home.url)
  const pages: CrawledPage[] = [{ ...home, kind: 'home' }]

  const fetched = new Set([home.url.replace(/\/$/, '')])
  const candidates = new Map<string, { score: number; kind: PageKind }>()
  /** Every same-site page we know about, for matching against template pages. */
  const known = new Map<string, string>()

  const consider = (href: string, text: string) => {
    if (SKIP.test(href)) return

    let url: URL
    try {
      url = new URL(href, homeUrl)
    } catch {
      return
    }
    if (!sameSite(url, homeUrl)) return

    url.hash = ''
    const key = url.toString().replace(/\/$/, '')
    if (fetched.has(key)) return

    if (!known.has(key)) known.set(key, text)

    const scored = scoreFor(url.pathname, text)
    if (scored && !candidates.has(key)) candidates.set(key, scored)
  }

  for (const { href, text } of anchors(home.html, home.url)) consider(href, text)

  // The sitemap is what finds the deeper content pages. A practice's carers
  // page or PPG page is rarely linked from the home page, and those are
  // exactly the ones worth offering to bring across.
  for (const loc of await sitemapUrls(homeUrl)) consider(loc, '')

  /* ----------------------------------------------------------- fact pages */

  // One page per kind, best scoring first. Six "meet the team" pages teach us
  // nothing the first one did not.
  const takenKinds = new Set<PageKind>()
  const factPages: [string, PageKind][] = []

  for (const [url, { kind }] of [...candidates.entries()].sort((a, b) => b[1].score - a[1].score)) {
    if (takenKinds.has(kind)) continue
    takenKinds.add(kind)
    factPages.push([url, kind])
    if (factPages.length >= MAX_FACT_PAGES - 1) break
  }

  for (const [url, kind] of factPages) {
    const page = await fetchPage(url)
    if (!page) continue
    fetched.add(url)
    pages.push({ ...page, kind, target: targetFor(page.url, known.get(url) || '') ?? undefined })
  }

  /* -------------------------------------------------------- content pages */

  // One page per template target, so a practice is never asked to choose
  // between three candidates for the same destination. The first match wins,
  // and the sitemap is ordered the way the site is.
  const takenTargets = new Set<string>()
  for (const page of pages) {
    if (page.target) takenTargets.add(page.target.key)
  }

  let contentFetched = 0

  for (const [url, text] of known) {
    if (contentFetched >= MAX_CONTENT_PAGES) break
    if (fetched.has(url)) continue

    const target = targetFor(url, text)
    if (!target || takenTargets.has(target.key)) continue

    takenTargets.add(target.key)

    const page = await fetchPage(url)
    if (!page) continue

    fetched.add(url)
    contentFetched += 1
    pages.push({ ...page, kind: 'services', target })
  }

  return pages
}
