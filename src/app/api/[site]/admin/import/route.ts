import { NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { crawl } from '@/lib/import/crawl'
import { extract } from '@/lib/import/extract'
import { FetchBlocked, FetchRefused, normaliseUrl } from '@/lib/import/fetch'
import { pagesFromUploads, type UploadedPage } from '@/lib/import/manual'
import { normaliseSlug } from '@/lib/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Reads a practice's existing website and reports what it found.
 *
 * This endpoint writes nothing. It returns findings, the admin panel shows them
 * with a tick box each, and whatever the practice accepts is merged into the
 * draft they then have to save through the normal route. So the sanitiser still
 * sees every value before it reaches storage, and nothing an old website says
 * can change a live site without a person agreeing to it twice.
 *
 * Signed in only, which matters more than it looks: it is a server that fetches
 * URLs on request, and leaving that open to the public would make it a proxy
 * for scanning other people's networks. `lib/import/fetch` blocks private
 * addresses; this is the second lock on the same door.
 */

/**
 * Saved pages arrive in the request body. Vercel refuses bodies over 4.5MB
 * before this code runs, and the browser strips scripts and styles first, so
 * this is a backstop rather than the real limit.
 */
const MAX_BODY = 4_500_000

/** One scan at a time per practice, and not more than a few a minute. */
const recent = new Map<string, number[]>()
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 5

function rateLimited(slug: string): boolean {
  const now = Date.now()
  const hits = (recent.get(slug) || []).filter((t) => now - t < WINDOW_MS)
  hits.push(now)
  recent.set(slug, hits)
  return hits.length > MAX_PER_WINDOW
}

interface Context {
  params: Promise<{ site: string }>
}

export async function POST(request: Request, { params }: Context) {
  const { site: rawSite } = await params
  const site = normaliseSlug(rawSite)

  if (!site || !(await isAuthenticated(site))) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  if (rateLimited(site)) {
    return NextResponse.json(
      { error: 'That is a lot of scans. Wait a minute and try again.' },
      { status: 429 },
    )
  }

  const raw = await request.text()
  if (raw.length > MAX_BODY) {
    return NextResponse.json(
      { error: 'Those pages are too large to send together. Try adding fewer at a time.' },
      { status: 413 },
    )
  }

  let body: { url?: unknown; pages?: unknown }
  try {
    body = JSON.parse(raw) as { url?: unknown; pages?: unknown }
  } catch {
    return NextResponse.json({ error: 'Could not read that.' }, { status: 400 })
  }

  const input = typeof body.url === 'string' ? body.url : ''

  // Pages the practice saved from their own browser, for sites that will not
  // let a server read them. Nothing is fetched on this path.
  if (Array.isArray(body.pages)) {
    try {
      const uploads: UploadedPage[] = body.pages
        .filter((p): p is Record<string, unknown> => typeof p === 'object' && p !== null)
        .map((p) => ({
          name: typeof p.name === 'string' ? p.name.slice(0, 200) : 'Page',
          html: typeof p.html === 'string' ? p.html : '',
          url: typeof p.url === 'string' ? p.url.slice(0, 2000) : undefined,
        }))

      const { pages, challenges } = pagesFromUploads(input, uploads)

      if (!pages.length) {
        return NextResponse.json(
          {
            error: challenges.length
              ? 'Every page you added is the security check rather than your page. Open the page, wait until your practice website is showing, then save it again.'
              : 'We could not read any of those pages. Save them as "Webpage, HTML only" and try again.',
          },
          { status: 422 },
        )
      }

      return NextResponse.json({ ...extract(pages), skipped: challenges })
    } catch (err) {
      if (err instanceof FetchRefused) {
        return NextResponse.json({ error: err.message }, { status: 400 })
      }
      console.error(`[simple-surgery] manual import failed for ${site}:`, err)
      return NextResponse.json(
        { error: 'Something went wrong reading those pages. Try again in a moment.' },
        { status: 500 },
      )
    }
  }

  let target: URL
  try {
    target = normaliseUrl(input)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof FetchRefused ? err.message : 'That address cannot be read.' },
      { status: 400 },
    )
  }

  try {
    const pages = await crawl(target.toString())

    if (!pages.length) {
      return NextResponse.json(
        {
          error: `We could not read anything at ${target.hostname}. Check the address, and that the site is online.`,
        },
        { status: 422 },
      )
    }

    return NextResponse.json(extract(pages))
  } catch (err) {
    if (err instanceof FetchBlocked) {
      return NextResponse.json(
        { error: err.message, blocked: true, suggestions: err.suggestions },
        { status: 422 },
      )
    }
    if (err instanceof FetchRefused) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error(`[simple-surgery] import failed for ${site} from ${input}:`, err)
    return NextResponse.json(
      { error: 'Something went wrong reading that website. Try again in a moment.' },
      { status: 500 },
    )
  }
}
