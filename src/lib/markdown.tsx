import type { ReactNode } from 'react'

/**
 * A deliberately tiny Markdown subset, rendered straight to React elements.
 *
 * Why not a Markdown library? Two reasons. First, staff need a format that
 * cannot go wrong, not one with footnotes and tables: the admin panel's
 * formatting buttons produce exactly this and nothing more. Second, this
 * parser never emits raw HTML to a patient-facing page, so there is no path
 * from the admin panel to script injection on an NHS site. The public output
 * is React elements, not an HTML string, which means dangerouslySetInnerHTML
 * is never involved.
 *
 * Supported:
 *   ## Heading            level 2 heading
 *   ### Heading           level 3 heading
 *   - item                bullet list
 *   1. item               numbered list
 *   > text                callout
 *   **bold**              bold
 *   [label](url)          link
 *   blank line            new paragraph
 */

type Inline = { text: string; bold?: boolean; href?: string }

/** One block of a document, as both renderers see it. */
type MdBlock =
  | { type: 'h2' | 'h3' | 'p'; text: string }
  | { type: 'ul' | 'ol' | 'quote'; items: string[] }

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g
const BOLD = /\*\*([^*]+)\*\*/g

function isSafeHref(href: string): boolean {
  const value = href.trim().toLowerCase()
  if (value.startsWith('/') || value.startsWith('#')) return true
  return (
    value.startsWith('https://') ||
    value.startsWith('http://') ||
    value.startsWith('mailto:') ||
    value.startsWith('tel:')
  )
}

/** Splits a line into plain text, bold runs and links. */
function parseInline(line: string): Inline[] {
  const out: Inline[] = []
  let cursor = 0

  LINK.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = LINK.exec(line)) !== null) {
    if (match.index > cursor) out.push(...parseBold(line.slice(cursor, match.index)))
    if (isSafeHref(match[2])) {
      out.push({ text: match[1], href: match[2] })
    } else {
      out.push({ text: match[1] })
    }
    cursor = match.index + match[0].length
  }
  if (cursor < line.length) out.push(...parseBold(line.slice(cursor)))
  return out
}

function parseBold(text: string): Inline[] {
  const out: Inline[] = []
  let cursor = 0
  BOLD.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = BOLD.exec(text)) !== null) {
    if (match.index > cursor) out.push({ text: text.slice(cursor, match.index) })
    out.push({ text: match[1], bold: true })
    cursor = match.index + match[0].length
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor) })
  return out
}

/** The document's blocks, in order. Both renderers start here. */
function parseBlocks(source: string): MdBlock[] {
  const lines = (source || '').replace(/\r\n/g, '\n').split('\n')
  const blocks: MdBlock[] = []

  let paragraph: string[] = []
  let bullets: string[] = []
  let numbers: string[] = []
  let quote: string[] = []

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: 'p', text: paragraph.join(' ') })
    paragraph = []
  }
  const flushBullets = () => {
    if (bullets.length) blocks.push({ type: 'ul', items: bullets })
    bullets = []
  }
  const flushNumbers = () => {
    if (numbers.length) blocks.push({ type: 'ol', items: numbers })
    numbers = []
  }
  const flushQuote = () => {
    if (quote.length) blocks.push({ type: 'quote', items: quote })
    quote = []
  }
  const flushAll = () => {
    flushParagraph()
    flushBullets()
    flushNumbers()
    flushQuote()
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()

    if (!line.trim()) {
      flushAll()
      continue
    }

    if (line.startsWith('### ')) {
      flushAll()
      blocks.push({ type: 'h3', text: line.slice(4) })
      continue
    }

    if (line.startsWith('## ')) {
      flushAll()
      blocks.push({ type: 'h2', text: line.slice(3) })
      continue
    }

    if (/^[-*]\s+/.test(line)) {
      flushParagraph()
      flushNumbers()
      flushQuote()
      bullets.push(line.replace(/^[-*]\s+/, ''))
      continue
    }

    if (/^\d+[.)]\s+/.test(line)) {
      flushParagraph()
      flushBullets()
      flushQuote()
      numbers.push(line.replace(/^\d+[.)]\s+/, ''))
      continue
    }

    if (line.startsWith('> ')) {
      flushParagraph()
      flushBullets()
      flushNumbers()
      quote.push(line.slice(2))
      continue
    }

    flushBullets()
    flushNumbers()
    flushQuote()
    paragraph.push(line.trim())
  }

  flushAll()
  return blocks
}

