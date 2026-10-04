import { contentNode, expandersIn, isShouting, plainText, sentenceCase, toMarkdown, type ConvertOptions } from './convert'
import { detach, findFirst, parseHtml, type DomNode, type ElementNode } from './dom'
import { tidy } from './html'

/**
 * Turning a page of somebody else's website into the template's Markdown.
 *
 * Three jobs. Find the part of the page that is actually the content, work out
 * which of the template's pages it belongs to, and convert it into the Markdown
 * subset the template renders (see convert.ts). All three are lossy and meant
 * to be: the output is shown to a person who decides whether to keep it.
 *
 * What is deliberately thrown away: images, embedded video, styling, anything
 * in a form. A practice moving suppliers wants its words, and the template
 * supplies the layout.
 */

/** The options every imported page is converted with. */
function importOptions(base: string, dropTitle: string, top: 2 | 3 = 2): ConvertOptions {
  return { base, findContent: false, tidy: true, promoteBold: true, dropTitle, top, rankHeadings: true }
}

/** A whole page, converted. Kept for callers that only want the Markdown. */
export function htmlToMarkdown(html: string, base: string): string {
  return toMarkdown(html, { ...importOptions(base, ''), findContent: true })
}

/* ------------------------------------------------------- matching to pages */

export type TargetKind = 'contentField' | 'page' | 'service'

export interface PageTarget {
  /** Where it goes. */
  kind: TargetKind
  /** The config field, or the slug of the page or service. */
  key: string
  label: string
  /**
   * URL and title fragments that identify this page on somebody else's site.
   * Written to match both a URL slug and a heading: "gp-earnings" and
   * "GP Earnings" are the same page.
   */
  pattern: RegExp
  /**
   * True where the template writes this page to meet a legal or contractual
   * requirement, against current guidance, so the practice does not have to.
   *
   * These are offered but never ticked by default, and ticking one shows the
   * reason it is risky. The page on the old site was very often written by the
   * outgoing supplier for their whole estate rather than by this practice, so
   * importing it swaps wording somebody maintains for wording nobody does.
   */
  statutory?: boolean
  /** The specific risk, shown when a practice ticks a statutory page. */
  caution?: string
}

/**
 * Shown whenever a practice ticks one of the compliance pages.
 *
 * The template's argument for its own wording, stated once so the practice can
 * weigh it rather than discover it later.
 */
export const STATUTORY_WARNING =
  'The page we supply is written against current NHS England, CQC and Information Commissioner guidance, and we keep it that way as the rules change. The page on your old site was very often written by your previous supplier for every practice on their platform, not by you, and nobody has updated it since. Bringing it across replaces wording we maintain with wording that is already as old as the site you are leaving.'

/** The caution on a policy that covers ground the template already covers. */
export const CORE_POLICY_CAUTION =
  'Chaperone, zero tolerance, confidentiality and data sharing policies are CQC expectations, and the template keeps its own versions current. Bringing yours across replaces ours on your Practice policies page.'

