import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

/**
 * Admin authentication.
 *
 * One shared password, verified on the server, exchanged for a signed HttpOnly
 * cookie. The password never reaches the browser bundle and the cookie cannot be
 * read or forged by client JavaScript.
 *
 * Set ADMIN_PASSWORD for the simple case. For a deployment where you would
 * rather not have the plaintext sitting in an env var, generate a hash with
 * `npm run hash-password` and set ADMIN_PASSWORD_HASH instead.
 */
const COOKIE_NAME = 'ss_admin'
const SESSION_HOURS = 12

function secret(): string {
  const explicit = process.env.SESSION_SECRET
  if (explicit && explicit.length >= 16) return explicit

  // Deriving from the password keeps a fresh clone working without extra setup.
  // Sessions are invalidated whenever the password changes, which is desirable.
  const fallback = process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD
  if (fallback) return `derived:${fallback}`

  // No credentials configured at all. Random per process, so nothing validates.
  return randomBytes(32).toString('hex')
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD_HASH)
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
  const hash = scryptSync(password, salt, 64)
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
}

export function verifyPassword(password: string): boolean {
  const stored = process.env.ADMIN_PASSWORD_HASH
  if (stored?.startsWith('scrypt$')) {
    const [, saltHex, hashHex] = stored.split('$')
    if (!saltHex || !hashHex) return false
    try {
      const candidate = scryptSync(password, Buffer.from(saltHex, 'hex'), 64)
      return timingSafeEqual(candidate, Buffer.from(hashHex, 'hex'))
    } catch {
      return false
    }
  }

  const plain = process.env.ADMIN_PASSWORD
  if (!plain) return false
  return safeEqual(password, plain)
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('hex')
}

function createToken(): string {
  const expires = Date.now() + SESSION_HOURS * 60 * 60 * 1000
  const payload = String(expires)
  return `${payload}.${sign(payload)}`
}

function tokenIsValid(token: string | undefined): boolean {
  if (!token) return false
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return false
  if (!safeEqual(signature, sign(payload))) return false

  const expires = Number(payload)
  return Number.isFinite(expires) && expires > Date.now()
}

export async function createSession(): Promise<void> {
  const jar = await cookies()
  jar.set(COOKIE_NAME, createToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_HOURS * 60 * 60,
  })
}

export async function destroySession(): Promise<void> {
  const jar = await cookies()
  jar.delete(COOKIE_NAME)
}

/** True when the current request carries a valid admin session. */
export async function isAuthenticated(): Promise<boolean> {
  const jar = await cookies()
  return tokenIsValid(jar.get(COOKIE_NAME)?.value)
}

/**
 * Crude but effective brute force protection.
 *
 * In memory, so it resets when a serverless instance recycles. That is fine:
 * it raises the cost of an online guessing attack by orders of magnitude
 * without adding a dependency or another piece of infrastructure to run.
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
