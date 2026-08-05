/**
 * Every storage backend implements this. Two methods, keyed by string.
 *
 * Keys are namespaced per practice, so one database holds every site we host
 * and provisioning a new practice is a write rather than a deployment.
 */
export interface StorageDriver {
  /** Human readable name, shown in the admin panel diagnostics. */
  readonly name: string
  /** Returns the raw JSON string, or null when nothing is stored at that key. */
  read(key: string): Promise<string | null>
  /** Persists the raw JSON string. Must be atomic from the caller's point of view. */
  write(key: string, json: string): Promise<void>
  /** True when the driver has everything it needs to work. */
  isConfigured(): boolean
}

export type StorageDriverName = 'file' | 'upstash' | 'firebase' | 'memory'

const PREFIX = 'simplesurgery'

/**
 * Slugs end up in URLs, storage keys and filenames, so they are normalised hard:
 * lowercase, alphanumeric and hyphens only, and never empty.
 */
export function normaliseSlug(value: string): string {
  return (value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

/** The site content for one practice. */
export function configKey(slug: string): string {
  return `${PREFIX}:${normaliseSlug(slug)}:site-config`
}

/** The tenant record: status, billing, admin password hash. */
export function tenantKey(slug: string): string {
  return `${PREFIX}:tenant:${normaliseSlug(slug)}`
}

/** Maps a custom domain to the slug that owns it. */
export function domainKey(hostname: string): string {
  const clean = (hostname || '').toLowerCase().trim().replace(/:\d+$/, '')
  return `${PREFIX}:domain:${clean}`
}
