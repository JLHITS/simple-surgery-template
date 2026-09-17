import { revalidatePath, revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { defaultConfig, saveSiteConfig } from '@/lib/config'
import type { SiteConfig } from '@/lib/config/types'
import { sanitiseConfig } from '@/lib/config/sanitise'
import { siteBase } from '@/lib/routing'
import { settleUnseenUpdates } from '@/lib/config/wording-updates'
import { configKey, normaliseSlug, readKey } from '@/lib/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Roughly 2MB, which is generous even with a base64 logo embedded. */
const MAX_BODY = 2_000_000

interface Context {
  params: Promise<{ site: string }>
}

export async function POST(request: Request, { params }: Context) {
  const { site: rawSite } = await params
  const site = normaliseSlug(rawSite)

  // The session cookie is scoped to one practice, so this single check is also
  // what stops a signed-in practice writing to somebody else's site.
  if (!site || !(await isAuthenticated(site))) {
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

  // Reviewed wording updates only ever accumulate. A browser tab opened before
  // an earlier save does not know what that save recorded, and must not make an
  // update the practice already dealt with come back. If the stored copy cannot
  // be read, the save still goes ahead: this is bookkeeping, not the content.
  try {
    const raw = await readKey(configKey(site), { fresh: true })
    const stored = raw ? (JSON.parse(raw) as unknown) : null
    const earlier = (stored as { reviewedUpdates?: unknown } | null)?.reviewedUpdates
    if (Array.isArray(earlier)) {
      const extra = earlier.filter(
        (id): id is string => typeof id === 'string' && !clean.reviewedUpdates.includes(id),
      )
      if (extra.length) clean = { ...clean, reviewedUpdates: [...clean.reviewedUpdates, ...extra] }
    }
    clean = settleUnseenUpdates(stored, clean)
  } catch (err) {
    console.error(`[simple-surgery] could not read ${site} before saving:`, err)
  }

  try {
    await saveSiteConfig(site, clean)
  } catch (err) {
    console.error(`[simple-surgery] save failed for ${site}:`, err)
    return NextResponse.json(
      { error: 'Could not save. Check your storage settings and try again.' },
      { status: 500 },
    )
  }

  // Purge only this practice's cache. The tag is keyed by storage key, so one
  // surgery saving its opening hours cannot evict every other site we host.
  revalidateTag(`store:${configKey(site)}`, { expire: 0 })
  revalidatePath(`${siteBase(site)}/`, 'layout')

  return NextResponse.json({
    ok: true,
    updatedAt: clean.updatedAt,
    reviewedUpdates: clean.reviewedUpdates,
  })
}
