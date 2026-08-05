import { NextResponse, type NextRequest } from 'next/server'

/**
 * Maps an incoming request onto the practice that should answer it.
 *
 * Three cases:
 *
 *   1. Single tenant. SITE_KEY is set, so this deployment is one practice: the
 *      demo, or anyone self-hosting from the open source repo. Everything is
 *      rewritten under that slug and the visitor keeps clean URLs.
 *
 *   2. A practice on their own domain. The hostname is looked up and the
 *      request is rewritten under their slug, so patients at
 *      theirsurgery.nhs.uk never see a practice code in the address bar.
 *
 *   3. The platform domain. The slug is already the first path segment and
 *      nothing needs rewriting.
 *
 * The domain lookup goes straight to Upstash over REST rather than through the
 * storage layer, because middleware runs on the edge runtime where node:fs and
 * node:crypto are unavailable. It is cached in memory per instance, so the
 * common case costs nothing.
 */
export const config = {
  // Everything except Next internals, the API, and files with an extension.
  matcher: ['/((?!_next/|api/|.*\\.[\\w]+$).*)'],
}

const SINGLE = (process.env.SITE_KEY || '').toLowerCase().replace(/[^a-z0-9-]/g, '')

/** Hostnames that are the platform itself and never belong to a practice. */
function isPlatformHost(host: string): boolean {
  const platform = (process.env.PLATFORM_HOST || '').toLowerCase()
  if (platform && host === platform) return true
  return (
    host.startsWith('localhost') ||
    host.endsWith('.vercel.app') ||
    host === '127.0.0.1' ||
    Boolean(platform) === false
  )
}

const domainCache = new Map<string, { slug: string | null; expiresAt: number }>()
const CACHE_MS = 5 * 60 * 1000

async function slugForHost(host: string): Promise<string | null> {
  const hit = domainCache.get(host)
  if (hit && hit.expiresAt > Date.now()) return hit.slug

  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  if (!url || !token) return null

  try {
    const key = `simplesurgery:domain:${host}`
    const res = await fetch(`${url.replace(/\/+$/, '')}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })

    if (!res.ok) throw new Error(String(res.status))

    const body = (await res.json()) as { result: string | null }
    const slug = body.result
      ? body.result.replace(/^"|"$/g, '').toLowerCase().replace(/[^a-z0-9-]/g, '')
      : null

    domainCache.set(host, { slug: slug || null, expiresAt: Date.now() + CACHE_MS })
    return slug || null
  } catch {
    // A lookup failure must not take the site down. Fall through to path based
    // routing, which still works on the platform domain.
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  if (SINGLE) {
    // Already rewritten, or a shared asset. Leave it alone.
    if (pathname === `/${SINGLE}` || pathname.startsWith(`/${SINGLE}/`)) {
      return NextResponse.next()
    }
    return NextResponse.rewrite(
      new URL(`/${SINGLE}${pathname === '/' ? '' : pathname}${search}`, request.url),
    )
  }

  const host = (request.headers.get('host') || '').toLowerCase().replace(/:\d+$/, '')
  if (!host || isPlatformHost(host)) return NextResponse.next()

  const slug = await slugForHost(host)
  if (!slug) return NextResponse.next()

  if (pathname === `/${slug}` || pathname.startsWith(`/${slug}/`)) {
    return NextResponse.next()
  }

  return NextResponse.rewrite(
    new URL(`/${slug}${pathname === '/' ? '' : pathname}${search}`, request.url),
  )
}
