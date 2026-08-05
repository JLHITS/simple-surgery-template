import type {
  Closure,
  InfoPage,
  NoticeLevel,
  OpeningDay,
  PracticeNewsItem,
  QuickLink,
  ServiceItem,
  SiteConfig,
  TeamMember,
  Weekday,
} from './types'

/**
 * Server side validation of everything the admin panel sends.
 *
 * The client is not trusted. Anything that reaches storage has been through
 * here, which means:
 *
 *   - every string is length capped, so nobody can fill the store with junk
 *   - every URL is checked against a scheme allowlist, so javascript: and
 *     data:text/html can never end up in an href on a patient-facing page
 *   - colours must be hex, because they are injected into a <style> tag
 *   - slugs are forced to lowercase kebab case, so they cannot collide with a
 *     real route or escape their folder
 *   - statutory pages cannot be deleted, because publishing them is a
 *     contractual requirement, not a preference
 */

const WEEKDAYS: Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

const LIMITS = {
  short: 200,
  medium: 1000,
  long: 20_000,
  url: 2000,
  /** A base64 logo is allowed to be larger than a normal URL. */
  image: 1_200_000,
  listItems: 200,
}

type Plain = Record<string, unknown>

function obj(value: unknown): Plain {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Plain)
    : {}
}

/**
 * Removes control characters that have no business in website copy and can
 * break a JSON round trip. Tab, newline and carriage return are deliberately
 * kept, because the Markdown body fields depend on them.
 */
function stripControlChars(value: string): string {
  let out = ''
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0
    const isAllowedWhitespace = code === 9 || code === 10 || code === 13
    if (code === 127) continue
    if (code < 32 && !isAllowedWhitespace) continue
    out += char
  }
  return out
}

function str(value: unknown, fallback = '', max = LIMITS.short): string {
  if (typeof value !== 'string') return fallback
  return stripControlChars(value).slice(0, max)
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function num(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value.slice(0, LIMITS.listItems) : []
}

/**
 * URLs are the main injection risk on this site, because they end up in href
 * attributes. Only these schemes are ever allowed through.
 */
function url(value: unknown, fallback = ''): string {
  const raw = str(value, '', LIMITS.url).trim()
  if (!raw) return ''

  if (raw.startsWith('/') || raw.startsWith('#')) return raw

  const lower = raw.toLowerCase()
  const allowed = ['https://', 'http://', 'mailto:', 'tel:']
  if (!allowed.some((scheme) => lower.startsWith(scheme))) return fallback

  return raw
}

/** Image sources may additionally be a data: URI, for the inline logo fallback. */
function imageUrl(value: unknown, fallback = ''): string {
  const raw = str(value, '', LIMITS.image).trim()
  if (!raw) return ''

  const lower = raw.toLowerCase()
  if (lower.startsWith('data:image/')) {
    // Reject anything that smuggles markup inside a data URI.
    if (/[<>]/.test(raw)) return fallback
    return raw
  }

  return url(raw, fallback)
}

function hexColour(value: unknown, fallback: string): string {
  const raw = str(value, '', 16).trim()
  return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : fallback
}

function slug(value: unknown, fallback: string): string {
  const raw = str(value, '', 80)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return raw || fallback
}

function isoDate(value: unknown, fallback = ''): string {
  const raw = str(value, '', 10).trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : fallback
}

function time(value: unknown, fallback: string): string {
  const raw = str(value, '', 5).trim()
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(raw) ? raw : fallback
}

function id(value: unknown, prefix: string, index: number): string {
  const raw = str(value, '', 40).replace(/[^a-zA-Z0-9_-]/g, '')
  return raw || `${prefix}-${index + 1}`
}

function oneOf<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback
}

/* ------------------------------------------------------------------ pieces */

