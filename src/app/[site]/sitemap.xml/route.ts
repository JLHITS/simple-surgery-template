import { getSiteConfig } from '@/lib/config'
import { siteBase } from '@/lib/routing'
import { getTenant, singleTenantSlug } from '@/lib/tenant'

export const runtime = 'nodejs'

interface Context {
  params: Promise<{ site: string }>
}

/**
 * A sitemap per practice.
 *
 * Written as a route handler rather than Next's `sitemap.ts` convention,
 * because that convention does not sit comfortably inside a dynamic segment
 * and this needs the practice from the URL.
 *
 * Once a practice is on their own domain the proxy rewrites
 * `theirsurgery.nhs.uk/sitemap.xml` onto this, so search engines see a sitemap
 * at the root of their domain, which is what they expect.
 */
export async function GET(_request: Request, { params }: Context) {
  const { site } = await params
  const single = singleTenantSlug()

  if (!single) {
    const tenant = await getTenant(site)
    if (!tenant) return new Response('Not found', { status: 404 })
  }

  const config = await getSiteConfig(site)
  const tenant = single ? null : await getTenant(site)

  // Prefer their own domain once it is live, so search engines index the
  // address patients will actually see.
  const origin = (
    tenant?.customDomain
      ? `https://${tenant.customDomain}`
      : config.advanced.siteUrl || 'http://localhost:3001'
  ).replace(/\/+$/, '')

  const base = tenant?.customDomain ? '' : siteBase(site)
  const lastmod = new Date(config.updatedAt || Date.now()).toISOString()

  const paths = [
    { path: '/', priority: '1.0' },
    { path: '/appointments', priority: '0.9' },
    { path: '/prescriptions', priority: '0.9' },
    { path: '/services', priority: '0.8' },
    { path: '/contact', priority: '0.8' },
    { path: '/about', priority: '0.6' },
    { path: '/news', priority: '0.5' },
    ...config.services.map((s) => ({ path: `/services/${s.slug}`, priority: '0.7' })),
    ...config.pages.map((p) => ({ path: `/about/${p.slug}`, priority: '0.4' })),
  ]

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths
  .map(
    (entry) => `  <url>
    <loc>${origin}${base}${entry.path === '/' ? '' : entry.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>${entry.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  })
}
