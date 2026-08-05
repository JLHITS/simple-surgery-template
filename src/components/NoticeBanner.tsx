import Link from 'next/link'
import type { Notice } from '@/lib/config/types'
import { renderMarkdown } from '@/lib/markdown'
import { Icon } from './Icon'

const TONES = {
  info: 'border-l-nhs-blue bg-nhs-grey-5',
  warning: 'border-l-nhs-yellow bg-[#fff9e6]',
  urgent: 'border-l-nhs-red bg-[#fdeceb]',
} as const

/**
 * The practice notice.
 *
 * Sits inline at the top of the page content, never as an overlay or pop-up.
 * NHS testing found more than a quarter of patients who met an overlay on
 * arrival could not get past it, and the information disappears the moment it
 * is dismissed.
 *
 * The expiry date does the tidying up. Staff set "flu clinics open until 31
 * December" once and the banner removes itself, which is the difference between
 * a site that looks current and one that still says "Merry Christmas" in March.
 */
export function NoticeBanner({ notice }: { notice: Notice }) {
  if (!notice.enabled || !notice.title) return null

  if (notice.expiresOn) {
    const today = new Date().toISOString().slice(0, 10)
    if (notice.expiresOn < today) return null
  }

  const tone = TONES[notice.level] ?? TONES.info
  const isExternal = notice.linkUrl ? /^https?:\/\//.test(notice.linkUrl) : false

  return (
    <div className="ss-container pt-6">
      <div className={`border-l-8 ${tone} p-4 sm:p-5`} role="region" aria-label="Practice notice">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0 text-nhs-grey-1" aria-hidden="true">
            <Icon name={notice.level === 'info' ? 'info' : 'alert'} size={22} />
          </span>
          <div className="min-w-0">
            <p className="text-lg font-bold">{notice.title}</p>
            {notice.body && (
              // Rendered through the Markdown subset so a practice can put a
              // link in the message. The renderer only ever emits React
              // elements and rejects any scheme outside its allowlist, so this
              // cannot become an injection route.
              <div className="ss-prose mt-1 text-[0.98rem]">
                {renderMarkdown(notice.body, { headingLevel: 3 })}
              </div>
            )}
            {notice.linkUrl && notice.linkText && (
              <p className="mt-2">
                {isExternal ? (
                  <a
                    href={notice.linkUrl}
                    className="ss-link font-semibold"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {notice.linkText}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : (
                  <Link href={notice.linkUrl} className="ss-link font-semibold">
                    {notice.linkText}
                  </Link>
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
