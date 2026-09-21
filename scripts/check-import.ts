/** Read-only live smoke test, including the API fallback from a data centre. */
import assert from 'node:assert/strict'
import { crawl } from '../src/lib/import/crawl'
import { extract } from '../src/lib/import/extract'

async function main() {
  const url = process.argv[2] || 'https://www.abbeymedicalcentre.org/'
  const realFetch = globalThis.fetch
  // Reproduce the original failure even on networks where HTML is accessible.
  globalThis.fetch = async (input, init) => {
    const target = new URL(String(input))
    if (target.pathname.includes('/wp-json/') || target.searchParams.has('rest_route')) {
      const response = await realFetch(input, init)
      console.log(`Public API: ${response.status} ${target.pathname}`)
      return response
    }
    return new Response('awswaf', { status: 202, headers: { 'x-amzn-waf-action': 'challenge' } })
  }
  try {
    const started = Date.now()
    const result = extract(await crawl(url))
    assert.ok(result.pagesRead.length >= 3, 'Expected multiple real pages')
    assert.ok(result.findings.some(f => f.id === 'practice.name'), 'Expected a practice name')
    assert.ok(result.findings.some(f => f.id === 'practice.phone'), 'Expected a practice phone')
    assert.ok(result.pageFindings.some(p => p.targetKey === 'appointmentsBody'), 'Expected appointments wording')
    console.log(JSON.stringify({
      url, seconds: (Date.now() - started) / 1000, pages: result.pagesRead.length,
      findings: result.findings.map(f => f.label),
      content: result.pageFindings.map(p => p.targetLabel), missing: result.missing,
    }, null, 2))
  } finally {
    globalThis.fetch = realFetch
  }
}

main().catch(err => { console.error(err); process.exitCode = 1 })
