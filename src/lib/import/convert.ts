import { attrOf, classOf, findFirst, parseHtml, type DomNode, type ElementNode } from './dom'
import { decodeEntities } from './html'

/**
 * HTML into the template's Markdown subset.
 *
 * Used three ways, which is why the clean-ups are switchable:
 *
 *   import   a page of somebody else's website. Every clean-up on, because
 *            supplier markup is a mess and a practice should not spend an
 *            afternoon fixing headings after a migration.
 *   paste    something pasted into the editor from Word or a web page. Tidied,
 *            but nothing is promoted to a heading behind the person's back.
 *   editor   the editor's own HTML, converted back as it is. No guessing at
 *            all, or a line somebody made bold would come back as a heading.
 *
 * The output only ever uses what lib/markdown.tsx renders: two heading levels,
 * paragraphs, bullet and numbered lists, callouts, bold and links.
 */

export type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'para'; text: string; boldOnly?: boolean }
  | { type: 'item'; ordered: boolean; text: string; list: number }
  | { type: 'quote'; text: string; group: number }

export interface ConvertOptions {
  /** Resolve links against this address. Links back into the same site are dropped. */
  base?: string
  /** Find the content area of a whole page, rather than converting everything. */
  findContent?: boolean
  /** The clean-ups that make supplier markup read as written text. */
  tidy?: boolean
  /** Short bold lines on their own become headings. Implies tidy. */
  promoteBold?: boolean
  /** Remove a heading near the top that repeats the page's own title. */
  dropTitle?: string
  /**
   * What the most important heading becomes. 3 nests everything under a
   * section heading that the caller supplies, as policies do.
   */
  top?: 2 | 3
  /** Map heading levels by rank rather than by number. On when importing. */
  rankHeadings?: boolean
}

/* -------------------------------------------------------------- skipping */

/** Never content, wherever they appear. */
const SKIP_TAGS = new Set([
  'script', 'style', 'noscript', 'svg', 'template', 'form', 'nav', 'header', 'footer', 'aside',
  'iframe', 'video', 'audio', 'button', 'select', 'option', 'textarea', 'input', 'img',
  'picture', 'canvas', 'object', 'embed', 'map', 'head', 'label', 'fieldset', 'dialog',
  'figcaption', 'meta', 'link', 'title',
])

/**
 * Class names that mark something as not content.
 *
 * Matched as whole class names, never substrings: "social" would otherwise
 * remove a practice's social prescribing section along with its share buttons.
 */
const SKIP_CLASSES = new Set([
  // Text meant for screen readers only, like the "Non-urgent advice:" an NHS
  // care card hides before its heading. Read aloud it makes sense. Imported as
  // visible text it put "Non-urgent advice:" in front of every heading.
  'nhsuk-u-visually-hidden', 'visually-hidden', 'visuallyhidden', 'screen-reader-text',
  'sr-only', 'screen-reader-only', 'skip-link', 'nhsuk-skip-link',
  // Navigation and furniture.
  'nhsuk-breadcrumb', 'breadcrumb', 'breadcrumbs', 'nhsuk-back-link', 'nhsuk-pagination',
  'pagination', 'nav-links', 'post-navigation', 'entry-meta', 'entry-footer', 'widget',
  'widget-area', 'sidebar', 'comments-area', 'comment-respond', 'nhsuk-review-date',
  'search-form', 'wp-block-search', 'nhsuk-header', 'nhsuk-footer', 'site-header',
  'site-footer', 'nhsuk-contents-list',
  // Cookie banners, forms, sharing and embeds.
  'cookie-notice', 'cookie-banner', 'cookie-law-info-bar', 'cmplz-cookiebanner', 'frm_forms',
  'wpcf7', 'gform_wrapper', 'sharedaddy', 'addtoany_share_save_container', 'a2a_kit',
  'social-share', 'social-links', 'share-buttons', 'printfriendly', 'wp-block-embed',
  // Decoration inside accordions and cards.
  'advgb-accordion-header-icon', 'nhsuk-care-card__arrow',
])

const SKIP_ROLES = /^(navigation|banner|contentinfo|search|complementary|dialog|alertdialog)$/i

function skipped(el: ElementNode): boolean {
  if (SKIP_TAGS.has(el.tag)) return true
  const role = attrOf(el, 'role')
  if (role && SKIP_ROLES.test(role)) return true
  const cls = classOf(el)
  if (cls && cls.split(/\s+/).some((c) => SKIP_CLASSES.has(c.toLowerCase()))) return true
  return false
}

/* --------------------------------------------------------- page structure */

const BLOCK_TAGS = new Set([
  'address', 'article', 'body', 'center', 'dd', 'div', 'dl', 'figure', 'html', 'main', 'p',
  'pre', 'section', 'td', 'th', 'tr', 'tbody', 'thead', 'tfoot', 'caption', 'details', 'hgroup',
])

/** Where the page's own words are, most specific first. */
const CONTENT_CLASS =
  /(^|\s)(entry-content|page-content|post-content|article-content|page__content|single-content|content-body)(\s|$)/i
