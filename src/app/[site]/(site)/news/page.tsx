import type { Metadata } from 'next'
import { PageHeader } from '@/components/ui'
import { NewsList } from '@/components/NewsList'
import { getSiteConfig } from '@/lib/config'
import { siteBase } from '@/lib/routing'
import { formatDateShort } from '@/lib/hours'
import { renderMarkdown } from '@/lib/markdown'
import { getNationalNews } from '@/lib/news'

export const metadata: Metadata = {
  title: 'News',
  description: 'Practice updates and the latest national news from the NHS.',
}

interface Props {
  params: Promise<{ site: string }>
}

/**
 * News.
 *
 * The point of this page is that it stays current without anyone at the
 * practice doing anything. National NHS news is pulled from NHS England's feed
 * and refreshed hourly. Practice notices sit above it when there are any, and
 * the page still looks alive when there are none.
 */
export default async function NewsPage({ params }: Props) {
  const { site } = await params
  const base = siteBase(site)
  const { news } = await getSiteConfig(site)

  const national = news.nhsFeedEnabled ? await getNationalNews(news.feedUrls, news.feedCount) : []

  const practiceNews = [...news.practiceNews].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return (b.date || '').localeCompare(a.date || '')
  })

  return (
    <>
      <PageHeader
        title="News"
        intro="Updates from the practice, and the latest national news from the NHS."
      />

      <div className="ss-container py-10">
        {practiceNews.length > 0 && (
          <section aria-labelledby="practice-news" className="mb-14">
            <h2 id="practice-news">From the practice</h2>
            <ul className="mt-5 grid gap-4">
              {practiceNews.map((item) => (
                <li
                  key={item.id}
                  className="radius-card border border-nhs-grey-4 bg-white p-5 sm:p-6"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8rem] font-semibold uppercase tracking-wide text-nhs-grey-1">
                    {item.date && (
                      <time dateTime={item.date}>{formatDateShort(item.date)}</time>
                    )}
                    {item.pinned && (
                      <span className="accent-text">&middot; Pinned</span>
                    )}
                  </div>
                  <h3 className="mt-2 text-xl">{item.title}</h3>
                  <div className="ss-prose mt-2 text-[0.98rem]">
                    {renderMarkdown(item.body, { headingLevel: 3 })}
                  </div>
                  {item.linkUrl && (
                    <p className="mt-3">
                      <a
                        href={item.linkUrl}
                        className="ss-link font-semibold"
                        {...(/^https?:\/\//.test(item.linkUrl)
                          ? { target: '_blank', rel: 'noopener noreferrer' }
                          : {})}
                      >
                        Read more
                      </a>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {news.nhsFeedEnabled && (
          <section aria-labelledby="national-news">
            <h2 id="national-news">National NHS news</h2>
            <p className="mt-2 max-w-2xl text-nhs-grey-1">
              Published by NHS England. These links open on the NHS website.
            </p>
            <div className="mt-5">
              <NewsList items={national} />
            </div>
          </section>
        )}

        {!news.nhsFeedEnabled && practiceNews.length === 0 && (
          <p className="text-nhs-grey-1">There is no news at the moment.</p>
        )}
      </div>
    </>
  )
}
