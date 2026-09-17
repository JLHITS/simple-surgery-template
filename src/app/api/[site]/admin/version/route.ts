import { NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { normaliseSlug } from '@/lib/storage'
import { singleTenantSlug } from '@/lib/tenant'
import {
  compareVersions,
  DEFAULT_UPSTREAM,
  parseChangelog,
  TEMPLATE_VERSION,
  type Release,
} from '@/lib/version'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Whether a newer version of the template has been published.
 *
 * Only meaningful for a self-hosted copy. Hosted practices all run on the one
 * deployment we keep current, so for them the answer is always "you already
 * have it" and nothing is fetched.
 *
 * For a self-hosted copy this reads CHANGELOG.md from the public repository.
 * No token, no GitHub API, nothing stored: a public file, at most a few times a
 * day per server instance. Set TEMPLATE_UPSTREAM to another "owner/repo" to
 * follow a different copy, or to "off" to never check.
 *
 * It never changes the site. Updating is done on GitHub, where the practice
 * can see exactly what they are taking.
 */

interface Context {
  params: Promise<{ site: string }>
}

const CACHE_MS = 6 * 60 * 60 * 1000
let cached: { upstream: string; releases: Release[]; at: number } | null = null

async function publishedReleases(upstream: string): Promise<Release[]> {
  if (cached && cached.upstream === upstream && Date.now() - cached.at < CACHE_MS) {
    return cached.releases
  }

  const res = await fetch(`https://raw.githubusercontent.com/${upstream}/main/CHANGELOG.md`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`changelog returned ${res.status}`)

  const releases = parseChangelog(await res.text())
  cached = { upstream, releases, at: Date.now() }
  return releases
}

/** The GitHub repository this deployment was built from, when Vercel says. */
function deployedRepo(): { owner: string; slug: string; url: string } | null {
  const provider = process.env.VERCEL_GIT_PROVIDER
  const owner = process.env.VERCEL_GIT_REPO_OWNER
  const slug = process.env.VERCEL_GIT_REPO_SLUG
  if (provider !== 'github' || !owner || !slug) return null
  return { owner, slug, url: `https://github.com/${owner}/${slug}` }
}

export async function GET(_request: Request, { params }: Context) {
  const { site: rawSite } = await params
  const site = normaliseSlug(rawSite)

  if (!site || !(await isAuthenticated(site))) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  const noStore = { headers: { 'Cache-Control': 'no-store' } }

  if (!singleTenantSlug()) {
    return NextResponse.json({ mode: 'hosted', current: TEMPLATE_VERSION }, noStore)
  }

  const setting = (process.env.TEMPLATE_UPSTREAM || '').trim()
  if (setting.toLowerCase() === 'off') {
    return NextResponse.json({ mode: 'self-hosted', current: TEMPLATE_VERSION, disabled: true }, noStore)
  }

  const upstream = /^[\w.-]+\/[\w.-]+$/.test(setting) ? setting : DEFAULT_UPSTREAM
  const repo = deployedRepo()
  const base = {
    mode: 'self-hosted',
    current: TEMPLATE_VERSION,
    upstreamUrl: `https://github.com/${upstream}`,
    repoUrl: repo?.url ?? null,
    // The upstream repository itself has nothing to sync from.
    isUpstream: repo ? `${repo.owner}/${repo.slug}`.toLowerCase() === upstream.toLowerCase() : false,
  }

  try {
    const releases = await publishedReleases(upstream)
    const newer = releases.filter((r) => compareVersions(r.version, TEMPLATE_VERSION) > 0)

    return NextResponse.json(
      { ...base, latest: releases[0]?.version ?? TEMPLATE_VERSION, newer },
      noStore,
    )
  } catch (err) {
    console.error('[simple-surgery] update check failed:', err)
    return NextResponse.json(
      { ...base, latest: null, newer: [], error: 'Could not check for updates just now.' },
      noStore,
    )
  }
}