function sanitiseDays(value: unknown, fallback: OpeningDay[]): OpeningDay[] {
  const incoming = arr(value)

  // Always return exactly seven days in a fixed order, whatever arrives.
  return WEEKDAYS.map((day, i) => {
    const source = obj(incoming.find((d) => obj(d).day === day) ?? incoming[i])
    const base = fallback.find((d) => d.day === day) ?? {
      day,
      closed: true,
      open: '09:00',
      close: '17:00',
    }

    const result: OpeningDay = {
      day,
      closed: bool(source.closed, base.closed),
      open: time(source.open, base.open),
      close: time(source.close, base.close),
    }

    const breakStart = time(source.breakStart, '')
    const breakEnd = time(source.breakEnd, '')
    if (breakStart && breakEnd) {
      result.breakStart = breakStart
      result.breakEnd = breakEnd
    }

    return result
  })
}

function sanitiseClosures(value: unknown): Closure[] {
  return arr(value)
    .map((item) => {
      const source = obj(item)
      const date = isoDate(source.date)
      if (!date) return null

      const closure: Closure = {
        date,
        reason: str(source.reason, 'Closed'),
        allDay: bool(source.allDay, true),
      }

      if (!closure.allDay) {
        closure.from = time(source.from, '09:00')
        closure.to = time(source.to, '17:00')
      }

      return closure
    })
    .filter((c): c is Closure => c !== null)
    .sort((a, b) => a.date.localeCompare(b.date))
}

function sanitiseTeam(value: unknown): TeamMember[] {
  return arr(value)
    .map((item, i): TeamMember | null => {
      const source = obj(item)
      const name = str(source.name)
      if (!name) return null

      return {
        id: id(source.id, 'tm', i),
        name,
        role: str(source.role),
        group: str(source.group, 'Team'),
        bio: str(source.bio, '', LIMITS.medium),
        photoUrl: imageUrl(source.photoUrl),
        availability: str(source.availability),
      }
    })
    .filter((m): m is TeamMember => m !== null)
}

function sanitiseServices(value: unknown): ServiceItem[] {
  const seen = new Set<string>()

  return arr(value)
    .map((item, i): ServiceItem | null => {
      const source = obj(item)
      const title = str(source.title)
      if (!title) return null

      let itemSlug = slug(source.slug, `service-${i + 1}`)
      while (seen.has(itemSlug)) itemSlug = `${itemSlug}-2`
      seen.add(itemSlug)

      return {
        id: id(source.id, 'sv', i),
        slug: itemSlug,
        title,
        summary: str(source.summary, '', LIMITS.medium),
        body: str(source.body, '', LIMITS.long),
        icon: str(source.icon, '', 32),
        featured: bool(source.featured),
      }
    })
    .filter((s): s is ServiceItem => s !== null)
}

function sanitisePages(value: unknown, fallback: InfoPage[]): InfoPage[] {
  const seen = new Set<string>()

  const pages = arr(value)
    .map((item, i): InfoPage | null => {
      const source = obj(item)
      const title = str(source.title)
      if (!title) return null

      let pageSlug = slug(source.slug, `page-${i + 1}`)
      while (seen.has(pageSlug)) pageSlug = `${pageSlug}-2`
      seen.add(pageSlug)

      // Whether a page is statutory is decided by the template, not the editor.
      const original = fallback.find((p) => p.slug === pageSlug)

      return {
        id: id(source.id, 'pg', i),
        slug: pageSlug,
        title,
        summary: str(source.summary, '', LIMITS.medium),
        body: str(source.body, '', LIMITS.long),
        statutory: original?.statutory ?? false,
        showInFooter: bool(source.showInFooter, true),
        order: num(source.order, (i + 1) * 10, 0, 9999),
      }
    })
    .filter((p): p is InfoPage => p !== null)

  // Restore any statutory page that was removed. Publishing these is a
  // contractual requirement, so the admin panel is not allowed to drop them.
  for (const required of fallback.filter((p) => p.statutory)) {
    if (!pages.some((p) => p.slug === required.slug)) pages.push(required)
  }

  return pages
}

function sanitiseNewsItems(value: unknown): PracticeNewsItem[] {
  return arr(value)
    .map((item, i): PracticeNewsItem | null => {
      const source = obj(item)
      const title = str(source.title)
      if (!title) return null

      return {
        id: id(source.id, 'pn', i),
        title,
        date: isoDate(source.date, new Date().toISOString().slice(0, 10)),
        body: str(source.body, '', LIMITS.long),
        linkUrl: url(source.linkUrl),
        pinned: bool(source.pinned),
      }
    })
    .filter((n): n is PracticeNewsItem => n !== null)
}

