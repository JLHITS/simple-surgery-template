import { getSiteConfig } from '@/lib/config'
import { siteBase } from '@/lib/routing'

export const runtime = 'nodejs'

interface Context {
  params: Promise<{ site: string }>
}

/** The web app manifest, per practice, so an installed icon says their name. */
export async function GET(_request: Request, { params }: Context) {
  const { site } = await params
  const { practice } = await getSiteConfig(site)
  const base = siteBase(site)

  const manifest = {
    name: practice.name,
    short_name: practice.name.split(' ').slice(0, 2).join(' '),
    description: `${practice.name} is an NHS GP surgery in ${practice.town}.`,
    start_url: base || '/',
    scope: base || '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#005EB8',
    icons: [
      { src: '/favicon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/favicon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }

  return Response.json(manifest, {
    headers: { 'Cache-Control': 'public, max-age=0, s-maxage=3600' },
  })
}
