import type { StorageDriver } from './types'

/**
 * Upstash Redis over its REST API. The recommended backend for anything
 * deployed, and the one that makes multi-tenancy cheap: every practice we host
 * lives in the same database under its own key.
 *
 * Deliberately uses plain fetch rather than the Upstash SDK: one less
 * dependency, works on any runtime, and the two calls we need are trivial.
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

  async read(key) {
    const res = await fetch(endpoint(`get/${encodeURIComponent(key)}`), {
      headers: { Authorization: `Bearer ${TOKEN_ENV}` },
      // Tagged per key so one practice saving a change cannot purge another
      // practice's cache. The save handler revalidates its own tag only.
      next: { tags: [`store:${key}`], revalidate: 3600 },
    })

    if (!res.ok) {
      throw new Error(`Upstash read failed: ${res.status} ${await res.text()}`)
    }

    const body = (await res.json()) as { result: string | null }
    return body.result ?? null
  },

  async write(key, json) {
    const res = await fetch(endpoint(`set/${encodeURIComponent(key)}`), {
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
