'use client'

import { useMemo, useState } from 'react'
import { renderMarkdown } from '@/lib/markdown'
import {
  acceptWordingUpdate,
  changedTargets,
  keepOwnWording,
  pendingWordingUpdates,
  type TargetState,
} from '@/lib/config/wording-updates'
import type { Release } from '@/lib/version'
import { Divider, Fieldset, SmallButton } from './fields'
import type { SectionProps } from './sections'

/** What /api/[site]/admin/version answers. */
export type VersionInfo =
  | { mode: 'hosted'; current: string }
  | {
      mode: 'self-hosted'
      current: string
      disabled?: boolean
      upstreamUrl?: string
      repoUrl?: string | null
      isUpstream?: boolean
      latest?: string | null
      newer?: Release[]
      error?: string
    }

interface Props extends SectionProps {
  /** Null while loading, and always in the demo, which has no server to ask. */
  version: VersionInfo | null
  demo: boolean
}

export function UpdatesSection({ config, update, version, demo }: Props) {
  const pending = useMemo(() => pendingWordingUpdates(config), [config])
  const [done, setDone] = useState('')

  return (
    <div className="grid gap-8">
      <Fieldset
        legend="Recommended wording"
        description="When NHS guidance changes, we update the wording that comes with the template. Pages you have already saved keep your words until you choose, so changes are listed here for you to review."
      >
        {done && (
          <p
            role="status"
            className="rounded-lg border border-green-200 bg-green-50 p-3 text-[0.85rem] text-green-800"
          >
            {done} Press <span className="font-semibold">Save changes</span> to publish it, or{' '}
            <span className="font-semibold">Undo changes</span> if you change your mind.
          </p>
        )}

        {pending.length === 0 ? (
          <p className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-[0.85rem] text-zinc-600">
            Nothing to review. Your wording is up to date with our latest recommendations.
          </p>
        ) : (
          <ul className="grid gap-4">
            {pending.map((item) => {
              const targets = changedTargets(config, item)
              const allNew = targets.every((t) => t.state.current === null)

              return (
                <li key={item.id} className="rounded-xl border border-zinc-200 p-4 sm:p-5">
                  {item.date && (
                    <p className="text-[0.75rem] font-semibold uppercase tracking-wider text-zinc-400">
                      {formatDate(item.date)}
                    </p>
                  )}
                  <h3 className="mt-1 text-base font-bold text-zinc-900">{item.title}</h3>
                  <p className="mt-1 text-[0.85rem] leading-relaxed text-zinc-600">{item.reason}</p>

                  <div className="mt-4 grid gap-2">
                    {targets.map(({ state }) => (
                      <TargetDiff key={state.label} state={state} />
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <SmallButton
                      tone="primary"
                      onClick={() => {
                        update(acceptWordingUpdate(config, item))
                        setDone(allNew ? 'Page added.' : 'Recommended wording taken.')
                      }}
                    >
                      {allNew ? 'Add this page' : 'Use the recommended wording'}
                    </SmallButton>
                    <SmallButton
                      onClick={() => {
                        update(keepOwnWording(config, item.id))
                        setDone(allNew ? 'We will not suggest it again.' : 'Your wording stays as it is.')
                      }}
                    >
                      {allNew ? 'Do not add it' : 'Keep my wording'}
                    </SmallButton>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Fieldset>

      <Divider />

      <Fieldset legend="Website version">
        <VersionPanel version={version} demo={demo} />
      </Fieldset>
    </div>
  )
}

/* ------------------------------------------------------------ difference */

function TargetDiff({ state }: { state: TargetState }) {
  const lines = useMemo(
    () => diffLines(state.current ?? '', state.recommended),
    [state.current, state.recommended],
  )

  return (
    <details className="rounded-lg border border-zinc-200 bg-zinc-50">
      <summary className="cursor-pointer px-3 py-2 text-[0.85rem] font-semibold text-zinc-800">
        {state.label}
        {state.current === null && (
          <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-[0.7rem] font-semibold text-green-800">
            New page
          </span>
        )}
        <span className="ml-2 font-normal text-zinc-500">
          {state.current === null ? 'See the wording' : 'See what changes'}
        </span>
      </summary>

      <div className="overflow-x-auto border-t border-zinc-200 bg-white">
        <p className="flex flex-wrap gap-4 px-3 pt-2 text-[0.75rem] text-zinc-500">
          <span>
            <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-red-200 align-middle" />
            Your wording, removed
          </span>
          <span>
            <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-green-200 align-middle" />
            Recommended, added
          </span>
        </p>
        <ol className="py-2 font-mono text-[0.8rem] leading-relaxed">
          {collapse(lines).map((line, i) =>
            line.kind === 'gap' ? (
              <li key={i} className="px-3 py-1 text-zinc-400 italic">
                {line.count} unchanged {line.count === 1 ? 'line' : 'lines'}
              </li>
            ) : (
              <li
                key={i}
                className={`whitespace-pre-wrap px-3 ${
                  line.kind === 'removed'
                    ? 'bg-red-50 text-red-900 line-through decoration-red-300'
                    : line.kind === 'added'
                      ? 'bg-green-50 text-green-900'
                      : 'text-zinc-600'
                }`}
              >
                <span className="sr-only">
                  {line.kind === 'removed' ? 'Removed: ' : line.kind === 'added' ? 'Added: ' : ''}
                </span>
                {line.text || <>&nbsp;</>}
              </li>
            ),
          )}
        </ol>
      </div>
    </details>
  )
}

type DiffLine = { kind: 'same' | 'removed' | 'added'; text: string }

/**
 * Line by line difference, by longest common subsequence.
 *
 * Quadratic, which is fine: the longest page is a few hundred lines, and this
 * only runs for the handful of updates a practice has open.
 */
function diffLines(before: string, after: string): DiffLine[] {
  const a = before ? before.replace(/\r\n/g, '\n').split('\n') : []
  const b = after.replace(/\r\n/g, '\n').split('\n')

  const table: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  )
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] =
        a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1])
    }
  }

  const out: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ kind: 'same', text: a[i] })
      i++
      j++
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      out.push({ kind: 'removed', text: a[i++] })
    } else {
      out.push({ kind: 'added', text: b[j++] })
    }
  }
  while (i < a.length) out.push({ kind: 'removed', text: a[i++] })
  while (j < b.length) out.push({ kind: 'added', text: b[j++] })
  return out
}

