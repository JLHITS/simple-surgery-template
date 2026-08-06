import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ButtonLink, Callout, PageHeader } from '@/components/ui'
import { getSiteConfig } from '@/lib/config'
import { formatDate } from '@/lib/hours'
import { siteBase } from '@/lib/routing'
import { markdownToPlainText, renderMarkdown } from '@/lib/markdown'

interface Props {
  params: Promise<{ site: string; slug: string }>
}

/**
 * NHS England's own "You and your general practice".
 *
 * The GP contract requires practices to link to the national document, not
 * merely to publish something equivalent, so this is a link rather than
 * something a practice can accidentally edit away. Translated, easy read and
 * British Sign Language versions are all published on that page.
 */
const PATIENT_CHARTER_URL =
  'https://www.england.nhs.uk/long-read/you-and-your-general-practice/'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site, slug } = await params
  const { pages } = await getSiteConfig(site)
  const page = pages.find((p) => p.slug === slug)
  if (!page) return {}

  return {
    title: page.title,
    description: page.summary || markdownToPlainText(page.body, 155),
  }
}

/**
 * A practice information page.
 *
 * Some statutory pages need live data appended to the editable copy: the
 * complaints page needs the current contact, the privacy notice needs the named
 * Data Protection Officer, and the GP earnings page needs this year's figures.
 * Those are rendered from config below the body so they can never drift out of
 * date when someone edits the words above them.
 */
