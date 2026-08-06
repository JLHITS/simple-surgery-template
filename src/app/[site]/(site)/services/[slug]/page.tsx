import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ButtonLink, PageHeader } from '@/components/ui'
import { getSiteConfig } from '@/lib/config'
import { siteBase } from '@/lib/routing'
import { markdownToPlainText, renderMarkdown } from '@/lib/markdown'

interface Props {
  params: Promise<{ site: string; slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site, slug } = await params
  const { services } = await getSiteConfig(site)
  const service = services.find((s) => s.slug === slug)
  if (!service) return {}

  return {
    title: service.title,
    description: service.summary || markdownToPlainText(service.body, 155),
  }
}

export default async function ServicePage({ params }: Props) {
  const { site, slug } = await params
  const config = await getSiteConfig(site)
  const service = config.services.find((s) => s.slug === slug)

  if (!service) notFound()

  const base = siteBase(site)

  const others = config.services.filter((s) => s.slug !== slug).slice(0, 4)

  return (
    <>
      <PageHeader
        title={service.title}
        intro={service.summary}
        breadcrumbs={[
          { label: 'Home', href: base || '/' },
          { label: 'Services', href: `${base}/services` },
        ]}
      />

      <div className="ss-container py-10">
        <div className="grid gap-12 lg:grid-cols-[1fr_18rem]">
          <div>
            <div className="ss-prose">{renderMarkdown(service.body)}</div>

            {/*
              NHS guidance expects a practice to describe its boundary through a
              map, a plan or postcodes, not prose alone. Shown only on the
              registration page, where it is the question patients actually have.
            */}
            {slug === 'register' &&
              (config.practice.boundaryDescription ||
                config.practice.boundaryPostcodes ||
                config.practice.boundaryMapUrl) && (
                <section aria-labelledby="boundary" className="mt-10">
                  <h2 id="boundary">Our practice area</h2>

                  {config.practice.boundaryDescription && (
                    <p className="mt-3 leading-relaxed">
                      {config.practice.boundaryDescription}
                    </p>
                  )}

                  {config.practice.boundaryPostcodes && (
                    <div className="mt-4 radius-card border border-nhs-grey-4 bg-nhs-grey-5 p-5">
                      <h3 className="text-base font-bold">Postcodes we cover</h3>
                      <p className="mt-2 text-[0.95rem] leading-relaxed">
                        {config.practice.boundaryPostcodes}
                      </p>
                      <p className="mt-2 text-[0.9rem] text-nhs-grey-1">
                        If your postcode is not listed, contact us anyway. We may still be able
                        to register you.
                      </p>
                    </div>
                  )}

                  {config.practice.boundaryMapUrl && (
                    <div className="mt-4 aspect-[16/10] w-full overflow-hidden radius-card border border-nhs-grey-4">
                      <iframe
                        src={config.practice.boundaryMapUrl}
                        title={`Map showing the practice area for ${config.practice.name}`}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        className="h-full w-full border-0"
                      />
                    </div>
                  )}
                </section>
              )}
          </div>

          <aside>
            {others.length > 0 && (
              <div className="radius-card border border-nhs-grey-4 p-5">
                <h2 className="text-base font-bold">Other services</h2>
                <ul className="mt-3 grid gap-2 text-[0.95rem]">
                  {others.map((other) => (
                    <li key={other.id}>
                      <Link href={`${base}/services/${other.slug}`} className="ss-link">
                        {other.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6">
              <ButtonLink href={`${base}/contact`} variant="secondary" icon="phone">
                Contact the surgery
              </ButtonLink>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}
