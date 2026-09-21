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
 * The site answered with a bot check instead of its page.
 *
 * Some practice website suppliers put their sites behind a firewall that
 * challenges requests from data centres, which is where any server, ours
 * included, makes them from. The challenge page is a perfectly good 200 or 202
 * response, so without this it was read as the practice's content: the import
 * "found" a practice called "JavaScript is disabled" and nothing else, across
 * every page it read. The crawler can try the public content API instead.
 */
export class FetchBlocked extends FetchRefused {
  /** The address that was blocked, after any redirects. */
  readonly url: string
  /** Pages worth saving by hand instead, when the sitemap could still be read. */
  suggestions: string[] = []

  constructor(url: URL) {
    super(
      `${url.hostname} has a security check, and we could not read its pages through its public content API either. Nothing has been brought across yet. Your pages still open normally in your own browser, so you can save them from there and add them below.`,
    )
    this.url = url.toString()
  }
}

/** True when a page someone saved or pasted is a bot check, not their content. */
export function isBotChallengeHtml(html: string): boolean {
  return html.length <= CHALLENGE_MAX_BYTES && CHALLENGE_MARKERS.some((m) => m.test(html))
}

/** Bot checks are a few kilobytes. A real practice home page is far larger. */
const CHALLENGE_MAX_BYTES = 60_000

const CHALLENGE_MARKERS = [
  /awswaf|aws-waf-token|AwsWafIntegration/i, // AWS WAF challenge and CAPTCHA
  /challenge-platform|cf-chl-|<title>\s*Just a moment\.\.\.\s*<\/title>/i, // Cloudflare
  /verify\s+that\s+you(?:'|’|&#39;)?re\s+not\s+a\s+robot/i,
  /_Incapsula_Resource|sgcaptcha|DDoS protection by/i, // Imperva, SiteGround, generic
]

function isBotChallenge(res: Response, html: string | null): boolean {
  // Explicit signals from the firewall itself, whatever the status code.
  const waf = (res.headers.get('x-amzn-waf-action') || '').toLowerCase()
  if (waf === 'challenge' || waf === 'captcha') return true
  if ((res.headers.get('cf-mitigated') || '').toLowerCase() === 'challenge') return true

  if (html === null || html.length > CHALLENGE_MAX_BYTES) return false
  return CHALLENGE_MARKERS.some((marker) => marker.test(html))
}

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
export async function fetchPage(target: string | URL, signal?: AbortSignal): Promise<FetchedPage | null> {
  const result = await fetchResource(target, false, signal)
  return result ? { url: result.url, html: result.text } : null
}

/** Public WordPress data uses the same redirect, address, size and time limits. */
export async function fetchJson(target: string | URL, signal?: AbortSignal): Promise<unknown> {
  const result = await fetchResource(target, true, signal)
  if (!result) return null
  try {
    return JSON.parse(result.text) as unknown
  } catch {
    return null
  }
}

async function fetchResource(
  target: string | URL,
  json: boolean,
  signal?: AbortSignal,
): Promise<{ url: string; text: string } | null> {
  let url = normaliseUrl(target.toString())

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    if (signal?.aborted) return null
    await assertPublicHost(url)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const res = await fetch(url, {
        redirect: 'manual',
        signal: signal ? AbortSignal.any([signal, controller.signal]) : controller.signal,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: json ? 'application/json' : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-GB,en;q=0.9',
        },
        cache: 'no-store',
      })
      if (res.status >= 300 && res.status < 400) {
        await res.body?.cancel()
        const location = res.headers.get('location')
        if (!location) return null
        try {
          url = new URL(location, url)
        } catch {
          return null
        }
        url = normaliseUrl(url.toString())
        continue
      }

      if (isBotChallenge(res, null)) {
        await res.body?.cancel()
        throw new FetchBlocked(url)
      }

      const type = res.headers.get('content-type') || ''
      const accepted = json
        ? /application\/(?:[\w.-]+\+)?json/i
        : /text\/html|application\/xhtml|text\/xml|application\/xml/i
      // Error pages can contain the only indication that a firewall blocked us.
      if (type && !accepted.test(type) && (res.ok || !/text\/html/i.test(type))) {
        await res.body?.cancel()
        return null
      }

      const declared = Number(res.headers.get('content-length') || 0)
      if (declared > MAX_BYTES) {
        await res.body?.cancel()
        return null
      }

      // Cap while streaming, with the timeout still active during body reads.
      const reader = res.body?.getReader()
      if (!reader) return null
      const decoder = new TextDecoder()
      let bytes = 0
      let text = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        bytes += value.byteLength
        if (bytes > MAX_BYTES) {
          await reader.cancel()
          return null
        }
        text += decoder.decode(value, { stream: true })
      }
      text += decoder.decode()
      if (isBotChallenge(res, text)) throw new FetchBlocked(url)
      if (!res.ok || (type && !accepted.test(type))) return null
      return { url: url.toString(), text }
    } catch (err) {
      if (err instanceof FetchRefused) throw err
      return null
    } finally {
      clearTimeout(timer)
    }
  }

  return null
}