export default async function AboutSubPage({ params }: Props) {
  const { site, slug } = await params
  const config = await getSiteConfig(site)
  const page = config.pages.find((p) => p.slug === slug)

  if (!page) notFound()

  const base = siteBase(site)

  const { compliance, practice, advanced } = config

  return (
    <>
      <PageHeader
        title={page.title}
        intro={page.summary}
        breadcrumbs={[
          { label: 'Home', href: base || '/' },
          { label: 'About the surgery', href: `${base}/about` },
        ]}
      />

      <div className="ss-container py-10">
        {/*
          The model accessibility statement opens with the scope and the
          commitment, in a set form of words. Rendered from config rather than
          left in the editable body so the website address and the practice
          name cannot end up describing somebody else's site.
        */}
        {slug === 'accessibility' && (
          <div className="ss-prose mb-8">
            <p>
              <strong>
                This accessibility statement applies to{' '}
                {advanced.siteUrl ? (
                  <a href={advanced.siteUrl} className="ss-link">
                    {advanced.siteUrl.replace(/^https?:\/\//, '')}
                  </a>
                ) : (
                  'this website'
                )}
                .
              </strong>
            </p>
            <p>
              {practice.name} is committed to making its website accessible, in accordance with
              the Public Sector Bodies (Websites and Mobile Applications) (No. 2) Accessibility
              Regulations 2018.
            </p>
          </div>
        )}

        {/*
          A practice's privacy notice has to describe that practice's own
          processing. What ships here is a starting point covering the common
          case, and saying so is the honest thing to do: safeguarding, research,
          commissioning and local sharing arrangements all vary.
        */}
        {slug === 'privacy' && (
          <div className="mb-8">
            <Callout tone="warning" title="Draft patient privacy summary">
              <p>
                Review and adapt this before publication. It covers the processing common to
                most GP practices, but it is not a complete privacy notice for any particular
                one. Add your own arrangements for safeguarding, research, commissioning, local
                data sharing and anything else specific to this practice, and check the
                retention periods and rights described below are the ones that apply.
              </p>
            </Callout>
          </div>
        )}

        <div className="ss-prose">{renderMarkdown(page.body)}</div>

        {slug === 'patient-charter' && (
          <div className="radius-card mt-8 border-2 border-nhs-grey-4 bg-nhs-grey-5 p-6">
            <h2 className="text-lg font-bold">The official NHS England document</h2>
            <p className="mt-2 max-w-2xl text-[0.98rem] leading-relaxed">
              The summary above is ours. NHS England publishes the definitive version, and that
              is the one this practice is required to link to.
            </p>
            <div className="mt-5">
              <ButtonLink href={PATIENT_CHARTER_URL}>
                Read the official NHS England document
              </ButtonLink>
            </div>
            <p className="mt-4 text-[0.9rem] text-nhs-grey-1">
              That page also carries the document in other languages, in easy read, in large
              print and in British Sign Language.
            </p>
          </div>
        )}

        {slug === 'complaints' && (
          <div className="ss-prose mt-8">
            <Callout tone="info" title="Who to contact">
              <p>
                <strong>{compliance.complaintsContactName || 'The Practice Manager'}</strong>
              </p>
              {compliance.complaintsEmail && (
                <p className="mt-1">
                  <a href={`mailto:${compliance.complaintsEmail}`} className="ss-link">
                    {compliance.complaintsEmail}
                  </a>
                </p>
              )}
              {practice.phone && (
                <p className="mt-1">
                  <a
                    href={`tel:${practice.phone.replace(/\s+/g, '')}`}
                    className="ss-link"
                  >
                    {practice.phone}
                  </a>
                </p>
              )}
            </Callout>
          </div>
        )}

        {/*
          Complaints about a GP practice go to the Integrated Care Board, and
          have done since 1 July 2023. NHS England's old complaints line is
          still on a great many practice websites and still sends patients to
          the wrong place.
        */}
        {slug === 'complaints' &&
          (compliance.icbComplaintsEmail ||
            compliance.icbComplaintsPhone ||
            compliance.icbComplaintsUrl) && (
            <div className="ss-prose mt-6">
              <Callout tone="info" title="Or complain to our Integrated Care Board">
                <p>
                  <strong>{compliance.icbName || 'Our Integrated Care Board'}</strong>
                </p>
                {compliance.icbComplaintsAddress && (
                  <p className="mt-1">{compliance.icbComplaintsAddress}</p>
                )}
                {compliance.icbComplaintsEmail && (
                  <p className="mt-1">
                    <a href={`mailto:${compliance.icbComplaintsEmail}`} className="ss-link">
                      {compliance.icbComplaintsEmail}
                    </a>
                  </p>
                )}
                {compliance.icbComplaintsPhone && (
                  <p className="mt-1">
                    <a
                      href={`tel:${compliance.icbComplaintsPhone.replace(/\s+/g, '')}`}
                      className="ss-link"
                    >
                      {compliance.icbComplaintsPhone}
                    </a>
                  </p>
                )}
                {compliance.icbComplaintsUrl && (
                  <p className="mt-1">
                    <a href={compliance.icbComplaintsUrl} className="ss-link">
                      Complain on their website
                    </a>
                  </p>
                )}
                <p className="mt-3 text-[0.9rem]">
                  You cannot normally ask us and the Integrated Care Board to investigate the
                  same complaint at the same time.
                </p>
              </Callout>
            </div>
          )}

        {slug === 'privacy' && (
          <div className="ss-prose mt-8">
            <Callout tone="info" title="Our Data Protection Officer">
              <p>{compliance.dataProtectionOfficer || 'Contact the Practice Manager'}</p>
              {compliance.dataProtectionEmail && (
                <p className="mt-1">
                  <a href={`mailto:${compliance.dataProtectionEmail}`} className="ss-link">
                    {compliance.dataProtectionEmail}
                  </a>
                </p>
              )}
              {compliance.icoRegistration && (
                <p className="mt-2 text-[0.9rem]">
                  ICO registration number: {compliance.icoRegistration}
                </p>
              )}
            </Callout>
          </div>
        )}

        {slug === 'accessibility' && (
          <div className="mt-8 max-w-2xl">
            {/*
              A statement is only compliant if it says when it was prepared,
              when it was last reviewed and who tested it. Rendering those from
              config keeps them current without a practice having to remember
              to edit dates buried inside the page body.
            */}
            <h2>Statement details</h2>
            <dl className="mt-4 divide-y divide-nhs-grey-4 border-y border-nhs-grey-4">
              <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3">
                <dt className="font-semibold">Statement prepared on</dt>
                <dd>
                  {compliance.accessibilityPreparedOn
                    ? formatDate(compliance.accessibilityPreparedOn)
                    : 'Not recorded'}
                </dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3">
                <dt className="font-semibold">Last reviewed and tested</dt>
                <dd>
                  {compliance.accessibilityReviewedOn
                    ? formatDate(compliance.accessibilityReviewedOn)
                    : 'Not recorded'}
                </dd>
              </div>
            </dl>
            {compliance.accessibilityTestedBy && (
              <p className="mt-4 text-[0.95rem] leading-relaxed text-nhs-grey-1">
                <span className="font-semibold text-nhs-black">How it was tested: </span>
                {compliance.accessibilityTestedBy}
              </p>
            )}
            {compliance.accessibilityKnownIssues && (
              <p className="mt-3 text-[0.95rem] leading-relaxed text-nhs-grey-1">
                <span className="font-semibold text-nhs-black">Known problems: </span>
                {compliance.accessibilityKnownIssues}
              </p>
            )}
          </div>
        )}

        {slug === 'accessibility' && (
          <div className="ss-prose mt-8">
            <Callout tone="info" title="Tell us about a problem">
              <p>
                Email{' '}
                <a href={`mailto:${practice.email}`} className="ss-link">
                  {practice.email}
                </a>{' '}
                or call{' '}
                <a href={`tel:${practice.phone.replace(/\s+/g, '')}`} className="ss-link">
                  {practice.phone}
                </a>
                .
              </p>
            </Callout>
          </div>
        )}

        {/*
          The ICO expects more than a statement that the model scheme has been
          adopted: a guide to the information actually held, where each item is,
          and what it costs. That is a table, and it belongs in config so a
          practice can add its own rows.
        */}
        {slug === 'freedom-of-information' && compliance.publicationScheme.length > 0 && (
          <div className="mt-10">
            <h2>Guide to information available</h2>
            <p className="mt-2 max-w-2xl text-[0.98rem] leading-relaxed text-nhs-grey-1">
              This is the information we routinely publish under the model publication scheme,
              where to find each item, and what we charge for it.
            </p>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[36rem] border-collapse text-[0.95rem]">
                <caption className="sr-only">
                  Information published under our publication scheme, where to get it and what
                  it costs
                </caption>
                <thead>
                  <tr className="border-b-2 border-nhs-grey-4">
                    <th scope="col" className="py-3 pr-4 text-left font-bold">
                      Information
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-bold">
                      Where available
                    </th>
                    <th scope="col" className="py-3 pl-4 text-left font-bold">
                      Charge
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {compliance.publicationScheme.map((row) => (
                    <tr key={row.id} className="border-b border-nhs-grey-4">
                      <th scope="row" className="py-3 pr-4 text-left align-top font-normal">
                        {row.information}
                      </th>
                      <td className="px-4 py-3 align-top text-nhs-grey-1">{row.where}</td>
                      <td className="py-3 pl-4 align-top text-nhs-grey-1">{row.charge}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 max-w-2xl text-[0.9rem] leading-relaxed text-nhs-grey-1">
              Where a charge applies, we will tell you what it is and agree it with you before
              we do the work. Information already on this website is always free.
            </p>
          </div>
        )}

        {slug === 'gp-earnings' && (
          <div className="mt-8 max-w-2xl">
            <h2>Declaration for {compliance.gpEarningsYear}</h2>
            <dl className="mt-4 divide-y divide-nhs-grey-4 border-y border-nhs-grey-4">
              <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3">
                <dt className="font-semibold">Average pay before tax and National Insurance</dt>
                <dd className="text-lg font-bold">{compliance.gpEarningsAmount}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3">
                <dt className="font-semibold">Full time GPs</dt>
                <dd>{compliance.gpEarningsFullTime}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3">
                <dt className="font-semibold">Part time GPs</dt>
                <dd>{compliance.gpEarningsPartTime}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3">
                <dt className="font-semibold">Locum GPs (6 months or more)</dt>
                <dd>{compliance.gpEarningsLocum}</dd>
              </div>
            </dl>
            {compliance.gpEarningsStatement && (
              <p className="mt-4 text-[0.9rem] text-nhs-grey-1">
                {compliance.gpEarningsStatement}
              </p>
            )}
          </div>
        )}

        <p className="mt-12 border-t border-nhs-grey-4 pt-6 text-[0.95rem]">
          <Link href={`${base}/about`} className="ss-link">
            Back to About the surgery
          </Link>
        </p>
      </div>
    </>
  )
}
