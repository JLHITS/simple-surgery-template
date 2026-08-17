import type { OpeningDay, SiteConfig, TeamMember, Weekday } from '@/lib/config/types'
import type { CrawledPage } from './crawl'
import { anchors, jsonLd, ldString, matchTags, meta, ofType, attr, tidy, title, toText } from './html'

/**
 * Reading facts off a practice website.
 *
 * Everything produced here is a suggestion. Nothing is written anywhere: the
 * route returns findings, the admin panel shows them with a tick box each, and
 * only what a human accepts is merged into the draft they then have to save.
 * That is the whole safety model, and it is why extraction is allowed to guess.
 *
 * Confidence is honest rather than flattering:
 *
 *   high    structured data, or a link the site itself labelled
 *   medium  a strong pattern, like a tel: link or a postcode
 *   low     a guess from prose. Off by default in the UI
 */

export type Confidence = 'high' | 'medium' | 'low'

/** A deep partial of the config, which is what a finding merges in. */
export type ConfigPatch = {
  [K in keyof SiteConfig]?: SiteConfig[K] extends object
    ? SiteConfig[K] extends unknown[]
      ? SiteConfig[K]
      : Partial<SiteConfig[K]>
    : SiteConfig[K]
}

export interface Finding {
  /** Stable across scans of the same site, so the UI can key on it. */
  id: string
  group: string
  label: string
  /** What we found, as the practice should read it. */
  display: string
  confidence: Confidence
  /** The page it came from. */
  source: string
  patch: ConfigPatch
}

export interface ExtractResult {
  siteUrl: string
  pagesRead: { url: string; kind: string }[]
  findings: Finding[]
  /** Things we looked for and could not find, so the UI can say so. */
  missing: string[]
}

/* ------------------------------------------------------------------ helpers */

const POSTCODE = /\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/i

/** UK numbers, loose enough for the many ways practices format them. */
const PHONE = /\b0(?:\d[\s-]?){9,10}\b/g

/** Numbers that are never the practice's own line. */
const NOT_PRACTICE_PHONE = /^0?(111|999|101|300123|8001111|3003112233)/

/**
 * Groups a UK number the way the area code says it should be.
 *
 * Getting this wrong is not cosmetic. "01215 160 363" is a real number
 * displayed as gibberish, and a patient reading it aloud to somebody else
 * passes on gibberish. Birmingham is 0121, not 01215.
 */
function cleanPhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '')
  if (!/^0\d{9,10}$/.test(digits)) return ''
  if (NOT_PRACTICE_PHONE.test(digits)) return ''

  if (digits.length !== 11) return digits

  // 020, 023, 024, 028, 029: two digit area code, then 4 and 4.
  if (/^02/.test(digits)) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`
  }

  // 0113, 0121, 0131, 0151, 0161, 0191 and the 011x set, plus non-geographic
  // 03xx, 08xx and 07xx: four digit prefix, then 3 and 4.
  if (/^0(1[1-9]1|11[1-9]|3\d\d|8\d\d|7\d\d)/.test(digits)) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
  }

  // Everything else is a five digit area code, then 3 and 3.
  return `${digits.slice(0, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`
}

const DAY_NAMES: Record<string, Weekday> = {
  mon: 'monday',
  monday: 'monday',
  tue: 'tuesday',
  tues: 'tuesday',
  tuesday: 'tuesday',
  wed: 'wednesday',
  weds: 'wednesday',
  wednesday: 'wednesday',
  thu: 'thursday',
  thur: 'thursday',
  thurs: 'thursday',
  thursday: 'thursday',
  fri: 'friday',
  friday: 'friday',
  sat: 'saturday',
  saturday: 'saturday',
  sun: 'sunday',
  sunday: 'sunday',
}

const ORDER: Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

/** "8.30am", "08:30", "8 am" and "0830" all mean the same thing. */
function parseTime(raw: string): string {
  const value = raw.toLowerCase().replace(/\s+/g, '')
  const m = /^(\d{1,2})(?::|\.)?(\d{2})?(am|pm)?$/.exec(value)
  if (!m) return ''

  let hour = Number(m[1])
  const minute = m[2] ? Number(m[2]) : 0
  const suffix = m[3]

  if (hour > 24 || minute > 59) return ''
  if (suffix === 'pm' && hour < 12) hour += 12
  if (suffix === 'am' && hour === 12) hour = 0
  if (hour === 24) hour = 0

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function blankWeek(): OpeningDay[] {
  return ORDER.map((day) => ({
    day,
    closed: day === 'saturday' || day === 'sunday',
    open: '08:00',
    close: '18:30',
  }))
}

/** The registrable-ish host, for deciding whether a link leaves the site. */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return ''
  }
}

function isExternal(url: string, siteHost: string): boolean {
  const host = hostOf(url)
  return Boolean(host) && host !== siteHost
}

/* ------------------------------------------------------- individual finders */

function findName(pages: CrawledPage[]): string {
  const home = pages[0]
  const candidates: string[] = []

  // Structured data first, then Open Graph, then headings, then the title.
  for (const node of ofType(
    jsonLd(home.html),
    'MedicalOrganization',
    'Physician',
    'MedicalClinic',
    'MedicalBusiness',
    'LocalBusiness',
    'Organization',
  )) {
    const name = ldString(node.name)
    if (name) candidates.push(name)
  }

  candidates.push(meta(home.html, 'og:site_name'), meta(home.html, 'og:title'))

  const h1 = matchTags(home.html, 'h1')[0]
  if (h1) candidates.push(tidy(toText(h1.inner)))

  candidates.push(title(home.html))

  // Titles are usually two or three parts: "Homepage - St Pauls Partners",
  // "Anytown Surgery | NHS GP in Anytown". Try every part, not just the first,
  // because which one holds the name varies by supplier.
  for (const candidate of candidates) {
    for (const segment of splitTitle(candidate)) {
      const name = stripBoilerplate(segment)
      if (looksLikeName(name)) return name
    }
  }

  // Nothing survived cleaning. An uncleaned title beats no name at all.
  return tidy(title(home.html)).slice(0, 80)
}

function splitTitle(value: string): string[] {
  return value
    .split(/[|–—»]|\s+-\s+|\s+::\s+/)
    .map((s) => tidy(s))
    .filter(Boolean)
}

/** Removes the "Welcome to" and trailing "website" that titles collect. */
function stripBoilerplate(value: string): string {
  return tidy(
    value
      .replace(/^\s*welcome\s+to\s+(the\s+)?/i, '')
      .replace(/^\s*(home\s*page|homepage|home)\b[\s:,-]*/i, '')
      .replace(/\s*(surgery|practice)?\s*website\s*$/i, ''),
  )
}

/**
 * Whether a candidate is plausibly a practice name.
 *
 * Stripping boilerplate can eat the whole string: "Home page" became "page",
 * which was then imported as the practice's name. Anything that fails here
 * falls through to the next candidate rather than being published.
 */
function looksLikeName(value: string): boolean {
  if (value.length < 4 || value.length > 80) return false
  return !/^(page|home|welcome|index|untitled|menu|navigation|main|default)$/i.test(value)
}

function findPhones(pages: CrawledPage[]): string[] {
  const counts = new Map<string, number>()

  const add = (raw: string, weight: number) => {
    const phone = cleanPhone(raw)
    if (!phone) return
    counts.set(phone, (counts.get(phone) || 0) + weight)
  }

  for (const page of pages) {
    // tel: links are what the practice itself marked up as a phone number.
    for (const { href } of anchors(page.html, page.url)) {
      if (/^tel:/i.test(href)) add(href.replace(/^tel:/i, ''), 10)
    }
    for (const node of jsonLd(page.html)) {
      const value = ldString(node.telephone)
      if (value) add(value, 10)
    }
    for (const m of toText(page.html).matchAll(PHONE)) add(m[0], 1)
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([phone]) => phone)
}

function findEmail(pages: CrawledPage[], host: string): string {
  const found = new Set<string>()

  for (const page of pages) {
    for (const { href } of anchors(page.html, page.url)) {
      if (!/^mailto:/i.test(href)) continue
      const address = href.replace(/^mailto:/i, '').split('?')[0].trim().toLowerCase()
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) found.add(address)
    }
    for (const node of jsonLd(page.html)) {
      const value = ldString(node.email).toLowerCase().replace(/^mailto:/, '')
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) found.add(value)
    }
  }

  const list = [...found].filter(
    (a) => !/(webmaster|noreply|no-reply|postmaster|support@|info@wordpress)/.test(a),
  )
  if (!list.length) return ''

  // An nhs.net address, or one on the practice's own domain, beats a generic.
  const domain = host.replace(/^www\./, '')
  return (
    list.find((a) => a.endsWith('@nhs.net')) ||
    list.find((a) => a.endsWith(`@${domain}`)) ||
    list.find((a) => a.includes('nhs.uk')) ||
    list[0]
  )
}

interface Address {
  line1: string
  town: string
  county: string
  postcode: string
}

function findAddress(pages: CrawledPage[]): Address | null {
  for (const page of pages) {
    for (const node of jsonLd(page.html)) {
      const raw = node.address
      if (!raw || typeof raw !== 'object') continue

      const address = raw as Record<string, unknown>
      const line1 = ldString(address.streetAddress)
      const postcode = ldString(address.postalCode).toUpperCase()
      if (!line1 && !postcode) continue

      return {
        line1,
        town: ldString(address.addressLocality),
        county: ldString(address.addressRegion),
        postcode: formatPostcode(postcode),
      }
    }
  }

  // No structured data. Find a postcode and read backwards, which is how
  // practice addresses are almost always laid out.
  //
  // The trap is that a postcode also appears in news items and event notices.
  // The first attempt at this imported "Cancer Screening and Health Event,
  // Monday 15th December- 10am to 2pm Halesowen Cultural" as a practice
  // address, so anything that reads like prose is now rejected.
  const NOT_ADDRESS =
    /\b(january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}(am|pm)|clinic|event|screening|appointment|closed|open(ing)?|welcome|copyright|©)\b/i

  const ordered = [...pages].sort((a, b) => rank(a.kind) - rank(b.kind))

  for (const page of ordered) {
    const text = toText(page.html)

    for (const m of text.matchAll(new RegExp(POSTCODE.source, 'gi'))) {
      const before = text.slice(Math.max(0, m.index - 140), m.index)
      const parts = before
        .split(/[\n,]/)
        .map((s) => tidy(s))
        .filter(Boolean)
        .slice(-3)
        .filter((part) => part.length <= 60 && !NOT_ADDRESS.test(part))

      // A real address has a street line with a number or a building name.
      if (!parts.length) continue

      return {
        line1: parts[0] || '',
        town: parts.length > 1 ? parts[parts.length - 1] : '',
        county: '',
        postcode: formatPostcode(`${m[1]} ${m[2]}`),
      }
    }
  }

  return null
}

/** Contact pages carry the address. Home pages carry it and everything else. */
function rank(kind: string): number {
  const order = ['contact', 'about', 'home']
  const index = order.indexOf(kind)
  return index === -1 ? order.length : index
}

function formatPostcode(value: string): string {
  const m = POSTCODE.exec(value.replace(/\s+/g, ' '))
  return m ? `${m[1].toUpperCase()} ${m[2].toUpperCase()}` : ''
}

/**
 * Opening hours, from structured data where possible.
 *
 * Text scraping of hours is deliberately conservative. A practice whose real
 * hours are wrong on its website is a patient turning up to a locked door, so
 * anything ambiguous is left for a human rather than guessed at.
 */
function findHours(pages: CrawledPage[]): { days: OpeningDay[]; confidence: Confidence } | null {
  for (const page of pages) {
    for (const node of jsonLd(page.html)) {
      const spec = node.openingHoursSpecification
      if (Array.isArray(spec) && spec.length) {
        const days = fromSpecification(spec as Record<string, unknown>[])
        if (days) return { days, confidence: 'high' }
      }

      const plain = node.openingHours
      if (plain) {
        const days = fromOpeningHoursStrings(Array.isArray(plain) ? plain : [plain])
        if (days) return { days, confidence: 'high' }
      }
    }
  }

  // Tables are the next most reliable, because a row is unambiguous.
  for (const page of pages) {
    if (page.kind !== 'hours' && page.kind !== 'contact' && page.kind !== 'home') continue

    const days = fromTables(page.html)
    if (days) return { days, confidence: 'medium' }
  }

  // Last resort: lines of text. Plenty of practices lay their hours out in a
  // list or a stack of divs, which reads the same to a person and not at all
  // like a table to a parser.
  for (const page of pages) {
    if (page.kind !== 'hours' && page.kind !== 'contact' && page.kind !== 'home') continue

    const days = fromLines(toText(page.html))
    if (days) return { days, confidence: 'low' }
  }

  return null
}

/**
 * "Monday 8.00am - 6.30pm" on a line of its own, or "Monday Closed".
 *
 * Low confidence by design. A line mentioning a day and two times might be the
 * opening hours, or it might be a flu clinic, so this only fires when at least
 * four days line up and the caller shows it as a guess.
 */
function fromLines(text: string): OpeningDay[] | null {
  const week = blankWeek()
  const touched = new Set<Weekday>()

  const LINE =
    /^\s*([A-Za-z]{3,9}(?:\s*(?:-|to|–)\s*[A-Za-z]{3,9})?)\s*[:–—-]?\s*(closed|(\d{1,2}[:.]?\d{0,2}\s*(?:am|pm)?)\s*(?:-|to|until|–|—)\s*(\d{1,2}[:.]?\d{0,2}\s*(?:am|pm)?))\s*$/i

  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line || line.length > 60) continue

    const m = LINE.exec(line)
    if (!m) continue

    const days = expandDayRange(m[1])
    if (!days.length) continue

    if (/^closed$/i.test(m[2])) {
      for (const day of days) {
        touched.add(day)
        week[ORDER.indexOf(day)] = { ...week[ORDER.indexOf(day)], day, closed: true }
      }
      continue
    }

    const open = parseTime(m[3])
    const close = parseTime(m[4])
    if (!open || !close) continue

    for (const day of days) {
      touched.add(day)
      week[ORDER.indexOf(day)] = { day, closed: false, open, close }
    }
  }

  if (touched.size < 4) return null
  for (const day of ORDER) if (!touched.has(day)) week[ORDER.indexOf(day)].closed = true
  return week
}

function fromSpecification(spec: Record<string, unknown>[]): OpeningDay[] | null {
  const week = blankWeek()
  const touched = new Set<Weekday>()

  for (const entry of spec) {
    const raw = entry.dayOfWeek
    const list = Array.isArray(raw) ? raw : [raw]
    const opens = parseTime(ldString(entry.opens))
    const closes = parseTime(ldString(entry.closes))

    for (const item of list) {
      const name = ldString(item).replace(/^https?:\/\/schema\.org\//i, '').toLowerCase()
      const day = DAY_NAMES[name] || DAY_NAMES[name.slice(0, 3)]
      if (!day) continue

      const index = ORDER.indexOf(day)
      touched.add(day)

      if (!opens || !closes || opens === closes) {
        week[index] = { ...week[index], closed: true }
      } else {
        week[index] = { day, closed: false, open: opens, close: closes }
      }
    }
  }

  if (!touched.size) return null
  for (const day of ORDER) if (!touched.has(day)) week[ORDER.indexOf(day)].closed = true
  return week
}

/** The "Mo-Fr 08:00-18:30" form. */
function fromOpeningHoursStrings(values: unknown[]): OpeningDay[] | null {
  const week = blankWeek()
  const touched = new Set<Weekday>()

  for (const value of values) {
    const text = ldString(value)
    const m = /^\s*([A-Za-z,\-\s]+?)\s+(\d{1,2}[:.]?\d{0,2})\s*-\s*(\d{1,2}[:.]?\d{0,2})\s*$/.exec(text)
    if (!m) continue

    const open = parseTime(m[2])
    const close = parseTime(m[3])
    if (!open || !close) continue

    for (const day of expandDayRange(m[1])) {
      touched.add(day)
      week[ORDER.indexOf(day)] = { day, closed: false, open, close }
    }
  }

  if (!touched.size) return null
  for (const day of ORDER) if (!touched.has(day)) week[ORDER.indexOf(day)].closed = true
  return week
}

/** "Mo-Fr", "Monday to Friday", "Mon, Wed, Fri". */
function expandDayRange(raw: string): Weekday[] {
  const text = raw.toLowerCase().replace(/\s+to\s+/g, '-').replace(/\s*&\s*/g, ',')
  const out: Weekday[] = []

  for (const part of text.split(',')) {
    const range = part.split('-').map((s) => s.trim()).filter(Boolean)

    if (range.length === 2) {
      const from = DAY_NAMES[range[0]] || DAY_NAMES[range[0].slice(0, 3)]
      const to = DAY_NAMES[range[1]] || DAY_NAMES[range[1].slice(0, 3)]
      if (!from || !to) continue

      const start = ORDER.indexOf(from)
      const end = ORDER.indexOf(to)
      if (start <= end) for (let i = start; i <= end; i += 1) out.push(ORDER[i])
      continue
    }

    const single = DAY_NAMES[range[0]] || DAY_NAMES[(range[0] || '').slice(0, 3)]
    if (single) out.push(single)
  }

  return out
}

/** Rows like "Monday | 8.00am - 6.30pm", the commonest layout by a distance. */
function fromTables(html: string): OpeningDay[] | null {
  const week = blankWeek()
  const touched = new Set<Weekday>()

  for (const { inner } of matchTags(html, 'tr')) {
    const cells = matchTags(inner, 'td')
      .concat(matchTags(inner, 'th'))
      .map((c) => tidy(toText(c.inner)))
      .filter(Boolean)

    if (cells.length < 2) continue

    const days = expandDayRange(cells[0])
    if (!days.length) continue

    const rest = cells.slice(1).join(' ')

    if (/closed/i.test(rest)) {
      for (const day of days) {
        touched.add(day)
        week[ORDER.indexOf(day)] = { ...week[ORDER.indexOf(day)], day, closed: true }
      }
      continue
    }

    const times = /(\d{1,2}[:.]?\d{0,2}\s*(?:am|pm)?)\s*(?:-|to|until|–|—)\s*(\d{1,2}[:.]?\d{0,2}\s*(?:am|pm)?)/i.exec(
      rest,
    )
    if (!times) continue

    const open = parseTime(times[1])
    const close = parseTime(times[2])
    if (!open || !close) continue

    for (const day of days) {
      touched.add(day)
      week[ORDER.indexOf(day)] = { day, closed: false, open, close }
    }
  }

  if (touched.size < 3) return null
  for (const day of ORDER) if (!touched.has(day)) week[ORDER.indexOf(day)].closed = true
  return week
}

/**
 * Online service links, by supplier.
 *
 * Patients never see these brand names on a Simple Surgery site, but they are
 * exactly how you recognise which tool a practice already uses. The link itself
 * is carried across so the practice's existing arrangements keep working.
 */
const SUPPLIERS: { pattern: RegExp; field: keyof SiteConfig['online']; label: string }[] = [
  { pattern: /(^|\.)econsult\.(net|health)$/i, field: 'requestUrl', label: 'Online request tool' },
  { pattern: /(^|\.)patchs\.ai$/i, field: 'requestUrl', label: 'Online request tool' },
  { pattern: /(^|\.)klinik\.(co\.uk|health)$/i, field: 'requestUrl', label: 'Online request tool' },
  { pattern: /(^|\.)accurx\.com$/i, field: 'requestUrl', label: 'Online request tool' },
  { pattern: /(^|\.)engageconsult\.co\.uk$/i, field: 'requestUrl', label: 'Online request tool' },
  { pattern: /(^|\.)anima\.(healthcare|health)$/i, field: 'requestUrl', label: 'Online request tool' },
  { pattern: /(^|\.)systmonline\.[\w.]+$|(^|\.)tpp-uk\.com$/i, field: 'systmOnlineUrl', label: 'SystmOnline' },
  { pattern: /(^|\.)patientaccess\.com$/i, field: 'patientAccessUrl', label: 'Patient Access' },
  { pattern: /(^|\.)airmid[\w.]*$/i, field: 'patientAccessUrl', label: 'Patient app' },
  { pattern: /(^|\.)nhsapp\.service\.nhs\.uk$/i, field: 'nhsAppUrl', label: 'NHS App' },
]

/** The NHS App's own page, which is a www.nhs.uk URL with a specific path. */
const NHS_APP_PAGE = /^https?:\/\/(www\.)?nhs\.uk\/nhs-app/i

type OnlineHit = { url: string; label: string; source: string }

function findOnline(
  pages: CrawledPage[],
  siteHost: string,
): Partial<Record<keyof SiteConfig['online'], OnlineHit>> {
  const out: Partial<Record<keyof SiteConfig['online'], OnlineHit>> = {}

  for (const page of pages) {
    for (const { href, text } of anchors(page.html, page.url)) {
      if (!/^https?:/i.test(href)) continue

      // Matching on the hostname, not the whole URL. A practice with a page at
      // /nhs-app/ on its own nhs.uk domain matched "nhs.uk/nhs-app" as a
      // substring and imported its own explainer page as the NHS App link.
      const host = hostOf(href)

      for (const { pattern, field, label } of SUPPLIERS) {
        if (out[field] || !pattern.test(host)) continue
        out[field] = { url: href, label, source: page.url }
      }

      if (!out.nhsAppUrl && NHS_APP_PAGE.test(href)) {
        out.nhsAppUrl = { url: href, label: 'NHS App', source: page.url }
      }

      // A link to order a repeat prescription.
      //
      // Deliberately strict. A loose version of this imported the NHS page
      // about prescription charges and the NHS App landing page as ordering
      // tools, and a patient who clicks the wrong one does not get their
      // medicine. It must leave the site, must not be one of the NHS's own
      // information pages, and its text must say order or request rather than
      // merely mentioning prescriptions.
      if (
        !out.prescriptionUrl &&
        /\b(order|request|renew)\b/i.test(text) &&
        /\b(repeat|prescription|medication|medicines)\b/i.test(text) &&
        isExternal(href, siteHost) &&
        !/(^|\.)nhs\.uk$/i.test(host) &&
        !/\.(pdf|docx?)$/i.test(href) &&
        !/facebook|twitter|x\.com|instagram|youtube|linkedin/i.test(host)
      ) {
        out.prescriptionUrl = { url: href, label: 'Repeat prescriptions', source: page.url }
      }
    }
  }

  return out
}

function findCqc(pages: CrawledPage[]): string {
  for (const page of pages) {
    for (const { href } of anchors(page.html, page.url)) {
      if (/cqc\.org\.uk\/(provider|location|directory)/i.test(href)) return href
    }
  }
  for (const page of pages) {
    for (const { href } of anchors(page.html, page.url)) {
      if (/cqc\.org\.uk/i.test(href)) return href
    }
  }
  return ''
}

/** ODS codes appear in NHS profile links and occasionally in the page text. */
function findOdsCode(pages: CrawledPage[]): string {
  // Online consultation links carry it. Accurx uses /p/<ODS>, so a practice
  // with one of those has told us its code without knowing it.
  for (const page of pages) {
    for (const { href } of anchors(page.html, page.url)) {
      if (!/accurx|econsult|patchs|klinik|engageconsult|anima|mysurgerywebsite|systmonline/i.test(href)) {
        continue
      }
      // Accurx puts it in the path, older suppliers in a query string.
      const m =
        /\/(?:p|practice|surgery)\/([A-Y]\d{5})\b/i.exec(href) ||
        /[?&](?:p|ods|odscode|practice)=([A-Y]\d{5})\b/i.exec(href)
      if (m) return m[1].toUpperCase()
    }
  }

  for (const page of pages) {
    for (const { href } of anchors(page.html, page.url)) {
      if (!/nhs\.uk\/services/i.test(href)) continue
      const m = /\b([A-Y]\d{5})\b/i.exec(href)
      if (m) return m[1].toUpperCase()
    }
  }

  for (const page of pages) {
    const m = /\b(?:ods|practice)\s*code\W{0,10}([A-Y]\d{5})\b/i.exec(toText(page.html))
    if (m) return m[1].toUpperCase()
  }

  return ''
}

function findIcb(pages: CrawledPage[]): string {
  for (const page of pages) {
    const m = /\b(NHS [A-Z][A-Za-z'’\- ]{2,60}?Integrated Care Board)\b/.exec(toText(page.html))
    if (m) return tidy(m[1])
  }
  return ''
}

/**
 * The practice's logo, and specifically not their current supplier's.
 *
 * Practice365 sites carry Agilio and PATCHS branding in the markup, and the
 * first image matching /logo/ on one of them belongs to the supplier rather
 * than the surgery. Requiring the image to be served from the practice's own
 * site removes that entire class of wrong answer.
 */
function findLogo(pages: CrawledPage[], siteHost: string): string {
  const home = pages[0]
  const ours = (url: string) => Boolean(url) && !isExternal(url, siteHost)

  for (const node of ofType(jsonLd(home.html), 'MedicalOrganization', 'Organization', 'LocalBusiness')) {
    const logo = ldString(node.logo)
    if (logo && /^https?:/i.test(logo) && ours(logo)) return logo
  }

  // An <img> whose class, id or alt says logo, which is nearly universal.
  for (const m of home.html.matchAll(/<img\b([^>]*)>/gi)) {
    const attrs = m[1] || ''
    const haystack = `${attr(attrs, 'class')} ${attr(attrs, 'id')} ${attr(attrs, 'alt')}`
    if (!/logo|brand|crest/i.test(haystack)) continue

    const src = attr(attrs, 'src') || attr(attrs, 'data-src')
    if (!src || /^data:/i.test(src)) continue

    let resolved: string
    try {
      resolved = new URL(src, home.url).toString()
    } catch {
      continue
    }
    if (ours(resolved)) return resolved
  }

  const og = meta(home.html, 'og:image')
  return /^https?:/i.test(og) && ours(og) ? og : ''
}

/** Staff names. The least reliable thing here, and flagged as such. */
function findTeam(pages: CrawledPage[]): TeamMember[] {
  const page = pages.find((p) => p.kind === 'team')
  if (!page) return []

  const seen = new Set<string>()
  const team: TeamMember[] = []

  const NAME =
    /\b(Dr|Doctor|Prof|Professor|Mr|Mrs|Ms|Miss|Sister|Nurse)\.?\s+([A-Z][a-z'’-]+(?:\s+[A-Z][a-z'’-]+){0,2})\b/g

  /**
   * Capitalised words that follow a name but are not part of it.
   *
   * A staff page reads "Dr Julie Beattie Monday, Wednesday", and a greedy match
   * turns the availability into a surname. These are trimmed off the end until
   * only the name is left.
   */
  const NOT_A_SURNAME =
    /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|GP|Partner|Partners|Salaried|Locum|Registrar|Trainee|Nurse|Practitioner|Practice|Manager|Doctor|Male|Female|Senior|Lead|Clinical|Pharmacist|Physiotherapist|Paramedic|Associate|Advanced|Specialist|Available|Works|Joined|Qualified|MBBS|MRCGP|BSc|MBChB)$/i

  for (const m of toText(page.html).matchAll(NAME)) {
    const words = m[2].split(/\s+/)
    while (words.length > 1 && NOT_A_SURNAME.test(words[words.length - 1])) words.pop()

    const name = tidy(`${m[1].replace(/\.$/, '')} ${words.join(' ')}`)
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    team.push({
      id: `im-${team.length + 1}`,
      name,
      role: /^(dr|doctor|prof)/i.test(m[1]) ? 'GP' : '',
      group: /^(dr|doctor|prof)/i.test(m[1]) ? 'Doctors' : 'Practice team',
      bio: '',
      photoUrl: '',
    })

    if (team.length >= 30) break
  }

  return team
}

/* -------------------------------------------------------------------- main */

export function extract(pages: CrawledPage[]): ExtractResult {
  const home = pages[0]
  const host = new URL(home.url).hostname
  const siteHost = host.toLowerCase().replace(/^www\./, '')
  const findings: Finding[] = []
  const missing: string[] = []

  const push = (
    id: string,
    group: string,
    label: string,
    display: string,
    confidence: Confidence,
    source: string,
    patch: ConfigPatch,
  ) => findings.push({ id, group, label, display, confidence, source, patch })

  /* practice details */

  const name = findName(pages)
  if (name) {
    push('practice.name', 'Practice details', 'Practice name', name, 'high', home.url, {
      practice: { name },
    })
  } else {
    missing.push('practice name')
  }

  const phones = findPhones(pages)
  if (phones[0]) {
    push('practice.phone', 'Practice details', 'Main phone number', phones[0], 'high', home.url, {
      practice: { phone: phones[0] },
    })
  } else {
    missing.push('phone number')
  }

  if (phones[1]) {
    push(
      'practice.phoneSecondary',
      'Practice details',
      'Second phone number',
      `${phones[1]} — check what this line is for before using it`,
      'low',
      home.url,
      { practice: { phoneSecondary: phones[1], phoneSecondaryLabel: '' } },
    )
  }

  const email = findEmail(pages, host)
  if (email) {
    push('practice.email', 'Practice details', 'Email address', email, 'high', home.url, {
      practice: { email },
    })
  } else {
    missing.push('email address')
  }

  const address = findAddress(pages)
  if (address && (address.line1 || address.postcode)) {
    const display = [address.line1, address.town, address.county, address.postcode]
      .filter(Boolean)
      .join(', ')
    push('practice.address', 'Practice details', 'Address', display, address.line1 ? 'medium' : 'low', home.url, {
      practice: {
        addressLine1: address.line1,
        town: address.town,
        county: address.county,
        postcode: address.postcode,
      },
    })
  } else {
    missing.push('address')
  }

  const ods = findOdsCode(pages)
  if (ods) {
    push('practice.odsCode', 'Practice details', 'ODS code', ods, 'medium', home.url, {
      practice: { odsCode: ods },
    })
  } else {
    missing.push('ODS code')
  }

  const logo = findLogo(pages, siteHost)
  if (logo) {
    push('practice.logoUrl', 'Practice details', 'Logo', logo, 'medium', home.url, {
      practice: { logoUrl: logo, logoAlt: name || '' },
    })
  }

  /* hours */

  const hours = findHours(pages)
  if (hours) {
    const display = hours.days
      .map((d) => `${d.day.slice(0, 3)} ${d.closed ? 'closed' : `${d.open}–${d.close}`}`)
      .join(', ')
    push('hours.days', 'Opening hours', 'Opening hours', display, hours.confidence, home.url, {
      hours: { days: hours.days },
    })
  } else {
    missing.push('opening hours')
  }

  /* online services */

  const online = findOnline(pages, siteHost)
  for (const [field, hit] of Object.entries(online)) {
    if (!hit) continue
    push(
      `online.${field}`,
      'Online services',
      hit.label,
      hit.url,
      'high',
      hit.source,
      { online: { [field]: hit.url } as Partial<SiteConfig['online']> },
    )
  }
  if (!Object.keys(online).length) missing.push('online service links')

  /* compliance */

  const cqc = findCqc(pages)
  if (cqc) {
    push('compliance.cqcReportUrl', 'Compliance', 'CQC report link', cqc, 'high', home.url, {
      compliance: { cqcReportUrl: cqc },
    })
  }

  const icb = findIcb(pages)
  if (icb) {
    push('compliance.icbName', 'Compliance', 'Integrated Care Board', icb, 'medium', home.url, {
      compliance: { icbName: icb },
    })
  }

  /* team */

  const team = findTeam(pages)
  if (team.length) {
    push(
      'team',
      'Team',
      `${team.length} possible staff ${team.length === 1 ? 'name' : 'names'}`,
      team.map((t) => t.name).join(', '),
      'low',
      pages.find((p) => p.kind === 'team')?.url || home.url,
      { team },
    )
  } else {
    missing.push('staff list')
  }

  return {
    siteUrl: home.url,
    pagesRead: pages.map((p) => ({ url: p.url, kind: p.kind })),
    findings,
    missing,
  }
}
