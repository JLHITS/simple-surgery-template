import Link from 'next/link'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { ActionCard, CardGrid, PageHeader } from '@/components/ui'
import { getSiteConfig } from '@/lib/config'

/**
 * The global 404, for URLs that match no route at all.
 *
 * Renders the site chrome itself because it sits above the (site) route group,
 * so a patient who mistypes a URL still gets the menu and the phone number
 * rather than a bare error page.
 */
export default async function NotFound() {
  const config = await getSiteConfig()
  const { practice, advanced } = config

  return (
    <>
      <Header
        practiceName={practice.name}
        logoUrl={practice.logoUrl}
        logoAlt={practice.logoAlt}
        phone={practice.phone}
        showSearch={advanced.showSearch}
        showNhsLogo={advanced.showNhsLogo}
      />

      <main id="main-content">
        <PageHeader
          title="Page not found"
          intro="Sorry, we cannot find that page. It may have been moved or removed."
        />

        <div className="ss-container py-10">
          <h2 className="sr-only">Common pages</h2>
          <CardGrid columns={3}>
            <ActionCard
              href="/appointments"
              title="Appointments"
              description="Request an urgent or routine appointment."
              icon="calendar"
            />
            <ActionCard
              href="/prescriptions"
              title="Prescriptions"
              description="Order your repeat medicines."
              icon="pill"
            />
            <ActionCard
              href="/contact"
              title="Contact us"
              description="Phone number, address and opening hours."
              icon="pin"
            />
          </CardGrid>

          <p className="mt-8">
            <Link href="/" className="ss-link">
              Go to the home page
            </Link>
          </p>
        </div>
      </main>

      <Footer config={config} />
    </>
  )
}
