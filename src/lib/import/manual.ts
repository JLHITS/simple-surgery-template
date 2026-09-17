import { targetFor } from './content'
import { scoreFor, type CrawledPage } from './crawl'
import { FetchRefused, isBotChallengeHtml, normaliseUrl } from './fetch'
import { title } from './html'

/**
 * Pages a practice saved from their own browser, read as if we had fetched them.
 *
 * The fallback for sites behind a bot check. Their pages open normally for a
 * person, so the practice saves them (or pastes their source) and we run the
 * same extraction over those. Nothing is fetched here: this reads only what
 * was handed to it, which also means none of the fetch safeguards are needed.
 *
 * The one thing a saved file does not reliably carry is its own address, and
 * the address is how a page is recognised as the contact page or the
 * complaints page. So it is recovered from the file where possible, and failing
 * that from the page title and the file name.
 */

export const MAX_UPLOADED_PAGES = 40
/** Per page. Matches what the crawl will download. */
export const MAX_UPLOADED_BYTES = 3_000_000

export interface UploadedPage {
  /** File name, or a label for pasted source. Used when the address is unknown. */
  name: string
  html: string
  /** Where the practice said it came from, if they said. */
  url?: string
}

export interface ManualResult {
  pages: CrawledPage[]
  /** Names of uploads that were a bot check page rather than content. */
  challenges: string[]
}

function sameSite(a: URL, b: URL): boolean {
  const strip = (h: string) => h.toLowerCase().replace(/^www\./, '')
  return strip(a.hostname) === strip(b.hostname)
}

/** An address on the practice's site, or null. Never a different site. */
function onSite(raw: string, site: URL): URL | null {
  if (!raw) return null
  try {
    const url = new URL(raw.trim(), site)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return sameSite(url, site) ? url : null
  } catch {
    return null
  }
}

/** Where a saved page came from, read from the page itself. */
function addressInFile(html: string, site: URL): URL | null {
  // Chrome and Edge stamp this on saved pages.
  const saved = /<!--\s*saved from url=\(\d+\)\s*(\S+?)\s*-->/i.exec(html)
  const canonical = /<link\b[^>]*\brel\s*=\s*["']?canonical["']?[^>]*>/i.exec(html)
  const canonicalHref = canonical ? /\bhref\s*=\s*["']([^"']+)["']/i.exec(canonical[0]) : null
  const ogUrl =
    /<meta\b[^>]*\bproperty\s*=\s*["']og:url["'][^>]*\bcontent\s*=\s*["']([^"']+)["']/i.exec(html) ||
    /<meta\b[^>]*\bcontent\s*=\s*["']([^"']+)["'][^>]*\bproperty\s*=\s*["']og:url["']/i.exec(html)

  return (
    onSite(saved?.[1] || '', site) ||
    onSite(canonicalHref?.[1] || '', site) ||
    onSite(ogUrl?.[1] || '', site)
  )
}

/** "Contact Us - Abbey Medical Centre.html" becomes /contact-us-abbey-medical-centre. */
function addressFromName(name: string, site: URL, index: number): URL {
  const slug =
    name
      .replace(/\.(html?|txt)$/i, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || `page-${index + 1}`
  return new URL(`/${slug}`, site)
}

function isHomeAddress(url: URL): boolean {
  return /^\/(index\.(html?|php))?$/i.test(url.pathname)
}

export function pagesFromUploads(siteInput: string, uploads: UploadedPage[]): ManualResult {
  const usable = uploads.filter((u) => typeof u.html === 'string' && u.html.trim())
  if (!usable.length) throw new FetchRefused('Add at least one page first.')
  if (usable.length > MAX_UPLOADED_PAGES) {
    throw new FetchRefused(`That is more than ${MAX_UPLOADED_PAGES} pages. Start with the most important ones.`)
  }

  // The site address: what they typed, or failing that whatever the first
  // saved page says about itself.
  let site: URL | null = null
  if (siteInput.trim()) {
    site = normaliseUrl(siteInput)
  } else {
    for (const upload of usable) {
      const saved = /<!--\s*saved from url=\(\d+\)\s*(https?:\/\/\S+?)\s*-->/i.exec(upload.html)
      const canonical = /<link\b[^>]*\brel\s*=\s*["']?canonical["']?[^>]*\bhref\s*=\s*["'](https?:\/\/[^"']+)["']/i.exec(upload.html)
      const found = saved?.[1] || canonical?.[1]
      if (found) {
        try {
          site = normaliseUrl(found)
          break
        } catch {
          /* try the next page */
        }
      }
    }
  }
  if (!site) {
    throw new FetchRefused('Put your website address in the box above, so we know which site these pages are from.')
  }
  const origin = new URL('/', site)

  const challenges: string[] = []
  const seen = new Set<string>()
  const read: { url: URL; html: string; title: string }[] = []

  usable.forEach((upload, index) => {
    if (upload.html.length > MAX_UPLOADED_BYTES) return

    if (isBotChallengeHtml(upload.html)) {
      challenges.push(upload.name)
      return
    }

    const url =
      onSite(upload.url || '', origin) ||
      addressInFile(upload.html, origin) ||
      addressFromName(upload.name, origin, index)

    url.hash = ''
    const key = url.toString().replace(/\/$/, '')
    if (seen.has(key)) return
    seen.add(key)

    // The first part only: "Contact us - Abbey Medical Centre - Proud to..."
    const pageTitle = (title(upload.html) || upload.name).split(/[|–—»]|\s+-\s+/)[0].trim()
    read.push({ url, html: upload.html, title: pageTitle })
  })

  if (!read.length) return { pages: [], challenges }

  // The extraction reads the practice's name and links from the first page,
  // so the home page must lead. If none is recognisable, the first one added is
  // the best guess, and the practice is told to start with the home page.
  const homeIndex = Math.max(
    0,
    read.findIndex((r) => isHomeAddress(r.url)),
  )
  const [home] = read.splice(homeIndex, 1)

  const pages: CrawledPage[] = [{ url: home.url.toString(), html: home.html, kind: 'home' }]

  const takenTargets = new Set<string>()
  for (const page of read) {
    const scored = scoreFor(page.url.pathname, page.title)
    let target = targetFor(page.url.toString(), page.title) ?? undefined

    // One page per destination, as in the crawl. The first one given wins.
    if (target && takenTargets.has(target.key)) target = undefined
    if (target) takenTargets.add(target.key)

    pages.push({
      url: page.url.toString(),
      html: page.html,
      kind: scored?.kind ?? 'services',
      target,
    })
  }

  return { pages, challenges }
}
