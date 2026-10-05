import type { OpeningDay, PracticeSite, SiteConfig, TeamMember, Weekday } from '@/lib/config/types'
import {
  CORE_POLICY_CAUTION,
  importPage,
  type ImportedPage,
  type ImportedPolicy,
  type WordingIssue,
} from './content'
import { htmlToBlocks, isShouting, plainText, sentenceCase, titleCase, type Block } from './convert'
import type { CrawledPage } from './crawl'
import { classOf, findAll, findFirst, parseHtml, rawText, type ElementNode } from './dom'
import { anchors, decodeEntities, jsonLd, ldString, matchTags, meta, ofType, attr, tidy, title, toText } from './html'

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

/** A page's wording, offered for one of the template's pages. */
export interface PageFinding {
  id: string
  /**
   * Where it would go: a content field, an info page slug, a service slug, or
   * a section of the Practice policies page, keyed by the policy.
   */
  targetKind: 'contentField' | 'page' | 'service' | 'policy'
  targetKey: string
  targetLabel: string
  /** True where the template writes this page to meet a requirement. */
  statutory: boolean
  /** The specific risk of importing this one, shown when it is ticked. */
  caution: string
  /** Where the imported wording departs from the guidance the template follows. */
  issues: WordingIssue[]
  sourceUrl: string
  sourceTitle: string
  excerpt: string
  wordCount: number
  /** The converted body, in the template's Markdown subset. */
  markdown: string
}

export interface ExtractResult {
  siteUrl: string
  pagesRead: { url: string; kind: string }[]
  findings: Finding[]
  /** Page wording, offered separately from the facts. */
  pageFindings: PageFinding[]
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

  // The main surgery's contact card. Practices with a branch list both
  // numbers equally often, so without this the branch could win.
  for (const page of pages) {
    const card = /class\s*=\s*["'][^"']*\bbp-phone\b[^"']*["'][^>]*>\s*<a\b[^>]*href\s*=\s*["']tel:([^"']+)["']/i.exec(page.html)
    if (card) {
      add(decodeEntities(card[1]), 25)
      break
    }
  }

