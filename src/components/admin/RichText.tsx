'use client'

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { toMarkdown } from '@/lib/import/convert'
import { markdownToHtml } from '@/lib/markdown'

/**
 * The body text editor: formatting buttons over a box that shows the page as
 * it will look.
 *
 * What it can produce is exactly what the site can show, and no more: two
 * sizes of heading, bold, bullet and numbered lists, links and a callout.
 * There is no font, no colour, no size and no alignment, because those are
 * where practice websites usually go wrong: staff paste from Word, the markup
 * comes with it, and the page ends up with three fonts and a broken heading
 * structure that fails accessibility.
 *
 * So everything that goes in, typed or pasted, comes out the other side as
 * the same small Markdown the site renders. Pasting from Word or another
 * website keeps the headings, lists, bold and links and drops the rest.
 */

type Format = 'h2' | 'h3' | 'bold' | 'ul' | 'ol' | 'blockquote' | 'link'

/** The nearest element above the selection that is inside the editor. */
function closestInEditor(editor: HTMLElement, selector: string): HTMLElement | null {
  const selection = window.getSelection()
  let node: Node | null = selection?.anchorNode ?? null
  if (!node || !editor.contains(node)) return null
  if (node.nodeType !== Node.ELEMENT_NODE) node = node.parentElement
  const found = (node as HTMLElement | null)?.closest(selector) as HTMLElement | null
  return found && editor.contains(found) && found !== editor ? found : null
}

/**
 * What somebody typed into the link box, as a link, or empty when it is not one.
 * People type "www.nhs.uk", "nhs.uk", an email address or a phone number as
 * often as a full address, and all of them should just work.
 */
export function normaliseLink(input: string): string {
  const value = input.trim()
  if (!value) return ''
  if (/^(https?:\/\/|mailto:|tel:)/i.test(value)) {
    return /\s/.test(value) ? '' : value
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `mailto:${value}`
  const digits = value.replace(/[\s()-]/g, '')
  if (/^\+?\d{6,15}$/.test(digits)) return `tel:${digits}`
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(value)) return `https://${value}`
  return ''
}

/**
 * The selection without spaces at either end.
 *
 * Double clicking a word selects the space after it too, on Windows at least.
 * Linking that selection swallowed the space, and "We keep" became "Wekeep".
 */
