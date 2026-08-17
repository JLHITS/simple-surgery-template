'use client'

import { useState } from 'react'
import { Divider, Fieldset, SmallButton, TextInput } from './fields'
import type { SiteConfig } from '@/lib/config/types'
import { STATUTORY_WARNING } from '@/lib/import/content'
import type { ConfigPatch, ExtractResult, Finding, PageFinding } from '@/lib/import/extract'

/**
 * Bringing content across from a practice's existing website.
 *
 * The whole flow is scan, review, apply, save. Nothing is written by the scan,
 * everything found is shown with a tick box, and applying only changes the
 * unsaved draft in the editor, so the practice still has to press Save and can
 * still walk away without doing so.
 *
 * That is deliberate and worth keeping. An importer that reads a website and
 * silently overwrites a live NHS page is one bad guess away from publishing
 * wrong opening hours to patients.
 */

const CONFIDENCE_LABEL: Record<Finding['confidence'], string> = {
  high: 'Confident',
  medium: 'Probably right',
  low: 'Check this one',
}

const CONFIDENCE_STYLE: Record<Finding['confidence'], string> = {
  high: 'bg-green-50 text-green-800 border-green-200',
  medium: 'bg-amber-50 text-amber-900 border-amber-200',
  low: 'bg-red-50 text-red-800 border-red-200',
}

/** Deep merges a finding's patch into the config, arrays replacing wholesale. */
function applyPatch(config: SiteConfig, patch: ConfigPatch): SiteConfig {
  const next = { ...config } as Record<string, unknown>

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue

    const current = next[key]
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      current &&
      typeof current === 'object' &&
      !Array.isArray(current)
    ) {
      next[key] = { ...(current as object), ...(value as object) }
    } else {
      next[key] = value
    }
  }

  return next as unknown as SiteConfig
}

/**
 * Puts an imported page's wording where it belongs.
 *
 * Three destinations, because the template keeps its pages in three shapes: a
 * field on `content`, an entry in `pages`, or an entry in `services`. Applied
 * one page at a time rather than as a whole-array patch, so two selected pages
 * cannot overwrite each other's array.
 */
function applyPage(config: SiteConfig, finding: PageFinding): SiteConfig {
  if (finding.targetKind === 'contentField') {
    return {
      ...config,
      content: { ...config.content, [finding.targetKey]: finding.markdown },
    }
  }

  const list = finding.targetKind === 'page' ? 'pages' : 'services'
  const items = config[list]
  const index = items.findIndex((item) => item.slug === finding.targetKey)

  // The page is not in this site's config, so there is nowhere to put it.
  // Silently doing nothing is right: the alternative is inventing a page the
  // practice did not ask for.
  if (index === -1) return config

  const next = [...items]
  next[index] = { ...next[index], body: finding.markdown }

  return { ...config, [list]: next }
}

