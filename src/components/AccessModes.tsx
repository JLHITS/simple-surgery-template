import type { SiteConfig } from '@/lib/config/types'

/**
 * When each way of contacting the practice is available.
 *
 * The 2026/27 GP contract requires practices to publish the availability of
 * walking in, telephoning and submitting an online consultation request
 * separately, each throughout core hours. Patients previously had to infer the
 * phone and online availability from the surgery's opening times, which is
 * exactly the guesswork the requirement exists to remove.
 *
 * Rendered as a definition list rather than a table: three rows of label and
 * value is a list, and it reflows on a phone without a horizontal scrollbar.
 */
export function AccessModes({
  accessModes,
  heading = 'Ways to contact us',
  className = '',
}: {
  accessModes: SiteConfig['hours']['accessModes']
  heading?: string
  className?: string
}) {
  if (!accessModes.enabled) return null

  const rows = [
    { label: 'Walk in', value: accessModes.walkIn },
    { label: 'Telephone', value: accessModes.telephone },
    { label: 'Online consultation', value: accessModes.onlineConsultation },
  ].filter((row) => row.value)

  if (!rows.length) return null

  return (
    <div className={className}>
      <h2 className="text-lg font-bold">{heading}</h2>
      <dl className="mt-3 divide-y divide-nhs-grey-4 border-y border-nhs-grey-4">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3">
            <dt className="font-semibold text-nhs-black">{row.label}</dt>
            <dd className="text-nhs-black">{row.value}</dd>
          </div>
        ))}
      </dl>
      {accessModes.note && (
        <p className="mt-3 text-[0.95rem] leading-relaxed text-nhs-grey-1">
          {accessModes.note}
        </p>
      )}
    </div>
  )
}
