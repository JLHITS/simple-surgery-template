import type { SiteConfig } from '@/lib/config/types'

type Practice = SiteConfig['practice']

/**
 * Reading a practice's identity when some of it is still blank.
 *
 * A newly bought site knows its name and its ODS code and nothing else, and it
 * is a live website from the moment it is provisioned. So the few places that
 * print these fields into a sentence go through here rather than interpolating
 * them directly, which is how you end up with "Hillside Surgery | " in a
 * browser tab, or "an NHS GP surgery in ." in a search result.
 */

/** The practice name, or something harmless if even that is missing. */
export function practiceName(practice: Practice): string {
  return practice.name.trim() || 'Our surgery'
}

/**
 * The line under the name on the home page, and the second half of the page
 * title. Falls back to naming the town, and then to the plain description.
 */
export function practiceStrapline(practice: Practice): string {
  const strapline = practice.strapline.trim()
  if (strapline) return strapline

  const town = practice.town.trim()
  return town ? `NHS GP surgery in ${town}` : 'NHS GP surgery'
}

/** "Hillside Surgery | NHS GP surgery in Ashford", with no stray separator. */
export function practiceTitle(practice: Practice): string {
  return `${practiceName(practice)} | ${practiceStrapline(practice)}`
}

/** The meta description every page falls back to. */
export function practiceDescription(practice: Practice): string {
  const town = practice.town.trim()
  const where = town ? ` in ${town}` : ''
  return `${practiceName(practice)} is an NHS GP surgery${where}. Request an appointment, order a repeat prescription, and find our opening hours and contact details.`
}