function trimRange(range: Range): Range {
  const trimmed = range.cloneRange()
  const { startContainer, endContainer } = trimmed
  if (endContainer.nodeType === Node.TEXT_NODE) {
    const text = endContainer.textContent || ''
    let end = trimmed.endOffset
    while (end > 0 && /\s/.test(text[end - 1]) && trimmed.toString().trim()) {
      end -= 1
      trimmed.setEnd(endContainer, end)
    }
  }
  if (startContainer.nodeType === Node.TEXT_NODE) {
    const text = startContainer.textContent || ''
    let start = trimmed.startOffset
    while (start < text.length && /\s/.test(text[start]) && trimmed.toString().trim()) {
      start += 1
      trimmed.setStart(startContainer, start)
    }
  }
  return trimmed
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** How a link reads when nobody gave it any words. */
function linkLabel(href: string): string {
  return href.replace(/^(mailto:|tel:|https?:\/\/)/i, '').replace(/\/$/, '')
}

const ICONS: Record<string, ReactNode> = {
  bullets: (
    <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
  ),
  numbers: (
    <path d="M10 6h10M10 12h10M10 18h10M4 4.5h1.5V9M4 9h3M4 14.5c0-.8.7-1.5 1.5-1.5S7 13.7 7 14.5c0 1.2-3 2.3-3 4h3" />
  ),
  link: (
    <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
  ),
  callout: <path d="M4 4v16M8 7h12M8 12h12M8 17h8" />,
  undo: <path d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />,
  redo: <path d="m15 14 5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />,
}

function Glyph({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  )
}

function ToolButton({
  label,
  shortcut,
  pressed,
  onPress,
  children,
  wide,
}: {
  label: string
  shortcut?: string
  pressed?: boolean
  onPress: () => void
  children: ReactNode
  /** Shows the label beside the icon on wider screens. */
  wide?: boolean
}) {
  return (
    <button
      type="button"
      // Keeps the selection in the text. A button that takes focus loses
      // the words somebody has just selected to make bold.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPress}
      aria-pressed={pressed === undefined ? undefined : pressed}
      aria-label={label}
      title={shortcut ? `${label} (${shortcut})` : label}
      className={`inline-flex min-h-9 min-w-9 items-center justify-center gap-1.5 rounded-md px-2 text-[0.85rem] font-semibold transition ${
        pressed ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-200/70'
      }`}
    >
      {children}
      {wide && <span className="hidden sm:inline">{label}</span>}
    </button>
  )
}

export function RichTextEditor({
  label,
  hint,
  value,
  onChange,
  rows = 14,
}: {
  label: string
  hint?: string
  value: string
  onChange: (value: string) => void
  rows?: number
}) {
  const id = useId()
  const editorRef = useRef<HTMLDivElement>(null)
  /** The last Markdown this editor produced, so its own changes are not reloaded. */
  const lastEmitted = useRef<string>(value)
  const savedRange = useRef<Range | null>(null)
  const [initialHtml] = useState(() => ({ __html: markdownToHtml(value) }))
  const [plain, setPlain] = useState(false)
  const [active, setActive] = useState<Set<Format>>(new Set())
  const [link, setLink] = useState<{ text: string; url: string; error: string; editing: boolean } | null>(null)

  // Content that changed from outside, such as a migration being applied or
  // an edit in the plain text box, is loaded in. The editor's own typing is
  // not, or the cursor would jump to the start on every keystroke.
  useEffect(() => {
    const editor = editorRef.current
    if (!editor || value === lastEmitted.current) return
    editor.innerHTML = markdownToHtml(value)
    lastEmitted.current = value
  }, [value])

  const emit = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    const markdown = toMarkdown(editor.innerHTML)
    lastEmitted.current = markdown
    onChange(markdown)
  }, [onChange])

  const refresh = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    const next = new Set<Format>()
    const heading = closestInEditor(editor, 'h1,h2,h3,h4,h5,h6')
    if (heading) next.add(heading.tagName === 'H1' || heading.tagName === 'H2' ? 'h2' : 'h3')
    if (closestInEditor(editor, 'blockquote')) next.add('blockquote')
    const list = closestInEditor(editor, 'ul,ol')
    if (list) next.add(list.tagName === 'OL' ? 'ol' : 'ul')
    if (closestInEditor(editor, 'a')) next.add('link')
    if (!heading && document.queryCommandState('bold')) next.add('bold')
    setActive(next)
  }, [])

  useEffect(() => {
    const onSelection = () => {
      const editor = editorRef.current
      const selection = window.getSelection()
      if (!editor || !selection?.anchorNode || !editor.contains(selection.anchorNode)) return
      savedRange.current = selection.rangeCount ? selection.getRangeAt(0).cloneRange() : null
      refresh()
    }
    document.addEventListener('selectionchange', onSelection)
    return () => document.removeEventListener('selectionchange', onSelection)
  }, [refresh])

  /** Puts the cursor back where it was before a button or the link box took focus. */
  function restoreSelection() {
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
    const range = savedRange.current
    const selection = window.getSelection()
    if (range && selection && editor.contains(range.startContainer)) {
      selection.removeAllRanges()
      selection.addRange(range)
    }
  }

  function run(command: string, argument?: string) {
    restoreSelection()
    // Bold as <b>, not as an inline style the converter would have to guess at.
    document.execCommand('styleWithCSS', false, 'false')
    document.execCommand('defaultParagraphSeparator', false, 'p')
    document.execCommand(command, false, argument)
    emit()
    refresh()
  }

  function toggleBlock(tag: 'h2' | 'h3') {
    run('formatBlock', active.has(tag) ? 'p' : tag)
  }

  function toggleCallout() {
    const editor = editorRef.current
    if (!editor) return
    restoreSelection()
    const quote = closestInEditor(editor, 'blockquote')
    if (!quote) {
      run('formatBlock', 'blockquote')
      return
    }
    // Taking a callout away puts its paragraphs back where it was.
    const parent = quote.parentNode
    if (!parent) return
    while (quote.firstChild) parent.insertBefore(quote.firstChild, quote)
    parent.removeChild(quote)
    emit()
    refresh()
  }

  function openLink() {
    const editor = editorRef.current
    if (!editor) return
    const selection = window.getSelection()
    if (selection?.rangeCount && editor.contains(selection.anchorNode)) {
      savedRange.current = trimRange(selection.getRangeAt(0))
    }
    const existing = closestInEditor(editor, 'a') as HTMLAnchorElement | null
    if (existing) {
      setLink({ text: existing.textContent || '', url: existing.getAttribute('href') || '', error: '', editing: true })
      return
    }
    setLink({ text: savedRange.current?.toString() || '', url: '', error: '', editing: false })
  }

  function applyLink() {
    if (!link) return
    const href = normaliseLink(link.url)
    if (!href) {
      setLink({ ...link, error: 'Enter a web address, an email address or a phone number.' })
      return
    }
    const text = link.text.trim() || linkLabel(href)
    const editor = editorRef.current
    restoreSelection()
    const existing = editor ? (closestInEditor(editor, 'a') as HTMLAnchorElement | null) : null
    if (existing) {
      existing.setAttribute('href', href)
      existing.textContent = text
      emit()
    } else {
      run('insertHTML', `<a href="${escapeHtml(href)}">${escapeHtml(text)}</a>`)
    }
    setLink(null)
  }

  function removeLink() {
    const editor = editorRef.current
    restoreSelection()
    const existing = editor ? closestInEditor(editor, 'a') : null
    if (existing) {
      const range = document.createRange()
      range.selectNodeContents(existing)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
      document.execCommand('unlink')
      emit()
    }
    setLink(null)
  }

  function onPaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const html = e.clipboardData.getData('text/html')
    const text = e.clipboardData.getData('text/plain')
    e.preventDefault()

    // Tidied the way an imported page is, but nothing is turned into a
    // heading that was not one: a bold line pasted stays a bold line.
    const markdown = html ? toMarkdown(html, { tidy: true }) : text.replace(/\r\n/g, '\n').trim()
    if (!markdown) return

    // A few words go into the line the cursor is on, not into a new paragraph.
    const fragment = markdownToHtml(markdown)
    const inline = /^<p>((?:(?!<\/?(p|h\d|ul|ol|blockquote)\b).)*)<\/p>$/s.exec(fragment)
    run('insertHTML', inline ? inline[1] : fragment)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      openLink()
    }
  }

  const hintId = `${id}-hint`
  const labelId = `${id}-label`

  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <span id={labelId} className="text-sm font-semibold text-zinc-900">
          {label}
        </span>
        <button
          type="button"
          onClick={() => setPlain((v) => !v)}
          className="text-[0.8rem] font-medium text-zinc-500 underline underline-offset-2 hover:text-zinc-900"
        >
          {plain ? 'Back to the formatting buttons' : 'Edit as plain text'}
        </button>
      </div>
      {hint && (
        <p id={hintId} className="text-[0.8rem] leading-relaxed text-zinc-500">
          {hint}
        </p>
      )}

      <div
        hidden={plain}
        className="overflow-hidden rounded-lg border border-zinc-300 bg-white transition focus-within:border-zinc-900 focus-within:ring-2 focus-within:ring-zinc-900/10"
      >
        <div
          role="toolbar"
          aria-label={`Formatting for ${label}`}
          className="flex flex-wrap items-center gap-0.5 border-b border-zinc-200 bg-zinc-50 p-1"
        >
          <ToolButton label="Heading" pressed={active.has('h2')} onPress={() => toggleBlock('h2')} wide>
            <span className="text-[0.95rem] font-bold" aria-hidden="true">
              H
            </span>
          </ToolButton>
          <ToolButton label="Subheading" pressed={active.has('h3')} onPress={() => toggleBlock('h3')} wide>
            <span className="text-[0.8rem] font-bold" aria-hidden="true">
              h
            </span>
          </ToolButton>
          <span className="mx-1 h-5 w-px bg-zinc-300" aria-hidden="true" />
          <ToolButton label="Bold" shortcut="Ctrl+B" pressed={active.has('bold')} onPress={() => run('bold')}>
            <span className="text-[0.95rem] font-black" aria-hidden="true">
              B
            </span>
          </ToolButton>
          <ToolButton label="Link" shortcut="Ctrl+K" pressed={active.has('link')} onPress={openLink} wide>
            <Glyph name="link" />
          </ToolButton>
          <span className="mx-1 h-5 w-px bg-zinc-300" aria-hidden="true" />
          <ToolButton label="Bullet list" pressed={active.has('ul')} onPress={() => run('insertUnorderedList')}>
            <Glyph name="bullets" />
          </ToolButton>
          <ToolButton label="Numbered list" pressed={active.has('ol')} onPress={() => run('insertOrderedList')}>
            <Glyph name="numbers" />
          </ToolButton>
          <ToolButton label="Callout" pressed={active.has('blockquote')} onPress={toggleCallout} wide>
            <Glyph name="callout" />
          </ToolButton>
          <span className="ml-auto flex items-center gap-0.5">
            <ToolButton label="Undo" shortcut="Ctrl+Z" onPress={() => run('undo')}>
              <Glyph name="undo" />
            </ToolButton>
            <ToolButton label="Redo" shortcut="Ctrl+Y" onPress={() => run('redo')}>
              <Glyph name="redo" />
            </ToolButton>
          </span>
        </div>

        {link && (
          <div className="grid gap-3 border-b border-zinc-200 bg-white p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="grid gap-1 text-[0.8rem] font-semibold text-zinc-700">
              Words to show
              <input
                type="text"
                value={link.text}
                onChange={(e) => setLink({ ...link, text: e.target.value })}
                placeholder="For example, book a flu jab"
                className="min-h-10 rounded-md border border-zinc-300 px-2.5 text-[0.9rem] font-normal text-zinc-900 outline-none focus:border-zinc-900"
              />
            </label>
            <label className="grid gap-1 text-[0.8rem] font-semibold text-zinc-700">
              Web address, email or phone number
              <input
                type="text"
                inputMode="url"
                autoFocus
                value={link.url}
                onChange={(e) => setLink({ ...link, url: e.target.value, error: '' })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    applyLink()
                  }
                  if (e.key === 'Escape') setLink(null)
                }}
                placeholder="www.nhs.uk"
                className="min-h-10 rounded-md border border-zinc-300 px-2.5 text-[0.9rem] font-normal text-zinc-900 outline-none focus:border-zinc-900"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={applyLink}
                className="min-h-10 rounded-md bg-zinc-900 px-3 text-[0.85rem] font-semibold text-white hover:bg-zinc-800"
              >
                {link.editing ? 'Update link' : 'Add link'}
              </button>
              {link.editing && (
                <button
                  type="button"
                  onClick={removeLink}
                  className="min-h-10 rounded-md border border-zinc-300 px-3 text-[0.85rem] font-semibold text-zinc-800 hover:bg-zinc-100"
                >
                  Remove link
                </button>
              )}
              <button
                type="button"
                onClick={() => setLink(null)}
                className="min-h-10 rounded-md px-3 text-[0.85rem] font-semibold text-zinc-600 hover:bg-zinc-100"
              >
                Cancel
              </button>
            </div>
            {link.error && (
              <p role="alert" className="text-[0.8rem] text-red-700 sm:col-span-3">
                {link.error}
              </p>
            )}
          </div>
        )}

        <div
          ref={editorRef}
          role="textbox"
          aria-multiline="true"
          aria-labelledby={labelId}
          aria-describedby={hint ? hintId : undefined}
          contentEditable
          suppressContentEditableWarning
          spellCheck
          lang="en-GB"
          // Set once. After that the browser owns the content and React
          // leaves it alone; outside changes are loaded by the effect above.
          dangerouslySetInnerHTML={initialHtml}
          onInput={emit}
          onPaste={onPaste}
          onKeyDown={onKeyDown}
          onDrop={(e) => {
            if (e.dataTransfer.files.length) e.preventDefault()
          }}
          className="ss-editor max-h-[70vh] overflow-y-auto px-4 py-3 outline-none"
          style={{ minHeight: `${Math.max(6, rows) * 1.25}rem` }}
        />
      </div>

      {!plain && (
        <p className="text-[0.8rem] leading-relaxed text-zinc-500">
          Select some words, then choose a button. Pasting from Word or another website keeps
          headings, lists, bold and links and tidies away the rest. Keep sentences short and
          paragraphs to two or three sentences, which is what NHS England asks for.
        </p>
      )}

      {plain && (
        <div className="grid gap-1.5">
          <textarea
            aria-labelledby={labelId}
            rows={rows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full min-h-11 resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-[0.85rem] leading-relaxed text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
          />
          <dl className="grid gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-[0.8rem] text-zinc-600">
            {[
              ['## Heading', 'A heading'],
              ['### Subheading', 'A smaller heading'],
              ['- Item', 'A bullet point'],
              ['1. Item', 'A numbered step'],
              ['> Text', 'A callout'],
              ['**bold**', 'Bold text'],
              ['[words](https://...)', 'A link'],
            ].map(([code, meaning]) => (
              <div key={code} className="flex gap-3">
                <dt className="w-40 shrink-0 font-mono text-zinc-900">{code}</dt>
                <dd>{meaning}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  )
}
