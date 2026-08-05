import type { MetadataRoute } from 'next'
import { getSiteConfig } from '@/lib/config'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const config = await getSiteConfig()
  const base = (config.advanced.siteUrl || 'http://localhost:3001').replace(/\/+$/, '')
  const lastModified = new Date(config.updatedAt || Date.now())

  const staticRoutes = [
    { path: '/', priority: 1 },
    { path: '/appointments', priority: 0.9 },
    { path: '/prescriptions', priority: 0.9 },
    { path: '/services', priority: 0.8 },
    { path: '/about', priority: 0.6 },
    { path: '/contact', priority: 0.8 },
    { path: '/news', priority: 0.5 },
  ]

  return [
    ...staticRoutes.map((route) => ({
      url: `${base}${route.path}`,
      lastModified,
      priority: route.priority,
      changeFrequency: 'weekly' as const,
    })),
    ...config.services.map((service) => ({
      url: `${base}/services/${service.slug}`,
      lastModified,
      priority: 0.7,
      changeFrequency: 'monthly' as const,
    })),
    ...config.pages.map((page) => ({
      url: `${base}/about/${page.slug}`,
      lastModified,
      priority: 0.4,
      changeFrequency: 'yearly' as const,
    })),
  ]
}
