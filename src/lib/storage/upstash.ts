import type { StorageDriver } from './types'
import { STORAGE_KEY } from './types'

/**
 * Upstash Redis over its REST API. This is the recommended backend for a
 * deployed practice site.
 *
 * Deliberately uses plain fetch rather than the Upstash SDK: one less
 * dependency, works on any runtime, and the two calls we need are trivial.
 *
 * Set up on Vercel: Storage tab, add Upstash Redis, and the two env vars below
 * are injected automatically. Free tier is 500,000 commands a month, which is
 * far beyond what a practice site uses since reads are cached.
 */
const URL_ENV = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || ''
const TOKEN_ENV = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || ''

function endpoint(path: string) {
  return `${URL_ENV.replace(/\/+$/, '')}/${path}`
}

export const upstashDriver: StorageDriver = {
  name: 'Upstash Redis',

  isConfigured() {
    return Boolean(URL_ENV && TOKEN_ENV)
  },

  async read() {
    const res = await fetch(endpoint(`get/${encodeURIComponent(STORAGE_KEY)}`), {
      headers: { Authorization: `Bearer ${TOKEN_ENV}` },
      // Cached by tag so patient-facing pages do not hit Redis on every request.
      // The admin save handler purges this tag, so edits appear immediately.
      next: { tags: ['site-config'], revalidate: 3600 },
    })

    if (!res.ok) {
      throw new Error(`Upstash read failed: ${res.status} ${await res.text()}`)
    }

    const body = (await res.json()) as { result: string | null }
    return body.result ?? null
  },

  async write(json) {
    const res = await fetch(endpoint(`set/${encodeURIComponent(STORAGE_KEY)}`), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN_ENV}`,
        'Content-Type': 'text/plain',
      },
      body: json,
      cache: 'no-store',
    })

    if (!res.ok) {
      throw new Error(`Upstash write failed: ${res.status} ${await res.text()}`)
    }
  },
}
