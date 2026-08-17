import { NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { crawl } from '@/lib/import/crawl'
import { extract } from '@/lib/import/extract'
import { FetchRefused, normaliseUrl } from '@/lib/import/fetch'
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

  let body: { url?: unknown }
  try {
    body = (await request.json()) as { url?: unknown }
  } catch {
    return NextResponse.json({ error: 'Could not read that.' }, { status: 400 })
  }

  const input = typeof body.url === 'string' ? body.url : ''

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
