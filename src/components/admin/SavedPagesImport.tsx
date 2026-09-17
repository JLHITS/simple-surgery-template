'use client'

import { useState } from 'react'
import { Fieldset, SmallButton, TextInput } from './fields'

/**
 * The fallback for websites that will not let a server read them.
 *
 * Firewalls that challenge data centres still let people in, so the practice
 * opens the pages in their own browser, saves them, and hands the files over.
 * The reading and the review afterwards are exactly the same as for the
 * automatic scan.
 */

export interface SavedPage {
  id: string
  name: string
  html: string
  /** Only for pasted source, where the practice may tell us the address. */
  url?: string
}

/** What the server will accept in one go, with room for the JSON around it. */
const MAX_SEND_CHARS = 4_000_000

/**
 * Drops what the extraction never reads, so forty saved pages fit in one
 * request. Scripts keep their opening tag, because a bot check page is
 * recognised partly by where its script comes from, and structured data keeps
 * its content, because that is where many sites state their name and hours.
 */
function slim(html: string): string {
  return html
    .replace(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi, (whole, attrs: string) =>
      /application\/ld\+json/i.test(attrs) ? whole : `<script${attrs}></script>`,
    )
    .replace(/<(style|svg)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/\s(?:src|href)\s*=\s*["']data:[^"']*["']/gi, '')
}

/** "https://site/contact-us/" becomes "contact-us", for a readable list. */
function shortPath(address: string): string {
  try {
    const { pathname } = new URL(address)
    const trimmed = decodeURIComponent(pathname).replace(/^\/+|\/+$/g, '')
    return trimmed || 'Home page'
  } catch {
    return address
  }
}

const GENERIC_PAGES = [
  'Your home page. Start with this one',
  'Contact us, or how to find us',
  'Opening times',
  'Our team, or meet the doctors',
  'Appointments',
  'Prescriptions',
  'Any policies you want to keep, such as complaints or your patient group',
]

const KBD = 'rounded border border-zinc-300 bg-white px-1'

let savedCounter = 0

