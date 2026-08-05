import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { getTenant, singleTenantSlug } from '@/lib/tenant'

/**
 * Admin authentication.
 *
 * Two sources of truth, checked in this order:
 *
 *   1. The tenant record, for practices we host. Their password hash lives in
 *      the database, set when their site was provisioned.
 *   2. ADMIN_PASSWORD or ADMIN_PASSWORD_HASH, for the demo and for anyone
 *      self-hosting from the open source repo, where there is no billing and
 *      no tenant record.
 *
 * Either way the password is verified on the server and exchanged for a signed
 * HttpOnly cookie. The password never reaches the browser bundle and the cookie
 * cannot be read or forged by client JavaScript.
 *
 * Sessions are scoped to one practice. Signing in to /a81001/admin gives you a
 * cookie that is worthless at /b82002/admin, so a compromised password affects
 * exactly one site.
 */
const SESSION_HOURS = 12

function cookieName(slug: string): string {
  return `ss_admin_${slug.replace(/[^a-z0-9-]/g, '')}`
}

function secret(): string {
  const explicit = process.env.SESSION_SECRET
  if (explicit && explicit.length >= 16) return explicit

  // Deriving from the credentials keeps a fresh clone working with no setup.
  const fallback = process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD
  if (fallback) return `derived:${fallback}`

  // Nothing configured. Random per process, so nothing validates.
  return randomBytes(32).toString('hex')
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) {
    // Still do a comparison so the timing does not leak the length.
    timingSafeEqual(bufA, bufA)
    return false
  }
  return timingSafeEqual(bufA, bufB)
}

/** Format: scrypt$<saltHex>$<hashHex> */
export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  return `scrypt$${salt.toString('hex')}$${scryptSync(password, salt, 64).toString('hex')}`
}

export function verifyHash(password: string, stored: string): boolean {
  if (!stored?.startsWith('scrypt$')) return false
  const [, saltHex, hashHex] = stored.split('$')
  if (!saltHex || !hashHex) return false
  try {
    const candidate = scryptSync(password, Buffer.from(saltHex, 'hex'), 64)
    return timingSafeEqual(candidate, Buffer.from(hashHex, 'hex'))
  } catch {
    return false
  }
}

/** Whether this deployment can authenticate anyone for this practice at all. */
export async function isAdminConfigured(slug: string): Promise<boolean> {
  if (process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD_HASH) return true
  const tenant = await getTenant(slug)
  return Boolean(tenant?.passwordHash)
}

export async function verifyPassword(slug: string, password: string): Promise<boolean> {
  const tenant = await getTenant(slug)
  if (tenant?.passwordHash) {
    return verifyHash(password, tenant.passwordHash)
  }

  // Self-hosted and demo deployments only. A hosted practice always has a
  // tenant record, so the env var can never be used to reach someone else's
  // site: this branch is unreachable once a hash exists.
  const storedHash = process.env.ADMIN_PASSWORD_HASH
  if (storedHash?.startsWith('scrypt$')) return verifyHash(password, storedHash)

  const plain = process.env.ADMIN_PASSWORD
  if (!plain) return false
  return safeEqual(password, plain)
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('hex')
}

export async function createSession(slug: string): Promise<void> {
  const expires = Date.now() + SESSION_HOURS * 60 * 60 * 1000
  // The slug is inside the signed payload, so a cookie cannot be replayed
  // against a different practice even if the name is edited.
  const payload = `${slug}.${expires}`
  const jar = await cookies()

  jar.set(cookieName(slug), `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_HOURS * 60 * 60,
  })
}

export async function destroySession(slug: string): Promise<void> {
  const jar = await cookies()
  jar.delete(cookieName(slug))
}

/** True when the current request carries a valid session for this practice. */
export async function isAuthenticated(slug: string): Promise<boolean> {
  const jar = await cookies()
  const token = jar.get(cookieName(slug))?.value
  if (!token) return false

  const parts = token.split('.')
  if (parts.length !== 3) return false

  const [tokenSlug, expiresRaw, signature] = parts
  const payload = `${tokenSlug}.${expiresRaw}`

  if (!safeEqual(signature, sign(payload))) return false
  if (tokenSlug !== slug) return false

  const expires = Number(expiresRaw)
  return Number.isFinite(expires) && expires > Date.now()
}

/**
 * Crude but effective brute force protection.
 *
 * In memory, so it resets when a serverless instance recycles. That is fine:
 * it raises the cost of an online guessing attack by orders of magnitude
 * without adding a dependency or another piece of infrastructure to run.
 *
 * Keyed by IP and practice together, so hammering one site cannot lock another
 * practice's staff out of theirs.
 */
const attempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 8
const WINDOW_MS = 10 * 60 * 1000

export function checkRateLimit(key: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now()
  const entry = attempts.get(key)

  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, retryAfter: 0 }
  }

  entry.count += 1
  if (entry.count > MAX_ATTEMPTS) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }
  return { allowed: true, retryAfter: 0 }
}

export function clearRateLimit(key: string): void {
  attempts.delete(key)
}

export { singleTenantSlug }
