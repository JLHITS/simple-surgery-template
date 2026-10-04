import { attr } from './html'

/**
 * A forgiving HTML tree, for the places where regular expressions run out.
 *
 * Still no parser dependency, for the reasons html.ts gives. But converting a
 * page's wording needs to know what is inside what: which text sits in a care
 * card with no paragraph tags at all, which headings belong to an expander,
 * which bold run is a whole line. A flat regex walk over `<p>` and `<li>` lost
 * every word that was not wrapped in one, which on Practice365 sites is most
 * of them.
 *
 * This follows the HTML parsing rules only as far as practice websites need:
 * void elements, raw text elements, a paragraph closing when a block opens
 * inside it, and list items, rows and cells closing their open siblings.
 * Anything malformed beyond that is closed at the end, never thrown on.
 */

export interface ElementNode {
  type: 'element'
  tag: string
  attrs: string
  children: DomNode[]
  parent: ElementNode | null
}

export interface TextNode {
  type: 'text'
  /** Raw, still entity encoded. */
  text: string
  parent: ElementNode | null
}

export type DomNode = ElementNode | TextNode

const VOID = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param',
  'source', 'track', 'wbr', 'keygen', 'command',
])

/** Elements whose content is not markup, and is never wanted. */
const RAW = new Set(['script', 'style', 'textarea', 'title', 'noscript', 'template', 'xmp', 'iframe', 'svg', 'math'])

/** Opening any of these closes a paragraph that is still open. */
const CLOSES_P = new Set([
  'address', 'article', 'aside', 'blockquote', 'details', 'dialog', 'div', 'dl', 'fieldset',
  'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr',
  'main', 'menu', 'nav', 'ol', 'p', 'pre', 'section', 'summary', 'table', 'ul',
])

/** A paragraph is never closed across one of these. */
const P_SCOPE = new Set(['td', 'th', 'table', 'caption', 'button', 'object', 'template', 'html'])

const TOKEN =
  /<!--[\s\S]*?(?:-->|$)|<!\[CDATA\[[\s\S]*?(?:\]\]>|$)|<[!?][^>]*>?|<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>|<|[^<]+/g

export function parseHtml(html: string): ElementNode {
  const root: ElementNode = { type: 'element', tag: '#root', attrs: '', children: [], parent: null }
  const stack: ElementNode[] = [root]
  const top = () => stack[stack.length - 1]

  /** Pops back to the nearest open `tag`, stopping at any of `stopAt`. */
  const closeTo = (tags: Set<string> | string, stopAt?: Set<string>): boolean => {
    for (let i = stack.length - 1; i > 0; i -= 1) {
      const tag = stack[i].tag
      if (typeof tags === 'string' ? tag === tags : tags.has(tag)) {
        stack.length = i
        return true
      }
      if (stopAt?.has(tag)) return false
    }
    return false
  }

  const source = html || ''
  TOKEN.lastIndex = 0
  let m: RegExpExecArray | null

  while ((m = TOKEN.exec(source)) !== null) {
    const token = m[0]

    if (m[2] === undefined) {
      // Comments, doctypes and processing instructions are dropped. A stray
      // "<" that opens nothing is text.
      if (token.startsWith('<!') || token.startsWith('<?')) continue
      top().children.push({ type: 'text', text: token, parent: top() })
      continue
    }

    const closing = m[1] === '/'
    const tag = m[2].toLowerCase()
    const attrs = m[3] || ''

    if (closing) {
      if (tag === 'br') {
        top().children.push({ type: 'element', tag: 'br', attrs: '', children: [], parent: top() })
      } else if (tag === 'p') {
        closeTo('p', P_SCOPE)
      } else {
        closeTo(tag)
      }
      continue
    }

    // Implicit closes.
    if (CLOSES_P.has(tag)) closeTo('p', P_SCOPE)
    if (tag === 'li') closeTo('li', new Set(['ul', 'ol', 'menu']))
    if (tag === 'dt' || tag === 'dd') closeTo(new Set(['dt', 'dd']), new Set(['dl']))
    if (tag === 'tr') closeTo('tr', new Set(['table', 'tbody', 'thead', 'tfoot']))
    if (tag === 'td' || tag === 'th') closeTo(new Set(['td', 'th']), new Set(['tr', 'table']))
    if (tag === 'option') closeTo('option', new Set(['select', 'datalist']))

    if (RAW.has(tag)) {
      // Skip to the matching close tag without reading what is in between.
      const end = new RegExp(`</${tag}\\s*>`, 'ig')
      end.lastIndex = TOKEN.lastIndex
      const close = end.exec(source)
      TOKEN.lastIndex = close ? close.index + close[0].length : source.length
      continue
    }

    const element: ElementNode = { type: 'element', tag, attrs, children: [], parent: top() }
    top().children.push(element)

    const selfClosing = /\/\s*$/.test(attrs)
    if (!VOID.has(tag) && !selfClosing) stack.push(element)
  }

  return root
}

/* --------------------------------------------------------------- queries */

export function classOf(node: ElementNode): string {
  return attr(node.attrs, 'class')
}

export function attrOf(node: ElementNode, name: string): string {
  return attr(node.attrs, name)
}

export function hasClass(node: ElementNode, pattern: RegExp): boolean {
  return pattern.test(classOf(node))
}

/** Depth first, document order. Return false from `visit` to skip children. */
export function walk(node: ElementNode, visit: (el: ElementNode) => boolean | void): void {
  for (const child of node.children) {
    if (child.type !== 'element') continue
    if (visit(child) === false) continue
    walk(child, visit)
  }
}

export function findFirst(node: ElementNode, test: (el: ElementNode) => boolean): ElementNode | null {
  let found: ElementNode | null = null
  walk(node, (el) => {
    if (found) return false
    if (test(el)) {
      found = el
      return false
    }
  })
  return found
}

export function findAll(
  node: ElementNode,
  test: (el: ElementNode) => boolean,
  { nested = true }: { nested?: boolean } = {},
): ElementNode[] {
  const out: ElementNode[] = []
  walk(node, (el) => {
    if (test(el)) {
      out.push(el)
      if (!nested) return false
    }
  })
  return out
}

/** Raw text content, still entity encoded. */
export function rawText(node: DomNode): string {
  if (node.type === 'text') return node.text
  if (node.tag === 'br') return '\n'
  return node.children.map(rawText).join('')
}

export function detach(node: DomNode): void {
  const parent = node.parent
  if (!parent) return
  parent.children = parent.children.filter((child) => child !== node)
  node.parent = null
}