export const TARGETS: PageTarget[] = [
  {
    kind: 'contentField',
    key: 'appointmentsBody',
    label: 'Appointments',
    pattern: /appointment|book|consultation|see[\s-]a[\s-](gp|doctor)/i,
  },
  {
    kind: 'contentField',
    key: 'prescriptionsBody',
    label: 'Prescriptions',
    pattern: /prescription|repeat[\s-]medic|medication/i,
  },
  {
    kind: 'contentField',
    key: 'aboutBody',
    label: 'About the surgery',
    pattern: /about|practice[\s-]info|surgery[\s-]info|who[\s-]we[\s-]are|welcome/i,
  },
  {
    kind: 'service',
    key: 'test-results',
    label: 'Test results',
    pattern: /test[\s-]results?|results|blood[\s-]tests?/i,
  },
  { kind: 'service', key: 'fit-notes', label: 'Fit notes', pattern: /(fit|sick)[\s-]?notes?/i },
  {
    kind: 'service',
    key: 'register',
    label: 'Registering with the practice',
    pattern: /register|new[\s-]patients?|joining/i,
  },
  {
    kind: 'service',
    key: 'vaccinations',
    label: 'Vaccinations',
    pattern: /vaccinat|immunis|flu[\s-]jab|covid/i,
  },
  {
    kind: 'service',
    key: 'clinics',
    label: 'Clinics and long term conditions',
    pattern: /clinic\b|clinics|long[\s-]term|chronic|diabet|asthma/i,
  },
  {
    kind: 'service',
    key: 'self-referral',
    label: 'Referring yourself',
    pattern: /self[\s-]refer|refer[\s-]yourself/i,
  },
  {
    kind: 'service',
    key: 'proxy-access',
    label: 'Help someone else with their care',
    pattern: /proxy|carer[\s-]access|on[\s-]behalf/i,
  },
  {
    kind: 'service',
    key: 'online-services',
    label: 'Managing your health online',
    pattern: /online[\s-]services?|online[\s-]access|patient[\s-]online/i,
  },
  {
    kind: 'page',
    key: 'patient-group',
    label: 'Patient Participation Group',
    pattern: /patient[\s-](participation|group)|\bppg\b/i,
  },
  { kind: 'page', key: 'carers', label: 'Support for carers', pattern: /carer/i },

  /* ------------------------------------------------------------ compliance */

  {
    kind: 'page',
    key: 'policies',
    label: 'Practice policies',
    // Not "website policies", which is where suppliers put cookie notices.
    pattern: /practice[\s-]polic|surgery[\s-]polic|chaperone|zero[\s-]tolerance|violence|confidentiality/i,
    statutory: true,
    caution: CORE_POLICY_CAUTION,
  },
  {
    kind: 'page',
    key: 'complaints',
    label: 'Complaints and feedback',
    pattern: /complaint|concerns?[\s-]procedure/i,
    statutory: true,
    caution:
      'Complaints about a GP practice go to your Integrated Care Board, and have since July 2023. Most older pages still send patients to NHS England, which no longer handles them.',
  },
  {
    kind: 'page',
    key: 'privacy',
    label: 'Privacy notice',
    // Hyphenated deliberately: a "Data Protection" section on a policies page
    // is a policy, but a page at /data-protection/ is the privacy notice.
    pattern: /privacy|data-protection|gdpr|fair[\s-]processing/i,
    statutory: true,
    caution:
      'A privacy notice has to describe your own processing. The template gives you a current draft to adapt rather than an old one to inherit.',
  },
  {
    kind: 'page',
    key: 'accessibility',
    label: 'Accessibility statement',
    pattern: /accessibility/i,
    statutory: true,
    caution:
      'An accessibility statement describes the website it is published on. Yours describes your old website, and would be wrong here from the day you go live.',
  },
  {
    kind: 'page',
    key: 'freedom-of-information',
    label: 'Freedom of information',
    pattern: /freedom[\s-]of[\s-]information|\bfoi\b|publication[\s-]scheme/i,
    statutory: true,
    caution:
      'The template ships the publication scheme guide and charging schedule the Information Commissioner expects. Most older pages list the seven categories and stop there.',
  },
  {
    kind: 'page',
    key: 'named-gp',
    label: 'Your named GP',
    pattern: /named[\s-](accountable[\s-])?gp|accountable[\s-]gp/i,
    statutory: true,
    caution: 'The wording the template supplies already meets the contractual requirement.',
  },
  {
    kind: 'page',
    key: 'gp-earnings',
    label: 'GP earnings',
    pattern: /gp[\s-]earning|net[\s-]earnings/i,
    statutory: true,
    caution:
      'The figures must be for the most recent year. An imported page carries whatever year your old site last published, and the template takes the figures from Compliance instead.',
  },
  {
    kind: 'page',
    key: 'patient-charter',
    label: 'You and your general practice',
    pattern: /patients?['’]?[\s-]charter|you[\s-]and[\s-]your[\s-]general[\s-]practice/i,
    statutory: true,
    caution:
      'Your contract requires this page to link to NHS England’s own document. The template does. An imported page almost certainly will not.',
  },
]

/** Where every policy goes. Each one becomes a section of this page. */
export const POLICIES_TARGET = TARGETS.find((t) => t.key === 'policies') as PageTarget

/**
 * What a practice policy looks like, by its address or its title.
 *
 * Practice365 keeps these in a /policies/ folder, or as expanders on a
 * "practice information" page, and they are practice specific: a sedation for
 * flying policy or a fee for seat belt exemptions is nothing the template could
 * write for them. They used to be either ignored or swept into the About page.
 */
const POLICY =
  /polic(y|ies)|chaperon|zero[\s-]?tolerance|violen|aggressi|confidential|data[\s-]?(protection|sharing)|personal[\s-]?data|summary[\s-]?care[\s-]?record|fear[\s-]?of[\s-]?flying|diazepam|benzodiazepine|seat[\s-]?belt|extreme[\s-]?sports?|non[\s-]?nhs|private[\s-]?(work|fees?)|\bfees\b|removal[\s-](from|of)|did[\s-]?not[\s-]?attend|\bdnas?\b|missed[\s-]?appointments?|\bconsent\b|cctv|social[\s-]?media|patient[\s-](rights|responsibilit)|firearms?|medical[\s-](certificates|reports)|certificates/i

/** A policies folder: /policies/, /practice-policies/, /our-policies/. */
const POLICY_FOLDER = /\/[\w-]*polic(y|ies)\//i

/**
 * Sections that are never a template page, whatever their words say.
 *
 * A news item titled "new website feedback" matched the complaints page, and a
 * form embed matched the patient group page. Neither is the practice's
 * complaints procedure or PPG page, and both would have been offered as one.
 */
const NEVER_A_PAGE =
  /\/(news|blog|events?|articles?|category|categories|tag|tags|author|archives?|search|form|forms|feed|comments?|attachment|wp-content)(\/|$)/i

/** "Policy" in the name, or a policies folder: a policy whatever else it says. */
const NAMED_POLICY = /polic(y|ies)/i

/**
 * The template page a URL or a heading belongs to, or null.
 *
 * In order: compliance pages, so "Privacy policy" is the privacy notice rather
 * than a policy. The specific services and pages, so "Carers information" in
 * a policies folder is still the carers page. Then policies, by name, folder
 * or subject, so "Missed appointments policy" is not the appointments page.
 * Last the three general pages, which match almost anything.
 */
export function targetFor(url: string, pageTitle: string): PageTarget | null {
  let path = url
  try {
    path = new URL(url).pathname
  } catch {
    /* use the whole string, which may be empty for a section heading */
  }

  if (NEVER_A_PAGE.test(path)) return null

  const leaf = path.replace(/\/$/, '').split('/').pop() || ''
  const haystack = `${leaf} ${pageTitle}`
  const matches = (t: PageTarget) => t.pattern.test(haystack)

  const statutory = TARGETS.find((t) => t.statutory && t !== POLICIES_TARGET && matches(t))
  if (statutory) return statutory

  const specific = TARGETS.find((t) => !t.statutory && t.kind !== 'contentField' && matches(t))
  if (specific) return specific

  if (NAMED_POLICY.test(haystack) || POLICY_FOLDER.test(path)) return POLICIES_TARGET
  if (POLICY.test(haystack) || matches(POLICIES_TARGET)) return POLICIES_TARGET

  return TARGETS.find((t) => t.kind === 'contentField' && matches(t)) || null
}

/** True for the page or section that should be offered as a policy. */
export function isPolicyTarget(target: PageTarget | null | undefined): boolean {
  return target === POLICIES_TARGET
}

/* ---------------------------------------------------------------- wording */

/**
 * Wording the template deliberately avoids, and why.
 *
 * This is the template's whole argument in one list. NHS England's guidance on
 * GP websites comes out of user testing with over 160 patients, and the wording
 * it rules out is wording that measurably confused them. The supplied content
 * follows it; a page lifted off an old site does not, and importing enough of
 * those pages quietly turns a compliant website back into an ordinary one.
 *
 * So imported wording is checked against the same rules, and anything that
 * trips one is shown to the practice with the reason and left unticked. The
 * practice can still take it. They just cannot take it by accident.
 */
export const GUIDANCE_CHECKS: { pattern: RegExp; problem: string }[] = [
  {
    pattern: /\bonline consultations?\b/i,
    problem:
      '"Online consultation" was not understood by 83% of patients tested. The template says "request an appointment online".',
  },
  {
    pattern: /\btriage\b/i,
    problem: 'Patients read "triage" as being turned away. NHS England guidance advises against it.',
  },
  {
    pattern: /\bclinicians?\b/i,
    problem: 'Tested patients did not reliably know what a "clinician" is. Name the role instead.',
  },
  {
    pattern: /\bemergency appointments?\b/i,
    problem: '"Emergency appointment" is confused with A&E. The template says "urgent".',
  },
  {
    pattern: /\b(econsult|e-consult|patchs|accurx|florey|systmonline|patient access|klinik|engage consult|airmid|askmygp|doctorlink|anima)\b/i,
    problem:
      'Supplier product names should not be shown to patients. NHS England guidance is explicit, and the template links the tool without naming it.',
  },
  {
    pattern: /\bdial 999\b|\bring 999\b/i,
    problem: 'The template uses "call 999" throughout, which tested better than "dial" or "ring".',
  },
  {
    pattern: /\.pdf\b/i,
    problem:
      'This links to a PDF. NHS England guidance says the format is not accessible, and the template publishes everything as a normal page.',
  },
  {
    pattern: /\bsurgery is closed\b.*\bcall\b.*\b111\b/i,
    problem: 'Check this against the urgent care wording the template already shows on every page.',
  },
]

export interface WordingIssue {
  /** The phrase found, as it appeared. */
  found: string
  problem: string
}

/** Checks imported wording against the guidance the template is built on. */
export function checkWording(markdown: string): WordingIssue[] {
  const issues: WordingIssue[] = []

  for (const { pattern, problem } of GUIDANCE_CHECKS) {
    const m = pattern.exec(markdown)
    if (m) issues.push({ found: m[0], problem })
  }

  return issues
}

/* ------------------------------------------------------------ the offers */

interface Converted {
  markdown: string
  wordCount: number
  /** First couple of lines, as plain text, for the review list. */
  excerpt: string
  /** Where the imported wording departs from the guidance the template follows. */
  issues: WordingIssue[]
}

export interface ImportedPage extends Converted {
  target: PageTarget
  sourceUrl: string
  sourceTitle: string
}

/** One policy, offered as a section of the Practice policies page. */
export interface ImportedPolicy extends Converted {
  /** Its heading on the policies page. */
  title: string
  /** Stable across scans, and shared by two copies of the same policy. */
  key: string
  /** Covers ground the template's own policies page already covers. */
  core: boolean
  sourceUrl: string
}

/** Roughly what the sanitiser will accept for a long body. */
const MAX_BODY = 38_000

/** Fewer words than this is a fragment, not a page. */
const MIN_PAGE_WORDS = 40
const MIN_SECTION_WORDS = 20

function finish(markdown: string, minWords: number): Converted | null {
  const body = markdown.slice(0, MAX_BODY).trim()
  if (!body) return null

  const words = body.split(/\s+/).filter(Boolean)
  if (words.length < minWords) return null

  // Mostly links is how a navigation page looks once the markup is gone.
  const linkCount = (body.match(/\]\(/g) || []).length
  if (linkCount > 0 && words.length / linkCount < 8) return null

  const excerpt = body
    .split('\n')
    .filter((line) => line.trim() && !line.startsWith('#'))
    .slice(0, 2)
    .join(' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/^([->]|\d+\.)\s+/gm, '')
    .slice(0, 220)

  return { markdown: body, wordCount: words.length, excerpt, issues: checkWording(body) }
}

/** A heading as the template would write it. */
function cleanTitle(text: string): string {
  const title = tidy(text).replace(/\s*:\s*$/, '')
  return isShouting(title) ? sentenceCase(title) : title
}

function policyKey(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-?polic(y|ies)$/, '') || 'policy'
  )
}

