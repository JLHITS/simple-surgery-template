'use client'

import { useState } from 'react'
import { NhsLogo } from '@/components/NhsLogo'

export function LoginForm({
  practiceName,
  configured,
  showNhsLogo,
}: {
  practiceName: string
  configured: boolean
  showNhsLogo: boolean
}) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        // Full reload rather than a router refresh, so the server renders the
        // editor with the new session cookie already in place.
        window.location.href = '/admin'
        return
      }

      const body = (await res.json()) as { error?: string }
      setError(body.error || 'That did not work.')
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          {showNhsLogo && (
            <>
              <NhsLogo height={24} />
              <span className="h-7 w-px bg-zinc-300" aria-hidden="true" />
            </>
          )}
          <div>
            <p className="text-sm font-bold text-zinc-900">{practiceName}</p>
            <p className="text-[0.75rem] text-zinc-500">Website settings</p>
          </div>
        </div>

        {!configured ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h1 className="text-lg font-bold text-amber-900">No password has been set</h1>
            <p className="mt-2 text-[0.9rem] leading-relaxed text-amber-900">
              Add an <code className="rounded bg-amber-100 px-1">ADMIN_PASSWORD</code>{' '}
              environment variable and restart the site. Until then, nobody can sign in and
              nobody can change your website.
            </p>
            <p className="mt-3 text-[0.85rem] text-amber-800">
              Running locally? Create a file called{' '}
              <code className="rounded bg-amber-100 px-1">.env.local</code> in the template
              folder with a line like{' '}
              <code className="rounded bg-amber-100 px-1">ADMIN_PASSWORD=letmein</code>.
            </p>
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
          >
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">Sign in</h1>
            <p className="mt-1 text-[0.85rem] text-zinc-500">
              Enter the password your practice uses to manage the website.
            </p>

            <div className="mt-5 grid gap-1.5">
              <label htmlFor="password" className="text-sm font-semibold text-zinc-900">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                className="min-h-12 w-full rounded-lg border border-zinc-300 px-3 py-2 text-base outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[0.85rem] text-red-700"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || !password}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-zinc-900 px-4 font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? 'Checking...' : 'Sign in'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-[0.8rem] text-zinc-500">
          <a href="/" className="underline underline-offset-2 hover:text-zinc-900">
            Back to the website
          </a>
        </p>
      </div>
    </div>
  )
}
