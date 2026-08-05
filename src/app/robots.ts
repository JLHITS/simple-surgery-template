import type { MetadataRoute } from 'next'

/**
 * Platform-level robots.
 *
 * Practices on their own domain get this same file through the proxy, which is
 * correct: the rules are identical for every site. The admin area and the API
 * are behind a password, but there is no reason for them to appear in search
 * results either.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin', '/*/admin', '/search', '/*/search'],
    },
  }
}