export function MigrationSection({
  site,
  config,
  update,
}: {
  site: string
  config: SiteConfig
  update: (patch: Partial<SiteConfig>) => void
}) {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<'idle' | 'scanning' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<ExtractResult | null>(null)
  const [chosen, setChosen] = useState<Record<string, boolean>>({})
  const [chosenPages, setChosenPages] = useState<Record<string, boolean>>({})
  const [applied, setApplied] = useState(false)

  async function scan() {
    setStatus('scanning')
    setMessage('')
    setResult(null)
    setApplied(false)

    try {
      const res = await fetch(`/api/${site}/admin/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      const body = (await res.json()) as ExtractResult & { error?: string }

      if (!res.ok) {
        setStatus('error')
        setMessage(body.error || 'We could not read that website.')
        return
      }

      setResult(body)
      // Anything we are confident about starts ticked. Guesses do not, because
      // the practice should have to look at those before taking them.
      setChosen(
        Object.fromEntries(body.findings.map((f) => [f.id, f.confidence !== 'low'])),
      )
      // Page wording starts ticked only where the template is not already
      // doing the work: compliance pages and anything that trips the guidance
      // checks are left for the practice to turn on deliberately.
      setChosenPages(
        Object.fromEntries(
          body.pageFindings.map((p) => [p.id, !p.statutory && p.issues.length === 0]),
        ),
      )
      setStatus('done')
    } catch {
      setStatus('error')
      setMessage('Could not reach the server. Check your connection and try again.')
    }
  }

  function applySelected() {
    if (!result) return

    let next = config
    for (const finding of result.findings) {
      if (chosen[finding.id]) next = applyPatch(next, finding.patch)
    }
    for (const page of result.pageFindings) {
      if (chosenPages[page.id]) next = applyPage(next, page)
    }

    update(next)
    setApplied(true)
  }

  const selectedCount = result
    ? result.findings.filter((f) => chosen[f.id]).length +
      result.pageFindings.filter((p) => chosenPages[p.id]).length
    : 0

  const groups = result
    ? [...new Set(result.findings.map((f) => f.group))].map((group) => ({
        group,
        items: result.findings.filter((f) => f.group === group),
      }))
    : []

  return (
    <div className="grid gap-8">
      <p className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-[0.85rem] leading-relaxed text-blue-900">
        Moving from another website? Put your current address in below and we will read what is
        on it: your details, and the wording of any page this template already has. You choose
        what to bring across, and nothing changes until you press Save.
      </p>

      <Fieldset
        legend="Read my current website"
        description="Your existing website address. Anything public on it can be read, which is everything a patient can see."
      >
        <TextInput
          label="Website address"
          type="url"
          hint="For example www.yoursurgery.nhs.uk. You do not need the https part."
          value={url}
          onChange={setUrl}
        />

        <div className="flex flex-wrap items-center gap-3">
          <SmallButton tone="primary" onClick={scan} disabled={status === 'scanning' || !url.trim()}>
            {status === 'scanning' ? 'Reading your website...' : 'Read my website'}
          </SmallButton>
          {status === 'scanning' && (
            <span className="text-[0.85rem] text-zinc-500">
              This takes up to a minute. We read a handful of pages, not the whole site.
            </span>
          )}
        </div>

        {status === 'error' && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-[0.85rem] text-red-700"
          >
            {message}
          </p>
        )}
      </Fieldset>

      {result && (
        <>
          <Divider />

          <Fieldset
            legend={`What we found on ${new URL(result.siteUrl).hostname}`}
            description={`We read ${result.pagesRead.length} ${
              result.pagesRead.length === 1 ? 'page' : 'pages'
            }. Tick what you want to bring across.`}
          >
            {/* The disclaimer sits above the results, not below, because below
                is after the decision has been made. */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-[0.85rem] leading-relaxed text-amber-900">
              <p className="font-semibold">Check everything before you save.</p>
              <p className="mt-1.5">
                This will not find everything, and it will sometimes get something wrong.
                Websites vary enormously and we are reading pages meant for people, not for
                computers. Treat this as a head start on the typing, not as a finished job.
              </p>
              <p className="mt-1.5">
                <strong>Your opening hours and phone number are worth checking twice.</strong>{' '}
                Those are the two things a patient acts on immediately.
              </p>
            </div>

            {result.findings.length === 0 && (
              <p className="text-[0.9rem] text-zinc-600">
                We could reach the site but could not recognise anything on it. You will need to
                fill your details in by hand, which the other sections walk you through.
              </p>
            )}

            {groups.map(({ group, items }) => (
              <div key={group} className="grid gap-2">
                <h3 className="text-[0.8rem] font-semibold uppercase tracking-wide text-zinc-500">
                  {group}
                </h3>

                {items.map((finding) => (
                  <label
                    key={finding.id}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 p-3 hover:bg-zinc-50"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5 shrink-0 accent-zinc-900"
                      checked={Boolean(chosen[finding.id])}
                      onChange={(e) =>
                        setChosen((c) => ({ ...c, [finding.id]: e.target.checked }))
                      }
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-zinc-900">{finding.label}</span>
                        <span
                          className={`rounded border px-1.5 py-0.5 text-[0.7rem] font-medium ${
                            CONFIDENCE_STYLE[finding.confidence]
                          }`}
                        >
                          {CONFIDENCE_LABEL[finding.confidence]}
                        </span>
                      </span>
                      <span className="mt-1 block break-words text-[0.9rem] text-zinc-700">
                        {finding.display}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            ))}

            {result.pageFindings.length > 0 && (
              <div className="grid gap-3">
                <h3 className="text-[0.8rem] font-semibold uppercase tracking-wide text-zinc-500">
                  Page wording
                </h3>
                <p className="text-[0.85rem] leading-relaxed text-zinc-600">
                  Wording from your old site, matched to the pages this template already has.
                  Ticking one <strong>replaces</strong> the wording we supply for that page.
                </p>

                {result.pageFindings.map((page) => {
                  const ticked = Boolean(chosenPages[page.id])

                  return (
                    <div
                      key={page.id}
                      className={`rounded-lg border ${
                        ticked && (page.statutory || page.issues.length)
                          ? 'border-amber-300 bg-amber-50/40'
                          : 'border-zinc-200'
                      }`}
                    >
                      <label className="flex cursor-pointer items-start gap-3 p-3 hover:bg-zinc-50">
                        <input
                          type="checkbox"
                          className="mt-1 h-5 w-5 shrink-0 accent-zinc-900"
                          checked={ticked}
                          onChange={(e) =>
                            setChosenPages((c) => ({ ...c, [page.id]: e.target.checked }))
                          }
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-zinc-900">{page.targetLabel}</span>
                            <span className="text-[0.75rem] text-zinc-500">
                              {page.wordCount} words
                            </span>
                            {page.statutory && (
                              <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[0.7rem] font-medium text-amber-900">
                                We write this one for you
                              </span>
                            )}
                            {page.issues.length > 0 && (
                              <span className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[0.7rem] font-medium text-red-800">
                                {page.issues.length} wording{' '}
                                {page.issues.length === 1 ? 'problem' : 'problems'}
                              </span>
                            )}
                          </span>
                          <span className="mt-1 block text-[0.85rem] leading-relaxed text-zinc-600">
                            {page.excerpt}...
                          </span>
                          <span className="mt-1 block break-all text-[0.75rem] text-zinc-400">
                            from {page.sourceUrl}
                          </span>
                        </span>
                      </label>

                      {/* The argument for our own wording, made at the moment
                          somebody chooses to replace it rather than buried in a
                          notice they read before they had a decision to make. */}
                      {ticked && page.statutory && (
                        <div className="border-t border-amber-200 bg-amber-50 p-3 text-[0.85rem] leading-relaxed text-amber-900">
                          <p className="font-semibold">
                            You are about to replace a page we keep compliant for you.
                          </p>
                          <p className="mt-1.5">{page.caution}</p>
                          <p className="mt-1.5">{STATUTORY_WARNING}</p>
                          <p className="mt-1.5">
                            If you take it anyway, read it line by line before you go live, and
                            put a date in the diary to review it. It is your practice that is
                            accountable for what this page says, not your old supplier and not
                            us.
                          </p>
                        </div>
                      )}

                      {ticked && page.issues.length > 0 && (
                        <div className="border-t border-red-200 bg-red-50 p-3 text-[0.85rem] leading-relaxed text-red-900">
                          <p className="font-semibold">
                            This wording does not follow NHS England&apos;s guidance:
                          </p>
                          <ul className="mt-1.5 grid gap-1.5 pl-5">
                            {page.issues.map((issue) => (
                              <li key={issue.found} className="list-disc">
                                <strong>&ldquo;{issue.found}&rdquo;</strong> {issue.problem}
                              </li>
                            ))}
                          </ul>
                          <p className="mt-1.5">
                            You can fix these in Page wording after importing. The guidance comes
                            from user testing with over 160 patients, which is why the supplied
                            wording avoids them.
                          </p>
                        </div>
                      )}

                      <details className="border-t border-zinc-200 p-3 text-[0.85rem]">
                        <summary className="cursor-pointer font-medium text-zinc-700">
                          Read what would be imported
                        </summary>
                        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded bg-zinc-50 p-3 font-sans text-[0.85rem] leading-relaxed text-zinc-700">
                          {page.markdown}
                        </pre>
                      </details>
                    </div>
                  )
                })}
              </div>
            )}

            {result.missing.length > 0 && (
              <p className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-[0.85rem] leading-relaxed text-zinc-600">
                <strong className="text-zinc-900">We could not find:</strong>{' '}
                {result.missing.join(', ')}. That does not mean it is not there. Fill these in
                yourself in the other sections.
              </p>
            )}

            <details className="text-[0.85rem] text-zinc-600">
              <summary className="cursor-pointer font-medium text-zinc-800">
                Which pages we read
              </summary>
              <ul className="mt-2 grid gap-1">
                {result.pagesRead.map((page) => (
                  <li key={page.url} className="break-all">
                    {page.url}
                  </li>
                ))}
              </ul>
            </details>

            <div className="flex flex-wrap items-center gap-3">
              <SmallButton tone="primary" onClick={applySelected} disabled={!selectedCount}>
                {selectedCount
                  ? `Bring ${selectedCount} ${selectedCount === 1 ? 'item' : 'items'} across`
                  : 'Nothing selected'}
              </SmallButton>
              <SmallButton
                onClick={() => {
                  setChosen(Object.fromEntries(result.findings.map((f) => [f.id, false])))
                  setChosenPages(Object.fromEntries(result.pageFindings.map((p) => [p.id, false])))
                }}
              >
                Untick everything
              </SmallButton>
            </div>

            {applied && (
              <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-[0.85rem] leading-relaxed text-green-900">
                <strong>Brought across.</strong> Nothing is live yet. Look through the other
                sections to check it reads correctly, then press <strong>Save</strong> at the
                top of the page.
              </p>
            )}
          </Fieldset>
        </>
      )}

      <Divider />

      <Fieldset legend="What this cannot do">
        <ul className="grid gap-2 pl-5 text-[0.9rem] leading-relaxed text-zinc-600">
          <li className="list-disc">
            It reads a handful of pages, not your whole website. Deep pages are missed.
          </li>
          <li className="list-disc">
            It cannot read anything behind a login, and it cannot read text inside images or
            PDFs.
          </li>
          <li className="list-disc">
            Practice news, photographs and anything inside a form are not brought across.
          </li>
          <li className="list-disc">
            Page wording is offered, but the pages we write to keep you compliant with NHS
            England, CQC and the Information Commissioner start unticked. That is the point of
            the template: those pages are maintained for you as the rules change, and the
            version on your old site was usually written by your previous supplier for their
            whole estate rather than by your practice.
          </li>
          <li className="list-disc">
            Staff names are a guess from the text of a page. Photographs and job titles are not
            brought across.
          </li>
          <li className="list-disc">
            You are responsible for what your website says, whether you typed it or imported
            it. Read it through before you go live.
          </li>
        </ul>
      </Fieldset>
    </div>
  )
}