export type PolicyTopic = 'chaperone' | 'violence' | 'confidentiality' | 'data'

/** The part of the template's policies page a policy covers, if any. */
export function policyTopic(title: string): PolicyTopic | null {
  const t = title.toLowerCase()
  if (/chaperon/.test(t)) return 'chaperone'
  if (/violen|zero[\s-]?tolerance|aggress|abus|removal/.test(t)) return 'violence'
  if (/confidential/.test(t)) return 'confidentiality'
  if (/\bdata\b|gdpr|summary care record|information sharing/.test(t)) return 'data'
  return null
}

function toPolicy(title: string, sourceUrl: string, converted: Converted): ImportedPolicy {
  const clean = cleanTitle(title)
  return {
    ...converted,
    title: clean,
    key: policyKey(clean),
    core: policyTopic(clean) !== null,
    sourceUrl,
  }
}

/** A page's own name: its main heading, or failing that its title tag. */
function pageHeading(root: ElementNode, region: ElementNode, documentTitle: string): string {
  const h1 = findFirst(region, (el) => el.tag === 'h1') || findFirst(root, (el) => el.tag === 'h1')
  const heading = h1 ? plainText(h1) : ''
  if (heading && heading.length <= 120) return heading
  return tidy(documentTitle.split(/\s[|–—»-]\s/)[0] || documentTitle)
}

