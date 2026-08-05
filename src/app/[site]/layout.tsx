import type { Metadata } from 'next'
import { getSiteConfig } from '@/lib/config'
import { siteBase } from '@/lib/routing'
import { getTenant, singleTenantSlug } from '@/lib/tenant'

interface Props {
  children: React.ReactNode
  params: Promise<{ site: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site } = await params
  const { practice, advanced } = await getSiteConfig(site)
  const tenant = singleTenantSlug() ? null : await getTenant(site)

  // A lapsed practice gets nothing describing them, and is never indexed.
  // Metadata is generated even when the page below it redirects, so without
  // this the description would still leak.
  if (tenant && tenant.status === 'suspended') {
    return {
      title: 'Website temporarily unavailable',
      robots: { index: false, follow: false },
    }
  }

  // Once a practice is on their own domain, that is the canonical address.
  const origin = tenant?.customDomain
    ? `https://${tenant.customDomain}`
    : advanced.siteUrl?.startsWith('http')
      ? advanced.siteUrl
      : undefined

  return {
    metadataBase: origin ? new URL(origin) : undefined,
    title: {
      default: `${practice.name} | ${practice.strapline}`,
      template: `%s | ${practice.name}`,
    },
    description: `${practice.name} is an NHS GP surgery in ${practice.town}. Request an appointment, order a repeat prescription, and find our opening hours and contact details.`,
    manifest: `${siteBase(site)}/manifest.webmanifest`,
    openGraph: {
      type: 'website',
      siteName: practice.name,
      title: `${practice.name} | ${practice.strapline}`,
      locale: 'en_GB',
    },
    robots: { index: true, follow: true },
  }
}

/**
 * Practice-level theming.
 *
 * The accent colour and corner style are applied to a wrapper element rather
 * than to `:root`, because only the root layout may render `<html>` and the
 * root layout does not know which practice this is. CSS custom properties
 * cascade, so a wrapper does the job exactly as well.
 */
export default async function SiteShell({ children, params }: Props) {
  const { site } = await params
  const { advanced } = await getSiteConfig(site)

  const accent = advanced.colourMode === 'custom' ? advanced.accentColour : '#005EB8'
  const accentDark = advanced.colourMode === 'custom' ? shade(accent) : '#003087'

  return (
    <div
      data-radius={advanced.cornerRadius}
      style={
        {
          '--accent': sanitiseColour(accent),
          '--accent-dark': sanitiseColour(accentDark),
        } as React.CSSProperties
      }
    >
      {advanced.analyticsScriptUrl && (
        <script
          defer
          src={advanced.analyticsScriptUrl}
          {...(advanced.analyticsSiteId ? { 'data-domain': advanced.analyticsSiteId } : {})}
        />
      )}
      {children}
    </div>
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
