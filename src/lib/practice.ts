import type { OpeningDay, SiteConfig } from '@/lib/config/types'

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

/**
 * The practice's page on the NHS website, or the empty string without a code.
 *
 * nhs.uk addresses a surgery as /services/gp-surgery/<name>/<ODS code>, and
 * finds it by the code whatever the name part says, redirecting to its real
 * address. A link with the code and no name part is a 404, which is what this
 * used to build. The name is the practice's own, so the link usually lands on
 * the right address without even needing the redirect.
 */
export function nhsProfileUrl(practice: Practice): string {
  const code = practice.odsCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!code) return ''
  const slug =
    practice.name
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'gp-surgery'
  return `https://www.nhs.uk/services/gp-surgery/${slug}/${code}`
}

/* ------------------------------------------------------------------ sites */

/** One building patients can go to, main surgery or branch, ready to print. */
export interface SiteView {
  id: string
  /** "Kegworth (main surgery)", "Gotham". */
  label: string
  main: boolean
  addressLines: string[]
  /** This site's own number, or empty when it is the main one. */
  phone: string
  /** Its own week, or null when it keeps the main surgery's hours. */
  days: OpeningDay[] | null
  notes: string
  /** A map search for the address, for "Get directions". */
  directionsUrl: string
  /** The place name, for summaries: "Surgeries in Kegworth and Gotham". */
  place: string
}

type Address = Pick<Practice, 'addressLine1' | 'addressLine2' | 'town' | 'county' | 'postcode'>

export function addressLines(address: Address): string[] {
  return [address.addressLine1, address.addressLine2, address.town, address.county, address.postcode]
    .map((line) => line.trim())
    .filter(Boolean)
}

function directions(name: string, lines: string[]): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([name, ...lines].join(', '))}`
}

/** True when the practice works from more than one building. */
export function hasBranches(practice: Practice): boolean {
  return (practice.sites ?? []).length > 0
}

/**
 * Every site the practice works from, the main surgery first.
 *
 * With a single site the main surgery is labelled with the practice's own
 * name, which is how every page already printed it. With branches it takes
 * the name the practice gave it, so a patient can tell "Kegworth" from
 * "Gotham" at a glance.
 */
export function practiceSites(practice: Practice): SiteView[] {
  const branches = practice.sites ?? []
  const mainLines = addressLines(practice)
  const mainName = practice.mainSiteName?.trim()

  const main: SiteView = {
    id: 'main',
    label: branches.length
      ? mainName
        ? `${mainName} (main surgery)`
        : 'Main surgery'
      : practiceName(practice),
    main: true,
    addressLines: mainLines,
    phone: '',
    days: null,
    notes: '',
    directionsUrl: directions(practiceName(practice), mainLines),
    place: practice.town.trim() || mainName || practice.addressLine1.trim(),
  }

  return [
    main,
    ...branches.map((site): SiteView => {
      const lines = addressLines(site)
      const label = site.name.trim() || site.town.trim() || site.addressLine1.trim() || 'Branch surgery'
      return {
        id: site.id,
        label,
        main: false,
        addressLines: lines,
        phone: site.phone.trim() && site.phone.trim() !== practice.phone.trim() ? site.phone.trim() : '',
        days: site.sameHours ? null : site.days,
        notes: site.notes.trim(),
        directionsUrl: directions(`${practiceName(practice)}, ${label}`, lines),
        place: site.town.trim() || label,
      }
    }),
  ]
}

/** "Kegworth and Gotham", "Kegworth, Gotham and Barton". */
function joinAnd(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/**
 * The address line under the practice name on the home page.
 *
 * One site prints its street and postcode. Several print where they are,
 * because three full addresses in a hero line is a paragraph, and the contact
 * page it links to has them all in full.
 */
export function addressSummary(practice: Practice): string {
  if (!hasBranches(practice)) {
    return [practice.addressLine1.trim(), practice.postcode.trim()].filter(Boolean).join(', ')
  }
  const places = [...new Set(practiceSites(practice).map((s) => s.place).filter(Boolean))]
  return places.length > 1 ? `Surgeries in ${joinAnd(places)}` : `Our ${practiceSites(practice).length} surgeries`
}

/** The meta description every page falls back to. */
export function practiceDescription(practice: Practice): string {
  const town = practice.town.trim()
  const where = town ? ` in ${town}` : ''
  return `${practiceName(practice)} is an NHS GP surgery${where}. Request an appointment, order a repeat prescription, and find our opening hours and contact details.`
}
