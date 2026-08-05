'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ActionCard, CardGrid, PageHeader } from '@/components/ui'

/**
 * Not found, inside a practice site.
 *
 * A client component because Next does not pass route params to not-found
 * boundaries, and these links have to stay inside the practice the patient was
 * already looking at. The first path segment is the practice, unless this is a
 * single tenant deployment, in which case there is no prefix and the first
 * segment is a real page.
 */
const KNOWN_PAGES = new Set([
  'appointments',
  'prescriptions',
  'services',
  'about',
  'contact',
  'news',
  'search',
  'admin',
])

export default function NotFound() {
  const pathname = usePathname()
  const first = pathname.split('/').filter(Boolean)[0] ?? ''
  const base = first && !KNOWN_PAGES.has(first) ? `/${first}` : ''

  return (
    <>
      <PageHeader
        title="Page not found"
        intro="Sorry, we cannot find that page. It may have been moved or removed."
      />

      <div className="ss-container py-10">
        <h2 className="sr-only">Common pages</h2>
        <CardGrid columns={3}>
          <ActionCard
            href={`${base}/appointments`}
            title="Appointments"
            description="Request an urgent or routine appointment."
            icon="calendar"
          />
          <ActionCard
            href={`${base}/prescriptions`}
            title="Prescriptions"
            description="Order your repeat medicines."
            icon="pill"
          />
          <ActionCard
            href={`${base}/contact`}
            title="Contact us"
            description="Phone number, address and opening hours."
            icon="pin"
          />
        </CardGrid>

        <p className="mt-8">
          <Link href={base || '/'} className="ss-link">
            Go to the home page
          </Link>
        </p>
      </div>
    </>
  )
}
