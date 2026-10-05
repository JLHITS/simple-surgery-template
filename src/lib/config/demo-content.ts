import { defaultConfig } from './defaults'
import { deepEqual, isPlainObject, mergeDeep } from './merge'
import type { SiteConfig } from './types'

/**
 * The demo practice.
 *
 * Frogmorton Medical Centre is a fiction, and it used to live in `defaults.ts`
 * as the seed content every site started from. That made the demo look good and
 * every real practice look wrong: a newly bought site inherited Bilbo Baggins
 * as its practice manager, an address in the Eastfarthing, and a CQC rating
 * nobody had earned, because the loader deep merges saved content over the
 * defaults and a new site has almost nothing saved.
 *
 * So the showcase content lives here instead, as an overlay applied to exactly
 * one deployment: the one whose SITE_KEY says it is the demo. Everybody else
 * gets the neutral defaults.
 *
 * Keeping it as an overlay rather than a second full document matters twice
 * over. The demo keeps picking up improvements to the shared wording in
 * `defaults.ts` automatically, and this file doubles as the definition of
 * "demo content" for the migration in `config/index.ts` that takes it back out
 * of practice sites seeded before the split.
 *
 * Nothing here may be real. The ODS code is outside the allocated range, the
 * phone numbers are in the 01632 960xxx range Ofcom reserves for fiction, and
 * the email domains end in .example.
 */
