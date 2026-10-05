import type { Metadata } from 'next'
import { getSiteConfig } from '@/lib/config'
import { practiceDescription, practiceName, practiceStrapline, practiceTitle } from '@/lib/practice'
import { siteBase } from '@/lib/routing'
import { getTenant, singleTenantSlug } from '@/lib/tenant'
import { paletteFor, themeInfo, themeOf, themeStyle } from '@/lib/theme'

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
      default: practiceTitle(practice),
      template: `%s | ${practiceName(practice)}`,
    },
    description: practiceDescription(practice),
    manifest: `${siteBase(site)}/manifest.webmanifest`,
    openGraph: {
      type: 'website',
      siteName: practiceName(practice),
      title: practiceTitle(practice),
      locale: 'en_GB',
    },
    robots: { index: true, follow: true },
  }
}

/**
 * Practice-level theming.
 *
 * The colour scheme and corner style are applied to a wrapper element rather
 * than to `:root`, because only the root layout may render `<html>` and the
 * root layout does not know which practice this is. CSS custom properties
 * cascade, so a wrapper does the job exactly as well. The schemes themselves
 * are in lib/theme.ts.
 */
export default async function SiteShell({ children, params }: Props) {
  const { site } = await params
  const { advanced } = await getSiteConfig(site)

  const theme = themeOf(advanced)

  return (
    <div
      data-radius={advanced.cornerRadius}
      data-theme={theme}
      data-header={themeInfo(theme).header}
      style={themeStyle(paletteFor(theme, advanced.accentColour)) as React.CSSProperties}
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
