import type { Metadata } from 'next'
import { ActionCard, CardGrid, PageHeader } from '@/components/ui'
import { getSiteConfig } from '@/lib/config'
import { siteBase } from '@/lib/routing'

export const metadata: Metadata = {
  title: 'Services',
  description:
    'Test results, fit notes, registering with the surgery, vaccinations, clinics for long term conditions, and services you can refer yourself to.',
}

interface Props {
  params: Promise<{ site: string }>
}

export default async function ServicesPage({ params }: Props) {
  const { site } = await params
  const base = siteBase(site)
  const { services } = await getSiteConfig(site)

  return (
    <>
      <PageHeader
        title="Services"
        intro="Everything the practice offers, and the things you can arrange without seeing us first."
      />

      <div className="ss-container py-10">
        <CardGrid columns={3}>
          {services.map((service) => (
            <ActionCard
              key={service.id}
              href={`${base}/services/${service.slug}`}
              title={service.title}
              description={service.summary}
              icon={service.icon}
            />
          ))}
        </CardGrid>

        {services.length === 0 && (
          <p className="text-nhs-grey-1">No services have been added yet.</p>
        )}
      </div>
    </>
  )
}