export function SavedPagesImport({
  siteAddress,
  suggestions,
  busy,
  error,
  onRead,
}: {
  siteAddress: string
  suggestions: string[]
  busy: boolean
  /** A failure reading these pages, from the server. */
  error: string
  onRead: (pages: SavedPage[]) => void
}) {
  const [pages, setPages] = useState<SavedPage[]>([])
  const [pasteHtml, setPasteHtml] = useState('')
  const [pasteUrl, setPasteUrl] = useState('')
  const [problem, setProblem] = useState('')
  const [dragging, setDragging] = useState(false)

  const size = pages.reduce((total, page) => total + page.html.length, 0)

  async function addFiles(files: FileList | null) {
    if (!files?.length) return
    setProblem('')

    const added: SavedPage[] = []
    const refused: string[] = []

    for (const file of Array.from(files)) {
      if (!/\.html?$/i.test(file.name) && !/html/i.test(file.type)) {
        refused.push(file.name)
        continue
      }
      savedCounter += 1
      added.push({ id: `saved-${savedCounter}`, name: file.name, html: slim(await file.text()) })
    }

    setPages((current) => [...current, ...added])
    if (refused.length) {
      setProblem(
        `${refused.join(', ')} ${refused.length === 1 ? 'is' : 'are'} not a saved web page. Save pages as "Webpage, HTML only".`,
      )
    }
  }

  function addPasted() {
    if (!pasteHtml.trim()) return
    if (!/<[a-z!][\s\S]*>/i.test(pasteHtml)) {
      setProblem(
        'That looks like the words on the page rather than its source. Use View page source, then copy all of that.',
      )
      return
    }

    savedCounter += 1
    const address = pasteUrl.trim()
    setPages((current) => [
      ...current,
      {
        id: `saved-${savedCounter}`,
        name: address ? shortPath(address) : `Pasted page ${current.length + 1}`,
        html: slim(pasteHtml),
        url: address || undefined,
      },
    ])
    setPasteHtml('')
    setPasteUrl('')
    setProblem('')
  }

  function read() {
    if (size > MAX_SEND_CHARS) {
      setProblem('Those pages are too large to send together. Remove a few and read them in two goes.')
      return
    }
    setProblem('')
    onRead(pages)
  }

  return (
    <Fieldset
      legend="Add pages from your own browser"
      description="If your website will not let us read it, your browser still can. Save the pages from there and add them here. We read them exactly as we would have read your website."
    >
      <div className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-[0.85rem] leading-relaxed text-zinc-700">
        <p className="font-semibold text-zinc-900">
          {suggestions.length ? 'Save these pages' : 'Which pages to save'}
        </p>
        {suggestions.length > 0 ? (
          <ol className="grid list-decimal gap-1 pl-5">
            {suggestions.map((address, i) => (
              <li key={address} className="break-all">
                <a
                  href={address}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-900 underline underline-offset-2"
                >
                  {shortPath(address)}
                </a>
                {i === 0 && <span className="text-zinc-500"> (start with this one)</span>}
              </li>
            ))}
          </ol>
        ) : (
          <ul className="grid list-disc gap-1 pl-5">
            {GENERIC_PAGES.map((page) => (
              <li key={page}>{page}</li>
            ))}
          </ul>
        )}

        <p className="font-semibold text-zinc-900">How to save a page</p>
        <ol className="grid list-decimal gap-1 pl-5">
          <li>Open the page and wait until your website is showing.</li>
          <li>
            Press <kbd className={KBD}>Ctrl</kbd> + <kbd className={KBD}>S</kbd>, or{' '}
            <kbd className={KBD}>Cmd</kbd> + <kbd className={KBD}>S</kbd> on a Mac.
          </li>
          <li>
            Choose <strong>Webpage, HTML only</strong> in Chrome or Edge, or{' '}
            <strong>Web Page, HTML only</strong> in Firefox. In Safari choose{' '}
            <strong>Page Source</strong>.
          </li>
          <li>Save them all in one folder, then add them below together.</li>
        </ol>
      </div>

      <label
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          void addFiles(e.dataTransfer.files)
        }}
        className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed p-6 text-center text-[0.9rem] transition ${
          dragging ? 'border-zinc-900 bg-zinc-100' : 'border-zinc-300 hover:bg-zinc-50'
        }`}
      >
        <span className="font-semibold text-zinc-900">Drop saved pages here, or choose them</span>
        <span className="text-[0.8rem] text-zinc-500">.html files, as many as you like</span>
        <input
          type="file"
          accept=".html,.htm,text/html"
          multiple
          className="sr-only"
          onChange={(e) => {
            void addFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </label>

      <details className="rounded-lg border border-zinc-200 p-3 text-[0.85rem]">
        <summary className="cursor-pointer font-medium text-zinc-800">
          Or paste a page&apos;s source instead
        </summary>
        <div className="mt-3 grid gap-3">
          <p className="text-zinc-600">
            Useful on a computer where you cannot save files. Open the page, press{' '}
            <kbd className={KBD}>Ctrl</kbd> + <kbd className={KBD}>U</kbd> to view its source,
            select all of it, copy, and paste it here.
          </p>
          <TextInput
            label="Address of this page"
            type="url"
            hint="Optional, but it helps us put the wording in the right place."
            value={pasteUrl}
            onChange={setPasteUrl}
          />
          <label className="grid gap-1.5">
            <span className="text-[0.9rem] font-semibold text-zinc-900">Page source</span>
            <textarea
              value={pasteHtml}
              onChange={(e) => setPasteHtml(e.target.value)}
              rows={6}
              spellCheck={false}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-[0.8rem]"
            />
          </label>
          <div>
            <SmallButton onClick={addPasted} disabled={!pasteHtml.trim()}>
              Add this page
            </SmallButton>
          </div>
        </div>
      </details>

      {(problem || error) && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-[0.85rem] text-red-700"
        >
          {problem || error}
        </p>
      )}

      {pages.length > 0 && (
        <div className="grid gap-2">
          <p className="text-[0.85rem] font-semibold text-zinc-900">
            {pages.length} {pages.length === 1 ? 'page' : 'pages'} ready to read
          </p>
          <ul className="grid gap-1">
            {pages.map((page) => (
              <li
                key={page.id}
                className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2 text-[0.85rem]"
              >
                <span className="min-w-0 flex-1 truncate text-zinc-800">{page.name}</span>
                <span className="shrink-0 text-[0.75rem] text-zinc-500">
                  {Math.max(1, Math.round(page.html.length / 1024))} KB
                </span>
                <SmallButton
                  tone="danger"
                  onClick={() => setPages((current) => current.filter((p) => p.id !== page.id))}
                >
                  Remove
                </SmallButton>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <SmallButton tone="primary" onClick={read} disabled={busy}>
              {busy
                ? 'Reading your pages...'
                : `Read ${pages.length === 1 ? 'this page' : `these ${pages.length} pages`}`}
            </SmallButton>
            {!siteAddress.trim() && (
              <span className="text-[0.8rem] text-zinc-500">
                Tip: put your website address in the box above as well.
              </span>
            )}
          </div>
        </div>
      )}
    </Fieldset>
  )
}
