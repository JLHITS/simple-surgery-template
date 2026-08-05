import type { StorageDriver, StorageDriverName } from './types'

/**
 * Picks the storage backend.
 *
 * Explicit STORAGE_DRIVER wins. Otherwise we auto-detect: if Upstash or
 * Firebase credentials are present we use them, and if not we fall back to
 * local files so a fresh clone runs with no setup at all.
 *
 * Drivers are imported dynamically so that, for example, node:fs never ends up
 * in the bundle of a site running on Upstash.
 */
let cached: StorageDriver | null = null

function detect(): StorageDriverName {
  const explicit = (process.env.STORAGE_DRIVER || '').toLowerCase().trim()
  if (
    explicit === 'file' ||
    explicit === 'upstash' ||
    explicit === 'firebase' ||
    explicit === 'memory'
  ) {
    return explicit
  }

  if (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) return 'upstash'
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL) return 'firebase'
  return 'file'
}

/** Last resort so the site still renders if a backend is misconfigured. */
function memoryDriver(): StorageDriver {
  const store = new Map<string, string>()
  return {
    name: 'In memory (not persisted)',
    isConfigured: () => true,
    read: async (key) => store.get(key) ?? null,
    write: async (key, json) => {
      store.set(key, json)
    },
  }
}

export async function getDriver(): Promise<StorageDriver> {
  if (cached) return cached

  switch (detect()) {
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

export async function readKey(key: string): Promise<string | null> {
  const driver = await getDriver()
  return driver.read(key)
}

export async function writeKey(key: string, json: string): Promise<void> {
  const driver = await getDriver()
  await driver.write(key, json)
}

export async function describeDriver() {
  const driver = await getDriver()
  return {
    name: driver.name,
    configured: driver.isConfigured(),
    persistent: driver.name !== 'In memory (not persisted)',
  }
}

export * from './types'
export type { StorageDriver, StorageDriverName }
