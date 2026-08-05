import type { Metadata, Viewport } from 'next'
import { getSiteConfig } from '@/lib/config'
import './globals.css'

/**
 * Root layout.
 *
 * Deliberately holds no page furniture. The public site's header and footer
 * live in (site)/layout.tsx and the admin panel has its own chrome, so neither
 * has to work around the other.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { practice, advanced } = await getSiteConfig()
  const base = advanced.siteUrl?.startsWith('http') ? advanced.siteUrl : undefined

  return {
    metadataBase: base ? new URL(base) : undefined,
    title: {
      default: `${practice.name} | ${practice.strapline}`,
      template: `%s | ${practice.name}`,
    },
    description: `${practice.name} is an NHS GP surgery in ${practice.town}. Request an appointment, order a repeat prescription, and find our opening hours and contact details.`,
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: 'any' },
        { url: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
      ],
      apple: '/apple-touch-icon.png',
    },
    manifest: '/manifest.webmanifest',
    openGraph: {
      type: 'website',
      siteName: practice.name,
      title: `${practice.name} | ${practice.strapline}`,
      locale: 'en_GB',
    },
    robots: { index: true, follow: true },
  }
}

export const viewport: Viewport = {
  themeColor: '#005EB8',
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { advanced } = await getSiteConfig()

  // Applied as a CSS variable rather than a Tailwind class so a practice can
  // pick any colour in advanced settings without a rebuild.
  const accent = advanced.colourMode === 'custom' ? advanced.accentColour : '#005EB8'
  const accentDark = advanced.colourMode === 'custom' ? shade(accent) : '#003087'

  return (
    <html lang="en-GB" data-radius={advanced.cornerRadius}>
      <head>
        <style
          // Safe: both values pass through sanitiseColour, which only ever
          // returns a six digit hex or the NHS Blue default.
          dangerouslySetInnerHTML={{
            __html: `:root{--accent:${sanitiseColour(accent)};--accent-dark:${sanitiseColour(
              accentDark,
            )}}`,
          }}
        />
        {advanced.analyticsScriptUrl && (
          <script
            defer
            src={advanced.analyticsScriptUrl}
            {...(advanced.analyticsSiteId ? { 'data-domain': advanced.analyticsSiteId } : {})}
          />
        )}
      </head>
      <body>{children}</body>
    </html>
  )
}

/** Only ever emit a value we are certain is a colour. */
function sanitiseColour(value: string): string {
  return /^#[0-9a-f]{6}$/i.test(value.trim()) ? value.trim() : '#005EB8'
}

/** Rough darker variant for hover and focus states on a custom accent. */
function shade(hex: string): string {
  const clean = sanitiseColour(hex).replace('#', '')
  const channels = [0, 2, 4].map((i) =>
    Math.max(0, Math.round(parseInt(clean.slice(i, i + 2), 16) * 0.72)),
  )
  return `#${channels.map((c) => c.toString(16).padStart(2, '0')).join('')}`
}