  // Each number counts once per page however often it appears there. A page
  // footer listing the branch twice (surgery and dispensary) is still one
  // page saying it, and counting every link let the branch outvote the main
  // surgery on every page of the site.
  for (const page of pages) {
    const best = new Map<string, number>()
    const note = (raw: string, weight: number) => {
      const phone = cleanPhone(raw)
      if (phone) best.set(phone, Math.max(best.get(phone) || 0, weight))
    }

    // tel: links are what the practice itself marked up as a phone number.
    for (const { href } of anchors(page.html, page.url)) {
      if (/^tel:/i.test(href)) note(href.replace(/^tel:/i, ''), 10)
    }
    for (const node of jsonLd(page.html)) {
      const value = ldString(node.telephone)
      if (value) note(value, 10)
    }
    for (const m of toText(page.html).matchAll(PHONE)) note(m[0], 1)

    for (const [phone, weight] of best) add(phone, weight)
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
  line2?: string
  town: string
  county: string
  postcode: string
}

/** The lines of an element, split where it had line breaks. */
function linesOf(el: ElementNode): string[] {
  return decodeEntities(rawText(el))
    .split('\n')
    .map((line) => tidy(line).replace(/,\s*$/, ''))
    .filter(Boolean)
}

/** One of Practice365's contact cards: a surgery, its address, number and hours. */
interface ContactCard {
  name: string
  address: Address
  phone: string
  days: OpeningDay[] | null
  /** Other cards at the same address, such as the site's dispensary. */
  alsoHere: string[]
}

const hasClass = (name: string) => (el: ElementNode) =>
  new RegExp(`(^|\\s)${name}(\\s|$)`).test(classOf(el))

/**
 * Practice365's contact cards, from the Business Profile plugin, main surgery
 * first.
 *
 * Practices with a branch have one card per site, and list the main surgery
 * first. The card's address lines are separated by line breaks, which the
 * prose reader below cannot see, so it read the card's heading as the street
 * and lost the street altogether. A second card at the same address, like
 * "Dispensary (Gotham)", is part of that site rather than another one.
 */
function contactCards(pages: CrawledPage[]): ContactCard[] {
  for (const page of [...pages].sort((a, b) => rank(a.kind) - rank(b.kind))) {
    if (!/bp-contact-card/.test(page.html)) continue

    const cards: ContactCard[] = []
    for (const card of findAll(parseHtml(page.html), hasClass('bp-contact-card'), { nested: false })) {
      const address = findFirst(card, hasClass('bp-address'))
      if (!address) continue

      const lines = linesOf(address)
      const at = lines.findIndex((line) => POSTCODE.test(line))
      if (at < 1) continue

      const parts = lines.slice(0, at)
      const label = findFirst(card, hasClass('bp-name'))
      const phoneLink = findFirst(card, (el) => el.tag === 'a' && /^tel:/i.test(attr(el.attrs, 'href')))
      const hours = findFirst(card, hasClass('bp-opening-hours'))

      const found: ContactCard = {
        name: label ? plainText(label) : '',
        address: {
          line1: parts[0],
          line2: parts.length > 2 ? parts.slice(1, -1).join(', ') : '',
          town: parts.length > 1 ? parts[parts.length - 1] : '',
          county: '',
          postcode: formatPostcode(lines[at]),
        },
        phone: phoneLink ? cleanPhone(attr(phoneLink.attrs, 'href').replace(/^tel:/i, '')) : '',
        days: hours ? weekFromBusinessProfile(hours) : null,
        alsoHere: [],
      }

      const same = cards.find(
        (c) =>
          c.address.postcode === found.address.postcode &&
          c.address.line1.toLowerCase() === found.address.line1.toLowerCase(),
      )
      if (same) {
        // The same surgery again: contact pages repeat a card in several
        // layouts, only some of which show the hours. Fill in what the first
        // copy lacked. A different name at the same address is part of the
        // site, like its dispensary, whose own hours are not the surgery's.
        if (!found.name || found.name === same.name) {
          same.days ??= found.days
          same.phone ||= found.phone
        } else if (!same.alsoHere.includes(found.name)) {
          same.alsoHere.push(found.name)
        }
        continue
      }
      cards.push(found)
    }

    if (cards.length) return cards
  }
  return []
}

function fromContactCard(pages: CrawledPage[]): Address | null {
  return contactCards(pages)[0]?.address ?? null
}

/**
 * What a card calls its site, without the practice's own name around it:
 * "Orchard Surgery (Gotham)" is "Gotham".
 */
function siteName(cardName: string, practice: string): string {
  const name = tidy(cardName)
  const inBrackets = /\(([^)]+)\)\s*$/.exec(name)
  if (inBrackets && (!practice || name.toLowerCase().startsWith(practice.toLowerCase()))) {
    return inBrackets[1].trim()
  }
  if (practice && name.toLowerCase().startsWith(practice.toLowerCase())) {
    return name.slice(practice.length).replace(/^[\s,:–—-]+/, '').trim() || name
  }
  return name
}

function sameWeek(a: OpeningDay[], b: OpeningDay[]): boolean {
  return ORDER.every((day) => {
    const x = a.find((d) => d.day === day)
    const y = b.find((d) => d.day === day)
    if (!x || !y) return false
    if (x.closed || y.closed) return x.closed === y.closed
    return x.open === y.open && x.close === y.close
  })
}

/**
 * The practice's other sites, from every contact card after the first.
 *
 * Each keeps its own phone number only if it differs from the main one, and
 * its own hours only if they differ from the main surgery's. A dispensary at
 * the same address becomes a note on that site rather than a site of its own.
 */
