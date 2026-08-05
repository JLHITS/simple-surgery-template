import { notFound, redirect } from 'next/navigation'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { getSiteConfig } from '@/lib/config'
import { siteBase } from '@/lib/routing'
import { getTenant, isServing, singleTenantSlug } from '@/lib/tenant'

interface Props {
  children: React.ReactNode
  params: Promise<{ site: string }>
}

/**
 * The public website for one practice.
 *
 * Also the gate. Every patient-facing page sits under this layout, so the
 * subscription check happens once, here, rather than being repeated in twelve
 * pages and forgotten in the thirteenth.
 */
export default async function SiteLayout({ children, params }: Props) {
  const { site } = await params
  const single = singleTenantSlug()

  // In single tenant mode there is no billing and no tenant record: the demo
  // and every self-hosted clone are simply always on.
  if (!single) {
    const tenant = await getTenant(site)
    if (!tenant) notFound()

    if (!isServing(tenant)) {
      // Redirect rather than rendering the holding page in place. A layout that
      // simply declines to render {children} does not stop the page component
      // running, and its output still ends up serialised in the streamed RSC
      // payload. Redirecting aborts the response before any of that is sent.
      redirect(`${siteBase(site)}/unavailable`)
    }
  }

  const config = await getSiteConfig(site)
  const { practice, advanced } = config
  const base = siteBase(site)

  return (
    <>
      <a href="#main-content" className="ss-skip">
        Skip to main content
      </a>

      <Header
        practiceName={practice.name}
        logoUrl={practice.logoUrl}
        logoAlt={practice.logoAlt}
        phone={practice.phone}
        showSearch={advanced.showSearch}
        showNhsLogo={advanced.showNhsLogo}
        base={base}
      />

      <main id="main-content">{children}</main>

      <Footer config={config} base={base} />
    </>
  )
}
