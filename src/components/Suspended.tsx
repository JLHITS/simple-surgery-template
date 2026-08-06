import { NhsLogo } from './NhsLogo'

/**
 * Shown when a practice's subscription has lapsed.
 *
 * Deliberately not a billing page. A patient who lands here was looking for
 * their GP surgery, so the first thing they get is where to go instead: 111,
 * 999, and a pharmacist. The practice's own content is untouched and comes
 * straight back the moment payment succeeds.
 */
export function Suspended({ practiceName }: { practiceName: string }) {
  return (
    <main id="main-content" className="flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-lg">
        <NhsLogo height={26} />

        <h1 className="mt-8 text-3xl">This website is temporarily unavailable</h1>
        <p className="mt-4 text-lg leading-relaxed text-nhs-grey-1">
          {practiceName ? `${practiceName}'s website` : 'This practice website'} is offline for
          the moment. The surgery itself is unaffected. Please contact them by phone as usual.
        </p>

        <div className="mt-8 border-l-8 border-nhs-red bg-nhs-grey-5 p-5">
          <h2 className="text-lg font-bold">If you need medical help now</h2>
          <ul className="mt-3 grid gap-2 text-[0.98rem]">
            <li>
              For a life threatening emergency, call <strong>999</strong>.
            </li>
            <li>
              For urgent help that is not an emergency, call <strong>111</strong> or go to{' '}
              <a
                href="https://111.nhs.uk"
                className="ss-link"
              >
                111.nhs.uk
              </a>
              .
            </li>
            <li>
              A pharmacist can help with many everyday illnesses.{' '}
              <a
                href="https://www.nhs.uk/service-search/pharmacy/find-a-pharmacy"
                className="ss-link"
              >
                Find a pharmacy
              </a>
              .
            </li>
          </ul>
        </div>

        <p className="mt-8 text-[0.9rem] text-nhs-grey-1">
          Practice staff: sign in at{' '}
          <a href="https://simplesurgery.co" className="ss-link">
            simplesurgery.co
          </a>{' '}
          to restore your website.
        </p>
      </div>
    </main>
  )
}
