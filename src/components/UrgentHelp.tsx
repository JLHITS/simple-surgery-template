import type { SiteConfig } from '@/lib/config/types'
import { Icon } from './Icon'

/**
 * Urgent care signposting.
 *
 * Always present, never behind a click, and placed before anything else on the
 * page. If someone is having a heart attack while reading a GP website, the
 * only thing that matters is that "call 999" is the first thing they see.
 */
export function UrgentHelp({ urgent }: { urgent: SiteConfig['urgent'] }) {
  return (
    <section aria-labelledby="urgent-help" className="border-t-4 border-nhs-red bg-nhs-grey-5">
      <div className="ss-container py-8">
        <h2 id="urgent-help" className="flex items-center gap-2 text-xl">
          <Icon name="alert" size={22} className="text-nhs-red" />
          If you need help urgently
        </h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="radius-card border-2 border-nhs-red bg-white p-5">
            <p className="text-2xl font-bold text-nhs-red">Call 999</p>
            <p className="mt-2 text-[0.95rem] leading-relaxed">{urgent.emergencyText}</p>
            {urgent.lifeThreateningText && (
              <p className="mt-2 text-[0.9rem] leading-relaxed text-nhs-grey-1">
                {urgent.lifeThreateningText}
              </p>
            )}
          </div>

          <div className="radius-card border border-nhs-grey-4 bg-white p-5">
            <p className="text-2xl font-bold text-nhs-black">Call 111</p>
            <p className="mt-2 text-[0.95rem] leading-relaxed">{urgent.nhs111Text}</p>
            <p className="mt-3">
              <a
                href="https://111.nhs.uk"
                className="ss-link font-semibold"
              >
                Get help from 111 online
              </a>
            </p>
          </div>

          <div className="radius-card border border-nhs-grey-4 bg-white p-5">
            <p className="text-2xl font-bold text-nhs-black">Ask a pharmacist</p>
            <p className="mt-2 text-[0.95rem] leading-relaxed">{urgent.pharmacyText}</p>
            <p className="mt-3">
              <a
                href="https://www.nhs.uk/service-search/pharmacy/find-a-pharmacy"
                className="ss-link font-semibold"
              >
                Find a pharmacy near you
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