const FALLBACK_CLASS = /(^|\s)(main-content|content-area|site-content)(\s|$)/i
const FALLBACK_ID = /^(content|main|main-content|primary|maincontent)$/i

/** The element that holds a page's content, or the whole document. */
export function contentNode(root: ElementNode): ElementNode {
  const enough = (el: ElementNode | null): el is ElementNode =>
    Boolean(el) && plainText(el as ElementNode).length > 200

  const candidates: (ElementNode | null)[] = [
    findFirst(root, (el) => CONTENT_CLASS.test(classOf(el))),
    findFirst(root, (el) => el.tag === 'main'),
    findFirst(root, (el) => el.tag === 'article'),
    findFirst(root, (el) => attrOf(el, 'role').toLowerCase() === 'main'),
    findFirst(root, (el) => FALLBACK_CLASS.test(classOf(el)) || FALLBACK_ID.test(attrOf(el, 'id'))),
  ]
  for (const candidate of candidates) if (enough(candidate)) return candidate

  return findFirst(root, (el) => el.tag === 'body') || root
}

/**
 * Accordions and expanders.
 *
 * Practice365 sites put whole pages of policies inside these, one per
 * expander, under a single "practice information" page. Recognising them is
 * what lets each one be offered as its own section rather than as one very
 * long page.
 */
const ACCORDION_ITEM =
  /(^|\s)(wp-block-advgb-accordion-item|advgb-accordion-item|wp-block-pb-accordion-item|c-accordion__item|accordion-item|accordion__item|elementor-accordion-item|sp-ea-single|wp-block-coblocks-accordion-item|ub-content-toggle-accordion|schema-faq-section)(\s|$)/i
const ACCORDION_TITLE =
  /(^|\s)(advgb-accordion-header|accordion-header|accordion__title|accordion-title|accordion-heading|accordion-trigger|elementor-tab-title|ea-header|c-accordion__title|wp-block-coblocks-accordion-item__title|ub-content-toggle-title-wrap|schema-faq-question)(\s|$)/i
const ACCORDION_BODY =
  /(^|\s)(advgb-accordion-body|accordion-body|accordion__content|accordion-content|accordion-panel|accordion-collapse|elementor-tab-content|ea-body|c-accordion__content|ub-content-toggle-panel|schema-faq-answer)(\s|$)/i

export interface Expander {
  element: ElementNode
  title: string
  body: DomNode[]
}

/** An element as an expander, when it is one. */
export function asExpander(el: ElementNode): Expander | null {
  if (el.tag === 'details') {
    const summary = el.children.find(
      (c): c is ElementNode => c.type === 'element' && c.tag === 'summary',
    )
    if (!summary) return null
    return {
      element: el,
      title: plainText(summary),
      body: el.children.filter((c) => c !== summary),
    }
  }

  if (!ACCORDION_ITEM.test(classOf(el))) return null
  const title = findFirst(el, (c) => ACCORDION_TITLE.test(classOf(c)))
  const body = findFirst(el, (c) => ACCORDION_BODY.test(classOf(c)))
  if (!title || !body) return null
  return { element: el, title: plainText(title), body: [body] }
}

/** The outermost expanders in a region, in document order. */
export function expandersIn(root: ElementNode): Expander[] {
  const out: Expander[] = []
  const visit = (el: ElementNode) => {
    for (const child of el.children) {
      if (child.type !== 'element' || skipped(child)) continue
      const expander = asExpander(child)
      if (expander) {
        if (expander.title) out.push(expander)
        continue
      }
      visit(child)
    }
  }
  visit(root)
  return out
}

/* ----------------------------------------------------------------- text */

const ZERO_WIDTH = /[​-‍⁠﻿­]/g

/** Decoded, single spaced, trimmed. */
export function cleanText(raw: string): string {
  return decodeEntities(raw).replace(ZERO_WIDTH, '').replace(/\s+/g, ' ').trim()
}

/** Visible text only: hidden labels, icons and forms are left out. */
export function plainText(node: DomNode): string {
  const parts: string[] = []
  const visit = (n: DomNode) => {
    if (n.type === 'text') {
      parts.push(n.text)
      return
    }
    if (n.tag === 'br') {
      parts.push(' ')
      return
    }
    if (skipped(n)) return
    if (BLOCK_TAGS.has(n.tag) || /^h[1-6]$/.test(n.tag) || n.tag === 'li') parts.push(' ')
    n.children.forEach(visit)
    if (BLOCK_TAGS.has(n.tag) || /^h[1-6]$/.test(n.tag) || n.tag === 'li') parts.push(' ')
  }
  visit(node)
  return cleanText(parts.join(''))
}

/**
 * Emoji are decoration, and a screen reader reads every one aloud by name.
 * The trademark-style symbols are kept: they are pictographic to Unicode but
 * not to anybody reading.
 */
const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}️⃣]/gu
const KEEP_SYMBOLS = new Set(['©', '®', '™'])

function stripEmoji(text: string): string {
  return text.replace(EMOJI, (ch) => (KEEP_SYMBOLS.has(ch) ? ch : '')).replace(/ {2,}/g, ' ')
}

