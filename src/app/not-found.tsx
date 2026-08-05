import Link from 'next/link'
import { NhsLogo } from '@/components/NhsLogo'

/**
 * The global 404, for URLs that match no practice at all.
 *
 * There is no tenant here by definition, so there is no practice name, no
 * phone number and no branding to show. Anyone who reaches this typed a
 * practice code that does not exist, so the useful thing is to point them at
 * the NHS service that will find their real surgery.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-lg">
        <NhsLogo height={26} />

        <h1 className="mt-8 text-3xl">Page not found</h1>
        <p className="mt-4 text-lg leading-relaxed text-nhs-grey-1">
          We cannot find a practice website at that address. It may have moved, or the address
          may have been typed incorrectly.
        </p>

        <div className="mt-8 border-l-8 border-[color:var(--accent)] bg-nhs-grey-5 p-5">
          <h2 className="text-lg font-bold">Looking for your GP surgery?</h2>
          <p className="mt-2 text-[0.98rem] leading-relaxed">
            Find it on the NHS website, which lists every GP practice in England.
          </p>
          <p className="mt-3">
            <a
              href="https://www.nhs.uk/service-search/find-a-gp"
              className="ss-link font-semibold"
              target="_blank"
              rel="noopener noreferrer"
            >
              Find a GP on nhs.uk
            </a>
          </p>
        </div>

        <p className="mt-8 text-[0.9rem] text-nhs-grey-1">
          If you need medical help now, call <strong>111</strong>. For a life threatening
          emergency, call <strong>999</strong>.
        </p>

        <p className="mt-6 text-[0.9rem]">
          <Link href="/" className="ss-link">
            Back to the start
          </Link>
        </p>
      </div>
    </main>
  )
}
