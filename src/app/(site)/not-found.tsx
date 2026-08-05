import Link from 'next/link'
import { ActionCard, CardGrid, PageHeader } from '@/components/ui'

export default function NotFound() {
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
    </>
  )
}
