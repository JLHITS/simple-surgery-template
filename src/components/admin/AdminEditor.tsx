'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SiteConfig } from '@/lib/config/types'
import {
  AdvancedSection,
  ComplianceSection,
  ContentSection,
  HoursSection,
  NewsSection,
  NoticeSection,
  OnlineSection,
  PagesSection,
  PracticeSection,
  ServicesSection,
  TeamSection,
} from './sections'
import { MigrationSection } from './MigrationSection'
import { DemoProvider } from './DemoMode'

type SectionKey =
  | 'migration'
  | 'practice'
  | 'hours'
  | 'notice'
  | 'online'
  | 'content'
  | 'services'
  | 'pages'
  | 'team'
  | 'news'
  | 'compliance'
  | 'advanced'

interface SectionDef {
  key: SectionKey
  label: string
  hint: string
  group: 'Everyday' | 'Content' | 'Practice information' | 'Moving in'
}

/**
 * Sections are grouped by how often a practice actually opens them.
 *
 * "Everyday" is the top of the list because that is where a receptionist goes
 * to close the surgery for a training afternoon. Compliance and Advanced are at
 * the bottom because they are set once and then left alone.
 */
const SECTIONS: SectionDef[] = [
  { key: 'notice', label: 'Notice banner', hint: 'A message at the top of the home page', group: 'Everyday' },
  { key: 'hours', label: 'Opening hours', hint: 'Hours, bank holidays and closures', group: 'Everyday' },
  { key: 'practice', label: 'Practice details', hint: 'Name, logo, address and phone', group: 'Everyday' },
  { key: 'news', label: 'News', hint: 'Automatic NHS news and your own updates', group: 'Everyday' },

  { key: 'online', label: 'Online services', hint: 'Links to your booking and prescription tools', group: 'Content' },
  { key: 'services', label: 'Services', hint: 'Test results, fit notes, vaccinations and more', group: 'Content' },
  { key: 'content', label: 'Page wording', hint: 'Appointments, prescriptions, about and contact', group: 'Content' },
  { key: 'team', label: 'Team', hint: 'Doctors, nurses and other staff', group: 'Content' },

  { key: 'pages', label: 'Policies and statements', hint: 'Complaints, privacy, accessibility', group: 'Practice information' },
  { key: 'compliance', label: 'Compliance', hint: 'CQC, ICB, data protection, GP earnings', group: 'Practice information' },
  { key: 'advanced', label: 'Advanced settings', hint: 'Colours, analytics, storage', group: 'Practice information' },

  { key: 'migration', label: 'Migration', hint: 'Bring content over from your old website', group: 'Moving in' },
]

const GROUPS = ['Everyday', 'Content', 'Practice information', 'Moving in'] as const

export interface BillingInfo {
  status: 'active' | 'past_due' | 'suspended'
  email: string
  customDomain: string
  mustChangePassword: boolean
}

interface Props {
  /** The practice slug. Every admin request is scoped to it. */
  site: string
  initialConfig: SiteConfig
  storage: { name: string; configured: boolean; persistent: boolean }
  siteUrl: string
  /** Null for the demo and for self-hosted sites, which have no billing. */
  billing: BillingInfo | null
  /**
   * The public demo at /admin-demo. Every editing control works exactly as it
   * does for a practice; nothing reaches the server and nothing is stored.
   */
  demo?: boolean
}

