import { singleTenantSlug } from '@/lib/tenant'

/**
 * Where a practice's site lives in the URL.
 *
 * Multi-tenant: `/a81001/appointments`, until they point their own domain at
 * us, at which point the proxy rewrites their domain onto the same prefix and
 * patients never see it.
 *
 * Single tenant: the empty string, so the demo and every self-hosted clone keep
 * clean URLs like `/appointments`.
 *
 * Every internal link goes through this, which is why it takes the slug rather
 * than reading it from somewhere global: a server component that renders one
 * practice must never accidentally link to another.
 */
export function siteBase(slug: string): string {
  return singleTenantSlug() ? '' : `/${slug}`
}

/** Joins the base and a root-relative path. `sitePath('/a81001', '/')` is `/a81001`. */
export function sitePath(base: string, path: string): string {
  if (path === '/') return base || '/'
  return `${base}${path}`
}
