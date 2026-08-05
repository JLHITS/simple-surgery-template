import type { Metadata } from 'next'
import Link from 'next/link'
import { ActionCard, CardGrid, PageHeader, Section, SectionHeading } from '@/components/ui'
import { Icon } from '@/components/Icon'
import { getSiteConfig } from '@/lib/config'
import { renderMarkdown } from '@/lib/markdown'

export const metadata: Metadata = {
  title: 'About the surgery',
  description:
    'Our team, our CQC rating, practice policies, complaints, privacy, accessibility and the information we are required to publish.',
}

/**
 * About the surgery.
 *
 * Doubles as the index for every statutory page. Practices are inspected on
 * whether this information is published and findable, so it is grouped in one
 * place rather than scattered through the footer.
 */
export default async function AboutPage() {
  const config = await getSiteConfig()
  const { practice, team, pages, compliance, content, advanced } = config

  const infoPages = [...pages].sort((a, b) => a.order - b.order)
  const groups = Array.from(new Set(team.map((m) => m.group)))

  return (
    <>
      <PageHeader title="About the surgery" intro={content.aboutIntro} />

      <div className="ss-container py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {compliance.cqcRating && (
            <div className="radius-card border border-nhs-grey-4 p-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-nhs-grey-1">
                CQC rating
              </p>
              <p className="mt-1 text-2xl font-bold">{compliance.cqcRating}</p>
              {compliance.cqcReportUrl && (
                <a
                  href={compliance.cqcReportUrl}
                  className="ss-link mt-1 inline-block text-sm"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Read our report
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              )}
            </div>
          )}

          {practice.odsCode && (
            <div className="radius-card border border-nhs-grey-4 p-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-nhs-grey-1">
                Practice code
              </p>
              <p className="mt-1 text-2xl font-bold">{practice.odsCode}</p>
              <a
                href={`https://www.nhs.uk/services/gp-surgery/${practice.odsCode}`}
                className="ss-link mt-1 inline-block text-sm"
                target="_blank"
                rel="noopener noreferrer"
              >
                Our NHS profile
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
          )}

          {compliance.pcnName && (
            <div className="radius-card border border-nhs-grey-4 p-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-nhs-grey-1">
                Primary Care Network
              </p>
              <p className="mt-1 text-base font-bold leading-snug">{compliance.pcnName}</p>
            </div>
          )}

          {compliance.icbName && (
            <div className="radius-card border border-nhs-grey-4 p-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-nhs-grey-1">
                Commissioned by
              </p>
              <p className="mt-1 text-base font-bold leading-snug">{compliance.icbName}</p>
            </div>
          )}
        </div>

        {content.aboutBody && (
          <div className="ss-prose mt-10">{renderMarkdown(content.aboutBody)}</div>
        )}
      </div>

      {advanced.showTeam && team.length > 0 && (
        <Section tint>
          <SectionHeading
            title="Our team"
            description="Not everyone you see will be a doctor. Our nurses, pharmacists and other staff can treat many problems."
          />

          <div className="grid gap-10">
            {groups.map((group) => (
              <div key={group}>
                <h3 className="mb-4 text-lg">{group}</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {team
                    .filter((member) => member.group === group)
                    .map((member) => (
                      <div
                        key={member.id}
                        className="radius-card border border-nhs-grey-4 bg-white p-5"
                      >
                        <div className="flex items-start gap-4">
                          {member.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={member.photoUrl}
                              alt=""
                              className="h-14 w-14 shrink-0 rounded-full object-cover"
                            />
                          ) : (
                            <span
                              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-nhs-grey-5 text-nhs-grey-1"
                              aria-hidden="true"
                            >
                              <Icon name="stethoscope" size={22} />
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold leading-snug">{member.name}</p>
                            <p className="text-[0.9rem] text-nhs-grey-1">{member.role}</p>
                          </div>
                        </div>
                        {member.bio && (
                          <p className="mt-3 text-[0.95rem] leading-relaxed">{member.bio}</p>
                        )}
                        {member.availability && (
                          <p className="mt-2 text-[0.9rem] text-nhs-grey-1">
                            Usually here: {member.availability}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section>
        <SectionHeading
          title="Practice information"
          description="The policies and statements we publish, including everything the NHS contract requires."
        />
        <CardGrid columns={3}>
          {infoPages.map((page) => (
            <ActionCard
              key={page.id}
              href={`/about/${page.slug}`}
              title={page.title}
              description={page.summary}
              icon="note"
            />
          ))}
        </CardGrid>

        <p className="mt-8 text-[0.95rem] text-nhs-grey-1">
          Looking for something else?{' '}
          <Link href="/contact" className="ss-link">
            Contact the surgery
          </Link>{' '}
          and we will help.
        </p>
      </Section>
    </>
  )
}