/** Words the template keeps in capitals when it turns SHOUTING into a sentence. */
const ACRONYM_LIST = [
  'NHS', 'GP', 'GPS', 'A&E', 'ICB', 'CQC', 'PCN', 'HCA', 'FCP', 'PPG', 'COVID', 'COVID-19', 'UK',
  'ID', 'IT', 'MMR', 'HPV', 'BCG', 'DNA', 'DNAS', 'ARRS', 'SCR', 'GDPR', 'FOI', 'ICO', 'HRT',
  'PPC', 'BMI', 'ECG', 'INR', 'MSK', 'ADHD', 'COPD', 'HIV', 'STI', 'IUD', 'IUS', 'LARC', 'SMS',
  'PDF', 'URL', 'BP', 'TB', 'ENT', 'NI', 'DWP', 'DVLA', 'GMC', 'NMC', 'RCGP', 'OOH', 'NHSE',
]
const ACRONYMS = new Map<string, string>(ACRONYM_LIST.map((a) => [a, a]))
ACRONYMS.set('GPS', 'GPs')
ACRONYMS.set('DNAS', 'DNAs')

/** Links and addresses, which must keep their case. */
const PROTECTED = /\]\([^)]*\)|https?:\/\/\S+|[\w.+-]+@[\w-]+(\.[\w-]+)+/g

/** True when text is in capitals throughout, and long enough for that to be shouting. */
export function isShouting(text: string): boolean {
  const letters = text.replace(PROTECTED, '').replace(/[^A-Za-z]/g, '')
  return letters.length >= 8 && letters === letters.toUpperCase()
}