function findSites(
  pages: CrawledPage[],
  practice: string,
  mainPhone: string,
): { mainSiteName: string; sites: PracticeSite[] } | null {
  const cards = contactCards(pages)
  if (cards.length < 2) return null

  const [main, ...branches] = cards
  const mainDays = main.days ?? blankWeek()

  const sites = branches.map((card, i): PracticeSite => {
    const own = card.days && !sameWeek(card.days, mainDays)
    const dispensary = card.alsoHere.some((name) => /dispens/i.test(name))
    return {
      id: `site-${i + 1}`,
      name: siteName(card.name, practice) || card.address.town,
      addressLine1: card.address.line1,
      addressLine2: card.address.line2 || '',
      town: card.address.town,
      county: card.address.county,
      postcode: card.address.postcode,
      phone: card.phone && card.phone !== mainPhone ? card.phone : '',
      sameHours: !own,
      days: own ? (card.days as OpeningDay[]) : mainDays.map((d) => ({ ...d })),
      notes: dispensary ? 'This site has a dispensary.' : '',
    }
  })

  return { mainSiteName: siteName(main.name, practice), sites }
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

  const card = fromContactCard(pages)
  if (card) return card

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

  // Practice365's contact card, which lays the week out in labelled spans.
  for (const page of [...pages].sort((a, b) => rank(a.kind) - rank(b.kind))) {
    const days = fromBusinessProfile(page.html)
    if (days) return { days, confidence: 'medium' }
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

    // The first time a day appears wins. A practice with a branch lists the
    // main surgery first, and the branch's Monday must not overwrite it.
    const fresh = days.filter((day) => !touched.has(day))
    if (!fresh.length) continue

    if (/^closed$/i.test(m[2])) {
      for (const day of fresh) {
        touched.add(day)
        week[ORDER.indexOf(day)] = { ...week[ORDER.indexOf(day)], day, closed: true }
      }
      continue
    }

    const open = parseTime(m[3])
    const close = parseTime(m[4])
    if (!open || !close) continue

    for (const day of fresh) {
      touched.add(day)
      week[ORDER.indexOf(day)] = { day, closed: false, open, close }
    }
  }

  if (touched.size < 4) return null
  for (const day of ORDER) if (!touched.has(day)) week[ORDER.indexOf(day)].closed = true
  return week
}

/** The times in "8:00 am to 6:30 pm". */
const TIME_RANGE =
  /(\d{1,2}[:.]?\d{0,2}\s*(?:am|pm)?)\s*(?:-|to|until|–|—)\s*(\d{1,2}[:.]?\d{0,2}\s*(?:am|pm)?)/i

/**
 * The Business Profile plugin's opening hours, as Practice365 sites use it.
 *
 * Each day is a row with the day's name and one time span per session, or
 * "Closed". Only the first card on a page is read here, because the rest are
 * branches: see contactCards for those.
 */
function fromBusinessProfile(html: string): OpeningDay[] | null {
  if (!/bp-opening-hours/.test(html)) return null
  const block = findFirst(parseHtml(html), (el) => /(^|\s)bp-opening-hours(\s|$)/.test(classOf(el)))
  return block ? weekFromBusinessProfile(block) : null
}

