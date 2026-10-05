import type { Metadata } from 'next'
import { Callout, PageHeader } from '@/components/ui'
import { AccessModes } from '@/components/AccessModes'
import { HoursList, HoursTable } from '@/components/HoursTable'
import { Icon } from '@/components/Icon'
import { OpenNow } from '@/components/OpenNow'
import { getSiteConfig } from '@/lib/config'
import { practiceSites } from '@/lib/practice'
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

  // The main surgery first, then any branches. With one site this is just
  // the practice's address, printed the way it always was.
  const allSites = practiceSites(practice)
  const main = allSites[0]
  const branches = allSites.slice(1)
  const sites = allSites.filter((site) => !site.main || site.addressLines.length > 0)
  const ownHours = branches.filter((site) => site.days)
  const sameHours = branches.filter((site) => !site.days)
  const mainName = practice.mainSiteName.trim() || 'the main surgery'

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

              {/*
                Only once there is an address to show. A heading with nothing
                under it, above a "Get directions" link that searches a map for
                an empty string, is worse than leaving the block out until the
                practice has filled their address in.

                With branches, each site gets its own block, so a patient can
                see at a glance which building is theirs, its phone number if
                it has its own, and the way there.
              */}
              {sites.map((site) => (
                <div key={site.id} className="flex gap-4">
                  <span className="accent-text mt-0.5 shrink-0" aria-hidden="true">
                    <Icon name="pin" size={22} />
                  </span>
                  <div>
                    <dt className="font-bold">{branches.length ? site.label : 'Address'}</dt>
                    {site.addressLines.length > 0 && (
                      <dd className="mt-0.5">
                        <address className="break-words not-italic leading-relaxed">
                          {site.addressLines.map((line) => (
                            <span key={line} className="block">
                              {line}
                            </span>
                          ))}
                        </address>
                      </dd>
                    )}
                    {site.phone && (
                      <dd className="mt-1 text-[0.95rem]">
                        Phone:{' '}
                        <a href={`tel:${site.phone.replace(/\s+/g, '')}`} className="ss-link">
                          {site.phone}
                        </a>
                      </dd>
                    )}
                    {site.notes && (
                      <dd className="mt-1 text-[0.95rem] leading-relaxed text-nhs-grey-1">{site.notes}</dd>
                    )}
                    {site.addressLines.length > 0 && (
                      <dd className="mt-2">
                        <a href={site.directionsUrl} className="ss-link text-[0.95rem]">
                          Get directions
                          {branches.length > 0 && <span className="sr-only"> to {site.label}</span>}
                        </a>
                      </dd>
                    )}
                  </div>
                </div>
              ))}
            </dl>

            {(practice.parkingInfo || practice.accessInfo || practice.publicTransportInfo) && (
              <div className="mt-10">
                {/* Parking and access are the main surgery's. Each branch
                    carries its own in the note under its address. */}
                <h2>{branches.length ? `Getting to ${practice.mainSiteName.trim() || 'the main surgery'}` : 'Getting here'}</h2>
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

            {/*
              Branches often keep shorter hours than the main surgery. When
              any does, the main surgery's table says whose it is and each
              branch with its own hours follows with its own list. Bank
              holidays and other closures apply to every site.
            */}
            {ownHours.length > 0 && <h3 className="mt-5 text-lg">{main.label}</h3>}
            <div className={ownHours.length > 0 ? 'mt-3' : 'mt-5'}>
              <HoursTable
                days={hours.days}
                closures={hours.closures}
                notes={hours.notes}
                extended={hours.extendedAccess}
                showTimeline={config.advanced.showHoursTimeline}
              />
            </div>

            {ownHours.map((site) => (
              <div key={site.id} className="mt-8">
                <h3 className="text-lg">{site.label}</h3>
                <div className="mt-3">
                  <HoursList days={site.days!} />
                </div>
              </div>
            ))}

            {sameHours.length > 0 && (
              <p className="mt-4 text-[0.95rem] text-nhs-grey-1">
                {ownHours.length === 0
                  ? 'These hours are the same at all our surgeries.'
                  : `${sameHours.map((site) => site.label).join(' and ')} ${
                      sameHours.length === 1 ? 'keeps' : 'keep'
                    } the same hours as ${mainName}.`}
              </p>
            )}

            {hours.receptionNote && (
              <p className="mt-4 text-[0.95rem] text-nhs-grey-1">{hours.receptionNote}</p>
            )}

            {/*
              Each access mode's availability, published separately as the
              2026/27 contract requires. It sits under the opening hours
              because "when is the surgery open" and "when can I phone" are
              different questions that patients ask in that order.
            */}
            <AccessModes accessModes={hours.accessModes} className="mt-8" />

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
