import { formatDate, formatTime, summariseHours, upcomingClosures } from '@/lib/hours'
import type { Closure, OpeningDay } from '@/lib/config/types'
import { Icon } from './Icon'

/**
 * Opening hours.
 *
 * Consecutive days with identical hours collapse into one row, so a normal
 * practice shows two lines rather than seven. Upcoming closures are listed
 * separately and drop off the page by themselves once the date passes, which
 * means nobody has to remember to delete last Christmas.
 */
export function HoursTable({
  days,
  closures,
  notes,
  compact = false,
}: {
  days: OpeningDay[]
  closures: Closure[]
  notes?: string
  compact?: boolean
}) {
  const rows = summariseHours(days)
  const upcoming = upcomingClosures(closures).slice(0, compact ? 2 : 6)

  return (
    <div>
      <dl className="divide-y divide-nhs-grey-4 border-y border-nhs-grey-4">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3">
            <dt className="font-semibold text-nhs-black">{row.label}</dt>
            <dd className={row.closed ? 'text-nhs-grey-1' : 'text-nhs-black'}>{row.value}</dd>
          </div>
        ))}
      </dl>

      {notes && <p className="mt-3 text-[0.95rem] text-nhs-grey-1">{notes}</p>}

      {upcoming.length > 0 && (
        <div className="mt-6">
          <h3 className="flex items-center gap-2 text-base font-bold">
            <Icon name="calendar" size={18} className="accent-text" />
            Upcoming closures
          </h3>
          <ul className="mt-3 divide-y divide-nhs-grey-4 border-y border-nhs-grey-4">
            {upcoming.map((closure: Closure) => (
              <li
                key={`${closure.date}-${closure.reason}`}
                className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3"
              >
                <span className="font-semibold">{formatDate(closure.date)}</span>
                <span className="text-nhs-grey-1">
                  {closure.reason}
                  {!closure.allDay && closure.from && closure.to && (
                    <span className="text-nhs-black">
                      {' '}
                      &middot; closed {formatTime(closure.from)} to {formatTime(closure.to)}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
