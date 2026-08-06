import { NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { getSiteConfig } from '@/lib/config'
import { normaliseSlug } from '@/lib/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Context {
  params: Promise<{ site: string }>
}

/**
 * The whole site as one JSON file.
 *
 * This is the practical form of "you are never locked in", and the thing the
 * privacy notice points at for data portability. The file is exactly what the
 * save endpoint accepts, so a practice can take it to its own deployment of the
 * template, drop it in, and have its site back.
 */
export async function GET(_request: Request, { params }: Context) {
  const { site: rawSite } = await params
  const site = normaliseSlug(rawSite)

  if (!site || !(await isAuthenticated(site))) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  const config = await getSiteConfig(site)
  const stamp = new Date().toISOString().slice(0, 10)

  return new NextResponse(JSON.stringify(config, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${site}-website-${stamp}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}