/** "Practice policies" or "Our policies": a page that holds several. */
const GENERIC_POLICIES = /^(our\s+)?((practice|surgery)\s+)?polic(y|ies)\b/i

/**
 * Converts one crawled page into what can be offered from it.
 *
 * Usually that is one page of wording. Two cases give more:
 *
 *   A hub page, like Practice365's "Practice information", holding a dozen
 *   expanders on unrelated subjects. Each expander is matched on its own, so
 *   the carers expander is offered for the carers page and the chaperone
 *   expander as a policy, and only what is left goes to the hub's own target.
 *
 *   A policy page, which becomes a policy rather than replacing the template's
 *   whole policies page. A general "Practice policies" page with a heading per
 *   policy becomes one policy per heading.
 */
export function importPage(
  html: string,
  url: string,
  documentTitle: string,
  target: PageTarget,
): { pages: ImportedPage[]; policies: ImportedPolicy[] } {
  const pages: ImportedPage[] = []
  const policies: ImportedPolicy[] = []

  const root = parseHtml(html)
  const region = contentNode(root)
  const heading = pageHeading(root, region, documentTitle)

  // A page filed under /policies/ whose own heading names a specific page,
  // like "Carers information", belongs to that page.
  const named = heading ? targetFor('', heading) : null
  if (isPolicyTarget(target) && named && !isPolicyTarget(named) && named.kind !== 'contentField') {
    target = named
  }

  // Hub pages: three or more expanders, at least two of which belong
  // somewhere other than the page they sit on.
  const expanders = expandersIn(region).map((expander) => ({
    expander,
    target: targetFor('', expander.title),
  }))
  const elsewhere = expanders.filter(({ target: t }) => t && (t.key !== target.key || isPolicyTarget(t)))

  if (expanders.length >= 3 && elsewhere.length >= 2) {
    for (const { expander, target: sectionTarget } of elsewhere) {
      detach(expander.element)
      const nodes: DomNode[] = expander.body
      const title = cleanTitle(expander.title)

      if (isPolicyTarget(sectionTarget)) {
        const converted = finish(toMarkdown(nodes, importOptions(url, title, 3)), MIN_SECTION_WORDS)
        if (converted) policies.push(toPolicy(title, url, converted))
        continue
      }

      const converted = finish(toMarkdown(nodes, importOptions(url, title)), MIN_SECTION_WORDS)
      if (converted && sectionTarget) {
        pages.push({ ...converted, target: sectionTarget, sourceUrl: url, sourceTitle: `${heading}: ${title}` })
      }
    }

    // What is left is the hub's own wording, unless the hub is a policies
    // page, whose introduction is not a policy of its own.
    if (!isPolicyTarget(target)) {
      const converted = finish(toMarkdown(region, importOptions(url, heading)), MIN_PAGE_WORDS)
      if (converted) pages.push({ ...converted, target, sourceUrl: url, sourceTitle: heading })
    }

    return { pages, policies }
  }

  if (isPolicyTarget(target)) {
    // A page of several policies, one heading each.
    const whole = toMarkdown(region, importOptions(url, heading))
    const sections = whole.split(/^## /m).slice(1)
    if (GENERIC_POLICIES.test(heading) && sections.length >= 2) {
      for (const section of sections) {
        const [first, ...rest] = section.split('\n')
        const converted = finish(rest.join('\n').trim(), MIN_SECTION_WORDS)
        if (converted) policies.push(toPolicy(first, url, converted))
      }
      return { pages, policies }
    }

    const converted = finish(toMarkdown(region, importOptions(url, heading, 3)), MIN_SECTION_WORDS)
    if (converted) policies.push(toPolicy(heading, url, converted))
    return { pages, policies }
  }

  const converted = finish(toMarkdown(region, importOptions(url, heading)), MIN_PAGE_WORDS)
  if (converted) pages.push({ ...converted, target, sourceUrl: url, sourceTitle: heading || documentTitle })
  return { pages, policies }
}

/* ------------------------------------------------- the policies page itself */

/**
 * The headings on the template's own policies page, and what each covers.
 *
 * Only these are ever replaced. An imported "Data protection" policy replaces
 * the template's "Data sharing" section, but a second imported data policy
 * must not then replace the first.
 */
const TEMPLATE_POLICY_SECTIONS: Record<string, PolicyTopic> = {
  chaperones: 'chaperone',
  'zero tolerance': 'violence',
  confidentiality: 'confidentiality',
  'data sharing': 'data',
  'violence and removal from the list': 'violence',
}

function normHeading(text: string): string {
  return text.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim()
}

/**
 * Adds one policy to the body of the Practice policies page.
 *
 * It goes on the end as its own section. Where it covers ground one of the
 * template's sections covers, that section is taken out, so the page never
 * says two different things about chaperones. Bringing the same policy across
 * twice replaces it rather than adding it again.
 */
export function mergePolicySection(body: string, title: string, markdown: string): string {
  const sections: { heading: string | null; lines: string[] }[] = [{ heading: null, lines: [] }]
  for (const line of (body || '').replace(/\r\n/g, '\n').split('\n')) {
    if (line.startsWith('## ')) sections.push({ heading: line.slice(3).trim(), lines: [line] })
    else sections[sections.length - 1].lines.push(line)
  }

  const topic = policyTopic(title)
  const kept = sections.filter((section) => {
    if (section.heading === null) return true
    const heading = normHeading(section.heading)
    if (heading === normHeading(title)) return false
    return !(topic && TEMPLATE_POLICY_SECTIONS[heading] === topic)
  })

  const existing = kept
    .map((section) => section.lines.join('\n'))
    .join('\n')
    .trim()
  const added = `## ${title}\n\n${markdown.replace(/^## /gm, '### ').trim()}`
  return existing ? `${existing}\n\n${added}` : added
}
