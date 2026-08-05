import { cache } from 'react'
import { getDriver } from '@/lib/storage'
import { defaultConfig, SCHEMA_VERSION } from './defaults'
import type { SiteConfig } from './types'

type Plain = Record<string, unknown>

function isPlainObject(value: unknown): value is Plain {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Deep merges saved content over the defaults.
 *
 * Arrays replace wholesale rather than merging element by element, because a
 * practice that deletes a team member means it. Objects merge key by key, so a
 * template upgrade that adds a new setting picks up its default without the
 * practice having to do anything.
 */
function mergeDeep<T>(base: T, override: unknown): T {
  if (override === undefined || override === null) return base
  if (Array.isArray(base)) return (Array.isArray(override) ? override : base) as T
  if (!isPlainObject(base) || !isPlainObject(override)) return override as T

  const out: Plain = { ...base }
  for (const [key, value] of Object.entries(override)) {
    out[key] = key in (base as Plain) ? mergeDeep((base as Plain)[key], value) : value
  }
  return out as T
}

/** Applies any migrations needed to bring an older saved config up to date. */
function migrate(stored: Plain): Plain {
  const version = typeof stored.schemaVersion === 'number' ? stored.schemaVersion : 0
  // No migrations yet. Add them here as `if (version < 2) { ... }` when the
  // shape changes, so existing practice sites upgrade in place.
  if (version < SCHEMA_VERSION) {
    return { ...stored, schemaVersion: SCHEMA_VERSION }
  }
  return stored
}

async function load(): Promise<SiteConfig> {
  try {
    const driver = await getDriver()
    const raw = await driver.read()
    if (!raw) return defaultConfig

    const parsed = JSON.parse(raw) as unknown
    if (!isPlainObject(parsed)) return defaultConfig

    return mergeDeep(defaultConfig, migrate(parsed))
  } catch (err) {
    // A broken backend must never take the whole website down. Patients still
    // need the phone number and opening hours.
    console.error('[simple-surgery] failed to load site config, using defaults:', err)
    return defaultConfig
  }
}

/**
 * Reads the site config. Deduplicated per request by React.cache, and cached
 * across requests by the storage driver's fetch tag.
 */
export const getSiteConfig = cache(load)

/** Writes the config. Callers are responsible for revalidating afterwards. */
export async function saveSiteConfig(config: SiteConfig): Promise<void> {
  const driver = await getDriver()
  const next: SiteConfig = {
    ...config,
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
  }
  await driver.write(JSON.stringify(next, null, 2))
}

export { defaultConfig, SCHEMA_VERSION }
export type * from './types'