function sanitiseQuickLinks(value: unknown): QuickLink[] {
  return arr(value)
    .map((item, i): QuickLink | null => {
      const source = obj(item)
      const label = str(source.label)
      const href = url(source.href)
      if (!label || !href) return null

      return {
        id: id(source.id, 'ql', i),
        label,
        description: str(source.description, '', LIMITS.medium),
        href,
        icon: str(source.icon, '', 32),
        external: bool(source.external, /^https?:\/\//.test(href)),
      }
    })
    .filter((l): l is QuickLink => l !== null)
}

/* ------------------------------------------------------------------- main */

export function sanitiseConfig(input: unknown, fallback: SiteConfig): SiteConfig {
  const source = obj(input)
  if (!Object.keys(source).length) {
    throw new Error('There were no changes to save.')
  }

  const practice = obj(source.practice)
  const hours = obj(source.hours)
  const urgent = obj(source.urgent)
  const online = obj(source.online)
  const notice = obj(source.notice)
  const content = obj(source.content)
  const news = obj(source.news)
  const compliance = obj(source.compliance)
  const advanced = obj(source.advanced)

  const name = str(practice.name, fallback.practice.name)
  if (!name.trim()) throw new Error('The practice name cannot be empty.')

  return {
    schemaVersion: fallback.schemaVersion,
    updatedAt: new Date().toISOString(),

    practice: {
      name,
      strapline: str(practice.strapline, fallback.practice.strapline),
      odsCode: str(practice.odsCode, '', 20).toUpperCase().replace(/[^A-Z0-9]/g, ''),
      logoUrl: imageUrl(practice.logoUrl, fallback.practice.logoUrl),
      logoAlt: str(practice.logoAlt, name),
      addressLine1: str(practice.addressLine1),
      addressLine2: str(practice.addressLine2),
      town: str(practice.town),
      county: str(practice.county),
      postcode: str(practice.postcode, '', 12).toUpperCase(),
      phone: str(practice.phone, '', 32),
      phoneSecondary: str(practice.phoneSecondary, '', 32),
      phoneSecondaryLabel: str(practice.phoneSecondaryLabel),
      email: str(practice.email, '', 120),
      mapEmbedUrl: url(practice.mapEmbedUrl),
      parkingInfo: str(practice.parkingInfo, '', LIMITS.medium),
      accessInfo: str(practice.accessInfo, '', LIMITS.medium),
      publicTransportInfo: str(practice.publicTransportInfo, '', LIMITS.medium),
    },

    hours: {
      days: sanitiseDays(hours.days, fallback.hours.days),
      notes: str(hours.notes, '', LIMITS.medium),
      closures: sanitiseClosures(hours.closures),
      outOfHoursInfo: str(hours.outOfHoursInfo, fallback.hours.outOfHoursInfo, LIMITS.medium),
      receptionNote: str(hours.receptionNote, '', LIMITS.medium),
    },

    urgent: {
      emergencyText: str(urgent.emergencyText, fallback.urgent.emergencyText, LIMITS.medium),
      lifeThreateningText: str(
        urgent.lifeThreateningText,
        fallback.urgent.lifeThreateningText,
        LIMITS.medium,
      ),
      nhs111Text: str(urgent.nhs111Text, fallback.urgent.nhs111Text, LIMITS.medium),
      pharmacyText: str(urgent.pharmacyText, fallback.urgent.pharmacyText, LIMITS.medium),
    },

    online: {
      requestUrl: url(online.requestUrl),
      requestOpenNote: str(online.requestOpenNote, '', LIMITS.medium),
      prescriptionUrl: url(online.prescriptionUrl),
      registrationUrl: url(online.registrationUrl, fallback.online.registrationUrl),
      nhsAppUrl: url(online.nhsAppUrl, fallback.online.nhsAppUrl),
      patientAccessUrl: url(online.patientAccessUrl),
      systmOnlineUrl: url(online.systmOnlineUrl),
      extraLinks: sanitiseQuickLinks(online.extraLinks),
    },

    notice: {
      enabled: bool(notice.enabled),
      level: oneOf<NoticeLevel>(notice.level, ['info', 'warning', 'urgent'], 'info'),
      title: str(notice.title),
      body: str(notice.body, '', LIMITS.medium),
      linkUrl: url(notice.linkUrl),
      linkText: str(notice.linkText),
      expiresOn: isoDate(notice.expiresOn),
    },

    content: {
      appointmentsIntro: str(
        content.appointmentsIntro,
        fallback.content.appointmentsIntro,
        LIMITS.medium,
      ),
      appointmentsBody: str(content.appointmentsBody, '', LIMITS.long),
      prescriptionsIntro: str(
        content.prescriptionsIntro,
        fallback.content.prescriptionsIntro,
        LIMITS.medium,
      ),
      prescriptionsBody: str(content.prescriptionsBody, '', LIMITS.long),
      aboutIntro: str(content.aboutIntro, fallback.content.aboutIntro, LIMITS.medium),
      aboutBody: str(content.aboutBody, '', LIMITS.long),
      contactIntro: str(content.contactIntro, fallback.content.contactIntro, LIMITS.medium),
    },

    team: sanitiseTeam(source.team),
    services: sanitiseServices(source.services),
    pages: sanitisePages(source.pages, fallback.pages),

    news: {
      nhsFeedEnabled: bool(news.nhsFeedEnabled, true),
      feedUrls: arr(news.feedUrls)
        .map((u) => url(u))
        .filter((u) => /^https?:\/\//.test(u))
        .slice(0, 5),
      feedCount: num(news.feedCount, 8, 1, 30),
      homeCount: num(news.homeCount, 3, 0, 10),
      practiceNews: sanitiseNewsItems(news.practiceNews),
    },

    compliance: {
      cqcRating: str(compliance.cqcRating),
      cqcReportUrl: url(compliance.cqcReportUrl),
      icbName: str(compliance.icbName),
      icbUrl: url(compliance.icbUrl),
      pcnName: str(compliance.pcnName),
      dataProtectionOfficer: str(compliance.dataProtectionOfficer),
      dataProtectionEmail: str(compliance.dataProtectionEmail, '', 120),
      icoRegistration: str(compliance.icoRegistration, '', 40),
      complaintsEmail: str(compliance.complaintsEmail, '', 120),
      complaintsContactName: str(compliance.complaintsContactName),
      gpEarningsStatement: str(
        compliance.gpEarningsStatement,
        fallback.compliance.gpEarningsStatement,
        LIMITS.medium,
      ),
      gpEarningsAmount: str(compliance.gpEarningsAmount, '', 40),
      gpEarningsFullTime: str(compliance.gpEarningsFullTime, '', 10),
      gpEarningsPartTime: str(compliance.gpEarningsPartTime, '', 10),
      gpEarningsLocum: str(compliance.gpEarningsLocum, '', 10),
      gpEarningsYear: str(compliance.gpEarningsYear, '', 20),
    },

    advanced: {
      accentColour: hexColour(advanced.accentColour, '#005EB8'),
      colourMode: oneOf(advanced.colourMode, ['nhs', 'custom'] as const, 'nhs'),
      cornerRadius: oneOf(advanced.cornerRadius, ['square', 'soft', 'round'] as const, 'soft'),
      showNhsLogo: bool(advanced.showNhsLogo, true),
      showSearch: bool(advanced.showSearch, true),
      showTeam: bool(advanced.showTeam, true),
      showNewsInNav: bool(advanced.showNewsInNav, false),
      siteUrl: url(advanced.siteUrl),
      analyticsScriptUrl: url(advanced.analyticsScriptUrl),
      analyticsSiteId: str(advanced.analyticsSiteId, '', 120),
      footerNote: str(advanced.footerNote, '', LIMITS.medium),
      showCredit: bool(advanced.showCredit, true),
    },
  }
}