function renderInline(parts: Inline[], keyPrefix: string): ReactNode[] {
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`
    if (part.href) {
      // Links open in the same tab, including external ones. NHS England
      // advises against forcing a new tab: it breaks the browser back button,
      // which is the control most patients rely on to get out of somewhere.
      return (
        <a key={key} href={part.href} className="ss-link">
          {part.text}
        </a>
      )
    }
    if (part.bold) {
      return <strong key={key}>{part.text}</strong>
    }
    return <span key={key}>{part.text}</span>
  })
}

/**
 * Renders Markdown-lite to React nodes.
 * Headings start at level 2 by default, on the assumption the page already has
 * an h1. Pass `headingLevel: 3` for content nested under a section heading.
 */
export function renderMarkdown(
  source: string,
  { headingLevel = 2 }: { headingLevel?: 2 | 3 } = {},
): ReactNode[] {
  const H2 = headingLevel === 2 ? 'h2' : 'h3'
  const H3 = headingLevel === 2 ? 'h3' : 'h4'

  return parseBlocks(source).map((block, key) => {
    switch (block.type) {
      case 'h2':
        return <H2 key={`h2-${key}`}>{renderInline(parseInline(block.text), `h2${key}`)}</H2>
      case 'h3':
        return <H3 key={`h3-${key}`}>{renderInline(parseInline(block.text), `h3${key}`)}</H3>
      case 'p':
        return <p key={`p-${key}`}>{renderInline(parseInline(block.text), `p${key}`)}</p>
      case 'ul':
        return (
          <ul key={`ul-${key}`}>
            {block.items.map((item, i) => (
              <li key={i}>{renderInline(parseInline(item), `ul${key}-${i}`)}</li>
            ))}
          </ul>
        )
      case 'ol':
        return (
          <ol key={`ol-${key}`}>
            {block.items.map((item, i) => (
              <li key={i}>{renderInline(parseInline(item), `ol${key}-${i}`)}</li>
            ))}
          </ol>
        )
      case 'quote':
        return (
          <div key={`q-${key}`} className="ss-inset">
            {block.items.map((item, i) => (
              <p key={i}>{renderInline(parseInline(item), `q${key}-${i}`)}</p>
            ))}
          </div>
        )
    }
  })
}

/* ------------------------------------------------------------ the editor */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function inlineHtml(text: string): string {
  return parseInline(text)
    .map((part) => {
      if (part.href) return `<a href="${escapeHtml(part.href)}">${escapeHtml(part.text)}</a>`
      if (part.bold) return `<strong>${escapeHtml(part.text)}</strong>`
      return escapeHtml(part.text)
    })
    .join('')
}

/**
 * The same document as HTML, for the admin panel's formatting editor to load.
 *
 * Only ever shown inside the editor, never on a public page. Every piece of
 * text is escaped and only the links the public renderer would allow are
 * kept, so loading a page into the editor cannot run anything either.
 */
export function markdownToHtml(source: string): string {
  const html = parseBlocks(source)
    .map((block) => {
      switch (block.type) {
        case 'h2':
        case 'h3':
          return `<${block.type}>${inlineHtml(block.text)}</${block.type}>`
        case 'p':
          return `<p>${inlineHtml(block.text)}</p>`
        case 'ul':
        case 'ol':
          return `<${block.type}>${block.items.map((item) => `<li>${inlineHtml(item)}</li>`).join('')}</${block.type}>`
        case 'quote':
          return `<blockquote>${block.items.map((item) => `<p>${inlineHtml(item)}</p>`).join('')}</blockquote>`
      }
    })
    .join('')

  // An empty editor still needs a paragraph to type into.
  return html || '<p><br></p>'
}

/** Strips formatting so body text can be used in meta descriptions and search. */
export function markdownToPlainText(source: string, limit = 300): string {
  const text = (source || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(LINK, '$1')
    .replace(BOLD, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/^\d+[.)]\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (text.length <= limit) return text
  return `${text.slice(0, limit).replace(/\s+\S*$/, '')}...`
}
