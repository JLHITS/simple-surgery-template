/**
 * The complete shape of a practice website.
 *
 * Everything a practice can change lives in this one object. There is no other
 * source of content. Keep it flat and obvious: a practice manager should be able
 * to read the JSON and understand it without documentation.
 */

export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export type NoticeLevel = 'info' | 'warning' | 'urgent'

export interface OpeningDay {
  day: Weekday
  closed: boolean
  /** 24h "HH:MM". Ignored when closed. */
  open: string
  close: string
  /** Optional midday closure, e.g. training afternoons. */
  breakStart?: string
  breakEnd?: string
}

export interface Closure {
  /** ISO date, "YYYY-MM-DD". */
  date: string
  reason: string
  /** Set false and fill from/to for a part day closure. */
  allDay: boolean
  from?: string
  to?: string
}

export interface Notice {
  enabled: boolean
  level: NoticeLevel
  title: string
  body: string
  linkUrl?: string
  linkText?: string
  /** ISO date. The notice hides itself after this date with no staff action. */
  expiresOn?: string
}

export interface TeamMember {
  id: string
  name: string
  role: string
  /** Free text, e.g. "GP Partner", used to group the team grid. */
  group: string
  bio?: string
  photoUrl?: string
  /** Shown as "Dr Smith is available on Monday and Thursday". */
  availability?: string
  /**
   * Optional, and blank by default.
   *
   * Patients often want to ask for a female or male clinician, for an intimate
   * examination or for cultural or religious reasons, and having it on the page
   * saves them a phone call to ask. It is the practice's choice whether to
   * publish it and each staff member's choice whether to be listed.
   */
  gender?: '' | 'Female' | 'Male' | 'Non-binary'
}

export interface ServiceItem {
  id: string
  slug: string
  title: string
  summary: string
  /** Markdown-lite. See lib/markdown.ts for the supported subset. */
  body: string
  /** Key of an icon in components/Icon.tsx. */
  icon?: string
  featured: boolean
}

export interface InfoPage {
  id: string
  slug: string
  title: string
  /** One sentence shown under the heading and in listings. */
  summary: string
  body: string
  /** Statutory pages cannot be deleted from the admin panel. */
  statutory: boolean
  showInFooter: boolean
  order: number
}

export interface PracticeNewsItem {
  id: string
  title: string
  date: string
  body: string
  linkUrl?: string
  pinned: boolean
}

export interface QuickLink {
  id: string
  label: string
  description: string
  href: string
  icon?: string
  /** Opens in a new tab and gets an external link marker. */
  external: boolean
}

export interface SiteConfig {
  /** Bumped when the shape changes so migrations can run. */
  schemaVersion: number
  /** ISO timestamp of the last admin save. Displayed in the footer. */
  updatedAt: string

  practice: {
    name: string
    /** Short line under the name, e.g. "NHS GP surgery in Fairfield". */
    strapline: string
    /** ODS / practice code, e.g. "A81001". Used to link the NHS profile page. */
    odsCode: string
    logoUrl: string
    logoAlt: string
    addressLine1: string
    addressLine2: string
    town: string
    county: string
    postcode: string
    phone: string
    /** Optional secondary number, e.g. a dedicated prescriptions line. */
    phoneSecondary: string
    phoneSecondaryLabel: string
    email: string
    /** Google Maps embed src, or blank to show a static address card instead. */
    mapEmbedUrl: string
    parkingInfo: string
    accessInfo: string
    publicTransportInfo: string
  }

  hours: {
    days: OpeningDay[]
    /** Shown under the table, e.g. "Phone lines open at 8am." */
    notes: string
    closures: Closure[]
    /** What patients should do when the practice is shut. */
    outOfHoursInfo: string
    /** Hours during which reception can be reached, if different. */
    receptionNote: string

    /**
     * Enhanced access, still widely called extended access by patients.
     *
     * Since October 2022, PCNs have had to offer appointments outside core
     * hours: weekday evenings and Saturdays. They are often delivered at a hub
     * rather than at the practice, and sometimes by a different team, so they
     * are modelled separately rather than being folded into the normal opening
     * hours. Showing them as if they were core hours would send patients to a
     * locked front door.
     */
    extendedAccess: {
      enabled: boolean
      /** Shown as the panel heading, e.g. "Evening and weekend appointments". */
      title: string
      description: string
      /** Blank means the appointments are held at the practice itself. */
      location: string
      days: OpeningDay[]
      /** How to book, e.g. "Call us or ask through the NHS App." */
      bookingNote: string
    }
  }

