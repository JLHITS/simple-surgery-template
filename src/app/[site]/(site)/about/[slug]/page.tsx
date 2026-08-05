import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Callout, PageHeader } from '@/components/ui'
import { getSiteConfig } from '@/lib/config'
import { siteBase } from '@/lib/routing'
import { markdownToPlainText, renderMarkdown } from '@/lib/markdown'

interface Props {
  params: Promise<{ site: string; slug: string }>
}

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

  const { compliance, practice } = config

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
        <div className="ss-prose">{renderMarkdown(page.body)}</div>

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
