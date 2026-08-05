import Link from 'next/link'
import { ActionCard, ButtonLink, CardGrid, Section, SectionHeading } from '@/components/ui'
import { HoursTable } from '@/components/HoursTable'
import { Icon } from '@/components/Icon'
import { NewsList } from '@/components/NewsList'
import { NoticeBanner } from '@/components/NoticeBanner'
import { OpenNow } from '@/components/OpenNow'
import { UrgentHelp } from '@/components/UrgentHelp'
import { getSiteConfig } from '@/lib/config'
import { siteBase } from '@/lib/routing'
import { getNationalNews } from '@/lib/news'

interface Props {
  params: Promise<{ site: string }>
}

/**
 * The home page.
 *
 * NHS user research found 80% of patients begin their task here, and that the
 * three things they overwhelmingly come for are an appointment, a repeat
 * prescription, and the phone number. So the page opens with those, not with a
 * welcome message about the practice's history.
 *
 * There is deliberately very little prose above the fold.
 */
export default async function HomePage({ params }: Props) {
  const { site } = await params
  const base = siteBase(site)
  const config = await getSiteConfig(site)
  const { practice, hours, online, notice, services, news } = config

  const featured = services.filter((s) => s.featured).slice(0, 6)
  const nationalNews =
    news.nhsFeedEnabled && news.homeCount > 0
      ? await getNationalNews(news.feedUrls, news.homeCount)
      : []

  return (
    <>
      <NoticeBanner notice={notice} />

      {/* ------------------------------------------------------------ hero */}
      <div className="ss-container pb-2 pt-10 sm:pt-14">
        <p className="text-sm font-bold uppercase tracking-wider text-nhs-grey-1">
          {practice.strapline}
        </p>
        <h1 className="mt-2 max-w-3xl">{practice.name}</h1>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
          <OpenNow days={hours.days} closures={hours.closures} />
          {practice.phone && (
            <a
              href={`tel:${practice.phone.replace(/\s+/g, '')}`}
              className="inline-flex items-center gap-2 text-sm font-bold text-nhs-black no-underline hover:underline"
            >
              <Icon name="phone" size={18} className="accent-text" />
              {practice.phone}
            </a>
          )}
          <Link href={`${base}/contact`} className="inline-flex items-center gap-2 text-sm ss-link">
            <Icon name="pin" size={18} />
            {practice.addressLine1}, {practice.postcode}
          </Link>
        </div>
      </div>

      {/* --------------------------------------------------- primary tasks */}
      <div className="ss-container pb-4 pt-8">
        <h2 className="sr-only">What would you like to do?</h2>
        <CardGrid columns={3}>
          <ActionCard
            href={`${base}/appointments`}
            title="Request an appointment"
            description="Tell us what is wrong and we will book you with the right person."
            icon="calendar"
          />
          <ActionCard
            href={`${base}/prescriptions`}
            title="Order a repeat prescription"
            description="Order online, by app, or through your pharmacy."
            icon="pill"
          />
          <ActionCard
            href={`${base}/services/test-results`}
            title="Get your test results"
            description="See results in the NHS App or call us after 2pm."
            icon="flask"
          />
          <ActionCard
            href={`${base}/services/register`}
            title="Register with the surgery"
            description="Join the practice as a new patient. No ID needed."
            icon="user-plus"
          />
          <ActionCard
            href={`${base}/services/fit-notes`}
            title="Get a fit note"
            description="Also called a sick note, for time off work."
            icon="note"
          />
          <ActionCard
            href={`${base}/contact`}
            title="Contact us"
            description="Phone number, address, opening hours and how to get here."
            icon="pin"
          />
        </CardGrid>
      </div>

      {/* ---------------------------------------------------- urgent care */}
      <div className="mt-10">
        <UrgentHelp urgent={config.urgent} />
      </div>

      {/* ------------------------------------------------- online services */}
      {(online.nhsAppUrl || online.requestUrl) && (
        <Section>
          <SectionHeading
            title="Manage your health online"
            description="The fastest way to do most things. Everything here can still be done by phone or in person."
          />
          <CardGrid columns={3}>
            {online.nhsAppUrl && (
              <ActionCard
                href={online.nhsAppUrl}
                title="The NHS App"
                description="Order prescriptions, see your record and check test results."
                icon="phone"
              />
            )}
            {online.requestUrl && (
              <ActionCard
                href={online.requestUrl}
                title="Request an appointment online"
                description={online.requestOpenNote}
                icon="calendar"
              />
            )}
            {online.registrationUrl && (
              <ActionCard
                href={online.registrationUrl}
                title="Register online"
                description="Takes about 10 minutes. You do not need proof of address."
                icon="user-plus"
              />
            )}
            {online.extraLinks.map((link) => (
              <ActionCard
                key={link.id}
                href={link.href}
                title={link.label}
                description={link.description}
                icon={link.icon}
                external={link.external}
              />
            ))}
          </CardGrid>
        </Section>
      )}

      {/* ---------------------------------------------------- our services */}
      {featured.length > 0 && (
        <Section tint>
          <SectionHeading
            title="Our services"
            action={
              <ButtonLink href={`${base}/services`} variant="secondary">
                See all services
              </ButtonLink>
            }
          />
          <CardGrid columns={4}>
            {featured.map((service) => (
              <ActionCard
                key={service.id}
                href={`${base}/services/${service.slug}`}
                title={service.title}
                description={service.summary}
                icon={service.icon}
              />
            ))}
          </CardGrid>
        </Section>
      )}

      {/* ------------------------------------------- hours and NHS news */}
      <Section>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <SectionHeading title="Opening hours" />
            <HoursTable
              days={hours.days}
              closures={hours.closures}
              notes={hours.notes}
              extended={hours.extendedAccess}
              compact
            />
            <div className="mt-6">
              <ButtonLink href={`${base}/contact`} variant="secondary" icon="pin">
                How to find us
              </ButtonLink>
            </div>
          </div>

          {nationalNews.length > 0 && (
            <div>
              <SectionHeading
                title="NHS news"
                action={
                  <Link href={`${base}/news`} className="ss-link text-sm font-semibold">
                    More news
                  </Link>
                }
              />
              <NewsList items={nationalNews} compact />
            </div>
          )}
        </div>
      </Section>
    </>
  )
}