/** Folds long unchanged stretches so the changes are what you see. */
function collapse(lines: DiffLine[]): Array<DiffLine | { kind: 'gap'; count: number }> {
  const CONTEXT = 2
  const out: Array<DiffLine | { kind: 'gap'; count: number }> = []

  let run: DiffLine[] = []
  const flush = (atStart: boolean, atEnd: boolean) => {
    const head = atStart ? 0 : CONTEXT
    const tail = atEnd ? 0 : CONTEXT
    if (run.length > head + tail + 1) {
      out.push(...run.slice(0, head))
      out.push({ kind: 'gap', count: run.length - head - tail })
      out.push(...run.slice(run.length - tail))
    } else {
      out.push(...run)
    }
    run = []
  }

  lines.forEach((line) => {
    if (line.kind === 'same') {
      run.push(line)
    } else {
      flush(out.length === 0, false)
      out.push(line)
    }
  })
  flush(out.length === 0, true)

  return out
}

/* --------------------------------------------------------------- version */

function VersionPanel({ version, demo }: { version: VersionInfo | null; demo: boolean }) {
  if (demo) {
    return (
      <p className="text-[0.85rem] leading-relaxed text-zinc-600">
        Websites we host are kept up to date for you. If you run your own copy, this is where
        you are told when a new version is out, what is in it, and how to take it.
      </p>
    )
  }

  if (!version) {
    return <p className="text-[0.85rem] text-zinc-500">Checking for updates...</p>
  }

  if (version.mode === 'hosted') {
    return (
      <p className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-[0.85rem] leading-relaxed text-zinc-600">
        We keep your website up to date for you. New features and fixes arrive by themselves,
        and there is nothing to install. You are on version {version.current}.
      </p>
    )
  }

  const newer = version.newer ?? []
  const actions = newer.filter((r) => r.actionNeeded)

  return (
    <div className="grid gap-4">
      <dl className="grid gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-[0.85rem]">
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">Your version</dt>
          <dd className="font-semibold text-zinc-900">{version.current}</dd>
        </div>
        {!version.disabled && (
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Latest version</dt>
            <dd className="font-semibold text-zinc-900">{version.latest ?? 'Unknown'}</dd>
          </div>
        )}
      </dl>

      {version.disabled && (
        <p className="text-[0.85rem] text-zinc-500">
          Checking for updates is turned off on this website.
        </p>
      )}

      {version.error && <p className="text-[0.85rem] text-zinc-500">{version.error}</p>}

      {!version.disabled && !version.error && newer.length === 0 && (
        <p className="text-[0.85rem] text-zinc-600">You have the latest version.</p>
      )}

      {newer.length > 0 && (
        <>
          <p className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-[0.85rem] leading-relaxed text-blue-900">
            <span className="font-semibold">A new version is available.</span> Updating takes
            a couple of minutes and does not touch anything you have written here: your
            content is stored separately from the website&apos;s code.
          </p>

          {actions.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-[0.85rem] leading-relaxed text-amber-900">
              <p className="font-semibold">Before or after updating, you need to:</p>
              {actions.map((r) => (
                <div key={r.version} className="mt-2">
                  <p className="text-[0.75rem] font-semibold">Version {r.version}</p>
                  <div className={NOTES}>{renderMarkdown(r.actionNeeded, { headingLevel: 3 })}</div>
                </div>
              ))}
            </div>
          )}

          <HowToUpdate version={version} />

          <div className="grid gap-3">
            <h3 className="text-[0.9rem] font-bold text-zinc-900">What is new</h3>
            {newer.map((r) => (
              <details key={r.version} className="rounded-lg border border-zinc-200" open={r === newer[0]}>
                <summary className="cursor-pointer px-3 py-2 text-[0.85rem] font-semibold text-zinc-800">
                  Version {r.version}
                  {r.date && <span className="ml-2 font-normal text-zinc-500">{formatDate(r.date)}</span>}
                </summary>
                <div className={`border-t border-zinc-200 px-3 py-3 text-[0.85rem] leading-relaxed text-zinc-700 ${NOTES}`}>
                  {r.notes ? renderMarkdown(r.notes, { headingLevel: 3 }) : <p>Small fixes.</p>}
                </div>
              </details>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function HowToUpdate({ version }: { version: Extract<VersionInfo, { mode: 'self-hosted' }> }) {
  if (version.isUpstream) {
    return (
      <p className="text-[0.85rem] text-zinc-600">
        This website is built from the template repository itself. Deploy the latest commit to
        update it.
      </p>
    )
  }

  if (version.repoUrl) {
    return (
      <div className="grid gap-3">
        <h3 className="text-[0.9rem] font-bold text-zinc-900">How to update</h3>
        <ol className="grid list-decimal gap-2 pl-5 text-[0.85rem] leading-relaxed text-zinc-700">
          <li>Open your copy of the website on GitHub, using the button below.</li>
          <li>
            Press <span className="font-semibold">Sync fork</span>, then{' '}
            <span className="font-semibold">Update branch</span>.
          </li>
          <li>
            Vercel rebuilds your website by itself. Come back here in a few minutes and this page
            will say you have the latest version.
          </li>
        </ol>
        <p className="text-[0.8rem] text-zinc-500">
          If GitHub says there are conflicts, someone has changed the website&apos;s code in
          your copy. Ask whoever made those changes to bring the update across.
        </p>
        <div>
          <a
            href={version.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center rounded-lg bg-zinc-900 px-4 text-[0.9rem] font-bold text-white no-underline hover:bg-zinc-800"
          >
            Open my copy on GitHub
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      <h3 className="text-[0.9rem] font-bold text-zinc-900">How to update</h3>
      <p className="text-[0.85rem] leading-relaxed text-zinc-700">
        If your copy is a fork on GitHub, open it and press{' '}
        <span className="font-semibold">Sync fork</span>. Otherwise, in the folder you deploy
        from:
      </p>
      <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-3 text-[0.8rem] leading-relaxed text-zinc-100">
        {`git remote add upstream ${version.upstreamUrl ?? ''}.git
git fetch upstream
git merge upstream/main
git push`}
      </pre>
      <p className="text-[0.8rem] text-zinc-500">
        The first line only needs running once. Your host rebuilds the website after the push.
      </p>
    </div>
  )
}

function formatDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00Z`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Release notes are Markdown-lite; the admin panel has no prose styles of its own. */
const NOTES =
  'grid gap-2 [&_a]:underline [&_h3]:font-bold [&_h4]:font-bold [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5'