/** "PLEASE CALL 111 AFTER 6.30PM" becomes "Please call 111 after 6.30pm". */
export function sentenceCase(text: string): string {
  const kept: string[] = []
  const masked = text.replace(PROTECTED, (match) => {
    kept.push(match)
    return `\u0000${kept.length - 1}\u0000`
  })

  let start = true
  const cased = masked.replace(/[A-Za-z][A-Za-z&'’-]*|[.!?]\s+/g, (token) => {
    if (/^[.!?]/.test(token)) {
      start = true
      return token
    }
    const upper = token.toUpperCase()
    const possessive = /['’]S$/.test(upper)
    const acronym = ACRONYMS.get(possessive ? upper.slice(0, -2) : upper)
    let out: string
    if (acronym) {
      out = possessive ? `${acronym}${token.slice(-2, -1)}s` : acronym
    } else if (upper === 'I') {
      out = 'I'
    } else {
      out = token.toLowerCase()
      if (start) out = out.charAt(0).toUpperCase() + out.slice(1)
    }
    start = false
    return out
  })

  return cased.replace(/\u0000(\d+)\u0000/g, (_, i: string) => kept[Number(i)])
}

/** Capitals for names: "o'brien-smith" becomes "O'Brien-Smith". */
export function titleCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/(^|[\s'’\-(])([a-z])/g, (_, before: string, letter: string) => before + letter.toUpperCase())
    .replace(/\bMc([a-z])/g, (_, letter: string) => `Mc${letter.toUpperCase()}`)
}

/* ---------------------------------------------------------------- links */

const DOCUMENT = /\.(pdf|docx?|xlsx?|pptx?|odt|ods|rtf|txt)$/i

function sameHost(a: URL, b: URL): boolean {
  const strip = (h: string) => h.toLowerCase().replace(/^www\./, '')
  return strip(a.hostname) === strip(b.hostname)
}

/** A link worth keeping, or the empty string. */
function resolveHref(raw: string, base: URL | null): string {
  const href = decodeEntities(raw || '').trim()
  if (!href || /^(javascript|data|vbscript|file):/i.test(href)) return ''
  if (/^mailto:/i.test(href)) return /^mailto:[^\s@]+@[^\s@]+$/i.test(href.split('?')[0]) ? href.split('?')[0] : ''
  if (/^tel:/i.test(href)) {
    const digits = href.slice(4).replace(/[^\d+]/g, '')
    return digits.length >= 3 ? `tel:${digits}` : ''
  }

  if (!base) {
    // The editor's own links, which are already in a form the renderer takes,
    // including links to a heading further down the same page.
    return /^(https?:\/\/|\/(?!\/)|#.)/i.test(href) ? href : ''
  }

  if (href.startsWith('#')) return ''

  let url: URL
  try {
    url = new URL(href, base)
  } catch {
    return ''
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return ''

  // A link pasted out of an Outlook email arrives wrapped in Microsoft's
  // scanner, two hundred characters long. The real address is inside it.
  if (/(^|\.)safelinks\.protection\.outlook\.com$/i.test(url.hostname)) {
    const real = url.searchParams.get('url')
    if (real && /^https?:\/\//i.test(real)) {
      try {
        url = new URL(real)
      } catch {
        return ''
      }
    }
  }
  if (/^(www\.)?google\.[a-z.]+$/i.test(url.hostname) && url.pathname === '/url') {
    const real = url.searchParams.get('q') || url.searchParams.get('url')
    if (real && /^https?:\/\//i.test(real)) {
      try {
        url = new URL(real)
      } catch {
        return ''
      }
    }
  }

  // Links to the old site's own pages stop working the day the address moves
  // across, so they become plain text. Documents are kept: they still need
  // re-homing, but the practice needs to know which ones exist.
  if (sameHost(url, base) && !DOCUMENT.test(url.pathname)) return ''

  url.hash = url.hash && url.hash.length > 1 ? url.hash : ''
  return url.toString()
}

/* ------------------------------------------------------------ the walker */

interface Run {
  text: string
  bold: boolean
  href: string
}

type Piece = Run | 'br'

const BOLD_WEIGHT = /font-weight\s*:\s*(bold|bolder|[6-9]00)/i
const NORMAL_WEIGHT = /font-weight\s*:\s*(normal|lighter|[1-4]00)/i

class Walker {
  readonly blocks: Block[] = []
  private pieces: Piece[] = []
  private bold = 0
  private href = ''
  private list: { ordered: boolean; id: number } | null = null
  private quote = 0
  private listIds = 0
  private quoteIds = 0
  /** Inside a list item, lines are gathered for the item instead of emitted. */
  private itemLines: string[] | null = null
  /** The last heading level outside any expander. */
  private outerLevel = 0
  /** Inside an expander, nothing ranks above its title. */
  private floor = 0
  private expanderDepth = 0

  constructor(
    private readonly options: ConvertOptions,
    private readonly base: URL | null,
  ) {}

  private get tidy(): boolean {
    return Boolean(this.options.tidy || this.options.promoteBold)
  }

  node(node: DomNode): void {
    if (node.type === 'text') {
      this.pieces.push({ text: node.text, bold: this.bold > 0, href: this.href })
      return
    }
    this.element(node)
  }

  private children(el: ElementNode | DomNode[]): void {
    for (const child of Array.isArray(el) ? el : el.children) this.node(child)
  }

  private element(el: ElementNode): void {
    if (skipped(el)) return
    const tag = el.tag

    const expander = asExpander(el)
    if (expander) {
      this.expander(expander)
      return
    }

    // The NHS inset text and warning callout read as callouts in the source,
    // so they become callouts here.
    if (/(^|\s)(nhsuk-inset-text|nhsuk-warning-callout)(\s|$)/.test(classOf(el))) {
      this.blockquote(el)
      return
    }

    switch (tag) {
      case 'br':
        this.pieces.push('br')
        return
      case 'hr':
        this.flush()
        return
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        this.flush()
        this.heading(Number(tag[1]), plainText(el))
        return
      case 'summary':
      case 'dt':
        this.flush()
        this.heading(this.subLevel(), plainText(el))
        return
      case 'ul':
      case 'ol':
      case 'menu': {
        this.flush()
        const outer = this.list
        // Nested lists flatten into their parent: the renderer has one level.
        this.list = outer ?? { ordered: tag === 'ol', id: ++this.listIds }
        this.children(el)
        this.flush()
        this.list = outer
        return
      }
      case 'li':
        this.listItem(el)
        return
      case 'blockquote':
        this.blockquote(el)
        return
      case 'table':
        this.table(el)
        return
      case 'strong':
      case 'b': {
        // Google Docs wraps a whole paste in <b style="font-weight:normal">.
        const style = attrOf(el, 'style')
        const bold = !NORMAL_WEIGHT.test(style)
        if (bold) this.bold += 1
        this.children(el)
        if (bold) this.bold -= 1
        return
      }
      case 'a': {
        const outer = this.href
        this.href = resolveHref(attrOf(el, 'href'), this.base) || outer
        this.children(el)
        this.href = outer
        return
      }
      case 'span': {
        const bold = BOLD_WEIGHT.test(attrOf(el, 'style'))
        if (bold) this.bold += 1
        this.children(el)
        if (bold) this.bold -= 1
        return
      }
    }

    if (BLOCK_TAGS.has(tag)) {
      this.flush()
      this.children(el)
      this.flush()
      return
    }

    this.children(el)
  }

  /** Level for a summary or term: one below the heading it sits under. */
  private subLevel(): number {
    if (this.expanderDepth) return Math.min(6, this.floor)
    return Math.min(6, (this.outerLevel || 1) + 1)
  }

  private heading(level: number, text: string): void {
    if (!text) return
    const actual = Math.max(level, this.floor)
    if (!this.expanderDepth) this.outerLevel = actual
    if (this.itemLines) {
      this.itemLines.push(text)
      return
    }
    this.blocks.push({ type: 'heading', level: actual, text })
  }

  private expander({ title, body }: Expander): void {
    this.flush()
    // Pushed directly rather than through heading(), so a run of expanders
    // stay siblings instead of each nesting one level under the last.
    const level = this.subLevel()
    if (title && this.itemLines) this.itemLines.push(title)
    else if (title) this.blocks.push({ type: 'heading', level, text: title })

    const floor = this.floor
    this.floor = Math.min(6, level + 1)
    this.expanderDepth += 1
    this.children(body)
    this.flush()
    this.expanderDepth -= 1
    this.floor = floor
  }

  private blockquote(el: ElementNode): void {
    this.flush()
    const outer = this.quote
    this.quote = outer || ++this.quoteIds
    this.children(el)
    this.flush()
    this.quote = outer
  }

  private listItem(li: ElementNode): void {
    this.flush()

    // An item used as a layout box, holding headings or several paragraphs, is
    // converted as a box. Squashing it into one bullet loses its structure.
    const blocks = li.children.filter(
      (c): c is ElementNode => c.type === 'element' && (/^h[1-6]$/.test(c.tag) || c.tag === 'p' || c.tag === 'div'),
    )
    if (blocks.some((c) => /^h[1-6]$/.test(c.tag)) || blocks.length > 2) {
      const outer = this.list
      this.list = null
      this.children(li)
      this.flush()
      this.list = outer
      return
    }

    const list = this.list ?? { ordered: false, id: ++this.listIds }
    const nested = li.children.filter(
      (c) => c.type === 'element' && (c.tag === 'ul' || c.tag === 'ol'),
    )

    const outerLines = this.itemLines
    this.itemLines = []
    for (const child of li.children) if (!nested.includes(child)) this.node(child)
    this.flush()
    const text = this.itemLines.join(' ').replace(/\s+/g, ' ').trim()
    this.itemLines = outerLines

    if (text) this.blocks.push({ type: 'item', ordered: list.ordered, text, list: list.id })

    const outer = this.list
    this.list = list
    for (const child of nested) this.node(child)
    this.list = outer
  }

  /**
   * Tables become lists, one row per item. The renderer has no tables, and a
   * fees table or an hours table reads perfectly well as "Item: price".
   * Tables used only for layout are converted cell by cell instead.
   */
  private table(table: ElementNode): void {
    this.flush()
    const rows: ElementNode[] = []
    const collect = (el: ElementNode) => {
      for (const child of el.children) {
        if (child.type !== 'element') continue
        if (child.tag === 'tr') rows.push(child)
        else if (child.tag !== 'table') collect(child)
      }
    }
    collect(table)

    const cellsOf = (row: ElementNode) =>
      row.children.filter(
        (c): c is ElementNode => c.type === 'element' && (c.tag === 'td' || c.tag === 'th'),
      )
    const layout =
      rows.every((row) => cellsOf(row).length <= 1) ||
      rows.some((row) =>
        cellsOf(row).some(
          (cell) =>
            Boolean(findFirst(cell, (el) => /^(h[1-6]|ul|ol|table)$/.test(el.tag))) ||
            cell.children.filter((c) => c.type === 'element' && c.tag === 'p').length > 1,
        ),
      )

    if (layout) {
      for (const row of rows) for (const cell of cellsOf(row)) {
        this.children(cell)
        this.flush()
      }
      return
    }

    const id = ++this.listIds
    const grid: string[][] = []
    rows.forEach((row, index) => {
      const cells = cellsOf(row)
      const header = cells.every((c) => c.tag === 'th')
      if (header && index === 0 && rows.length > 1) return

      const texts = cells
        .map((cell) => {
          const sub = new Walker({}, this.base)
          sub.node(cell)
          sub.flush()
          return sub.blocks.map((b) => b.text).join(' ').trim()
        })
        .filter(Boolean)
      if (texts.length) grid.push(texts)
    })

    // A grid of links, like leaflets in twenty languages, is a list of links.
    const LINK_ONLY = /^\[[^\]]+\]\([^)]+\)$/
    if (grid.flat().every((cell) => LINK_ONLY.test(cell))) {
      for (const cell of grid.flat()) this.blocks.push({ type: 'item', ordered: false, text: cell, list: id })
      return
    }

    for (const [first, ...rest] of grid) {
      // "Item: price". Bold would wrap a link in asterisks the renderer
      // cannot read, so a linked first cell stays as it is.
      const label = first.includes('](') || /^\*\*.*\*\*$/.test(first) ? first : `**${first.replace(/\*\*/g, '')}**`
      const text = rest.length ? `${label}: ${rest.join(', ')}` : first
      this.blocks.push({ type: 'item', ordered: false, text, list: id })
    }
  }

  /** Turns the gathered inline pieces into blocks. */
  flush(): void {
    if (!this.pieces.length) return
    const pieces = this.pieces
    this.pieces = []

    const lines: Run[][] = [[]]
    for (const piece of pieces) {
      if (piece === 'br') lines.push([])
      else lines[lines.length - 1].push(piece)
    }

    const rendered = lines.map((runs) => {
      let line = runsToMarkdown(runs)
      if (this.tidy) line = stripEmoji(line).trim()
      return line
    })

    if (this.itemLines) {
      this.itemLines.push(...rendered.filter(Boolean))
      return
    }

    // Groups of lines, split wherever there was a blank line.
    const groups: string[][] = [[]]
    for (const line of rendered) {
      if (line) groups[groups.length - 1].push(line)
      else if (groups[groups.length - 1].length) groups.push([])
    }

    for (const group of groups) if (group.length) this.emitGroup(group)
  }

  private emitGroup(lines: string[]): void {
    if (this.quote) {
      for (const line of lines) this.blocks.push({ type: 'quote', text: line.replace(/^>\s*/, ''), group: this.quote })
      return
    }

    if (!this.tidy) {
      for (const line of lines) this.pushPara(line)
      return
    }

    const usable = lines.filter((line) => !SEPARATOR.test(stripMarkdown(line)))
    let i = 0

    while (i < usable.length) {
      const line = usable[i]
      const rest = usable.slice(i + 1)

      // A line introducing the lines under it: "You can cancel by:".
      if (endsWithColon(line) && rest.length) {
        let n = 0
        while (n < rest.length && !isBoldOnly(rest[n]) && !endsWithColon(rest[n]) && stripMarkdown(rest[n]).length <= 160) n += 1
        if (n >= 1 && (n >= 2 || !/[.!?]$/.test(stripMarkdown(rest[0])))) {
          this.lineBlock(line)
          const id = ++this.listIds
          for (const item of rest.slice(0, n)) this.pushItem(item, id)
          i += 1 + n
          continue
        }
      }

      this.lineBlock(line)
      i += 1
    }

    // A run of short lines with nothing to introduce them, after a line that
    // ended in a colon: the list the previous paragraph promised.
    this.listAfterColon()
  }

  /** One line, as whatever its own markers say it is. */
  private lineBlock(line: string): void {
    const bullet = BULLET.exec(line)
    if (bullet && stripMarkdown(line.slice(bullet[0].length))) {
      this.pushItem(line.slice(bullet[0].length), null)
      return
    }
    const numbered = /^\s*\d{1,2}[.)]\s+/.exec(line)
    if (numbered) {
      this.pushItem(line.slice(numbered[0].length), null, true)
      return
    }
    if (/^\s*(>|&gt;)\s*/.test(line)) {
      const text = line.replace(/^\s*(>|&gt;)\s*/, '')
      if (text) this.blocks.push({ type: 'quote', text, group: ++this.quoteIds })
      return
    }
    this.pushPara(line)
  }

  private pushItem(text: string, list: number | null, ordered = false): void {
    const last = this.blocks[this.blocks.length - 1]
    const id =
      list ??
      (last && last.type === 'item' && last.ordered === ordered ? last.list : ++this.listIds)
    // The old site's own bullet characters, which would otherwise sit inside
    // ours: "- – Earache".
    const clean = text.replace(BULLET, '').trim()
    if (clean) this.blocks.push({ type: 'item', ordered, text: clean, list: id })
  }

  private pushPara(text: string): void {
    const bold = isBoldOnly(text)
    this.blocks.push(bold ? { type: 'para', text: unbold(text), boldOnly: true } : { type: 'para', text })
  }

  /**
   * "Our nurses offer:" followed by three short lines with no full stops. The
   * old site set them out as a list with line breaks; they read as one here.
   */
  private listAfterColon(): void {
    const blocks = this.blocks
    const end = blocks.length
    let start = end
    while (
      start > 0 &&
      blocks[start - 1].type === 'para' &&
      !(blocks[start - 1] as { boldOnly?: boolean }).boldOnly &&
      isListish(blocks[start - 1].text)
    ) {
      start -= 1
    }
    const intro = blocks[start - 1]
    if (end - start < 2 || !intro || intro.type !== 'para' || !endsWithColon(intro.text)) return

    const id = ++this.listIds
    for (let i = start; i < end; i += 1) {
      blocks[i] = { type: 'item', ordered: false, text: blocks[i].text, list: id }
    }
  }
}

const SEPARATOR = /^[\s—–\-_=~*•·.+#|]*$/

/** A bullet character typed at the start of a line, with the space after it. */
const BULLET = /^\s*(?:[•·●▪◦‣∙○■□➤►▶→✓✔☐]|[-–—*](?=\s))\s*/

function stripMarkdown(text: string): string {
  return text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\*\*/g, '').trim()
}

function endsWithColon(text: string): boolean {
  return /:$/.test(stripMarkdown(text))
}

function isListish(text: string): boolean {
  const plain = stripMarkdown(text)
  return plain.length > 0 && plain.length <= 100 && !/[.!?:;]$/.test(plain)
}

function isBoldOnly(text: string): boolean {
  return /^\*\*[^*]+\*\*$/.test(text.trim())
}

function unbold(text: string): string {
  return text.trim().replace(/^\*\*|\*\*$/g, '')
}

/** Inline runs to one line of Markdown, with bold and links where they were. */
function runsToMarkdown(runs: Run[]): string {
  const parts = runs.map((run) => ({
    ...run,
    text: decodeEntities(run.text).replace(ZERO_WIDTH, '').replace(/\s+/g, ' '),
  }))

  let out = ''
  let i = 0
  while (i < parts.length) {
    const href = parts[i].href
    let j = i
    while (j < parts.length && parts[j].href === href) j += 1
    const segment = parts.slice(i, j)

    if (href) {
      const text = segment.map((p) => p.text).join('')
      let inner = text.trim().replace(/[[\]]/g, (b) => (b === '[' ? '(' : ')')).replace(/\*+/g, '')
      // "[SystmOnline.](...)" reads better as "[SystmOnline](...)."
      const punctuation = /[.,;:!?]+$/.exec(inner)
      const after = punctuation && punctuation[0].length < inner.length ? punctuation[0] : ''
      if (after) inner = inner.slice(0, -after.length)
      // A link whose words are its own address: show it without the https.
      if (/^https?:\/\/\S+$/i.test(inner)) inner = inner.replace(/^https?:\/\//i, '').replace(/\/$/, '')
      out += inner
        ? `${lead(text)}[${inner}](${href.replace(/\)/g, '%29').replace(/\s/g, '%20')})${after}${trail(text)}`
        : text
    } else {
      let k = 0
      while (k < segment.length) {
        const bold = segment[k].bold
        let l = k
        while (l < segment.length && segment[l].bold === bold) l += 1
        const text = segment.slice(k, l).map((p) => p.text).join('')
        // A bold colon or full stop is not worth the asterisks.
        if (bold && /[\p{L}\p{N}]/u.test(text)) {
          out += `${lead(text)}**${text.trim().replace(/\*+/g, '')}**${trail(text)}`
        } else {
          out += text.replace(/\*{2,}/g, '*')
        }
        k = l
      }
    }
    i = j
  }

  return out
    .replace(/\*\*(\s*)\*\*/g, '$1')
    .replace(/\s+/g, ' ')
    .replace(/\*\*\s+([,.;:!?)])/g, '**$1')
    .trim()
}

function lead(text: string): string {
  return /^\s/.test(text) ? ' ' : ''
}

function trail(text: string): string {
  return /\s$/.test(text) ? ' ' : ''
}

/* ------------------------------------------------------ after the walk */

const UK_POSTCODE = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i

function norm(text: string): string {
  return stripMarkdown(text).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim()
}

/** The finishing passes, then the Markdown itself. */
export function blocksToMarkdown(input: Block[], options: ConvertOptions = {}): string {
  const tidy = Boolean(options.tidy || options.promoteBold)
  let blocks = input.map((b) => ({ ...b })) as Block[]

  if (options.promoteBold) {
    blocks = blocks.map((b, i) => {
      if (b.type !== 'para' || !b.boldOnly) return b
      const text = b.text.trim()
      const previous = blocks[i - 1]
      // Short, and not a sentence or a label: "Routine appointments", not
      // "Please note this." and not "By phone:". And not the answer to the
      // line before it: "Our carers champion is:" then a bold name.
      if (
        text.length > 100 ||
        /[.!,;:]$/.test(text) ||
        (previous && previous.type === 'para' && endsWithColon(previous.text))
      ) {
        return { type: 'para', text: `**${text}**` }
      }
      return { type: 'heading', level: 7, text }
    })
  } else {
    blocks = blocks.map((b) => (b.type === 'para' && b.boldOnly ? { type: 'para', text: `**${b.text}**` } : b))
  }

  // Headings hold plain words: no bold, no links, no trailing colon.
  blocks = blocks.flatMap((b): Block[] => {
    if (b.type !== 'heading') return [b]
    let text = stripMarkdown(b.text).replace(/\s*:\s*$/, '').trim()
    if (tidy && isShouting(text)) text = sentenceCase(text)
    if (!text) return []
    if (tidy && text.length > 150) return [{ type: 'para', text }]
    return [{ ...b, text }]
  })

  if (tidy) {
    // The page's own title, repeated as its first heading.
    const title = options.dropTitle ? norm(options.dropTitle) : ''
    const firstHeading = blocks.findIndex((b) => b.type === 'heading')
    if (firstHeading !== -1 && firstHeading <= 2) {
      const heading = blocks[firstHeading] as { level: number; text: string }
      // A page's h1 is its title, which the template prints itself. Only when
      // importing a page: a document pasted into the editor keeps its own.
      const importing = options.dropTitle !== undefined
      if ((importing && heading.level === 1) || (title && norm(heading.text) === title)) {
        blocks.splice(firstHeading, 1)
      }
    }

    blocks = teaserLists(blocks)

    // Headings with nothing under them. Their content was an image, a button
    // or a form, none of which come across.
    const kept: Block[] = []
    let next: Block | undefined
    for (let i = blocks.length - 1; i >= 0; i -= 1) {
      const b = blocks[i]
      if (b.type === 'heading' && (!next || (next.type === 'heading' && next.level <= b.level))) continue
      kept.unshift(b)
      next = b
    }
    blocks = kept

    // The same heading twice in a row: a card title above its own heading,
    // or the two left either side of an empty one that has just gone.
    blocks = blocks.filter((b, i) => {
      if (b.type !== 'heading') return true
      const previous = blocks[i - 1]
      return !(previous && previous.type === 'heading' && norm(previous.text) === norm(b.text))
    })

    blocks = blocks.map((b) => {
      if ((b.type === 'para' || b.type === 'item' || b.type === 'quote') && isShouting(b.text) && stripMarkdown(b.text).length >= 12) {
        const bold = /^\*\*[^*]+\*\*$/.test(b.text)
        const text = sentenceCase(bold ? unbold(b.text) : b.text)
        return { ...b, text: bold ? `**${text}**` : text }
      }
      return b
    })

    blocks = joinAddresses(blocks)
  }

  // Heading levels. Imported pages rank them, because suppliers pick heading
  // tags for their size: the most important becomes ##, everything under it
  // ###. Otherwise h1 and h2 are ## and the rest ###.
  //
  // One exception. A single heading of the top rank among three or more ranks
  // is usually an afterthought at the bottom of the page, like one h2 under a
  // stack of h3 cards. Ranking by it alone pushed every card down a level, so
  // the top two ranks both become ## instead.
  const top = options.top ?? 2
  const headingLevels = blocks.filter((b) => b.type === 'heading').map((b) => (b as { level: number }).level)
  const levels = [...new Set(headingLevels)].sort((a, b) => a - b)
  const major = new Set(levels.slice(0, 1))
  if (levels.length >= 3 && headingLevels.filter((l) => l === levels[0]).length === 1) major.add(levels[1])
  const levelFor = (level: number): number => {
    if (top === 3) return 3
    if (options.rankHeadings) return major.has(level) ? 2 : 3
    return level <= 2 ? 2 : 3
  }

  const out: string[] = []
  let previous: Block | undefined
  for (const b of blocks) {
    let line: string
    switch (b.type) {
      case 'heading':
        line = `${'#'.repeat(levelFor(b.level))} ${b.text}`
        break
      case 'item':
        line = `${b.ordered ? '1.' : '-'} ${b.text}`
        break
      case 'quote':
        line = `> ${b.text}`
        break
      default:
        line = b.text
    }

    const together =
      previous &&
      ((b.type === 'item' && previous.type === 'item' && b.list === previous.list) ||
        (b.type === 'quote' && previous.type === 'quote' && b.group === previous.group))

    if (out.length) out.push(together ? '\n' : '\n\n')
    out.push(line)
    previous = b
  }

  return out.join('').replace(/\n{3,}/g, '\n\n').trim()
}

/** The "read more" marker WordPress puts on the end of a cut-down excerpt. */
const TEASER = /\s*(\[\s*(…|\.\.\.)\s*\]|\[&hellip;\])\s*$/

/**
 * A listing page: a heading per service, each with the first line of that
 * service's own page cut off with "[…]". The cut-off lines are not worth
 * keeping, but the list of what the practice offers is, so it becomes a list.
 */
function teaserLists(blocks: Block[]): Block[] {
  const out: Block[] = []
  let i = 0
  while (i < blocks.length) {
    let j = i
    const titles: string[] = []
    while (
      blocks[j]?.type === 'heading' &&
      blocks[j + 1]?.type === 'para' &&
      TEASER.test(blocks[j + 1].text)
    ) {
      titles.push(blocks[j].text)
      j += 2
    }
    if (titles.length >= 3) {
      const list = 1_000_000 + i
      for (const text of titles) out.push({ type: 'item', ordered: false, text, list })
      i = j
      continue
    }
    const b = blocks[i]
    out.push(b.type === 'para' && TEASER.test(b.text) ? { ...b, text: b.text.replace(TEASER, '…') } : b)
    i += 1
  }
  return out
}

/** Address lines given a paragraph each become one line, separated by commas. */
function joinAddresses(blocks: Block[]): Block[] {
  const out: Block[] = []
  let i = 0
  while (i < blocks.length) {
    let j = i
    while (
      j < blocks.length &&
      blocks[j].type === 'para' &&
      !(blocks[j] as { boldOnly?: boolean }).boldOnly &&
      stripMarkdown(blocks[j].text).length <= 60 &&
      !/[.!?:]$/.test(stripMarkdown(blocks[j].text))
    ) {
      j += 1
      if (UK_POSTCODE.test(blocks[j - 1].text)) break
    }
    const run = blocks.slice(i, j)
    if (run.length >= 3 && UK_POSTCODE.test(run[run.length - 1].text)) {
      out.push({ type: 'para', text: run.map((b) => b.text.replace(/,\s*$/, '')).join(', ') })
      i = j
      continue
    }
    out.push(blocks[i])
    i += 1
  }
  return out
}

/* ----------------------------------------------------------------- entry */

function baseUrl(options: ConvertOptions): URL | null {
  if (!options.base) return null
  try {
    return new URL(options.base)
  } catch {
    return null
  }
}

/** The blocks of a document or element, before the finishing passes. */
export function htmlToBlocks(source: string | ElementNode | DomNode[], options: ConvertOptions = {}): Block[] {
  let nodes: DomNode[]
  if (typeof source === 'string') {
    const root = parseHtml(source)
    nodes = options.findContent ? [contentNode(root)] : root.children
  } else if (Array.isArray(source)) {
    nodes = source
  } else {
    nodes = [source]
  }

  const walker = new Walker(options, baseUrl(options))
  for (const node of nodes) walker.node(node)
  walker.flush()
  return walker.blocks
}

/** HTML, or part of a parsed document, to the template's Markdown. */
export function toMarkdown(source: string | ElementNode | DomNode[], options: ConvertOptions = {}): string {
  return blocksToMarkdown(htmlToBlocks(source, options), options)
}
