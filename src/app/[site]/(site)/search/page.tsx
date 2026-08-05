import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/ui'
import { getSiteConfig } from '@/lib/config'
import { siteBase } from '@/lib/routing'
import { buildSearchIndex, search } from '@/lib/search'

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search this website.',
  robots: { index: false, follow: true },
}

interface Props {
  params: Promise<{ site: string }>
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { site } = await params
  const { q = '' } = await searchParams
  const base = siteBase(site)
  const config = await getSiteConfig(site)
  const query = q.trim()
  const results = query ? search(buildSearchIndex(config), query) : []

  return (
    <>
      <PageHeader title="Search" />

      <div className="ss-container py-10">
        <form action={`${base}/search`} method="get" role="search" className="max-w-2xl">
          <label htmlFor="q" className="mb-2 block font-bold">
            Search this website
          </label>
          <div className="flex gap-2">
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="For example, repeat prescriptions"
              className="min-h-12 w-full radius-card border-2 border-nhs-black bg-white px-4 text-base"
            />
            <button
              type="submit"
              className="min-h-12 shrink-0 radius-card accent-bg px-6 font-bold text-white"
            >
              Search
            </button>
          </div>
        </form>

        {query && (
          <div className="mt-10">
            <h2 aria-live="polite">
              {results.length === 0
                ? `No results for "${query}"`
                : `${results.length} result${results.length === 1 ? '' : 's'} for "${query}"`}
            </h2>

            {results.length === 0 ? (
              <div className="ss-prose mt-4">
                <p>Try a different word, or use one of these:</p>
                <ul>
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
                    <Link href={`${base}/services`} className="ss-link">
                      Services
                    </Link>
                  </li>
                  <li>
                    <Link href={`${base}/contact`} className="ss-link">
                      Contact us
                    </Link>
                  </li>
                </ul>
              </div>
            ) : (
              <ul className="mt-5 grid gap-3">
                {results.map((result) => (
                  <li key={result.href}>
                    <Link
                      href={result.href}
                      className="block radius-card border border-nhs-grey-4 bg-white p-5 no-underline transition-colors hover:border-nhs-black"
                    >
                      <span className="text-[0.8rem] font-semibold uppercase tracking-wide text-nhs-grey-1">
                        {result.section}
                      </span>
                      <span className="mt-1 block text-lg font-bold text-nhs-black">
                        {result.title}
                      </span>
                      {result.summary && (
                        <span className="mt-1 block text-[0.95rem] text-nhs-grey-1">
                          {result.summary}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </>
  )
}
