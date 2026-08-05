import { NextResponse } from 'next/server'
import {
  checkRateLimit,
  clearRateLimit,
  createSession,
  isAdminConfigured,
  verifyPassword,
} from '@/lib/auth'
import { normaliseSlug } from '@/lib/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Context {
  params: Promise<{ site: string }>
}

export async function POST(request: Request, { params }: Context) {
  const { site: raw } = await params
  const site = normaliseSlug(raw)

  if (!site) {
    return NextResponse.json({ error: 'Unknown practice.' }, { status: 404 })
  }

  if (!(await isAdminConfigured(site))) {
    return NextResponse.json(
      {
        error:
          'No password has been set for this website yet. Check the email you were sent when it was created.',
      },
      { status: 503 },
    )
  }

  // Behind Vercel and most proxies the real client IP arrives in this header.
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  // Keyed per practice as well as per IP, so hammering one site cannot lock
  // another practice's staff out of theirs.
  const limitKey = `${site}:${ip}`
  const limit = checkRateLimit(limitKey)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${Math.ceil(limit.retryAfter / 60)} minutes.` },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    )
  }

  let password = ''
  try {
    const body = (await request.json()) as { password?: unknown }
    password = typeof body.password === 'string' ? body.password : ''
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  if (!(await verifyPassword(site, password))) {
    // Deliberately vague. Confirming that a password exists but is wrong tells
    // an attacker they are on the right track.
    return NextResponse.json({ error: 'That password is not right.' }, { status: 401 })
  }

  clearRateLimit(limitKey)
  await createSession(site)
  return NextResponse.json({ ok: true })
}
