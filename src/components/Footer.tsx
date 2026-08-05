import Link from 'next/link'
import type { SiteConfig } from '@/lib/config/types'
import { formatDateShort } from '@/lib/hours'
import { NhsLogo } from './NhsLogo'

/**
 * Site footer.
 *
 * Carries the statutory links every practice must publish, plus the NHS logo
 * again for people who scroll straight past the header. The "last updated" date
 * is not decoration: the GP contract requires practice websites to be reviewed
 * at least once a year, and showing the date makes that visible to patients,
 * inspectors and the practice itself.
 */
export function Footer({ config }: { config: SiteConfig }) {
  const { practice, pages, compliance, advanced } = config
  const footerPages = [...pages]
    .filter((p) => p.showInFooter)
    .sort((a, b) => a.order - b.order)

  const address = [
    practice.addressLine1,
    practice.addressLine2,
    practice.town,
    practice.county,
    practice.postcode,
  ].filter(Boolean)

  return (
    <footer className="mt-16 border-t-4 border-[color:var(--accent)] bg-nhs-grey-5">
      <div className="ss-container py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h2 className="text-base font-bold">{practice.name}</h2>
            <address className="mt-3 text-[0.95rem] not-italic leading-relaxed text-nhs-grey-1">
              {address.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
            {practice.phone && (
              <p className="mt-3 text-[0.95rem]">
                <a href={`tel:${practice.phone.replace(/\s+/g, '')}`} className="ss-link">
                  {practice.phone}
                </a>
              </p>
            )}
            {practice.email && (
              <p className="text-[0.95rem]">
                <a href={`mailto:${practice.email}`} className="ss-link">
                  {practice.email}
                </a>
              </p>
            )}
          </div>

          <nav aria-label="Patient services">
            <h2 className="text-base font-bold">Patients</h2>
            <ul className="mt-3 grid gap-2 text-[0.95rem]">
              <li>
                <Link href="/appointments" className="ss-link">
                  Appointments
                </Link>
              </li>
              <li>
                <Link href="/prescriptions" className="ss-link">
                  Prescriptions
                </Link>
              </li>
              <li>
                <Link href="/services/register" className="ss-link">
                  Register with the surgery
                </Link>
              </li>
              <li>
                <Link href="/services/test-results" className="ss-link">
                  Test results
                </Link>
              </li>
              <li>
                <Link href="/news" className="ss-link">
                  News
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Practice information">
            <h2 className="text-base font-bold">About</h2>
            <ul className="mt-3 grid gap-2 text-[0.95rem]">
              {footerPages.map((page) => (
                <li key={page.slug}>
                  <Link href={`/about/${page.slug}`} className="ss-link">
                    {page.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="text-base font-bold">NHS</h2>
            <ul className="mt-3 grid gap-2 text-[0.95rem]">
              <li>
                <a
                  href="https://www.nhs.uk"
                  className="ss-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  NHS website
                </a>
              </li>
              <li>
                <a
                  href="https://111.nhs.uk"
                  className="ss-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  NHS 111 online
                </a>
              </li>
              {practice.odsCode && (
                <li>
                  <a
                    href={`https://www.nhs.uk/services/gp-surgery/${practice.odsCode}`}
                    className="ss-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Our NHS profile page
                  </a>
                </li>
              )}
              {compliance.icbName && compliance.icbUrl && (
                <li>
                  <a
                    href={compliance.icbUrl}
                    className="ss-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {compliance.icbName}
                  </a>
                </li>
              )}
            </ul>

            {advanced.showNhsLogo && (
              <div className="mt-6">
                {/* Repeated here for anyone who scrolls straight past the header. */}
                <NhsLogo height={28} />
              </div>
            )}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-nhs-grey-4 pt-6 text-[0.85rem] text-nhs-grey-1 sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {practice.name}
            {compliance.cqcRating && (
              <>
                {' '}
                &middot; CQC rated{' '}
                {compliance.cqcReportUrl ? (
                  <a
                    href={compliance.cqcReportUrl}
                    className="ss-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {compliance.cqcRating}
                  </a>
                ) : (
                  compliance.cqcRating
                )}
              </>
            )}
            {config.updatedAt && (
              <> &middot; Page content last updated {formatDateShort(config.updatedAt)}</>
            )}
          </p>

          {advanced.showCredit && (
            <p>
              Built with{' '}
              <a
                href="https://simplesurgery.co"
                className="ss-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                Simple Surgery
              </a>
            </p>
          )}
        </div>

        {advanced.footerNote && (
          <p className="mt-4 text-[0.85rem] text-nhs-grey-1">{advanced.footerNote}</p>
        )}
      </div>
    </footer>
  )
}
