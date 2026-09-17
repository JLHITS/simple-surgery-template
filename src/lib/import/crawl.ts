import { targetFor, type PageTarget } from './content'
import { anchors, tidy } from './html'
import { FetchBlocked, fetchPage, normaliseUrl, type FetchedPage } from './fetch'

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

export function scoreFor(url: string, text: string): { score: number; kind: PageKind } | null {
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

/**
 * Any page after the home page. If the site's bot check starts partway
 * through, the pages already read are still worth having, so a blocked page is
 * skipped like a missing one. Only a blocked home page stops the import.
 */
async function fetchPageOrSkip(target: string | URL): Promise<FetchedPage | null> {
  try {
    return await fetchPage(target)
  } catch (err) {
    if (err instanceof FetchBlocked) return null
    throw err
  }
}

async function sitemapUrls(origin: URL): Promise<string[]> {
  const found: string[] = []

  for (const path of ['/sitemap.xml', '/sitemap_index.xml', '/wp-sitemap.xml']) {
    const page = await fetchPageOrSkip(new URL(path, origin))
    if (!page) continue

    const locs = [...page.html.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((m) => tidy(m[1]))
    if (!locs.length) continue

    // A sitemap index points at more sitemaps. Follow one level, no further.
    const nested = locs.filter((l) => /sitemap.*\.xml$/i.test(l)).slice(0, 3)
    for (const child of nested) {
      const sub = await fetchPageOrSkip(child)
      if (!sub) continue
      found.push(...[...sub.html.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((m) => tidy(m[1])))
    }

    found.push(...locs.filter((l) => !/sitemap.*\.xml$/i.test(l)))
    if (found.length) break
  }

  return found
}

/**
 * Which pages are worth reading, from a list of known links.
 *
 * Shared by the crawl, which then fetches them, and by the bot check fallback,
 * which cannot fetch them and instead lists them for the practice to save from
 * their own browser. Keeping one selection means both ask for the same pages.
 */
class PagePlan {
  readonly candidates = new Map<string, { score: number; kind: PageKind }>()
  /** Every same-site page we know about, for matching against template pages. */
  readonly known = new Map<string, string>()

  constructor(
    private readonly homeUrl: URL,
    private readonly fetched: Set<string>,
  ) {}

  consider(href: string, text: string) {
    if (SKIP.test(href)) return

    let url: URL
    try {
      url = new URL(href, this.homeUrl)
    } catch {
      return
    }
    if (!sameSite(url, this.homeUrl)) return

    url.hash = ''
    const key = url.toString().replace(/\/$/, '')
    if (this.fetched.has(key)) return

    if (!this.known.has(key)) this.known.set(key, text)

    const scored = scoreFor(url.pathname, text)
    if (scored && !this.candidates.has(key)) this.candidates.set(key, scored)
  }

  /**
   * One page per kind, best scoring first. Six "meet the team" pages teach us
   * nothing the first one did not.
   */
  factPages(): [string, PageKind][] {
    const takenKinds = new Set<PageKind>()
    const out: [string, PageKind][] = []

    const ranked = [...this.candidates.entries()].sort((a, b) => b[1].score - a[1].score)
    for (const [url, { kind }] of ranked) {
      if (takenKinds.has(kind)) continue
      takenKinds.add(kind)
      out.push([url, kind])
      if (out.length >= MAX_FACT_PAGES - 1) break
    }

    return out
  }

  /**
   * One page per template target, so a practice is never asked to choose
   * between three candidates for the same destination. The first match wins,
   * and the sitemap is ordered the way the site is.
   */
  contentPages(takenTargets: Set<string>, skip: Set<string>): [string, PageTarget][] {
    const out: [string, PageTarget][] = []

    for (const [url, text] of this.known) {
      if (out.length >= MAX_CONTENT_PAGES) break
      if (skip.has(url) || this.fetched.has(url)) continue

      const target = targetFor(url, text)
      if (!target || takenTargets.has(target.key)) continue

      takenTargets.add(target.key)
      out.push([url, target])
    }

    return out
  }
}

/**
 * Fetches the home page and the most promising handful of others.
 *
 * The home page is mandatory: if it cannot be read there is nothing to import
 * and the caller should say so rather than return an empty result. If it is
 * behind a bot check, the error carries the pages we would have read, when the
 * sitemap is still reachable, so the practice can save those by hand.
 */
export async function crawl(input: string): Promise<CrawledPage[]> {
  const start = normaliseUrl(input)

  let home: FetchedPage | null
  try {
    home = await fetchPage(start)
  } catch (err) {
    if (err instanceof FetchBlocked) {
      err.suggestions = await suggestPages(new URL(err.url)).catch(() => [])
    }
    throw err
  }
  if (!home) return []

  const homeUrl = new URL(home.url)
  const pages: CrawledPage[] = [{ ...home, kind: 'home' }]

  const fetched = new Set([home.url.replace(/\/$/, '')])
  const plan = new PagePlan(homeUrl, fetched)

  for (const { href, text } of anchors(home.html, home.url)) plan.consider(href, text)

  // The sitemap is what finds the deeper content pages. A practice's carers
  // page or PPG page is rarely linked from the home page, and those are
  // exactly the ones worth offering to bring across.
  for (const loc of await sitemapUrls(homeUrl)) plan.consider(loc, '')

  for (const [url, kind] of plan.factPages()) {
    const page = await fetchPageOrSkip(url)
    if (!page) continue
    fetched.add(url)
    pages.push({ ...page, kind, target: targetFor(page.url, plan.known.get(url) || '') ?? undefined })
  }

  const takenTargets = new Set<string>()
  for (const page of pages) {
    if (page.target) takenTargets.add(page.target.key)
  }

  let contentFetched = 0
  for (const [url, target] of plan.contentPages(takenTargets, new Set())) {
    if (contentFetched >= MAX_CONTENT_PAGES) break

    const page = await fetchPageOrSkip(url)
    if (!page) continue

    fetched.add(url)
    contentFetched += 1
    pages.push({ ...page, kind: 'services', target })
  }

  return pages
}

/**
 * The pages worth saving by hand, when the site will not let us read them.
 *
 * Built from the sitemap alone, because the home page is what was blocked.
 * Many firewalls leave sitemaps alone, since search engines need them, so this
 * usually works. When it does not, the practice is told which kinds of page to
 * save instead.
 */
async function suggestPages(homeUrl: URL): Promise<string[]> {
  const home = new URL('/', homeUrl).toString()
  const plan = new PagePlan(homeUrl, new Set([home.replace(/\/$/, '')]))

  for (const loc of await sitemapUrls(homeUrl)) plan.consider(loc, '')

  const facts = plan.factPages()
  const takenTargets = new Set<string>()
  for (const [url] of facts) {
    const target = targetFor(url, '')
    if (target) takenTargets.add(target.key)
  }
  const content = plan.contentPages(takenTargets, new Set(facts.map(([url]) => url)))

  return [home, ...facts.map(([url]) => url), ...content.map(([url]) => url)]
}
