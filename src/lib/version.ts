/**
 * The template version this deployment was built from.
 *
 * Set by `npm run release:template`, together with package.json and the
 * changelog. Do not edit it by hand: the admin panel compares it with the
 * newest release in the public repository to tell self-hosted practices an
 * update is available, and a number that does not match a changelog entry
 * would tell them something untrue.
 */
export const TEMPLATE_VERSION = '1.3.0'

/** Where self-hosted copies look for new releases. */
export const DEFAULT_UPSTREAM = 'JLHITS/simple-surgery-template'

export interface Release {
  version: string
  date: string
  /** Markdown-lite, the release notes with the action section taken out. */
  notes: string
  /** Things a practice has to do themselves, such as add a setting on Vercel. */
  actionNeeded: string
}

/** Compares x.y.z versions. Anything unparseable counts as 0.0.0. */
export function compareVersions(a: string, b: string): number {
  const parts = (v: string) => {
    const m = /^(\d+)\.(\d+)\.(\d+)/.exec(v.trim())
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, 0, 0]
  }
  const pa = parts(a)
  const pb = parts(b)
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i]
  }
  return 0
}

/**
 * Reads CHANGELOG.md into releases, newest first.
 *
 * The format is deliberately plain so it reads well on GitHub too:
 *
 *   ## 1.2.0 - 2026-10-02
 *
 *   - What changed, in a practice manager's words
 *
 *   ### Action needed
 *
 *   - Anything they must do themselves
 *
 * The "Unreleased" section is skipped.
 */
export function parseChangelog(source: string): Release[] {
  const releases: Release[] = []
  const sections = source.replace(/\r\n/g, '\n').split(/^## /m).slice(1)

  for (const section of sections) {
    const newline = section.indexOf('\n')
    const heading = (newline === -1 ? section : section.slice(0, newline)).trim()
    const match = /^v?(\d+\.\d+\.\d+)(?:\s*[-–]\s*(\d{4}-\d{2}-\d{2}))?/.exec(heading)
    if (!match) continue

    const body = newline === -1 ? '' : section.slice(newline + 1)
    const [notes, ...action] = body.split(/^### Action needed\s*$/im)

    releases.push({
      version: match[1],
      date: match[2] || '',
      notes: notes.trim(),
      actionNeeded: action.join('\n').trim(),
    })
  }

  return releases.sort((a, b) => compareVersions(b.version, a.version))
}
