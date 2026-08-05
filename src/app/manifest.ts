import type { MetadataRoute } from 'next'
import { getSiteConfig } from '@/lib/config'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { practice } = await getSiteConfig()

  return {
    name: practice.name,
    short_name: practice.name.split(' ').slice(0, 2).join(' '),
    description: `${practice.name} is an NHS GP surgery in ${practice.town}.`,
    start_url: '/',
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
}
