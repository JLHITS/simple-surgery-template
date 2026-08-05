import { createSign } from 'node:crypto'
import type { StorageDriver } from './types'
import { STORAGE_KEY } from './types'

/**
 * Google Firestore over its REST API.
 *
 * Provided as an alternative for practices or resellers already inside Google
 * Cloud. Talks to the REST endpoint directly and mints its own OAuth token from
 * a service account, so the heavyweight firebase-admin SDK is not needed.
 *
 * The entire config is stored as one string field on one document. Firestore's
 * 1MB document limit is comfortably more than a practice site needs.
 *
 * Required env:
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY      (with literal \n escapes, as Vercel stores them)
 * Optional:
 *   FIREBASE_COLLECTION       (defaults to "simplesurgery")
 */
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || ''
const CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL || ''
const PRIVATE_KEY = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
const COLLECTION = process.env.FIREBASE_COLLECTION || 'simplesurgery'
const DOC_ID = STORAGE_KEY.replace(/[:/]/g, '_')

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/datastore'

let cachedToken: { value: string; expiresAt: number } | null = null

function base64url(input: string | Buffer) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/** Signs a service account JWT and exchanges it for a short lived access token. */
async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (cachedToken && cachedToken.expiresAt > now + 60) return cachedToken.value

  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64url(
    JSON.stringify({
      iss: CLIENT_EMAIL,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  )

  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${claims}`)
  signer.end()
  const signature = base64url(signer.sign(PRIVATE_KEY))
  const assertion = `${header}.${claims}.${signature}`

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Firebase token exchange failed: ${res.status} ${await res.text()}`)
  }

  const body = (await res.json()) as { access_token: string; expires_in: number }
  cachedToken = { value: body.access_token, expiresAt: now + body.expires_in }
  return body.access_token
}

function docUrl() {
  return `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION}/${DOC_ID}`
}

export const firebaseDriver: StorageDriver = {
  name: 'Firebase Firestore',

  isConfigured() {
    return Boolean(PROJECT_ID && CLIENT_EMAIL && PRIVATE_KEY)
  },

  async read() {
    const token = await getAccessToken()
    const res = await fetch(docUrl(), {
      headers: { Authorization: `Bearer ${token}` },
      next: { tags: ['site-config'], revalidate: 3600 },
    })

    if (res.status === 404) return null
    if (!res.ok) {
      throw new Error(`Firestore read failed: ${res.status} ${await res.text()}`)
    }

    const body = (await res.json()) as {
      fields?: { json?: { stringValue?: string } }
    }
    return body.fields?.json?.stringValue ?? null
  },

  async write(json) {
    const token = await getAccessToken()
    // updateMask keeps the write to the single field we own.
    const res = await fetch(`${docUrl()}?updateMask.fieldPaths=json`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: { json: { stringValue: json } } }),
      cache: 'no-store',
    })

    if (!res.ok) {
      throw new Error(`Firestore write failed: ${res.status} ${await res.text()}`)
    }
  },
}