export function AdminEditor({
  site,
  initialConfig,
  storage,
  siteUrl,
  billing,
  demo = false,
}: Props) {
  const [config, setConfig] = useState<SiteConfig>(initialConfig)
  const [saved, setSaved] = useState<string>(JSON.stringify(initialConfig))
  const [section, setSection] = useState<SectionKey>('notice')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [navOpen, setNavOpen] = useState(false)
  const [demoSaved, setDemoSaved] = useState(false)

  const dirty = useMemo(() => JSON.stringify(config) !== saved, [config, saved])

  const update = useCallback((patch: Partial<SiteConfig>) => {
    setConfig((current) => ({ ...current, ...patch }))
    setStatus('idle')
  }, [])

  // Nobody should be able to close the tab and silently lose an afternoon of
  // edits. The browser's own confirmation dialog is the right tool here. Not in
  // the demo though: throwing the changes away is the whole point of it, and
  // being nagged on the way out would be a poor last impression.
  useEffect(() => {
    if (!dirty || demo) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty, demo])

  async function save() {
    // The demo stops here. Not by refusing at the API, which would surface as
    // an error and read like the product is broken, but by never asking: the
    // draft in the browser is the whole of it.
    if (demo) {
      setDemoSaved(true)
      return
    }

    setStatus('saving')
    setMessage('')

    try {
      const res = await fetch(`/api/${site}/admin/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      const body = (await res.json()) as { error?: string; updatedAt?: string }

      if (!res.ok) {
        setStatus('error')
        setMessage(body.error || 'Could not save your changes.')
        return
      }

      setSaved(JSON.stringify(config))
      setStatus('saved')
      setMessage('Your changes are live.')
    } catch {
      setStatus('error')
      setMessage('Could not reach the server. Check your connection and try again.')
    }
  }

  async function signOut() {
    await fetch(`/api/${site}/admin/logout`, { method: 'POST' })
    window.location.reload()
  }

  const current = SECTIONS.find((s) => s.key === section) ?? SECTIONS[0]

  return (
    <DemoProvider value={demo}>
      <div className="min-h-screen bg-zinc-50 pb-28">
        {/* ---------------------------------------------------------- header */}
        <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-zinc-900">{config.practice.name}</p>
              <p className="text-[0.75rem] text-zinc-500">
                {demo ? 'Website settings, in demo' : 'Website settings'}
              </p>
            </div>

            {demo && (
              <span className="hidden shrink-0 rounded-full bg-amber-100 px-3 py-1 text-[0.7rem] font-bold uppercase tracking-wider text-amber-900 sm:inline">
                Demo
              </span>
            )}

            <div className="ml-auto flex items-center gap-2">
              <a
                href={siteUrl || '/'}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden min-h-10 items-center rounded-lg border border-zinc-300 px-3 text-[0.85rem] font-semibold text-zinc-800 no-underline hover:bg-zinc-100 sm:inline-flex"
              >
                View website
              </a>
              {!demo && (
                <button
                  type="button"
                  onClick={signOut}
                  className="inline-flex min-h-10 items-center rounded-lg border border-zinc-300 px-3 text-[0.85rem] font-semibold text-zinc-800 hover:bg-zinc-100"
                >
                  Sign out
                </button>
              )}
              <button
                type="button"
                onClick={() => setNavOpen((v) => !v)}
                aria-expanded={navOpen}
                className="inline-flex min-h-10 items-center rounded-lg border border-zinc-300 px-3 text-[0.85rem] font-semibold text-zinc-800 hover:bg-zinc-100 lg:hidden"
              >
                {navOpen ? 'Close' : 'Sections'}
              </button>
            </div>
          </div>
        </header>

        {demo && (
          <div className="border-b border-amber-200 bg-amber-50">
            <div className="mx-auto max-w-6xl px-4 py-3 text-[0.85rem] leading-relaxed text-amber-900 sm:px-6">
              <span className="font-semibold">This is the real editor, with the brakes on.</span>{' '}
              Change anything you like. Nothing is saved, nothing is uploaded, and the demo
              website is not affected. Reload the page and it is all back as it was.
            </div>
          </div>
        )}

        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[16rem_1fr]">
          {/* --------------------------------------------------------- nav */}
          <nav
            aria-label="Settings sections"
            className={`${navOpen ? 'block' : 'hidden'} lg:block`}
          >
            <div className="lg:sticky lg:top-24 grid gap-6">
              {GROUPS.map((group) => (
                <div key={group}>
                  <h2 className="mb-2 px-2 text-[0.7rem] font-bold uppercase tracking-wider text-zinc-400">
                    {group}
                  </h2>
                  <ul className="grid gap-0.5">
                    {SECTIONS.filter((s) => s.group === group).map((item) => (
                      <li key={item.key}>
                        <button
                          type="button"
                          onClick={() => {
                            setSection(item.key)
                            setNavOpen(false)
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }}
                          aria-current={section === item.key ? 'true' : undefined}
                          className={`w-full rounded-lg px-3 py-2 text-left text-[0.9rem] transition ${
                            section === item.key
                              ? 'bg-zinc-900 font-semibold text-white'
                              : 'text-zinc-700 hover:bg-zinc-200/60'
                          }`}
                        >
                          {item.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </nav>

          {/* ------------------------------------------------------- editor */}
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{current.label}</h1>
              <p className="mt-1 text-[0.9rem] text-zinc-500">{current.hint}</p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-7">
              {section === 'practice' && <PracticeSection site={site} config={config} update={update} />}
              {section === 'hours' && <HoursSection site={site} config={config} update={update} />}
              {section === 'notice' && <NoticeSection site={site} config={config} update={update} />}
              {section === 'online' && <OnlineSection site={site} config={config} update={update} />}
              {section === 'content' && <ContentSection site={site} config={config} update={update} />}
              {section === 'services' && <ServicesSection site={site} config={config} update={update} />}
              {section === 'pages' && <PagesSection site={site} config={config} update={update} />}
              {section === 'team' && <TeamSection site={site} config={config} update={update} />}
              {section === 'news' && <NewsSection site={site} config={config} update={update} />}
              {section === 'compliance' && <ComplianceSection site={site} config={config} update={update} />}
              {section === 'advanced' && (
                <AdvancedSection site={site} config={config} update={update} storage={storage} />
              )}

              {section === 'migration' &&
                (demo ? (
                  <MigrationDemoNote />
                ) : (
                  <MigrationSection site={site} config={config} update={update} />
                ))}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------- save bar */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
            <p className="min-w-0 flex-1 text-[0.85rem]" role="status" aria-live="polite">
              {status === 'error' && <span className="font-semibold text-red-700">{message}</span>}
              {status === 'saved' && <span className="font-semibold text-green-700">{message}</span>}
              {status !== 'error' && status !== 'saved' && (
                <span className="text-zinc-500">
                  {demo
                    ? dirty
                      ? 'You have unsaved changes. Press Save and see what happens.'
                      : 'Edit anything on the left, then press Save.'
                    : dirty
                      ? 'You have unsaved changes.'
                      : 'Everything is saved.'}
                </span>
              )}
            </p>

            <button
              type="button"
              onClick={() => {
                setConfig(JSON.parse(saved) as SiteConfig)
                setStatus('idle')
              }}
              disabled={!dirty || status === 'saving'}
              className="inline-flex min-h-11 items-center rounded-lg border border-zinc-300 px-4 text-[0.9rem] font-semibold text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {demo ? 'Put it back' : 'Undo changes'}
            </button>

            <button
              type="button"
              onClick={save}
              disabled={(!dirty && !demo) || status === 'saving'}
              className="inline-flex min-h-11 items-center rounded-lg bg-zinc-900 px-6 text-[0.9rem] font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {status === 'saving' ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
        {demoSaved && <DemoSaveDialog onClose={() => setDemoSaved(false)} />}
      </div>
    </DemoProvider>
  )
}

/* ------------------------------------------------------------ demo dialog */

/**
 * What Save does in the demo.
 *
 * A dialog rather than a line in the save bar, because the whole point of the
 * demo is the moment someone presses Save: they should be told plainly that
 * nothing happened, in a tone that reads as friendly rather than as an error.
 */
function DemoSaveDialog({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-save-heading"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl sm:p-7"
      >
        <p className="text-3xl leading-none" aria-hidden="true">
          🎉
        </p>
        <h2
          id="demo-save-heading"
          className="mt-4 text-xl font-bold leading-snug tracking-tight text-zinc-900"
        >
          Your changes would usually be saved, but this is just a demo :-)
        </h2>
        <p className="mt-3 text-[0.9rem] leading-relaxed text-zinc-600">
          On a real Simple Surgery website that button publishes the change in about a second.
          No ticket, no supplier, no waiting until Thursday.
        </p>
        <p className="mt-2 text-[0.9rem] leading-relaxed text-zinc-600">
          Carry on having a play. Everything still works, and a refresh puts it all back.
        </p>

        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-zinc-900 px-4 font-bold text-white transition hover:bg-zinc-800"
        >
          Keep looking around
        </button>
      </div>
    </div>
  )
}

/* --------------------------------------------------------- demo migration */

/**
 * Migration in the demo.
 *
 * The real thing fetches a practice's existing website on the server, which is
 * exactly the sort of endpoint that should stay behind a password: left open it
 * would be a free proxy for pointing at other people's networks. So the demo
 * describes it rather than running it.
 */
function MigrationDemoNote() {
  return (
    <div className="grid gap-4">
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-[0.85rem] leading-relaxed text-amber-900">
        This is the one part of the editor the demo cannot run. Scanning a website happens on
        our server, so it stays behind your practice password.
      </p>

      <h3 className="text-base font-bold text-zinc-900">What it does on a real site</h3>
      <ol className="grid gap-3 text-[0.9rem] leading-relaxed text-zinc-600">
        <li>
          <span className="font-semibold text-zinc-900">You paste your current address.</span>{' '}
          Whatever your existing supplier hosts for you today.
        </li>
        <li>
          <span className="font-semibold text-zinc-900">We read it and report back.</span>{' '}
          Phone numbers, opening hours, staff, services and page wording, each with a note
          saying how confident we are about it.
        </li>
        <li>
          <span className="font-semibold text-zinc-900">You tick what to keep.</span> Anything
          we are only guessing at starts unticked, so nothing arrives on your website without
          somebody at the practice looking at it.
        </li>
        <li>
          <span className="font-semibold text-zinc-900">Nothing goes live until you save.</span>{' '}
          It lands in the editor as a draft, exactly like the changes you have been making
          here.
        </li>
      </ol>

      <p className="text-[0.9rem] leading-relaxed text-zinc-600">
        Most practices are moved across in an afternoon, and we will do this part for you if
        you would rather not.
      </p>
    </div>
  )
}
