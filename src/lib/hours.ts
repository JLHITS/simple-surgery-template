import type { Closure, OpeningDay, Weekday } from '@/lib/config/types'

/**
 * Opening hours logic.
 *
 * All functions are pure and take the current time as an argument, so the same
 * code runs on the server for the hours table and in the browser for the live
 * "open now" badge. Everything is evaluated in Europe/London, not the visitor's
 * timezone, because a patient in Spain still wants to know if the surgery in
 * Manchester is open.
 */

export const WEEKDAYS: Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

const TZ = 'Europe/London'

interface LocalNow {
  /** "YYYY-MM-DD" in Europe/London. */
  date: string
  weekday: Weekday
  /** Minutes since midnight. */
  minutes: number
}

/** Converts an absolute instant into Europe/London wall clock parts. */
export function londonNow(now: Date = new Date()): LocalNow {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''

  const weekday = get('weekday').toLowerCase() as Weekday
  const hour = Number(get('hour')) % 24
  const minute = Number(get('minute'))

  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    weekday: WEEKDAYS.includes(weekday) ? weekday : 'monday',
    minutes: hour * 60 + minute,
  }
}

function toMinutes(time: string): number {
  const [h, m] = (time || '00:00').split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0
  return h * 60 + m
}

/** "08:00" to "8am", "18:30" to "6:30pm". Matches how NHS pages write times. */
export function formatTime(time: string): string {
  const [hRaw, mRaw] = (time || '00:00').split(':').map(Number)
  const h = Number.isFinite(hRaw) ? hRaw : 0
  const m = Number.isFinite(mRaw) ? mRaw : 0
  const suffix = h >= 12 ? 'pm' : 'am'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${hour12}${suffix}` : `${hour12}:${String(m).padStart(2, '0')}${suffix}`
}

export function formatDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00Z`)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatDateShort(iso: string): string {
  const date = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export interface OpenState {
  open: boolean
  /** Short sentence explaining the state, e.g. "Opens at 8am tomorrow". */
  detail: string
  /** Set when today is a listed closure. */
  closure?: Closure
}

/** Closures that have not yet passed, soonest first. */
export function upcomingClosures(closures: Closure[], now: Date = new Date()): Closure[] {
  const today = londonNow(now).date
  return [...closures]
    .filter((c) => c.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
}

function dayFor(days: OpeningDay[], weekday: Weekday): OpeningDay | undefined {
  return days.find((d) => d.day === weekday)
}

function nextOpenDescription(days: OpeningDay[], from: Weekday): string {
  const startIndex = WEEKDAYS.indexOf(from)
  for (let offset = 1; offset <= 7; offset += 1) {
    const weekday = WEEKDAYS[(startIndex + offset) % 7]
    const day = dayFor(days, weekday)
    if (day && !day.closed) {
      const when = offset === 1 ? 'tomorrow' : WEEKDAY_LABELS[weekday]
      return `Opens ${formatTime(day.open)} ${when}`
    }
  }
  return 'Opening times are not set'
}

/**
 * Works out whether the practice is open right now, taking listed closures
 * and midday breaks into account.
 */
export function getOpenState(
  days: OpeningDay[],
  closures: Closure[],
  now: Date = new Date(),
): OpenState {
  const { date, weekday, minutes } = londonNow(now)
  const today = dayFor(days, weekday)
  const closure = closures.find((c) => c.date === date)

  if (closure?.allDay) {
    return { open: false, detail: `Closed today for ${closure.reason.toLowerCase()}`, closure }
  }

  if (!today || today.closed) {
    return { open: false, detail: nextOpenDescription(days, weekday) }
  }

  let open = toMinutes(today.open)
  let close = toMinutes(today.close)

  // A part day closure overrides the normal hours for that date.
  if (closure && !closure.allDay) {
    const from = closure.from ? toMinutes(closure.from) : open
    const to = closure.to ? toMinutes(closure.to) : close
    if (from <= open && to >= close) {
      return { open: false, detail: `Closed today for ${closure.reason.toLowerCase()}`, closure }
    }
    if (from <= open) open = to
    else close = from
  }

  if (minutes < open) {
    return { open: false, detail: `Opens at ${formatTime(minutesToTime(open))} today`, closure }
  }

  if (minutes >= close) {
    return { open: false, detail: nextOpenDescription(days, weekday), closure }
  }

  if (today.breakStart && today.breakEnd) {
    const bStart = toMinutes(today.breakStart)
    const bEnd = toMinutes(today.breakEnd)
    if (minutes >= bStart && minutes < bEnd) {
      return { open: false, detail: `Reopens at ${formatTime(today.breakEnd)}`, closure }
    }
  }

  return { open: true, detail: `Open until ${formatTime(minutesToTime(close))}`, closure }
}

function minutesToTime(total: number): string {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Groups consecutive days with identical hours so the table reads
 * "Monday to Friday 8am to 6:30pm" rather than five near-identical rows.
 */
export interface HoursRow {
  label: string
  value: string
  closed: boolean
}

export function summariseHours(days: OpeningDay[]): HoursRow[] {
  const ordered = WEEKDAYS.map((w) => dayFor(days, w)).filter(Boolean) as OpeningDay[]
  const rows: HoursRow[] = []

  const describe = (day: OpeningDay) => {
    if (day.closed) return 'Closed'
    const core = `${formatTime(day.open)} to ${formatTime(day.close)}`
    if (day.breakStart && day.breakEnd) {
      return `${formatTime(day.open)} to ${formatTime(day.breakStart)}, ${formatTime(day.breakEnd)} to ${formatTime(day.close)}`
    }
    return core
  }

  let runStart = 0
  for (let i = 0; i <= ordered.length; i += 1) {
    const current = ordered[i]
    const previous = ordered[runStart]
    const same = current && previous && describe(current) === describe(previous)
    if (same) continue

    const runEnd = i - 1
    const label =
      runStart === runEnd
        ? WEEKDAY_LABELS[previous.day]
        : `${WEEKDAY_LABELS[previous.day]} to ${WEEKDAY_LABELS[ordered[runEnd].day]}`

    rows.push({ label, value: describe(previous), closed: previous.closed })
    runStart = i
  }

  return rows
}
