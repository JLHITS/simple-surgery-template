/**
 * Every storage backend implements this. Two methods, one blob of JSON.
 *
 * The whole site is a single document, so there is nothing to model, no schema
 * to migrate in the database, and no query language to learn. Swapping backend
 * is a one line env var change.
 */
export interface StorageDriver {
  /** Human readable name, shown in the admin panel diagnostics. */
  readonly name: string
  /** Returns the raw JSON string, or null when nothing has been saved yet. */
  read(): Promise<string | null>
  /** Persists the raw JSON string. Must be atomic from the caller's point of view. */
  write(json: string): Promise<void>
  /** True when the driver has everything it needs to work. */
  isConfigured(): boolean
}

export type StorageDriverName = 'file' | 'upstash' | 'firebase' | 'memory'

/**
 * The key this deployment reads and writes.
 *
 * Namespaced by SITE_KEY so one Upstash database can hold many practices, each
 * in its own key. That matters if you run several practice sites: a shared
 * database on the free tier is far simpler than one account per customer, and a
 * practice site is a single small document read from cache.
 *
 * Leave SITE_KEY unset for a single practice.
 */
const SITE_KEY = (process.env.SITE_KEY || 'default').replace(/[^a-zA-Z0-9_-]/g, '') || 'default'

export const STORAGE_KEY = `simplesurgery:${SITE_KEY}:site-config`
