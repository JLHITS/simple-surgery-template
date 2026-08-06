import type { Metadata } from 'next'
import { ActionCard, ButtonLink, CardGrid, Callout, PageHeader } from '@/components/ui'
import { getSiteConfig } from '@/lib/config'
import { siteBase } from '@/lib/routing'
import { renderMarkdown } from '@/lib/markdown'

export const metadata: Metadata = {
  title: 'Prescriptions',
  description:
    'How to order a repeat prescription, how long it takes, where to collect it, medication reviews and prescription charges.',
}

interface Props {
  params: Promise<{ site: string }>
}

/**
 * Prescriptions.
 *
 * NHS England ranks repeat prescriptions as the second most important task
 * patients come to a GP website for, after appointments. Their guidance lists
 * exactly what this page must cover: how to order, collection, nominating a
 * pharmacy, medication queries, reviews, charges, and disposing of old
 * medicines. All of it is here by default.
 */
export default async function PrescriptionsPage({ params }: Props) {
  const { site } = await params
  const base = siteBase(site)
  const config = await getSiteConfig(site)
  const { practice, online, content } = config

  return (
    <>
      <PageHeader title="Prescriptions" intro={content.prescriptionsIntro} />

      <div className="ss-container py-10">
        <h2>How to order</h2>
        <div className="mt-5">
          <CardGrid columns={3}>
          {online.nhsAppUrl && (
            <ActionCard
              href={online.nhsAppUrl}
              title="Order in the NHS App"
              description="The fastest way. Takes under a minute once you are set up."
              icon="phone"
            />
          )}
          {online.prescriptionUrl && online.prescriptionUrl !== online.nhsAppUrl && (
            <ActionCard
              href={online.prescriptionUrl}
              title="Order online"
              description="Use your online account to order your repeat medicines."
              icon="pill"
            />
          )}
          {practice.phoneSecondary && (
            <ActionCard
              href={`tel:${practice.phoneSecondary.replace(/\s+/g, '')}`}
              title={practice.phoneSecondaryLabel || 'Prescriptions line'}
              description={practice.phoneSecondary}
              icon="phone"
              external={false}
            />
          )}
          </CardGrid>
        </div>

        {/*
          The ways to order that are not a button. These used to sit at the top
          of the body, which meant the page had the ordering methods twice: once
          as cards under "How to order", then again in prose immediately below.
        */}
        {content.prescriptionsOrderNote && (
          <div className="ss-prose mt-6 max-w-2xl">
            {renderMarkdown(content.prescriptionsOrderNote)}
          </div>
        )}

        <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_18rem]">
          <div className="ss-prose">{renderMarkdown(content.prescriptionsBody)}</div>

          <aside className="lg:pt-2">
            <Callout tone="warning" title="Allow 3 working days">
              <p>
                Order before you run out. Weekends and bank holidays do not count as working
                days.
              </p>
            </Callout>

            <div className="mt-6 radius-card border border-nhs-grey-4 p-5">
              <h2 className="text-base font-bold">Useful links</h2>
              <ul className="mt-3 grid gap-2 text-[0.95rem]">
                <li>
                  <a
                    href="https://www.nhs.uk/nhs-services/prescriptions/"
                    className="ss-link"
                  >
                    Prescription charges and exemptions
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.nhs.uk/service-search/pharmacy/find-a-pharmacy"
                    className="ss-link"
                  >
                    Find a pharmacy
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.nhs.uk/medicines/"
                    className="ss-link"
                  >
                    Information about your medicines
                  </a>
                </li>
                <li>
                  <a href={`${base}/appointments`} className="ss-link">
                    Request an appointment
                  </a>
                </li>
              </ul>
            </div>
          </aside>
        </div>

        <div className="mt-12 border-t border-nhs-grey-4 pt-8">
          <h2>Questions about your medicines?</h2>
          <p className="mt-2 max-w-2xl text-nhs-grey-1">
            Our clinical pharmacist can help with side effects, doses and reviews. A community
            pharmacist can also advise without an appointment.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {online.requestUrl && (
              <ButtonLink href={online.requestUrl}>Send us a request</ButtonLink>
            )}
            {practice.phone && (
              <ButtonLink
                href={`tel:${practice.phone.replace(/\s+/g, '')}`}
                variant="secondary"
                icon="phone"
              >
                Call {practice.phone}
              </ButtonLink>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
