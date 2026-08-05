import type { Metadata } from 'next'
import { ActionCard, ButtonLink, CardGrid, Callout, PageHeader } from '@/components/ui'
import { Icon } from '@/components/Icon'
import { getSiteConfig } from '@/lib/config'
import { renderMarkdown } from '@/lib/markdown'

export const metadata: Metadata = {
  title: 'Appointments',
  description:
    'How to request an urgent or routine appointment, what happens after you contact us, and how to arrange a home visit or an interpreter.',
}

/**
 * Appointments.
 *
 * NHS England calls this "the most critical page on a GP website for patients".
 * The wording follows their tested guidance closely:
 *
 *   - "request an appointment online", never "online consultation", which 83%
 *     of tested patients did not understand
 *   - never "triage" or "clinician"
 *   - never "emergency appointment", which patients confuse with A&E
 *   - no supplier or product names anywhere on the page
 */
export default async function AppointmentsPage() {
  const config = await getSiteConfig()
  const { practice, online, content, hours } = config

  return (
    <>
      <PageHeader title="Appointments" intro={content.appointmentsIntro} />

      <div className="ss-container py-10">
        <h2 className="sr-only">How to get in touch</h2>
        <CardGrid columns={3}>
          {online.requestUrl && (
            <ActionCard
              href={online.requestUrl}
              title="Request an appointment online"
              description={online.requestOpenNote}
              icon="calendar"
            />
          )}
          {practice.phone && (
            <ActionCard
              href={`tel:${practice.phone.replace(/\s+/g, '')}`}
              title={`Call us on ${practice.phone}`}
              description={hours.notes || 'Phone lines open when the surgery opens.'}
              icon="phone"
              external={false}
            />
          )}
          {online.nhsAppUrl && (
            <ActionCard
              href={online.nhsAppUrl}
              title="Use the NHS App"
              description="See and manage the appointments you already have."
              icon="phone"
            />
          )}
        </CardGrid>

        <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_18rem]">
          <div className="ss-prose">{renderMarkdown(content.appointmentsBody)}</div>

          <aside className="lg:pt-2">
            <Callout tone="urgent" title="If it cannot wait">
              <p>
                Call <strong>999</strong> for a life threatening emergency.
              </p>
              <p className="mt-2">
                Call <strong>111</strong> or go to{' '}
                <a
                  href="https://111.nhs.uk"
                  className="ss-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  111.nhs.uk
                </a>{' '}
                when we are closed.
              </p>
            </Callout>

            <div className="mt-6 radius-card border border-nhs-grey-4 p-5">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <Icon name="clock" size={18} className="accent-text" />
                Related
              </h2>
              <ul className="mt-3 grid gap-2 text-[0.95rem]">
                <li>
                  <a href="/prescriptions" className="ss-link">
                    Order a repeat prescription
                  </a>
                </li>
                <li>
                  <a href="/services/test-results" className="ss-link">
                    Get your test results
                  </a>
                </li>
                <li>
                  <a href="/services/fit-notes" className="ss-link">
                    Get a fit note
                  </a>
                </li>
                <li>
                  <a href="/services/self-referral" className="ss-link">
                    Services you can refer yourself to
                  </a>
                </li>
                <li>
                  <a href="/contact" className="ss-link">
                    Opening hours and how to find us
                  </a>
                </li>
              </ul>
            </div>
          </aside>
        </div>

        <div className="mt-12 border-t border-nhs-grey-4 pt-8">
          <h2>Cannot find what you need?</h2>
          <p className="mt-2 max-w-2xl text-nhs-grey-1">
            Call us and we will help. If you are not sure whether you need an appointment, a
            pharmacist can advise you about many everyday problems without one.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {practice.phone && (
              <ButtonLink href={`tel:${practice.phone.replace(/\s+/g, '')}`} icon="phone">
                Call {practice.phone}
              </ButtonLink>
            )}
            <ButtonLink
              href="https://www.nhs.uk/service-search/pharmacy/find-a-pharmacy"
              variant="secondary"
            >
              Find a pharmacy
            </ButtonLink>
          </div>
        </div>
      </div>
    </>
  )
}
