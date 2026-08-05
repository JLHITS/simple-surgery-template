import type { StorageDriver, StorageDriverName } from './types'

/**
 * Picks the storage backend.
 *
 * Explicit STORAGE_DRIVER wins. Otherwise we auto-detect: if Upstash or
 * Firebase credentials are present we use them, and if not we fall back to a
 * local file so a fresh clone runs with no setup at all.
 *
 * Drivers are imported dynamically so that, for example, node:fs never ends up
 * in the bundle of a site running on Upstash.
 */
let cached: StorageDriver | null = null

function detect(): StorageDriverName {
  const explicit = (process.env.STORAGE_DRIVER || '').toLowerCase().trim()
  if (explicit === 'file' || explicit === 'upstash' || explicit === 'firebase' || explicit === 'memory') {
    return explicit
  }

  if (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) return 'upstash'
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL) return 'firebase'
  return 'file'
}

/** Last resort so the site still renders if a backend is misconfigured. */
function memoryDriver(): StorageDriver {
  const store: { value: string | null } = { value: null }
  return {
    name: 'In memory (not persisted)',
    isConfigured: () => true,
    read: async () => store.value,
    write: async (json) => {
      store.value = json
    },
  }
}

export async function getDriver(): Promise<StorageDriver> {
  if (cached) return cached

  const name = detect()
  switch (name) {
    case 'upstash': {
      const { upstashDriver } = await import('./upstash')
      cached = upstashDriver
      break
    }
    case 'firebase': {
      const { firebaseDriver } = await import('./firebase')
      cached = firebaseDriver
      break
    }
    case 'memory': {
      cached = memoryDriver()
      break
    }
    default: {
      const { fileDriver } = await import('./file')
      cached = fileDriver
      break
    }
  }

  return cached
}

export async function describeDriver() {
  const driver = await getDriver()
  return {
    name: driver.name,
    configured: driver.isConfigured(),
    persistent: driver.name !== 'In memory (not persisted)',
  }
}

export type { StorageDriver, StorageDriverName }
