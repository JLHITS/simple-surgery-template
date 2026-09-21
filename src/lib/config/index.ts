import { cache } from 'react'
import { isDemoContentFor } from '@/lib/demo'
import { configKey, readKey, writeKey } from '@/lib/storage'
import { defaultConfig, SCHEMA_VERSION } from './defaults'
import { demoConfig, stripDemoContent } from './demo-content'
import { isPlainObject, mergeDeep } from './merge'
import type { SiteConfig } from './types'

type Plain = Record<string, unknown>

/**
 * What this practice's unedited site looks like.
 *
 * Everybody gets the neutral defaults. The one deployment that is the demo
 * gets the Frogmorton showcase laid over them. Until these were separated the
 * demo *was* the defaults, so every practice inherited its address, its staff
 * and its CQC rating for anything they had not yet edited.
 */
function baseConfig(slug: string): SiteConfig {
  return isDemoContentFor(slug) ? demoConfig : defaultConfig
}


/** Applies any migrations needed to bring an older saved config up to date. */
function migrate(stored: Plain, slug: string): Plain {
  const version = typeof stored.schemaVersion === 'number' ? stored.schemaVersion : 0
  if (version >= SCHEMA_VERSION) return stored

  let next = stored

  // 1 -> 2: the demo practice moved out of the defaults into its own overlay.
  // The demo itself keeps its content; everyone else has it taken back out.
  if (version < 2 && !isDemoContentFor(slug)) {
    next = stripDemoContent(next)
  }

  return { ...next, schemaVersion: SCHEMA_VERSION }
}

/**
 * Adds any required page the stored copy is missing.
 *
 * Pages are an array, so saved content replaces the defaults wholesale and a
 * required page added in a later template release would otherwise stay missing
 * until the practice next pressed Save. Publishing these is a contractual
 * requirement, so it appears straight away, with the recommended wording. Same
 * rule as the sanitiser, applied on the way out as well as on the way in.
 */
function withStatutoryPages(config: SiteConfig): SiteConfig {
  const missing = defaultConfig.pages.filter(
    (required) => required.statutory && !config.pages.some((p) => p.slug === required.slug),
  )
  return missing.length ? { ...config, pages: [...config.pages, ...missing] } : config
}

async function load(slug: string): Promise<SiteConfig> {
  const base = baseConfig(slug)

  try {
    const raw = await readKey(configKey(slug))
    if (!raw) return base

    const parsed = JSON.parse(raw) as unknown
    if (!isPlainObject(parsed)) return base

    return withStatutoryPages(mergeDeep(base, migrate(parsed, slug)))
  } catch (err) {
    // A broken backend must never take the whole website down. Patients still
    // need the phone number and the opening hours.
    console.error(`[simple-surgery] failed to load config for ${slug}, using defaults:`, err)
    return base
  }
}

/**
 * Reads one practice's site config. Deduplicated per request by React.cache,
 * and cached across requests by the storage driver's fetch tag.
 */
export const getSiteConfig = cache(load)

/** Writes the config. Callers are responsible for revalidating afterwards. */
export async function saveSiteConfig(slug: string, config: SiteConfig): Promise<void> {
  const next: SiteConfig = {
    ...config,
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
  }
  await writeKey(configKey(slug), JSON.stringify(next, null, 2))
}

export { defaultConfig, SCHEMA_VERSION }
export type * from './types'
