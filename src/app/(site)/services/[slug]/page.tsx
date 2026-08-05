import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ButtonLink, PageHeader } from '@/components/ui'
import { getSiteConfig } from '@/lib/config'
import { markdownToPlainText, renderMarkdown } from '@/lib/markdown'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const { services } = await getSiteConfig()
  return services.map((service) => ({ slug: service.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { services } = await getSiteConfig()
  const service = services.find((s) => s.slug === slug)
  if (!service) return {}

  return {
    title: service.title,
    description: service.summary || markdownToPlainText(service.body, 155),
  }
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params
  const config = await getSiteConfig()
  const service = config.services.find((s) => s.slug === slug)

  if (!service) notFound()

  const others = config.services.filter((s) => s.slug !== slug).slice(0, 4)

  return (
    <>
      <PageHeader
        title={service.title}
        intro={service.summary}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Services', href: '/services' },
        ]}
      />

      <div className="ss-container py-10">
        <div className="grid gap-12 lg:grid-cols-[1fr_18rem]">
          <div className="ss-prose">{renderMarkdown(service.body)}</div>

          <aside>
            {others.length > 0 && (
              <div className="radius-card border border-nhs-grey-4 p-5">
                <h2 className="text-base font-bold">Other services</h2>
                <ul className="mt-3 grid gap-2 text-[0.95rem]">
                  {others.map((other) => (
                    <li key={other.id}>
                      <Link href={`/services/${other.slug}`} className="ss-link">
                        {other.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6">
              <ButtonLink href="/contact" variant="secondary" icon="phone">
                Contact the surgery
              </ButtonLink>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}
