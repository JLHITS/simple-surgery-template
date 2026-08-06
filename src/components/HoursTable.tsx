import {
  buildTimeline,
  formatDate,
  formatTime,
  summariseHours,
  upcomingClosures,
  type TimelineDay,
} from '@/lib/hours'
import type { Closure, OpeningDay, SiteConfig } from '@/lib/config/types'
import { Icon } from './Icon'

type ExtendedAccess = SiteConfig['hours']['extendedAccess']

/**
 * The week at a glance.
 *
 * Purely visual, and hidden from screen readers, because every time it shows is
 * also written out in the tables beneath it. Its job is to answer "can I be
 * seen on Saturday?" in about half a second, which a list of times cannot do.
 *
 * Core and extended hours are told apart by two things, not one: extended
 * access is both a lighter tone and a striped fill. Anyone who cannot
 * distinguish the two colours can still distinguish solid from striped, which
 * is what WCAG 1.4.1 asks for.
 */
function WeekTimeline({
  days,
  extended,
}: {
  days: OpeningDay[]
  extended: OpeningDay[] | null
}) {
  const timeline = buildTimeline(days, extended)
  if (!timeline.days.length) return null

  const stripes =
    'repeating-linear-gradient(45deg, var(--accent) 0 3px, transparent 3px 7px)'

  return (
    <div className="mb-7" aria-hidden="true">
      <div className="grid gap-1.5">
        {timeline.days.map((day: TimelineDay) => {
          const isEmpty = !day.core && !day.extended
          return (
            <div key={day.day} className="flex items-center gap-3">
              <span
                className={`w-9 shrink-0 text-[0.7rem] font-semibold uppercase tracking-wide ${
                  isEmpty ? 'text-nhs-grey-3' : 'text-nhs-grey-1'
                }`}
              >
                {day.short}
              </span>

              <span className="relative h-4 flex-1 overflow-hidden rounded-full bg-nhs-grey-5">
                {day.core && (
                  <span
                    className="absolute inset-y-0 rounded-full accent-bg"
                    style={{ left: `${day.core.start}%`, width: `${day.core.width}%` }}
                  />
                )}
                {day.extended && (
                  <span
                    className="absolute inset-y-0 rounded-full border-2 opacity-70"
                    style={{
                      left: `${day.extended.start}%`,
                      width: `${day.extended.width}%`,
                      backgroundImage: stripes,
                      borderColor: 'var(--accent)',
                    }}
                  />
                )}
              </span>
            </div>
          )
        })}
      </div>

      {/* Hour marks, aligned with the tracks above. */}
      <div className="mt-2 flex items-center gap-3">
        <span className="w-9 shrink-0" />
        <span className="relative h-4 flex-1">
          {timeline.ticks.map((tick, i) => {
            // Centring every label on its mark clips the first and last ones in
            // half, because they sit at 0% and 100% of the track. The outer two
            // are aligned to their edge instead. Most visible on a phone, where
            // the track is narrowest.
            const isFirst = i === 0
            const isLast = i === timeline.ticks.length - 1
            const align = isFirst
              ? 'translate-x-0'
              : isLast
                ? '-translate-x-full'
                : '-translate-x-1/2'

            return (
              <span
                key={tick.hour}
                className={`absolute top-0 text-[0.65rem] text-nhs-grey-2 ${align}`}
                style={{ left: `${tick.position}%` }}
              >
                {tick.label}
              </span>
            )
          })}
        </span>
      </div>

      {timeline.hasExtended && (
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.75rem] text-nhs-grey-1">
          <span className="flex items-center gap-2">
            <span className="h-3 w-6 rounded-full accent-bg" />
            Surgery open
          </span>
          <span className="flex items-center gap-2">
            <span
              className="h-3 w-6 rounded-full border-2 opacity-70"
              style={{ backgroundImage: stripes, borderColor: 'var(--accent)' }}
            />
            Extended access
          </span>
        </div>
      )}
    </div>
  )
}

