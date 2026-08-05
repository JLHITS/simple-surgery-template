import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { getSiteConfig } from '@/lib/config'

/** The public website: everything a patient sees. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const config = await getSiteConfig()
  const { practice, advanced } = config

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
      />

      <main id="main-content">{children}</main>

      <Footer config={config} />
    </>
  )
}