export const demoOverlay = {
  practice: {
    name: 'Frogmorton Medical Centre',
    strapline: 'NHS GP surgery in Frogmorton',
    // Deliberately not a real ODS code. Real ones map to real practices.
    odsCode: 'Z99999',
    logoAlt: 'Frogmorton Medical Centre',
    addressLine1: '14 Bywater Road',
    town: 'Frogmorton',
    county: 'Eastfarthing',
    postcode: 'SH1 4RE',
    // 01632 960xxx is the range Ofcom reserves for use in fiction, so these
    // numbers cannot ring a real person no matter who types them in.
    phone: '01632 960 118',
    phoneSecondary: '01632 960 119',
    phoneSecondaryLabel: 'Prescriptions line',
    email: 'reception@frogmorton.example',
    parkingInfo:
      'We have 12 patient parking spaces at the front of the building. Two of these are blue badge spaces beside the main door.',
    accessInfo:
      'The building is on one level. There are no steps at the entrance. We have an accessible toilet and a hearing loop at reception.',
    publicTransportInfo:
      'The surgery is on the East Road, opposite The Floating Log. The nearest bus stop is a two minute walk.',
    boundaryDescription:
      'We can register you if you live inside our practice area. It covers Frogmorton, Bywater and the villages along the East Road as far as Whitfurrows.',
    boundaryPostcodes: 'SH1, SH2, SH3 4, SH3 5',
    // A branch, to show how a practice with more than one surgery looks:
    // shorter hours than the main site, its own number and its own parking.
    mainSiteName: 'Frogmorton',
    sites: [
      {
        id: 'site-bywater',
        name: 'Bywater',
        addressLine1: 'The Old Mill',
        addressLine2: 'Mill Lane',
        town: 'Bywater',
        county: 'Eastfarthing',
        postcode: 'SH2 7GD',
        phone: '01632 960 120',
        sameHours: false,
        days: [
          { day: 'monday', closed: false, open: '08:30', close: '12:30' },
          { day: 'tuesday', closed: true, open: '08:30', close: '12:30' },
          { day: 'wednesday', closed: false, open: '08:30', close: '12:30' },
          { day: 'thursday', closed: true, open: '08:30', close: '12:30' },
          { day: 'friday', closed: false, open: '08:30', close: '12:30' },
          { day: 'saturday', closed: true, open: '08:30', close: '12:30' },
          { day: 'sunday', closed: true, open: '08:30', close: '12:30' },
        ],
        notes:
          'Free parking in the village hall car park opposite. Step free access through the side door.',
      },
    ],
  },

  hours: {
    closures: [
      { date: '2026-08-31', reason: 'Summer bank holiday', allDay: true },
      {
        date: '2026-09-17',
        reason: 'Staff training afternoon',
        allDay: false,
        from: '13:00',
        to: '18:30',
      },
      { date: '2026-12-25', reason: 'Christmas Day', allDay: true },
      { date: '2026-12-26', reason: 'Boxing Day', allDay: true },
      { date: '2027-01-01', reason: "New Year's Day", allDay: true },
    ],

    extendedAccess: {
      enabled: true,
      location: 'Four Farthings Health Hub, Bywater',
      days: [
        { day: 'monday', closed: false, open: '18:30', close: '20:00' },
        { day: 'tuesday', closed: true, open: '18:30', close: '20:00' },
        { day: 'wednesday', closed: false, open: '18:30', close: '20:00' },
        { day: 'thursday', closed: true, open: '18:30', close: '20:00' },
        { day: 'friday', closed: true, open: '18:30', close: '20:00' },
        { day: 'saturday', closed: false, open: '09:00', close: '13:00' },
        { day: 'sunday', closed: true, open: '09:00', close: '13:00' },
      ],
    },

    accessModes: {
      enabled: true,
      walkIn: 'Monday to Friday, 8am to 6:30pm',
      telephone: 'Monday to Friday, 8am to 6:30pm',
      onlineConsultation: 'Monday to Friday, 8am to 6:30pm',
      note: 'All three are available throughout our core hours. We are closed on bank holidays.',
    },
  },

  notice: {
    enabled: true,
    level: 'info',
    title: 'Flu and COVID-19 vaccinations',
    body:
      'Our autumn vaccination clinics are now open. If you are eligible we will text you an invitation. You can also book using the NHS App.',
    linkUrl: '/services/vaccinations',
    linkText: 'Read about vaccinations',
    expiresOn: '2026-12-31',
  },

  team: [
    {
      id: 'tm-1',
      name: 'Dr Rosie Cotton',
      gender: 'Female',
      role: 'GP Partner',
      group: 'Doctors',
      bio: 'Dr Cotton has worked at the practice since 2014. She has a special interest in diabetes and long term conditions.',
      availability: 'Monday, Tuesday, Thursday',
    },
    {
      id: 'tm-2',
      name: 'Dr Meriadoc Brandybuck',
      gender: 'Male',
      role: 'GP Partner',
      group: 'Doctors',
      bio: 'Dr Brandybuck leads our work on heart health. He also supervises our trainee doctors.',
      availability: 'Monday to Friday',
    },
    {
      id: 'tm-3',
      name: 'Dr Poppy Proudfoot',
      gender: 'Female',
      role: 'Salaried GP',
      group: 'Doctors',
      bio: "Dr Proudfoot has a special interest in women's health and contraception.",
      availability: 'Wednesday, Thursday, Friday',
    },
    {
      id: 'tm-4',
      name: 'Marigold Gamgee',
      gender: 'Female',
      role: 'Advanced Nurse Practitioner',
      group: 'Nursing team',
      bio: 'Marigold can assess, diagnose and prescribe for many everyday illnesses.',
      availability: 'Monday to Thursday',
    },
    {
      id: 'tm-5',
      name: 'Hamfast Gardner',
      gender: 'Male',
      role: 'Practice Nurse',
      group: 'Nursing team',
      bio: 'Hamfast runs our asthma, diabetes and travel health clinics.',
    },
    {
      id: 'tm-6',
      name: 'Barliman Butterbur',
      gender: 'Male',
      role: 'Clinical Pharmacist',
      group: 'Nursing team',
      bio: 'Barliman reviews medicines and can answer questions about your prescriptions.',
    },
    {
      id: 'tm-7',
      name: 'Bilbo Baggins',
      gender: 'Male',
      role: 'Practice Manager',
      group: 'Management and reception',
      bio: 'Bilbo manages the practice and handles complaints and feedback.',
    },
    {
      id: 'tm-8',
      name: 'Reception team',
      role: 'Patient services',
      group: 'Management and reception',
      bio: 'Our receptionists are trained to help you reach the right person. They will ask what you need so they can book you correctly.',
    },
  ],

  news: {
    practiceNews: [
      {
        id: 'pn-1',
        title: 'New online request system',
        date: '2026-07-14',
        body: 'You can now send us a request about any health problem online. We reply within 2 working days. Nothing has changed if you prefer to phone us.',
        pinned: false,
      },
      {
        id: 'pn-2',
        title: 'Car park resurfacing in September',
        date: '2026-06-30',
        body: 'Our car park will be resurfaced during the week of 21 September. Parking will be limited. Please allow extra time or use the street parking on Bywater Road.',
        pinned: false,
      },
    ],
  },

  compliance: {
    cqcRating: 'Good',
    cqcReportUrl: 'https://www.cqc.org.uk/',
    icbName: 'NHS Shire and Buckland Integrated Care Board',
    pcnName: 'Four Farthings Primary Care Network',
    dataProtectionOfficer: 'Bilbo Baggins',
    dataProtectionEmail: 'dpo@frogmorton.example',
    icoRegistration: 'Z1234567',
    complaintsEmail: 'complaints@frogmorton.example',
    complaintsContactName: 'Bilbo Baggins, Practice Manager',
    icbComplaintsEmail: 'complaints@shireandbuckland.example',
    icbComplaintsPhone: '01632 960 940',
    icbComplaintsAddress: 'Patient Experience Team, NHS Shire and Buckland ICB, Bywater',
    gpEarningsAmount: '£78,400',
    gpEarningsFullTime: '2',
    gpEarningsPartTime: '3',
    gpEarningsLocum: '0',
    gpEarningsYear: '2025/26',
    accessibilityPreparedOn: '2026-08-06',
    accessibilityReviewedOn: '2026-08-06',
  },

  advanced: {
    siteUrl: 'https://demo.simplesurgery.co',
  },
} as const

