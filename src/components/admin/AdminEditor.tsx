'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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

type SectionKey =
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
  group: 'Everyday' | 'Content' | 'Practice information'
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
]

const GROUPS = ['Everyday', 'Content', 'Practice information'] as const

interface Props {
  initialConfig: SiteConfig
  storage: { name: string; configured: boolean; persistent: boolean }
  siteUrl: string
}

export function AdminEditor({ initialConfig, storage, siteUrl }: Props) {
  const [config, setConfig] = useState<SiteConfig>(initialConfig)
  const [saved, setSaved] = useState<string>(JSON.stringify(initialConfig))
  const [section, setSection] = useState<SectionKey>('notice')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [navOpen, setNavOpen] = useState(false)

  const dirty = useMemo(() => JSON.stringify(config) !== saved, [config, saved])

  const update = useCallback((patch: Partial<SiteConfig>) => {
    setConfig((current) => ({ ...current, ...patch }))
    setStatus('idle')
  }, [])

  // Nobody should be able to close the tab and silently lose an afternoon of
  // edits. The browser's own confirmation dialog is the right tool here.
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  async function save() {
    setStatus('saving')
    setMessage('')

    try {
      const res = await fetch('/api/admin/save', {
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
    await fetch('/api/admin/logout', { method: 'POST' })
    window.location.href = '/admin'
  }

  const current = SECTIONS.find((s) => s.key === section) ?? SECTIONS[0]

  return (
    <div className="min-h-screen bg-zinc-50 pb-28">
      {/* ---------------------------------------------------------- header */}
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-zinc-900">{config.practice.name}</p>
            <p className="text-[0.75rem] text-zinc-500">Website settings</p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <a
              href={siteUrl || '/'}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden min-h-10 items-center rounded-lg border border-zinc-300 px-3 text-[0.85rem] font-semibold text-zinc-800 no-underline hover:bg-zinc-100 sm:inline-flex"
            >
              View website
            </a>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex min-h-10 items-center rounded-lg border border-zinc-300 px-3 text-[0.85rem] font-semibold text-zinc-800 hover:bg-zinc-100"
            >
              Sign out
            </button>
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
            {section === 'practice' && <PracticeSection config={config} update={update} />}
            {section === 'hours' && <HoursSection config={config} update={update} />}
            {section === 'notice' && <NoticeSection config={config} update={update} />}
            {section === 'online' && <OnlineSection config={config} update={update} />}
            {section === 'content' && <ContentSection config={config} update={update} />}
            {section === 'services' && <ServicesSection config={config} update={update} />}
            {section === 'pages' && <PagesSection config={config} update={update} />}
            {section === 'team' && <TeamSection config={config} update={update} />}
            {section === 'news' && <NewsSection config={config} update={update} />}
            {section === 'compliance' && <ComplianceSection config={config} update={update} />}
            {section === 'advanced' && (
              <AdvancedSection config={config} update={update} storage={storage} />
            )}
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
                {dirty ? 'You have unsaved changes.' : 'Everything is saved.'}
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
            Undo changes
          </button>

          <button
            type="button"
            onClick={save}
            disabled={!dirty || status === 'saving'}
            className="inline-flex min-h-11 items-center rounded-lg bg-zinc-900 px-6 text-[0.9rem] font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {status === 'saving' ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
