import { NextResponse } from 'next/server'
import {
  checkRateLimit,
  clearRateLimit,
  createSession,
  isAdminConfigured,
  verifyPassword,
} from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      {
        error:
          'No admin password is set. Add ADMIN_PASSWORD to your environment variables and redeploy.',
      },
      { status: 503 },
    )
  }

  // Behind Vercel and most proxies the real client IP arrives in this header.
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  const limit = checkRateLimit(ip)
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

  if (!verifyPassword(password)) {
    // Deliberately vague. Confirming that a password exists but is wrong tells
    // an attacker they are on the right track.
    return NextResponse.json({ error: 'That password is not right.' }, { status: 401 })
  }

  clearRateLimit(ip)
  await createSession()
  return NextResponse.json({ ok: true })
}