/** The defaults with the showcase practice laid over the top. */
export const demoConfig: SiteConfig = mergeDeep(defaultConfig, demoOverlay)

/**
 * Sections that are cleaned whole or left completely alone.
 *
 * An address is a list of independent facts, so clearing the demo's town while
 * keeping a phone number the practice typed is right. A notice banner is not:
 * clearing its "on" switch but keeping a heading someone wrote would leave
 * them with a banner they had turned on, silently off, with nothing in it. If
 * the practice has touched any part of one of these, all of it is theirs.
 */
const ALL_OR_NOTHING = new Set(['notice', 'hours.extendedAccess', 'hours.accessModes'])

type Plain = Record<string, unknown>

/** Whether every field the demo set in here is still exactly as the demo set it. */
function untouched(stored: Plain, overlay: Plain): boolean {
  return Object.entries(overlay).every(
    ([key, value]) => key in stored && deepEqual(stored[key], value),
  )
}

/**
 * Takes the demo content back out of a site that was seeded with it.
 *
 * Pressing Save in the editor writes the whole merged document, so a practice
 * who opened their new site and saved anything at all baked Frogmorton into
 * their own stored content. Changing the defaults alone would never reach
 * them, which is why this runs as a schema migration on load.
 *
 * It removes only values that are still byte for byte what the demo shipped,
 * which is as close as we can get to "they never touched it". Anything they
 * edited stays, including anything they edited back to the same words. The
 * schema version gates it to a single run, so a practice that genuinely is
 * rated Good can type Good afterwards and keep it.
 */
export function stripDemoContent(stored: Plain, overlay: unknown = demoOverlay, path = ''): Plain {
  if (!isPlainObject(overlay)) return stored

  const out: Plain = { ...stored }
  for (const [key, demoValue] of Object.entries(overlay)) {
    if (!(key in out)) continue
    const here = path ? `${path}.${key}` : key
    const value = out[key]

    if (deepEqual(value, demoValue)) {
      delete out[key]
      continue
    }

    // Arrays and scalars that differ are the practice's own. Only objects are
    // worth going into, because the overlay covers part of most of them.
    if (!isPlainObject(value) || !isPlainObject(demoValue)) continue
    if (ALL_OR_NOTHING.has(here) && !untouched(value, demoValue)) continue

    const cleaned = stripDemoContent(value, demoValue, here)
    if (Object.keys(cleaned).length === 0) delete out[key]
    else out[key] = cleaned
  }
  return out
}
