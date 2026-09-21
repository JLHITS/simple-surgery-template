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

/**
 * Where this practice's website actually is, as a link a browser can follow.
 *
 * The admin panel's "View website" button used to send everyone to
 * `advanced.siteUrl`, which is a free text field the practice fills in and
 * which, until a practice touches it, comes from the template's own defaults.
 * On a hosted site that meant every practice was shown the demo.
 *
 * So the tenant record wins. A practice we host lives at their own domain once
 * it is pointed at us, and at `/their-code` until then, whatever anyone has
 * typed into the settings. Only a self-hosted deployment, which has no tenant
 * record and no slug in its URLs, has to be told its own address.
 */
export function liveSiteUrl(input: {
  slug: string
  customDomain?: string | null
  configuredUrl?: string | null
}): string {
  const domain = (input.customDomain || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '')
  if (domain) return `https://${domain}`

  if (!singleTenantSlug()) return siteBase(input.slug) || '/'

  const configured = (input.configuredUrl || '').trim()
  return /^https?:\/\//i.test(configured) ? configured.replace(/\/+$/, '') : '/'
}