/** Grouped, plain text hours. This is the accessible source of truth. */
function HoursList({ days }: { days: OpeningDay[] }) {
  return (
    <dl className="divide-y divide-nhs-grey-4 border-y border-nhs-grey-4">
      {summariseHours(days).map((row) => (
        <div key={row.label} className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3">
          <dt className="font-semibold text-nhs-black">{row.label}</dt>
          <dd className={row.closed ? 'text-nhs-grey-1' : 'text-nhs-black'}>{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Extended access, presented as a distinct offer rather than as more opening
 * hours. These appointments are frequently at a different site and must be
 * booked in advance, so the panel leads with where and how, not just when.
 */
function ExtendedAccessPanel({ extended }: { extended: ExtendedAccess }) {
  const open = extended.days.filter((d) => !d.closed)
  if (!open.length) return null

  return (
    <section
      aria-labelledby="extended-access"
      className="mt-7 radius-card border border-nhs-grey-4 bg-nhs-grey-5 p-5"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="accent-text" aria-hidden="true">
          <Icon name="clock" size={20} />
        </span>
        <h3 id="extended-access" className="text-base font-bold">
          {extended.title}
        </h3>
        <span className="rounded-full border border-[color:var(--accent)] px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide accent-text">
          Extended access
        </span>
      </div>

      {extended.description && (
        <p className="mt-2.5 text-[0.95rem] leading-relaxed text-nhs-grey-1">
          {extended.description}
        </p>
      )}

      <dl className="mt-4 divide-y divide-nhs-grey-4 border-y border-nhs-grey-4">
        {summariseHours(extended.days)
          .filter((row) => !row.closed)
          .map((row) => (
            <div
              key={row.label}
              className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-2.5"
            >
              <dt className="font-semibold text-nhs-black">{row.label}</dt>
              <dd className="text-nhs-black">{row.value}</dd>
            </div>
          ))}
      </dl>

      <div className="mt-4 grid gap-2 text-[0.9rem]">
        {extended.location && (
          <p className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0 text-nhs-grey-1" aria-hidden="true">
              <Icon name="pin" size={16} />
            </span>
            <span>
              <span className="font-semibold">Where: </span>
              {extended.location}
            </span>
          </p>
        )}
        {extended.bookingNote && (
          <p className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0 text-nhs-grey-1" aria-hidden="true">
              <Icon name="calendar" size={16} />
            </span>
            <span>
              <span className="font-semibold">How to book: </span>
              {extended.bookingNote}
            </span>
          </p>
        )}
      </div>
    </section>
  )
}

/**
 * Extended access, summarised for the home page.
 *
 * The full panel lives on the contact page. This is the short version: when,
 * where, and the fact that it must be booked ahead.
 */
export function ExtendedAccessCard({ extended }: { extended: ExtendedAccess }) {
  const rows = summariseHours(extended.days).filter((row) => !row.closed)
  if (!rows.length) return null

  return (
    <section
      aria-labelledby="home-extended"
      className="radius-card border border-nhs-grey-4 bg-nhs-grey-5 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="accent-text" aria-hidden="true">
          <Icon name="clock" size={20} />
        </span>
        <h3 id="home-extended" className="text-base font-bold">
          {extended.title}
        </h3>
      </div>

      {extended.description && (
        <p className="mt-2.5 text-[0.95rem] leading-relaxed text-nhs-grey-1">
          {extended.description}
        </p>
      )}

      <dl className="mt-4 divide-y divide-nhs-grey-4 border-y border-nhs-grey-4">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-2.5">
            <dt className="font-semibold">{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>

      {extended.location && (
        <p className="mt-4 flex items-start gap-2 text-[0.9rem]">
          <span className="mt-0.5 shrink-0 text-nhs-grey-1" aria-hidden="true">
            <Icon name="pin" size={16} />
          </span>
          <span>
            <span className="font-semibold">Where: </span>
            {extended.location}
          </span>
        </p>
      )}
    </section>
  )
}

/** Shown in place of extended access when a practice does not offer it. */
export function OutOfHoursCard({ info }: { info: string }) {
  return (
    <section
      aria-labelledby="home-out-of-hours"
      className="radius-card border border-nhs-grey-4 bg-nhs-grey-5 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="accent-text" aria-hidden="true">
          <Icon name="clock" size={20} />
        </span>
        <h3 id="home-out-of-hours" className="text-base font-bold">
          When we are closed
        </h3>
      </div>
      <p className="mt-2.5 text-[0.95rem] leading-relaxed">{info}</p>
      <p className="mt-3 text-[0.95rem]">
        For a life threatening emergency, call <strong>999</strong>.
      </p>
    </section>
  )
}

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
  extended,
  compact = false,
  showTimeline = true,
}: {
  days: OpeningDay[]
  closures: Closure[]
  notes?: string
  extended?: ExtendedAccess
  compact?: boolean
  /** The week-at-a-glance chart. Practices can turn it off in settings. */
  showTimeline?: boolean
}) {
  const upcoming = upcomingClosures(closures).slice(0, compact ? 2 : 6)
  const showExtended = Boolean(extended?.enabled && extended.days.some((d) => !d.closed))

  return (
    <div>
      {showTimeline && (
        <WeekTimeline days={days} extended={showExtended ? extended!.days : null} />
      )}

      <HoursList days={days} />

      {notes && <p className="mt-3 text-[0.95rem] text-nhs-grey-1">{notes}</p>}

      {showExtended && <ExtendedAccessPanel extended={extended!} />}

      {upcoming.length > 0 && (
        <div className="mt-7">
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
