import type { Metadata } from 'next'
import { Callout, PageHeader } from '@/components/ui'
import { HoursTable } from '@/components/HoursTable'
import { Icon } from '@/components/Icon'
import { OpenNow } from '@/components/OpenNow'
import { getSiteConfig } from '@/lib/config'
import { siteBase } from '@/lib/routing'

export const metadata: Metadata = {
  title: 'Contact us',
  description:
    'Our phone number, address, opening hours, parking, accessibility and how to reach us when we are closed.',
}

interface Props {
  params: Promise<{ site: string }>
}

/**
 * Contact us.
 *
 * NHS guidance says this page must line up with the practice's NHS.uk profile
 * page, and must cover phone, address, directions, opening hours, out of hours,
 * building access and parking. All of that is here.
 *
 * Patients arriving here looking for an appointment get pointed back to the
 * appointments page rather than being left to phone reception, which is the
 * specific behaviour NHS user testing recommends.
 */
export default async function ContactPage({ params }: Props) {
  const { site } = await params
  const base = siteBase(site)
  const config = await getSiteConfig(site)
  const { practice, hours, content } = config

  const addressLines = [
    practice.addressLine1,
    practice.addressLine2,
    practice.town,
    practice.county,
    practice.postcode,
  ].filter(Boolean)

  const mapsQuery = encodeURIComponent(
    `${practice.name}, ${addressLines.join(', ')}`,
  )

  return (
    <>
      <PageHeader title="Contact us" intro={content.contactIntro} />

      <div className="ss-container py-10">
        {/*
          Points patients at the right page without appearing to discourage the
          telephone. NHS guidance is that every contact route should be shown
          and give a consistent experience, so this signposts rather than
          restricts.
        */}
        <Callout tone="info" title="Looking for an appointment or a prescription?">
          <p>
            Our{' '}
            <a href={`${base}/appointments`} className="ss-link">
              appointments
            </a>{' '}
            and{' '}
            <a href={`${base}/prescriptions`} className="ss-link">
              prescriptions
            </a>{' '}
            pages show every way you can contact us about these, including online, by phone
            and in person.
          </p>
        </Callout>

        <div className="mt-10 grid gap-10 lg:grid-cols-2">
          {/* ------------------------------------------------------ contact */}
          <div>
            <h2>How to reach us</h2>

            <dl className="mt-5 grid gap-5">
              {practice.phone && (
                <div className="flex gap-4">
                  <span className="accent-text mt-0.5 shrink-0" aria-hidden="true">
                    <Icon name="phone" size={22} />
                  </span>
                  <div>
                    <dt className="font-bold">Phone</dt>
                    <dd className="mt-0.5">
                      <a
                        href={`tel:${practice.phone.replace(/\s+/g, '')}`}
                        className="ss-link text-lg"
                      >
                        {practice.phone}
                      </a>
                    </dd>
                    {practice.phoneSecondary && (
                      <dd className="mt-1 text-[0.95rem]">
                        {practice.phoneSecondaryLabel}:{' '}
                        <a
                          href={`tel:${practice.phoneSecondary.replace(/\s+/g, '')}`}
                          className="ss-link"
                        >
                          {practice.phoneSecondary}
                        </a>
                      </dd>
                    )}
                  </div>
                </div>
              )}

              {practice.email && (
                <div className="flex gap-4">
                  <span className="accent-text mt-0.5 shrink-0" aria-hidden="true">
                    <Icon name="mail" size={22} />
                  </span>
                  <div>
                    <dt className="font-bold">Email</dt>
                    <dd className="mt-0.5">
                      <a href={`mailto:${practice.email}`} className="ss-link break-all">
                        {practice.email}
                      </a>
                    </dd>
                    <dd className="mt-1 text-[0.9rem] text-nhs-grey-1">
                      Please do not email us about anything urgent or about a medical problem.
                      Email is not a secure way to send health information.
                    </dd>
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <span className="accent-text mt-0.5 shrink-0" aria-hidden="true">
                  <Icon name="pin" size={22} />
                </span>
                <div>
                  <dt className="font-bold">Address</dt>
                  <dd className="mt-0.5">
                    <address className="break-words not-italic leading-relaxed">
                      {addressLines.map((line) => (
                        <span key={line} className="block">
                          {line}
                        </span>
                      ))}
                    </address>
                  </dd>
                  <dd className="mt-2">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                      className="ss-link text-[0.95rem]"
                    >
                      Get directions
                    </a>
                  </dd>
                </div>
              </div>
            </dl>

            {(practice.parkingInfo || practice.accessInfo || practice.publicTransportInfo) && (
              <div className="mt-10">
                <h2>Getting here</h2>
                <div className="mt-4 grid gap-4">
                  {practice.publicTransportInfo && (
                    <div>
                      <h3 className="text-base">Public transport</h3>
                      <p className="mt-1 text-[0.95rem] leading-relaxed text-nhs-grey-1">
                        {practice.publicTransportInfo}
                      </p>
                    </div>
                  )}
                  {practice.parkingInfo && (
                    <div>
                      <h3 className="text-base">Parking</h3>
                      <p className="mt-1 text-[0.95rem] leading-relaxed text-nhs-grey-1">
                        {practice.parkingInfo}
                      </p>
                    </div>
                  )}
                  {practice.accessInfo && (
                    <div>
                      <h3 className="text-base">Access into the building</h3>
                      <p className="mt-1 text-[0.95rem] leading-relaxed text-nhs-grey-1">
                        {practice.accessInfo}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* -------------------------------------------------------- hours */}
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2>Opening hours</h2>
              <OpenNow days={hours.days} closures={hours.closures} />
            </div>

            <div className="mt-5">
              <HoursTable
                days={hours.days}
                closures={hours.closures}
                notes={hours.notes}
                extended={hours.extendedAccess}
                showTimeline={config.advanced.showHoursTimeline}
              />
            </div>

            {hours.receptionNote && (
              <p className="mt-4 text-[0.95rem] text-nhs-grey-1">{hours.receptionNote}</p>
            )}

            <div className="mt-8">
              <Callout tone="warning" title="When we are closed">
                <p>{hours.outOfHoursInfo}</p>
                <p className="mt-2">
                  For a life threatening emergency, call <strong>999</strong>.
                </p>
              </Callout>
            </div>
          </div>
        </div>

        {practice.mapEmbedUrl && (
          <div className="mt-12">
            <h2>Where to find us</h2>
            <div className="mt-4 aspect-[16/9] w-full overflow-hidden radius-card border border-nhs-grey-4">
              <iframe
                src={practice.mapEmbedUrl}
                title={`Map showing the location of ${practice.name}`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-full w-full border-0"
              />
            </div>
          </div>
        )}
      </div>
    </>
  )
}
