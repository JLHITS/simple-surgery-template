import { attr, tidy, toText } from './html'

/**
 * Turning a page of somebody else's website into the template's Markdown.
 *
 * Two jobs. Find the part of the page that is actually the content, and convert
 * it into the six-rule Markdown subset the template renders. Both are lossy and
 * both are meant to be: the output is shown to a person who decides whether to
 * keep it.
 *
 * What is deliberately thrown away: images, tables, embedded video, styling,
 * anything in a form. A practice moving suppliers wants its words, and the
 * template supplies the layout.
 */

/** Whole elements that are never content, removed before anything else. */
const STRIP_ELEMENTS =
  /<(script|style|noscript|svg|template|form|nav|header|footer|aside|iframe|video|audio|figure|button|select|table)\b[\s\S]*?<\/\1\s*>/gi

/**
 * Wrappers whose contents are the page body, best first.
 *
 * Every supplier nests differently, but almost all of them land on one of
 * these. Finding the right container is what stops the menu and the cookie
 * banner being imported as practice content.
 */
const CONTAINERS: RegExp[] = [
  /<main\b[^>]*>([\s\S]*?)<\/main\s*>/i,
  /<article\b[^>]*>([\s\S]*?)<\/article\s*>/i,
  /<div\b[^>]*\b(?:id|class)\s*=\s*["'][^"']*\b(?:entry-content|page-content|post-content|main-content|content-area)\b[^"']*["'][^>]*>([\s\S]*?)<\/div\s*>/i,
  /<div\b[^>]*\brole\s*=\s*["']main["'][^>]*>([\s\S]*?)<\/div\s*>/i,
  /<div\b[^>]*\bid\s*=\s*["'](?:content|main)["'][^>]*>([\s\S]*?)<\/div\s*>/i,
]

/** Lines that are supplier furniture rather than practice content. */
const BOILERPLATE =
  /^(skip to (main )?content|cookie|we use cookies|accept all|back to top|share this|print this page|last updated|page last reviewed|search|menu|home|toggle navigation|website (design|supplied|powered) by|©|copyright|all rights reserved|designed and (built|developed) by|privacy and cookies)\b/i

/**
 * Finds the content region, or falls back to the whole body.
 *
 * The fallback matters: plenty of older practice sites have no semantic
 * container at all, and refusing to read those would rule out exactly the
 * suppliers people most want to leave.
 */
function contentRegion(html: string): string {
  const body = /<body\b[^>]*>([\s\S]*?)<\/body\s*>/i.exec(html)
  const source = body ? body[1] : html
  const cleaned = source.replace(STRIP_ELEMENTS, ' ').replace(/<!--[\s\S]*?-->/g, ' ')

  for (const pattern of CONTAINERS) {
    const m = pattern.exec(cleaned)
    // A container with almost nothing in it is the wrong container.
    if (m && m[1] && toText(m[1]).length > 200) return m[1]
  }

  return cleaned
}

/** Inline markup, converted before the block structure is walked. */
function inlineToMarkdown(html: string, base: string): string {
  let out = html

  out = out.replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi, (_, __, inner: string) => {
    const text = tidy(toText(inner))
    return text ? `**${text}**` : ''
  })

  out = out.replace(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi, (whole, attrs: string, inner: string) => {
    const text = tidy(toText(inner))
    if (!text) return ''

    const raw = attr(attrs, 'href')
    if (!raw) return text

    let href = raw
    if (!/^(mailto|tel):/i.test(raw)) {
      try {
        href = new URL(raw, base).toString()
      } catch {
        return text
      }
    }

    // The renderer only allows these, so anything else becomes plain text
    // rather than a link that silently disappears.
    if (!/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(href)) return text
    // A link whose text is the URL reads badly twice over.
    return text === href ? href : `[${text}](${href})`
  })

  return out
}

/**
 * Converts a content region into the template's Markdown subset.
 *
 * Handled: h2 to h6 as headings, paragraphs, unordered and ordered lists,
 * blockquotes, bold and links. Everything else becomes a paragraph or is
 * dropped.
 */
export function htmlToMarkdown(html: string, base: string): string {
  const source = inlineToMarkdown(contentRegion(html), base)
  const blocks: string[] = []

  // Walk the block-level elements in document order. Anything not matched by
  // this is not structure worth keeping.
  const BLOCK =
    /<(h[1-6]|p|li|blockquote|dt|dd)\b([^>]*)>([\s\S]*?)<\/\1\s*>|<(ul|ol)\b[^>]*>/gi

  let listType: 'ul' | 'ol' = 'ul'
  let m: RegExpExecArray | null

  while ((m = BLOCK.exec(source)) !== null) {
    if (m[4]) {
      listType = m[4].toLowerCase() === 'ol' ? 'ol' : 'ul'
      continue
    }

    const tag = (m[1] || '').toLowerCase()
    const text = tidy(toText(m[3] || ''))

    if (!text || BOILERPLATE.test(text)) continue

    switch (tag) {
      case 'h1':
      case 'h2':
        blocks.push(`## ${text}`)
        break
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        blocks.push(`### ${text}`)
        break
      case 'li':
        blocks.push(listType === 'ol' ? `1. ${text}` : `- ${text}`)
        break
      case 'blockquote':
        blocks.push(`> ${text}`)
        break
      case 'dt':
        blocks.push(`### ${text}`)
        break
      default:
        blocks.push(text)
    }
  }

  return joinBlocks(blocks)
}

/** Blank lines between blocks, but not between consecutive list items. */
function joinBlocks(blocks: string[]): string {
  const out: string[] = []

  for (const block of blocks) {
    const isItem = /^(-|\d+\.)\s/.test(block)
    const lastIsItem = out.length > 0 && /^(-|\d+\.)\s/.test(out[out.length - 1])

    if (out.length && !(isItem && lastIsItem)) out.push('')
    out.push(block)
  }

  return out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/* ------------------------------------------------------- matching to pages */

export type TargetKind = 'contentField' | 'page' | 'service'

export interface PageTarget {
  /** Where it goes. */
  kind: TargetKind
  /** The config field, or the slug of the page or service. */
  key: string
  label: string
  /** URL and title fragments that identify this page on somebody else's site. */
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


export const TARGETS: PageTarget[] = [
  {
    kind: 'contentField',
    key: 'appointmentsBody',
    label: 'Appointments',
    pattern: /appointment|book|consultation|see-a-(gp|doctor)/i,
  },
  {
    kind: 'contentField',
    key: 'prescriptionsBody',
    label: 'Prescriptions',
    pattern: /prescription|repeat-medic|medication/i,
  },
  {
    kind: 'contentField',
    key: 'aboutBody',
    label: 'About the surgery',
    pattern: /about|practice-info|surgery-info|who-we-are|welcome/i,
  },
  {
    kind: 'service',
    key: 'test-results',
    label: 'Test results',
    pattern: /test-result|results|blood-test/i,
  },
  { kind: 'service', key: 'fit-notes', label: 'Fit notes', pattern: /fit-note|sick-note|sicknote/i },
  {
    kind: 'service',
    key: 'register',
    label: 'Registering with the practice',
    pattern: /register|new-patient|joining/i,
  },
  {
    kind: 'service',
    key: 'vaccinations',
    label: 'Vaccinations',
    pattern: /vaccinat|immunis|flu-jab|covid/i,
  },
  {
    kind: 'service',
    key: 'clinics',
    label: 'Clinics and long term conditions',
    pattern: /clinic|long-term|chronic|diabet|asthma/i,
  },
  {
    kind: 'service',
    key: 'self-referral',
    label: 'Referring yourself',
    pattern: /self-refer|refer-yourself/i,
  },
  {
    kind: 'service',
    key: 'proxy-access',
    label: 'Help someone else with their care',
    pattern: /proxy|carer-access|on-behalf/i,
  },
  {
    kind: 'service',
    key: 'online-services',
    label: 'Managing your health online',
    pattern: /online-service|online-access|patient-online/i,
  },
  {
    kind: 'page',
    key: 'patient-group',
    label: 'Patient Participation Group',
    pattern: /patient-(participation|group)|\bppg\b/i,
  },
  { kind: 'page', key: 'carers', label: 'Support for carers', pattern: /carer/i },

  /* ------------------------------------------------------------ compliance */

  {
    kind: 'page',
    key: 'policies',
    label: 'Practice policies',
    // Not "website policies", which is where suppliers put cookie notices.
    pattern: /practice-polic|surgery-polic|chaperone|zero-tolerance|violence|confidentiality/i,
    statutory: true,
    caution:
      'Chaperone, zero tolerance and data sharing policies are CQC expectations, and the template keeps them current.',
  },
  {
    kind: 'page',
    key: 'complaints',
    label: 'Complaints and feedback',
    pattern: /complaint|concerns?-procedure/i,
    statutory: true,
    caution:
      'Complaints about a GP practice go to your Integrated Care Board, and have since July 2023. Most older pages still send patients to NHS England, which no longer handles them.',
  },
  {
    kind: 'page',
    key: 'privacy',
    label: 'Privacy notice',
    pattern: /privacy|data-protection|gdpr|fair-processing/i,
    statutory: true,
    caution:
      'A privacy notice has to describe your own processing. The template gives you a current draft to adapt rather than an old one to inherit.',
  },
  {
    kind: 'page',
    key: 'accessibility',
    label: 'Accessibility statement',
    pattern: /accessib/i,
    statutory: true,
    caution:
      'An accessibility statement describes the website it is published on. Yours describes your old website, and would be wrong here from the day you go live.',
  },
  {
    kind: 'page',
    key: 'freedom-of-information',
    label: 'Freedom of information',
    pattern: /freedom-of-information|foi|publication-scheme/i,
    statutory: true,
    caution:
      'The template ships the publication scheme guide and charging schedule the Information Commissioner expects. Most older pages list the seven categories and stop there.',
  },
  {
    kind: 'page',
    key: 'named-gp',
    label: 'Your named GP',
    pattern: /named-gp|accountable-gp/i,
    statutory: true,
    caution: 'The wording the template supplies already meets the contractual requirement.',
  },
  {
    kind: 'page',
    key: 'gp-earnings',
    label: 'GP earnings',
    pattern: /gp-earning|net-earnings/i,
    statutory: true,
    caution:
      'The figures must be for the most recent year. An imported page carries whatever year your old site last published, and the template takes the figures from Compliance instead.',
  },
  {
    kind: 'page',
    key: 'patient-charter',
    label: 'You and your general practice',
    pattern: /patient-charter|you-and-your-general-practice|patients-charter/i,
    statutory: true,
    caution:
      'Your contract requires this page to link to NHS England’s own document. The template does. An imported page almost certainly will not.',
  },
]

/**
 * Sections that are never a template page, whatever their words say.
 *
 * A news item titled "new website feedback" matched the complaints page, and a
 * form embed matched the patient group page. Neither is the practice's
 * complaints procedure or PPG page, and both would have been offered as one.
 */
const NEVER_A_PAGE =
  /\/(news|blog|events?|articles?|category|categories|tag|tags|author|archives?|search|form|forms|feed|comments?|attachment|wp-content)(\/|$)/i

/** The first target a URL and title match, or null. */
export function targetFor(url: string, pageTitle: string): PageTarget | null {
  let path = url
  try {
    path = new URL(url).pathname
  } catch {
    /* use the whole string */
  }

  if (NEVER_A_PAGE.test(path)) return null

  const haystack = `${path} ${pageTitle}`
  return TARGETS.find((target) => target.pattern.test(haystack)) || null
}

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

export interface ImportedPage {
  target: PageTarget
  sourceUrl: string
  sourceTitle: string
  markdown: string
  wordCount: number
  /** First couple of lines, for the review list. */
  excerpt: string
  /** Where the imported wording departs from the guidance the template follows. */
  issues: WordingIssue[]
}

/** Roughly what the sanitiser will accept for a long body. */
const MAX_BODY = 18_000

/**
 * Converts one crawled page into something offerable, or returns null.
 *
 * Rejects anything too short to be worth importing, and anything that is mostly
 * links, which is how a navigation page looks once the markup is gone.
 */
export function toImportedPage(
  html: string,
  url: string,
  pageTitle: string,
  target: PageTarget,
): ImportedPage | null {
  const markdown = htmlToMarkdown(html, url).slice(0, MAX_BODY)
  if (!markdown) return null

  const words = markdown.split(/\s+/).filter(Boolean)
  if (words.length < 40) return null

  const linkCount = (markdown.match(/\]\(/g) || []).length
  if (linkCount > 0 && words.length / linkCount < 8) return null

  const excerpt = markdown
    .split('\n')
    .filter((line) => line.trim() && !line.startsWith('#'))
    .slice(0, 2)
    .join(' ')
    .slice(0, 220)

  return {
    target,
    sourceUrl: url,
    sourceTitle: pageTitle,
    markdown,
    wordCount: words.length,
    excerpt,
    issues: checkWording(markdown),
  }
}
