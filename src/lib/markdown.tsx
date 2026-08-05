import type { ReactNode } from 'react'

/**
 * A deliberately tiny Markdown subset, rendered straight to React elements.
 *
 * Why not a Markdown library? Two reasons. First, staff need a format they can
 * learn in thirty seconds, not one with footnotes and tables. Second, this
 * parser never emits raw HTML, so there is no path from the admin panel to
 * script injection on a patient-facing NHS page. The output is React elements,
 * not an HTML string, which means dangerouslySetInnerHTML is never involved.
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

function renderInline(parts: Inline[], keyPrefix: string): ReactNode[] {
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`
    if (part.href) {
      const external = /^https?:\/\//.test(part.href)
      return (
        <a
          key={key}
          href={part.href}
          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          className="ss-link"
        >
          {part.text}
          {external && <span className="sr-only"> (opens in a new tab)</span>}
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
  const lines = (source || '').replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []

  let paragraph: string[] = []
  let bullets: string[] = []
  let numbers: string[] = []
  let quote: string[] = []
  let key = 0

  const H2 = headingLevel === 2 ? 'h2' : 'h3'
  const H3 = headingLevel === 2 ? 'h3' : 'h4'

  const flushParagraph = () => {
    if (!paragraph.length) return
    const text = paragraph.join(' ')
    blocks.push(<p key={`p-${key++}`}>{renderInline(parseInline(text), `p${key}`)}</p>)
    paragraph = []
  }

  const flushBullets = () => {
    if (!bullets.length) return
    blocks.push(
      <ul key={`ul-${key++}`}>
        {bullets.map((item, i) => (
          <li key={i}>{renderInline(parseInline(item), `ul${key}-${i}`)}</li>
        ))}
      </ul>,
    )
    bullets = []
  }

  const flushNumbers = () => {
    if (!numbers.length) return
    blocks.push(
      <ol key={`ol-${key++}`}>
        {numbers.map((item, i) => (
          <li key={i}>{renderInline(parseInline(item), `ol${key}-${i}`)}</li>
        ))}
      </ol>,
    )
    numbers = []
  }

  const flushQuote = () => {
    if (!quote.length) return
    blocks.push(
      <div key={`q-${key++}`} className="ss-inset">
        {quote.map((item, i) => (
          <p key={i}>{renderInline(parseInline(item), `q${key}-${i}`)}</p>
        ))}
      </div>,
    )
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
      const text = line.slice(4)
      blocks.push(<H3 key={`h3-${key++}`}>{renderInline(parseInline(text), `h3${key}`)}</H3>)
      continue
    }

    if (line.startsWith('## ')) {
      flushAll()
      const text = line.slice(3)
      blocks.push(<H2 key={`h2-${key++}`}>{renderInline(parseInline(text), `h2${key}`)}</H2>)
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
