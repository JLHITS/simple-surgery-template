import type { NewsItem } from '@/lib/news'
import { formatDateShort } from '@/lib/hours'
import { Icon } from './Icon'

/**
 * National NHS news.
 *
 * Each item links out to the original NHS article rather than republishing it.
 * The source is named on every item so patients can see this is NHS England
 * writing, not the practice, and so the practice is not implicitly endorsing
 * anything it did not write.
 */
/**
 * One story as a card, for the home page grid.
 *
 * The list form works down a narrow column; this works across a full width
 * band, where three abreast reads better than three stacked.
 */
export function NewsCard({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.link}
      className="group flex h-full flex-col radius-card border border-nhs-grey-4 bg-white p-5 no-underline transition-all duration-150 hover:border-nhs-black hover:shadow-[0_2px_0_0_var(--color-nhs-black)] focus-visible:shadow-none"
    >
      <span className="flex flex-wrap items-center gap-x-2 text-[0.75rem] font-semibold uppercase tracking-wide text-nhs-grey-1">
        <span>{item.source}</span>
        {item.published && (
          <>
            <span aria-hidden="true">&middot;</span>
            <time dateTime={item.published}>{formatDateShort(item.published)}</time>
          </>
        )}
      </span>

      <span className="mt-2 block text-[1.02rem] font-bold leading-snug text-nhs-black">
        {item.title}
      </span>

      <span className="mt-auto flex items-center gap-1.5 pt-4 text-[0.85rem] font-semibold accent-text">
        Read on nhs.uk
        <Icon
          name="external"
          size={14}
          className="transition-transform duration-150 group-hover:translate-x-0.5"
        />
      </span>
    </a>
  )
}

export function NewsList({ items, compact = false }: { items: NewsItem[]; compact?: boolean }) {
  if (!items.length) {
    return (
      <p className="text-nhs-grey-1">
        National NHS news is not available right now. Visit{' '}
        <a
          href="https://www.england.nhs.uk/news/"
          className="ss-link"
        >
          the NHS England news page
        </a>{' '}
        instead.
      </p>
    )
  }

  return (
    <ul className="grid gap-3 sm:gap-4">
      {items.map((item) => (
        <li key={item.link}>
          <a
            href={item.link}
            className="group flex flex-col radius-card border border-nhs-grey-4 bg-white p-5 no-underline transition-all duration-150 hover:border-nhs-black hover:shadow-[0_2px_0_0_var(--color-nhs-black)] focus-visible:shadow-none"
          >
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8rem] font-semibold uppercase tracking-wide text-nhs-grey-1">
              <span>{item.source}</span>
              {item.published && (
                <>
                  <span aria-hidden="true">&middot;</span>
                  <time dateTime={item.published}>{formatDateShort(item.published)}</time>
                </>
              )}
            </span>

            <span className="mt-2 flex items-start gap-3">
              <span className="text-lg font-bold leading-snug text-nhs-black">
                {item.title}
              </span>
              <span className="ml-auto mt-1 shrink-0 text-nhs-grey-3 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-nhs-black">
                <Icon name="external" size={18} />
              </span>
            </span>

            {!compact && item.summary && (
              <span className="mt-2 block text-[0.95rem] leading-relaxed text-nhs-grey-1">
                {item.summary.length > 220 ? `${item.summary.slice(0, 220).trim()}...` : item.summary}
              </span>
            )}
          </a>
        </li>
      ))}
    </ul>
  )
}