  urgent: {
    /** Shown in the always-visible urgent care strip. */
    emergencyText: string
    lifeThreateningText: string
    nhs111Text: string
    pharmacyText: string
  }

  online: {
    /**
     * The practice's online request tool (Accurx, eConsult, Klinik, PATCHS...).
     * NHS England guidance says never to show the supplier's brand name to
     * patients, so the label is deliberately generic and not configurable
     * beyond wording.
     */
    requestUrl: string
    requestOpenNote: string
    prescriptionUrl: string
    registrationUrl: string
    nhsAppUrl: string
    patientAccessUrl: string
    systmOnlineUrl: string
    /** Extra buttons for anything not covered above. */
    extraLinks: QuickLink[]
  }

  notice: Notice

  /**
   * Body copy for the pages that have a fixed structure.
   *
   * The layout of these pages is set in code so it stays compliant, but every
   * word is editable. Markdown-lite, same subset as everywhere else.
   */
  content: {
    appointmentsIntro: string
    appointmentsBody: string
    prescriptionsIntro: string
    prescriptionsBody: string
    aboutIntro: string
    aboutBody: string
    contactIntro: string
  }

  team: TeamMember[]
  services: ServiceItem[]
  pages: InfoPage[]

  news: {
    /** Pull national NHS news automatically. This is the whole point. */
    nhsFeedEnabled: boolean
    /** RSS/Atom URLs. Defaults to NHS England. */
    feedUrls: string[]
    /** How many national stories to show on /news. */
    feedCount: number
    /** How many to show on the home page. Set 0 to hide from home. */
    homeCount: number
    practiceNews: PracticeNewsItem[]
  }

  compliance: {
    cqcRating: string
    cqcReportUrl: string
    /** "Integrated Care Board", e.g. "NHS Sussex ICB". */
    icbName: string
    icbUrl: string
    pcnName: string
    dataProtectionOfficer: string
    dataProtectionEmail: string
    icoRegistration: string
    complaintsEmail: string
    complaintsContactName: string
    /** Mandatory annual GP earnings declaration. */
    gpEarningsStatement: string
    gpEarningsAmount: string
    gpEarningsFullTime: string
    gpEarningsPartTime: string
    gpEarningsLocum: string
    gpEarningsYear: string
  }

  /** Advanced settings. Practices should rarely need to touch these. */
  advanced: {
    /** Accent colour. Defaults to NHS Blue. */
    accentColour: string
    /** 'nhs' locks brand colours, 'custom' honours accentColour everywhere. */
    colourMode: 'nhs' | 'custom'
    cornerRadius: 'square' | 'soft' | 'round'
    /**
     * Shows the NHS logo in the header and footer.
     *
     * On by default. NHS England's guidance asks practice sites to carry NHS
     * branding because patients use it to tell a real NHS service from a
     * private clinic. It is a setting rather than a fixture because the logo is
     * a protected trademark and the decision to display it belongs to the
     * practice, not to the template.
     */
    showNhsLogo: boolean
    /**
     * The week-at-a-glance bar chart above the opening hours.
     *
     * On by default because it answers "can I be seen on Saturday?" faster than
     * a list of times can. A practice with unusual hours, or one that simply
     * prefers the plain table, can turn it off without losing any information:
     * everything the chart shows is also written out underneath it.
     */
    showHoursTimeline: boolean
    showSearch: boolean
    showTeam: boolean
    showNewsInNav: boolean
    /** Canonical origin, used for sitemap, robots and social cards. */
    siteUrl: string
    /** Plausible/Fathom/Umami script src. Left blank means no analytics at all. */
    analyticsScriptUrl: string
    analyticsSiteId: string
    footerNote: string
    /** Hides the "Built with Simple Surgery" credit on paid deployments. */
    showCredit: boolean
  }
}

/** A single editable section of the admin panel. */
export type AdminSection =
  | 'practice'
  | 'hours'
  | 'notice'
  | 'online'
  | 'team'
  | 'services'
  | 'pages'
  | 'news'
  | 'compliance'
  | 'advanced'
