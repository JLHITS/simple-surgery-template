import type { MetadataRoute } from 'next'
import { getSiteConfig } from '@/lib/config'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const { advanced } = await getSiteConfig()
  const base = (advanced.siteUrl || '').replace(/\/+$/, '')

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // The admin area is behind a password, but there is no reason for it to
      // appear in search results either.
      disallow: ['/admin', '/api/', '/search'],
    },
    ...(base ? { sitemap: `${base}/sitemap.xml`, host: base } : {}),
  }
}
