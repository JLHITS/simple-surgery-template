import Link from 'next/link'
import type { SiteConfig } from '@/lib/config/types'
import { formatDateShort } from '@/lib/hours'
import { nhsProfileUrl, practiceSites } from '@/lib/practice'
import { NhsLogo } from './NhsLogo'
import { SimpleSurgeryMark } from './SimpleSurgeryMark'

/**
 * Site footer.
 *
 * Carries the statutory links every practice must publish, plus the NHS logo
 * again for people who scroll straight past the header. The "last updated" date
 * is not decoration: the GP contract requires practice websites to be reviewed
 * at least once a year, and showing the date makes that visible to patients,
 * inspectors and the practice itself.
 */
export function Footer({ config, base }: { config: SiteConfig; base: string }) {
  const { practice, pages, compliance, advanced } = config
  const footerPages = [...pages]
    .filter((p) => p.showInFooter)
    .sort((a, b) => a.order - b.order)

  // Every surgery's address, each under its own name once there is more
  // than one. A patient checking the footer for "which one is mine" should
  // not have to go to the contact page to find out.
  const sites = practiceSites(practice).filter((site) => site.addressLines.length > 0)
  const several = sites.length > 1

  return (
    <footer className="mt-16 bg-nhs-grey-5">
      {/* NHS Blue, or the scheme's own stripe: the rainbow, or purple and pink. */}
      <div className="ss-footer-stripe" aria-hidden="true" />
      <div className="ss-container py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h2 className="text-base font-bold">{practice.name}</h2>
            {sites.map((site) => (
              <address
                key={site.id}
                className="mt-3 break-words text-[0.95rem] not-italic leading-relaxed text-nhs-grey-1"
              >
                {several && <span className="block font-semibold text-nhs-black">{site.label}</span>}
                {site.addressLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
                {/* With several sites each number sits with its own address,
                    so the main number is not read as the last branch's. */}
                {several && (site.main ? practice.phone : site.phone) && (
                  <a
                    href={`tel:${(site.main ? practice.phone : site.phone).replace(/\s+/g, '')}`}
                    className="ss-link block"
                  >
                    {site.main ? practice.phone : site.phone}
                  </a>
                )}
              </address>
            ))}
            {(!several || !sites.some((site) => site.main)) && practice.phone && (
              <p className="mt-3 text-[0.95rem]">
                <a href={`tel:${practice.phone.replace(/\s+/g, '')}`} className="ss-link">
                  {practice.phone}
                </a>
              </p>
            )}
            {practice.email && (
              <p className={`text-[0.95rem] ${several ? 'mt-3' : ''}`}>
                <a href={`mailto:${practice.email}`} className="ss-link break-all">
                  {practice.email}
                </a>
              </p>
            )}
          </div>

          <nav aria-label="Patient services">
            <h2 className="text-base font-bold">Patients</h2>
            <ul className="mt-3 grid gap-2 text-[0.95rem]">
              <li>
                <Link href={`${base}/appointments`} className="ss-link">
                  Appointments
                </Link>
              </li>
              <li>
                <Link href={`${base}/prescriptions`} className="ss-link">
                  Prescriptions
                </Link>
              </li>
              <li>
                <Link href={`${base}/services/register`} className="ss-link">
                  Register with the surgery
                </Link>
              </li>
              <li>
                <Link href={`${base}/services/test-results`} className="ss-link">
                  Test results
                </Link>
              </li>
              <li>
                <Link href={`${base}/news`} className="ss-link">
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
                  <Link href={`${base}/about/${page.slug}`} className="ss-link">
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
                >
                  NHS website
                </a>
              </li>
              <li>
                <a
                  href="https://111.nhs.uk"
                  className="ss-link"
                >
                  NHS 111 online
                </a>
              </li>
              {practice.odsCode && (
                <li>
                  <a
                    href={nhsProfileUrl(practice)}
                    className="ss-link"
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
            <p className="flex items-center gap-1.5">
              <span>Built with</span>
              <a
                href="https://www.simplesurgery.co"
                className="ss-link inline-flex items-center gap-1.5"
              >
                <SimpleSurgeryMark size={14} />
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
