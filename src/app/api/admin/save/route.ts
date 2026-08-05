import { revalidatePath, revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { defaultConfig, saveSiteConfig } from '@/lib/config'
import type { SiteConfig } from '@/lib/config/types'
import { sanitiseConfig } from '@/lib/config/sanitise'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Roughly 2MB, which is generous even with a base64 logo embedded. */
const MAX_BODY = 2_000_000

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  const raw = await request.text()
  if (raw.length > MAX_BODY) {
    return NextResponse.json(
      { error: 'That is too large to save. Try a smaller logo or photo.' },
      { status: 413 },
    )
  }

  let incoming: unknown
  try {
    incoming = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Could not read the changes.' }, { status: 400 })
  }

  let clean: SiteConfig
  try {
    clean = sanitiseConfig(incoming, defaultConfig)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Those changes are not valid.' },
      { status: 400 },
    )
  }

  try {
    await saveSiteConfig(clean)
  } catch (err) {
    console.error('[simple-surgery] save failed:', err)
    return NextResponse.json(
      { error: 'Could not save. Check your storage settings and try again.' },
      { status: 500 },
    )
  }

  // Purge the cached config so the change is live on the next page view rather
  // than whenever the hour-long cache happens to expire. `expire: 0` is what
  // makes it immediate rather than merely stale.
  revalidateTag('site-config', { expire: 0 })
  revalidatePath('/', 'layout')

  return NextResponse.json({ ok: true, updatedAt: clean.updatedAt })
}
