/**
 * Just enough HTML reading to pull facts out of a practice website.
 *
 * No parser dependency. That is a deliberate trade: a real DOM would be more
 * robust, but this only ever does targeted extraction, everything it produces is
 * shown to a human before it is saved, and the alternative is another package to
 * keep patched in a repo that has kept its dependency list to Next and React.
 *
 * Everything here assumes the input is hostile. Practice websites are built by
 * dozens of suppliers over twenty years, and a good proportion of them are
 * malformed.
 */

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
  pound: '£',
  hellip: '…',
  bull: '•',
  middot: '·',
}

export function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (whole, name: string) => ENTITIES[name.toLowerCase()] ?? whole)
}

function safeCodePoint(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return ''
  try {
    return String.fromCodePoint(code)
  } catch {
    return ''
  }
}

/** Collapses runs of whitespace and trims. */
export function tidy(value: string): string {
  return decodeEntities(value).replace(/\s+/g, ' ').trim()
}

/** Strips script, style and all tags, leaving readable text with line breaks. */
export function toText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<\/(p|div|li|tr|h[1-6]|section|article|br)\s*>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t ]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .replace(/^[ \t]+|[ \t]+$/gm, '')
    .trim()
}

/** The content of every occurrence of a tag, with attributes kept separately. */
export function matchTags(
  html: string,
  tag: string,
): { attrs: string; inner: string }[] {
  const out: { attrs: string; inner: string }[] = []
  const re = new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)<\\/${tag}\\s*>`, 'gi')
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) out.push({ attrs: m[1] || '', inner: m[2] || '' })
  return out
}

/** One attribute out of an attribute string, quoted or not. */
export function attr(attrs: string, name: string): string {
  const quoted = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i').exec(attrs)
  if (quoted) return decodeEntities(quoted[2] ?? quoted[3] ?? '').trim()
  const bare = new RegExp(`\\b${name}\\s*=\\s*([^\\s>]+)`, 'i').exec(attrs)
  return bare ? decodeEntities(bare[1]).trim() : ''
}

/** A meta tag's content, by name or property. */
export function meta(html: string, key: string): string {
  for (const { attrs } of matchTags(html, 'meta').concat(
    // Self-closing meta tags never match the paired form above.
    [...html.matchAll(/<meta\b([^>]*)>/gi)].map((m) => ({ attrs: m[1] || '', inner: '' })),
  )) {
    const name = (attr(attrs, 'name') || attr(attrs, 'property')).toLowerCase()
    if (name === key.toLowerCase()) {
      const content = attr(attrs, 'content')
      if (content) return tidy(content)
    }
  }
  return ''
}

export function title(html: string): string {
  const m = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(html)
  return m ? tidy(m[1]) : ''
}

export interface Anchor {
  href: string
  text: string
}

/** Every link, with its text, resolved against the page it came from. */
export function anchors(html: string, base: string): Anchor[] {
  const out: Anchor[] = []
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi)) {
    const raw = attr(m[1] || '', 'href')
    if (!raw) continue

    let href = raw
    if (!/^(mailto|tel):/i.test(raw)) {
      try {
        href = new URL(raw, base).toString()
      } catch {
        continue
      }
    }
    out.push({ href, text: tidy(m[2] || '') })
  }
  return out
}

/** Every JSON-LD block on the page, flattened through @graph, never throwing. */
export function jsonLd(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = []

  for (const m of html.matchAll(
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi,
  )) {
    let parsed: unknown
    try {
      // Some suppliers emit HTML comments or trailing commas inside the block.
      parsed = JSON.parse(m[1].replace(/<!--[\s\S]*?-->/g, '').trim())
    } catch {
      continue
    }
    collect(parsed, out)
  }

  return out
}

function collect(value: unknown, into: Record<string, unknown>[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collect(item, into)
    return
  }
  if (!value || typeof value !== 'object') return

  const node = value as Record<string, unknown>
  into.push(node)

  if ('@graph' in node) collect(node['@graph'], into)
}

/** Nodes whose @type matches, case insensitively, including arrays of types. */
export function ofType(nodes: Record<string, unknown>[], ...types: string[]): Record<string, unknown>[] {
  const wanted = types.map((t) => t.toLowerCase())
  return nodes.filter((node) => {
    const raw = node['@type']
    const list = Array.isArray(raw) ? raw : [raw]
    return list.some((t) => typeof t === 'string' && wanted.includes(t.toLowerCase()))
  })
}

/** A string out of a JSON-LD value that might be a string, array or object. */
export function ldString(value: unknown): string {
  if (typeof value === 'string') return tidy(value)
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = ldString(item)
      if (found) return found
    }
    return ''
  }
  if (value && typeof value === 'object') {
    const node = value as Record<string, unknown>
    for (const key of ['name', '@value', 'url', 'text']) {
      if (key in node) return ldString(node[key])
    }
  }
  return ''
}
