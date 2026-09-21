import { FetchBlocked, fetchJson, isBotChallengeHtml, normaliseUrl, type FetchedPage } from './fetch'
import { tidy, toText } from './html'

/**
 * Practice365 uses WordPress. Its firewall can challenge page requests while
 * leaving the public, published-page API available. Read that API without
 * credentials or a browser service, and retain the original URLs as sources.
 * Both WordPress URL formats are supported; some hosts block just one of them.
 */
const PAGE_SIZE = 100
const MAX_INDEX_PAGES = 3

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function escape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function key(url: URL): string {
  return `${url.hostname.replace(/^www\./, '')}${url.pathname.replace(/\/$/, '')}${url.search}`
}

async function readJson(url: URL, signal?: AbortSignal): Promise<unknown> {
  try {
    return await fetchJson(url, signal)
  } catch (err) {
    if (err instanceof FetchBlocked) return null
    throw err
  }
}

export interface WordPressReader {
  links: { href: string; text: string }[]
  read: (url: string | URL) => Promise<FetchedPage | null>
}

export async function wordpressReader(origin: URL, signal?: AbortSignal): Promise<WordPressReader | null> {
  // The supplier also serves practices at practice365.co.uk/<ODS code>/.
  // Its network root is a different WordPress site; never read that site's data.
  const prefix = /(^|\.)practice365\.co\.uk$/i.test(origin.hostname)
    ? /^\/[a-z]\d{5}(?=\/|$)/i.exec(origin.pathname)?.[0] || ''
    : ''
  for (const queryRoute of [false, true]) {
    const endpoint = (path: string, params: Record<string, string> = {}) => {
      const url = new URL(queryRoute ? `${prefix}/` : `${prefix}/wp-json/${path}`, origin)
      if (queryRoute) url.searchParams.set('rest_route', `/${path}`)
      for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value)
      return url
    }

    const entries = new Map<string, { id: number; href: string; text: string }>()
    for (let page = 1; page <= MAX_INDEX_PAGES; page++) {
      const data = await readJson(endpoint('wp/v2/pages', {
        context: 'view', status: 'publish', per_page: String(PAGE_SIZE), page: String(page),
        orderby: 'id', order: 'asc', _fields: 'id,link,title,status',
      }), signal)
      if (!Array.isArray(data)) break
      for (const value of data) {
        const item = record(value)
        if (!Number.isSafeInteger(item.id) || Number(item.id) <= 0 || typeof item.link !== 'string') continue
        if (item.status !== 'publish') continue
        let url: URL
        try { url = normaliseUrl(item.link) } catch { continue }
        if (url.hostname.replace(/^www\./, '') !== origin.hostname.replace(/^www\./, '')) continue
        if (prefix && !url.pathname.startsWith(`${prefix}/`) && url.pathname !== prefix) continue
        if (url.port !== origin.port || url.username || url.password) continue
        url.hash = ''
        const rendered = record(item.title).rendered
        entries.set(key(url), {
          id: Number(item.id), href: url.toString(),
          text: typeof rendered === 'string' ? tidy(toText(rendered)) : '',
        })
      }
      if (data.length < PAGE_SIZE) break
    }
    if (!entries.size) continue

    // The actual site name, rather than a generic WordPress "Home Page" title.
    const info = record(await readJson(endpoint('', { _fields: 'name,home' }), signal))
    const name = typeof info.name === 'string' ? tidy(toText(info.name)).slice(0, 200) : ''
    const cache = new Map<string, Promise<FetchedPage | null>>()
    return {
      links: [...entries.values()].map(({ href, text }) => ({ href, text })),
      read(target) {
        const url = normaliseUrl(target.toString())
        const entry = entries.get(key(url))
        if (!entry) return Promise.resolve(null)
        const cached = cache.get(key(url))
        if (cached) return cached
        const pending = (async (): Promise<FetchedPage | null> => {
          const item = record(await readJson(endpoint(`wp/v2/pages/${entry.id}`, {
            context: 'view', _fields: 'id,link,title,content,status',
          }), signal))
          const content = record(item.content)
          if (item.id !== entry.id || item.status !== 'publish' || content.protected === true) return null
          if (typeof item.link !== 'string') return null
          try {
            if (key(normaliseUrl(item.link)) !== key(new URL(entry.href))) return null
          } catch { return null }
          if (typeof content.rendered !== 'string' || !toText(content.rendered).trim()) return null
          if (isBotChallengeHtml(content.rendered)) return null
          const pageTitle = entry.text || name
          const documentTitle = /^(home\s*page|home|welcome)$/i.test(pageTitle) ? name : pageTitle
          const html = `<html><head><title>${escape(documentTitle)}</title>` +
            (name ? `<meta property="og:site_name" content="${escape(name)}">` : '') +
            `</head><body><main><h1>${escape(pageTitle)}</h1>${content.rendered}</main></body></html>`
          return { url: entry.href, html }
        })()
        cache.set(key(url), pending)
        return pending
      },
    }
  }
  return null
}
