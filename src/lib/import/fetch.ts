import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

/**
 * Fetching a URL somebody typed into a form, safely.
 *
 * This is the dangerous half of the migration tool. An admin panel that will
 * fetch any address given to it, from a server, is a server side request
 * forgery hole: the classic exploit is `http://169.254.169.254/`, the cloud
 * metadata endpoint, which on some platforms hands back credentials.
 *
 * So every hop is resolved and checked against the address, not the hostname.
 * Checking the hostname alone is not enough, because DNS can point anywhere and
 * an attacker controls their own DNS. Redirects are followed manually so each
 * new location goes through the same check rather than being handled invisibly
 * by fetch.
 */

/** Practice websites are HTML. Nothing else needs to be downloaded. */
const MAX_BYTES = 3_000_000
const TIMEOUT_MS = 12_000
const MAX_REDIRECTS = 5

export const USER_AGENT =
  'SimpleSurgeryImportBot/1.0 (+https://simplesurgery.co; practice website migration)'

export interface FetchedPage {
  url: string
  html: string
}

export class FetchRefused extends Error {}

/**
 * True for anything that must never be reached from the server.
 *
 * Loopback, private ranges, link-local (which is where cloud metadata lives),
 * carrier grade NAT, and the IPv6 equivalents including v4-mapped addresses,
 * because `::ffff:169.254.169.254` resolves to the metadata endpoint just as
 * well as the dotted-quad does.
 */
function isBlockedAddress(address: string): boolean {
  const version = isIP(address)

  if (version === 4) {
    const [a, b] = address.split('.').map(Number)
    if (a === 0 || a === 10 || a === 127) return true
    if (a === 169 && b === 254) return true // link-local and metadata
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 100 && b >= 64 && b <= 127) return true // carrier grade NAT
    if (a >= 224) return true // multicast and reserved
    return false
  }

  if (version === 6) {
    const lower = address.toLowerCase()
    if (lower === '::' || lower === '::1') return true
    if (lower.startsWith('fe80') || lower.startsWith('fc') || lower.startsWith('fd')) return true

    // ::ffff:a.b.c.d and ::ffff:aabb:ccdd both map onto IPv4.
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower)
    if (mapped) return isBlockedAddress(mapped[1])
    if (lower.startsWith('::ffff:')) return true

    return false
  }

  return true
}

/** Normalises what somebody typed into something fetchable, or throws. */
export function normaliseUrl(input: string): URL {
  const trimmed = (input || '').trim()
  if (!trimmed) throw new FetchRefused('Enter your website address.')

  // Reject other schemes before assuming https, or "file:///etc/passwd"
  // becomes "https://file:///etc/passwd" and fails with a baffling message
  // about not finding a website called "file".
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    throw new FetchRefused('Only web addresses starting http or https can be read.')
  }

  // People type "oursurgery.nhs.uk". Assume https rather than making them.
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  let url: URL
  try {
    url = new URL(withScheme)
  } catch {
    throw new FetchRefused('That does not look like a website address.')
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new FetchRefused('Only web addresses starting http or https can be read.')
  }

  const host = url.hostname.toLowerCase()
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.internal') ||
    host.endsWith('.local')
  ) {
    throw new FetchRefused('That address is not a public website.')
  }

  return url
}

/** Resolves the host and refuses anything on a private or reserved address. */
async function assertPublicHost(url: URL): Promise<void> {
  const host = url.hostname

  if (isIP(host)) {
    if (isBlockedAddress(host)) throw new FetchRefused('That address is not a public website.')
    return
  }

  let addresses: { address: string }[]
  try {
    addresses = await lookup(host, { all: true })
  } catch {
    throw new FetchRefused(`We could not find a website at ${host}.`)
  }

  if (!addresses.length) throw new FetchRefused(`We could not find a website at ${host}.`)

  // Every address, not just the first. A host that resolves to one public and
  // one private address is a deliberate attack, not a misconfiguration.
  for (const { address } of addresses) {
    if (isBlockedAddress(address)) {
      throw new FetchRefused('That address is not a public website.')
    }
  }
}

/**
 * Fetches one page as HTML, following redirects by hand.
 *
 * Returns null rather than throwing for the ordinary failures: a 404 on one of
 * several guessed pages is expected and must not stop the crawl. Throws only
 * for refusals, which the caller shows to the practice.
 */
export async function fetchPage(target: string | URL): Promise<FetchedPage | null> {
  let url = typeof target === 'string' ? normaliseUrl(target) : target

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    await assertPublicHost(url)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    let res: Response
    try {
      res = await fetch(url, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-GB,en;q=0.9',
        },
        cache: 'no-store',
      })
    } catch {
      return null
    } finally {
      clearTimeout(timer)
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location')
      if (!location) return null
      try {
        url = new URL(location, url)
      } catch {
        return null
      }
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
      continue
    }

    if (!res.ok) return null

    const type = res.headers.get('content-type') || ''
    if (type && !/text\/html|application\/xhtml|text\/xml|application\/xml/i.test(type)) {
      return null
    }

    const declared = Number(res.headers.get('content-length') || 0)
    if (declared > MAX_BYTES) return null

    // Read with a cap, because content-length can lie or be absent.
    const buffer = await res.arrayBuffer().catch(() => null)
    if (!buffer) return null
    if (buffer.byteLength > MAX_BYTES) return null

    return { url: url.toString(), html: new TextDecoder('utf-8').decode(buffer) }
  }

  return null
}