function weekFromBusinessProfile(block: ElementNode): OpeningDay[] | null {
  const week = blankWeek()
  const touched = new Set<Weekday>()

  for (const row of findAll(block, (el) => /(^|\s)bp-weekday(\s|$)/.test(classOf(el)), { nested: false })) {
    const label = findFirst(row, (el) => /(^|\s)bp-weekday-name(\s|$)/.test(classOf(el)))
    const name = (label ? plainText(label) : '').toLowerCase()
    const day = DAY_NAMES[name] || DAY_NAMES[name.slice(0, 3)]
    if (!day || touched.has(day)) continue

    const ranges = findAll(row, (el) => /(^|\s)bp-time(\s|$)/.test(classOf(el)))
      .map((el) => TIME_RANGE.exec(plainText(el)))
      .map((m) => (m ? [parseTime(m[1]), parseTime(m[2])] : null))
      .filter((r): r is [string, string] => Boolean(r && r[0] && r[1]))

    touched.add(day)
    const index = ORDER.indexOf(day)
    if (!ranges.length) {
      week[index] = { ...week[index], day, closed: true }
      continue
    }

    const entry: OpeningDay = { day, closed: false, open: ranges[0][0], close: ranges[ranges.length - 1][1] }
    if (ranges.length > 1) {
      entry.breakStart = ranges[0][1]
      entry.breakEnd = ranges[1][0]
    }
    week[index] = entry
  }

  if (touched.size < 5) return null
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

/**
 * Which of several request links is the practice's own.
 *
 * Practice sites link to their supplier's marketing page as often as to their
 * own form: Orchard Surgery linked PATCHS's "for patients" page, and its real
 * forms were SystmOnline and Accurx links carrying its practice code. A link
 * with the practice's code in it is theirs.
 */
function requestScore(href: string, text: string, ods: string): number {
  let score = 0
  if (ods && href.toLowerCase().includes(ods.toLowerCase())) score += 4
  if (/\b(request|consult|query|contact|ask|form|submit)\b/i.test(text)) score += 1
  try {
    const path = new URL(href).pathname
    if (path.length > 1) score += 1
  } catch {
    /* scored as it is */
  }
  return score
}

function findOnline(
  pages: CrawledPage[],
  siteHost: string,
  ods = '',
): Partial<Record<keyof SiteConfig['online'], OnlineHit>> {
  const out: Partial<Record<keyof SiteConfig['online'], OnlineHit>> = {}
  let requestBest = -1

  for (const page of pages) {
    for (const { href, text } of anchors(page.html, page.url)) {
      if (!/^https?:/i.test(href)) continue

      // Matching on the hostname, not the whole URL. A practice with a page at
      // /nhs-app/ on its own nhs.uk domain matched "nhs.uk/nhs-app" as a
      // substring and imported its own explainer page as the NHS App link.
      const host = hostOf(href)

      for (const { pattern, field, label } of SUPPLIERS) {
        if (!pattern.test(host)) continue
        if (field === 'requestUrl') {
          const score = requestScore(href, text, ods)
          if (score > requestBest) {
            requestBest = score
            out.requestUrl = { url: href, label, source: page.url }
          }
          continue
        }
        // The record login, not the consultation form on the same host.
        if (field === 'systmOnlineUrl' && /onlineconsultation/i.test(href)) continue
        if (!out[field]) out[field] = { url: href, label, source: page.url }
      }

      // SystmOnline's own online consultation form is a request tool, not the
      // patient record login, whatever host it shares with it.
      if (/(^|\.)tpp-uk\.com$|(^|\.)systmonline\./i.test(host) && /onlineconsultation/i.test(href)) {
        const score = requestScore(href, text, ods)
        if (score > requestBest) {
          requestBest = score
          out.requestUrl = { url: href, label: 'Online request tool', source: page.url }
        }
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
        /[?&](?:p|ods|odscode|practice|practicecode|orgid|org_id|organisationid)=([A-Y]\d{5})\b/i.exec(href)
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

/* ------------------------------------------------------------------ team */

const TITLES: Record<string, string> = {
  dr: 'Dr',
  doctor: 'Dr',
  prof: 'Prof',
  professor: 'Prof',
  mr: 'Mr',
  mrs: 'Mrs',
  ms: 'Ms',
  miss: 'Miss',
  mx: 'Mx',
  sister: 'Sister',
}

/** Letters after a name: "Dr Jane Smith MBChB MRCGP" is Dr Jane Smith. */
const QUALIFICATION =
  /^(MBBS|MBChB|MB|ChB|BM|BS|BCh|BAO|BSc|MSc|MA|BA|PhD|MD|MRCGP|FRCGP|DRCOG|DFSRH|DFFP|DCH|DPD|MRCP|FRCP|MRCS|FRCS|MRCOG|DGM|RGN|RN|RMN|NMP|IP|ACP|PGCert|PGDip|DipHE|PGCE|LoC|DTM&H|MPharm|MCSP|BHSc)\.?,?$/

/**
 * Words that are never part of a person's name on a staff page.
 *
 * Group headings ("Practice management", "Additional roles") and job titles
 * ("Practice manager") are two or three capitalised words, exactly like a
 * name. This is what tells them apart.
 */
const NOT_A_NAME = new Set(
  `the and of for our your with team teams staff doctors doctor gp gps partner partners nurse nurses
  nursing management manager managers reception receptionist receptionists administration
  administrative administrator admin role roles assistant assistants pharmacist pharmacists pharmacy
  dispenser dispensers dispensary dispensing clinical clinician clinicians practice surgery service
  services additional healthcare health care support other others meet contact secretary secretaries
  secretarial phlebotomist phlebotomists phlebotomy physiotherapist physiotherapists physio paramedic
  paramedics trainee trainees registrar registrars locum locums salaried associate associates specialist
  specialists advanced practitioner practitioners coordinator coordinators link worker workers social
  prescribing primary network pcn arrs finance maintenance operations lead leads senior deputy student
  students visiting community midwife midwives visitor visitors about us who we are hours opening
  information welcome page home details news appointments appointment prescriptions results telephone
  phone email address monday tuesday wednesday thursday friday saturday sunday female male available
  qualified joined works special interests interest`.split(/\s+/),
)

interface Person {
  name: string
  gender: TeamMember['gender']
  /** Had "Dr", "Mrs" and so on in front, which is a strong signal. */
  titled: boolean
  /** Had "(F)" or "(M)" after, which on a staff page is as strong. */
  marked: boolean
}

/** A person's name, cleaned up, or null when the text is not one. */
function parsePerson(raw: string): Person | null {
  let text = tidy(raw)
  let gender: TeamMember['gender'] = ''

  const marker = /\s*[([]\s*(f|m|female|male)\s*[)\]]\s*$/i.exec(text)
  if (marker) {
    gender = /^f/i.test(marker[1]) ? 'Female' : 'Male'
    text = text.slice(0, marker.index).trim()
  }

  let title = ''
  const prefix = /^(dr|doctor|prof|professor|mr|mrs|ms|miss|mx|sister)\.?\s+/i.exec(text)
  if (prefix) {
    title = TITLES[prefix[1].toLowerCase()]
    text = text.slice(prefix[0].length)
  }

  // "Jane Smith, Practice Manager" and "Jane Smith (Partner)" are handled by
  // splitNameAndRole. Here only the name part matters.
  text = text.split(/\s*[,(|–—:]\s*|\s+-\s+/)[0].trim()

  const words = text.split(/\s+/).filter(Boolean)
  while (words.length > 1 && QUALIFICATION.test(words[words.length - 1])) words.pop()

  if (words.length < 2 || words.length > 4) return null
  if (!words.every((w) => /^[A-Za-z][A-Za-z'’.-]*$/.test(w))) return null
  if (words.some((w) => NOT_A_NAME.has(w.toLowerCase().replace(/[.'’]/g, '')))) return null

  const joined = words.join(' ')
  const shouting = joined === joined.toUpperCase()
  if (!shouting && !words.every((w) => /^[A-Z]/.test(w))) return null

  const name = shouting ? titleCase(joined) : joined
  return { name: title ? `${title} ${name}` : name, gender, titled: Boolean(title), marked: Boolean(marker) }
}

function plainOf(text: string): string {
  return tidy(text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\*\*/g, ''))
}

/** A job title: short, not a sentence, and not somebody else's name. */
function asRole(text: string): string {
  const plain = plainOf(text)
  if (!plain || plain.length > 70 || plain.split(/\s+/).length > 9 || /[.!?]$/.test(plain)) return ''
  const person = parsePerson(plain)
  if (person && (person.titled || person.marked)) return ''
  return isShouting(plain) ? sentenceCase(plain) : plain
}

/** "Dr Jane Smith - GP Partner", "Jane Smith (Practice Manager)", "Jane Smith, Nurse". */
function splitNameAndRole(text: string): (Person & { role: string }) | null {
  const plain = plainOf(text)
  const m =
    /^(.+?)\s*\(([^)]{3,})\)\s*$/.exec(plain) ||
    /^(.+?)\s*(?:[–—|:]|\s-\s|,)\s*(.+)$/.exec(plain)
  if (!m) return null
  if (/^(f|m|female|male)$/i.test(m[2].trim())) return null

  const person = parsePerson(m[1])
  const role = asRole(m[2])
  if (!person || !role) return null
  return { ...person, role }
}

/** Headings that name the page rather than a group of people on it. */
const PAGE_HEADING = /^(meet\s+(the|our)\s+(team|staff)|(our|the)\s+(practice\s+)?(team|staff)|staff|team|practice\s+staff)$/i

/**
 * Reads a staff page's structure rather than its prose.
 *
 * Practice staff pages are a list of names, each followed by a job title, in
 * groups under headings: "Doctors", then "DR CLARE POLLOCK (F)" over "GP
 * Partner". The names are often in capitals and most staff have no title, so
 * looking for "Dr" followed by a capitalised word found almost nobody.
 */
function teamFromBlocks(blocks: Block[]): TeamMember[] {
  const people: (Person & { role: string; group: string })[] = []
  let group = ''

  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i]
    const isHeading = block.type === 'heading' || (block.type === 'para' && block.boldOnly)

    if (isHeading) {
      const person = parsePerson(plainOf(block.text))
      const next = blocks[i + 1]
      const role = next && next.type === 'para' && !next.boldOnly ? asRole(next.text) : ''

      if (person && (role || person.titled || person.marked)) {
        people.push({ ...person, role, group })
        if (role) i += 1
        continue
      }

      const both = splitNameAndRole(block.text)
      if (both) {
        people.push({ ...both, group })
        continue
      }

      if (block.type === 'heading' && !person && block.level > 1) {
        const text = plainOf(block.text)
        if (!PAGE_HEADING.test(text) && text.length <= 60) {
          group = isShouting(text) ? titleCase(text) : text
        }
      }
      continue
    }

    if (block.type === 'para' || block.type === 'item') {
      const both = splitNameAndRole(block.text)
      if (both) {
        people.push({ ...both, group })
        continue
      }
      const person = parsePerson(plainOf(block.text))
      if (person && (person.titled || person.marked)) {
        const next = blocks[i + 1]
        const role = next && next.type === 'para' && !next.boldOnly ? asRole(next.text) : ''
        people.push({ ...person, role, group })
        if (role) i += 1
      }
    }
  }

  return people.map((p, index) => {
    const doctor = /^(Dr|Prof)\b/.test(p.name)
    return {
      id: `im-${index + 1}`,
      name: p.name,
      role: p.role || (doctor ? 'GP' : ''),
      group: p.group || (doctor ? 'Doctors' : 'Practice team'),
      bio: '',
      photoUrl: '',
      gender: p.gender,
    }
  })
}

/**
 * The old way, for staff pages written as prose: "Dr Julie Beattie joined the
 * practice in 2010." Only titled names are found, which is why it is the
 * fallback rather than the first choice.
 */
function teamFromProse(html: string): TeamMember[] {
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

  for (const m of toText(html).matchAll(NAME)) {
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

/** Staff from every team page read, names and job titles where they are given. */
function findTeam(pages: CrawledPage[]): { team: TeamMember[]; structured: boolean; source: string } {
  const teamPages = pages.filter((p) => p.kind === 'team')
  const seen = new Set<string>()
  const team: TeamMember[] = []
  let structured = false

  const add = (members: TeamMember[]) => {
    for (const member of members) {
      const key = member.name.toLowerCase().replace(/^(dr|prof|mr|mrs|ms|miss|mx|sister)\s+/, '')
      if (seen.has(key) || team.length >= 80) continue
      seen.add(key)
      team.push({ ...member, id: `im-${team.length + 1}` })
    }
  }

  for (const page of teamPages) {
    const found = teamFromBlocks(htmlToBlocks(page.html, { findContent: true }))
    if (found.length >= 2) {
      structured = true
      add(found)
    }
  }

  if (!team.length) for (const page of teamPages) add(teamFromProse(page.html))

  return { team, structured, source: teamPages[0]?.url || '' }
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

  // The other sites, which also tell us whose the second number is.
  const branches = findSites(pages, name, phones[0] || '')
  const branchPhones = new Set(branches?.sites.map((s) => s.phone).filter(Boolean))

  if (phones[1] && !branchPhones.has(phones[1])) {
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

  const ods = findOdsCode(pages)

  const email = findEmail(pages, host)
  if (email) {
    // A public page can link to its ICB or another service's nhs.net mailbox.
    // Being a mailto link does not make it the practice's own email address,
    // unless it is on their own domain or carries their own practice code.
    const ownDomain =
      email.endsWith(`@${host.replace(/^www\./, '')}`) ||
      Boolean(ods && email.split('@')[0].toLowerCase().includes(ods.toLowerCase()))
    const source = pages.find(p => anchors(p.html, p.url).some(a =>
      a.href.toLowerCase().replace(/^mailto:/, '').split('?')[0] === email,
    ))?.url || home.url
    push('practice.email', 'Practice details', 'Email address', email, ownDomain ? 'medium' : 'low', source, {
      practice: { email },
    })
  } else {
    missing.push('email address')
  }

  if (branches) {
    const describe = (site: PracticeSite) =>
      [
        [site.addressLine1, site.addressLine2, site.town, site.postcode].filter(Boolean).join(', '),
        site.phone,
        site.sameHours ? '' : 'its own opening hours',
        site.notes ? 'a dispensary' : '',
      ]
        .filter(Boolean)
        .join(', ')
    push(
      'practice.sites',
      'Practice details',
      branches.sites.length === 1 ? 'Another site' : `${branches.sites.length} other sites`,
      `${branches.mainSiteName ? `Main surgery: ${branches.mainSiteName}. ` : ''}${branches.sites
        .map((site) => `${site.name}: ${describe(site)}`)
        .join('. ')}`,
      'medium',
      home.url,
      { practice: { mainSiteName: branches.mainSiteName, sites: branches.sites } },
    )
  }

  const address = findAddress(pages)
  if (address && (address.line1 || address.postcode)) {
    const display = [address.line1, address.line2, address.town, address.county, address.postcode]
      .filter(Boolean)
      .join(', ')
    push('practice.address', 'Practice details', 'Address', display, address.line1 ? 'medium' : 'low', home.url, {
      practice: {
        addressLine1: address.line1,
        addressLine2: address.line2 || '',
        town: address.town,
        county: address.county,
        postcode: address.postcode,
      },
    })
  } else {
    missing.push('address')
  }

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

  const online = findOnline(pages, siteHost, ods)
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

  const { team, structured, source: teamSource } = findTeam(pages)
  if (team.length) {
    const withRoles = team.filter((t) => t.role && t.role !== 'GP').length
    push(
      'team',
      'Team',
      structured
        ? `${team.length} staff, with ${withRoles === team.length ? 'job titles' : 'job titles where given'} and groups`
        : `${team.length} possible staff ${team.length === 1 ? 'name' : 'names'}`,
      team.map((t) => (t.role ? `${t.name} (${t.role})` : t.name)).join(', '),
      // Read from the page's structure, names and titles together, it is
      // usually right. Guessed from prose it often is not.
      structured && withRoles >= team.length / 2 ? 'medium' : 'low',
      teamSource || home.url,
      { team },
    )
  } else {
    missing.push('staff list')
  }

  /* page wording */

  // One offer per template page. Several pages on a site can match the same
  // target, and asking a practice to choose between three "About" pages is
  // worse than picking the fullest one for them. Policies are offered one
  // each, and the same policy found twice (an expander and its own page) is
  // offered once, from whichever copy says more.
  const best = new Map<string, ImportedPage>()
  const policies = new Map<string, ImportedPolicy>()

  for (const page of pages) {
    if (!page.target) continue

    const found = importPage(page.html, page.url, title(page.html), page.target)

    for (const imported of found.pages) {
      const existing = best.get(imported.target.key)
      if (!existing || imported.wordCount > existing.wordCount) best.set(imported.target.key, imported)
    }
    for (const policy of found.policies) {
      const existing = policies.get(policy.key)
      if (!existing || policy.wordCount > existing.wordCount) policies.set(policy.key, policy)
    }
  }

  const pageFindings: PageFinding[] = [
    ...[...best.values()].map(toPageFinding),
    ...distinctPolicies([...policies.values()], [...best.values()]).map(toPolicyFinding),
  ]

  if (!pageFindings.length) missing.push('page wording')

  return {
    siteUrl: home.url,
    pagesRead: pages.map((p) => ({ url: p.url, kind: p.kind })),
    findings,
    pageFindings,
    missing,
  }
}

function normWords(text: string): string {
  return text.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim()
}

function wordSet(text: string): Set<string> {
  return new Set(normWords(text).split(' ').slice(0, 80))
}

/** How much of the shorter text the longer one also says, from 0 to 1. */
function overlap(a: string, b: string): number {
  const x = wordSet(a)
  const y = wordSet(b)
  let shared = 0
  for (const word of x) if (y.has(word)) shared += 1
  return shared / Math.max(1, Math.min(x.size, y.size))
}

/** How much of `text` is also in `within`, from 0 to 1. */
function coveredBy(text: string, within: string): number {
  const x = wordSet(text)
  const y = wordSet(within)
  let shared = 0
  for (const word of x) if (y.has(word)) shared += 1
  return shared / Math.max(1, x.size)
}

/** Each section of a page's Markdown, by its heading. */
function sectionsOf(markdown: string): Map<string, string> {
  const out = new Map<string, string>()
  const parts = markdown.split(/^#{2,3} /m).slice(1)
  for (const part of parts) {
    const [heading, ...body] = part.split('\n')
    out.set(normWords(heading), body.join('\n'))
  }
  return out
}

/**
 * Each policy once.
 *
 * Practice365 sites often have a policy twice, as an expander on the practice
 * information page and as a page of its own, sometimes under different names
 * ("Non NHS services" and "Non-NHS (private) services"). The fuller copy is
 * kept. A policy already offered as a section of another page, like "Disabled
 * access" on the About page, is not offered a second time.
 */
function distinctPolicies(policies: ImportedPolicy[], pages: ImportedPage[]): ImportedPolicy[] {
  const order = new Map(policies.map((p, i) => [p, i]))
  const kept: ImportedPolicy[] = []
  for (const policy of [...policies].sort((a, b) => b.wordCount - a.wordCount)) {
    if (kept.some((k) => overlap(k.markdown, policy.markdown) > 0.6)) continue
    kept.push(policy)
  }

  // Only where the page says the same thing under the same heading. A list
  // of links with a line of teaser text under each is not the policy itself.
  const sections = pages.map((page) => sectionsOf(page.markdown))
  const alreadyOffered = (policy: ImportedPolicy) =>
    sections.some((map) => {
      const section = map.get(normWords(policy.title))
      return section !== undefined && coveredBy(policy.markdown, section) > 0.6
    })

  return kept
    .filter((policy) => !alreadyOffered(policy))
    .sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0))
}

function toPolicyFinding(policy: ImportedPolicy): PageFinding {
  return {
    id: `policy.${policy.key}`,
    targetKind: 'policy',
    targetKey: policy.key,
    targetLabel: policy.title,
    statutory: policy.core,
    caution: policy.core ? CORE_POLICY_CAUTION : '',
    issues: policy.issues,
    sourceUrl: policy.sourceUrl,
    sourceTitle: policy.title,
    excerpt: policy.excerpt,
    wordCount: policy.wordCount,
    markdown: policy.markdown,
  }
}

function toPageFinding(imported: ImportedPage): PageFinding {
  return {
    id: `page.${imported.target.kind}.${imported.target.key}`,
    targetKind: imported.target.kind,
    targetKey: imported.target.key,
    targetLabel: imported.target.label,
    statutory: Boolean(imported.target.statutory),
    caution: imported.target.caution || '',
    issues: imported.issues,
    sourceUrl: imported.sourceUrl,
    sourceTitle: imported.sourceTitle,
    excerpt: imported.excerpt,
    wordCount: imported.wordCount,
    markdown: imported.markdown,
  }
}
