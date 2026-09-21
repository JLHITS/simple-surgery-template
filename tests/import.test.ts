import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { crawl, scoreFor } from '../src/lib/import/crawl'
import { targetFor } from '../src/lib/import/content'
import { extract } from '../src/lib/import/extract'
import { FetchBlocked, FetchRefused, fetchJson, fetchPage } from '../src/lib/import/fetch'
import { wordpressReader } from '../src/lib/import/wordpress'
import { anchors } from '../src/lib/import/html'

const origin = 'https://93.184.216.34'
const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })
const challenge = () => new Response('<title>JavaScript is disabled</title>awswaf', {
  status: 202, headers: { 'content-type': 'text/html', 'x-amzn-waf-action': 'challenge' },
})
const rows = [
  { id: 1, link: origin + '/', title: { rendered: 'Home Page' }, status: 'publish' },
  { id: 2, link: origin + '/contact/', title: { rendered: 'Contact' }, status: 'publish' },
  { id: 3, link: origin + '/practice-information/appointments/', title: { rendered: 'Appointments' }, status: 'publish' },
  { id: 4, link: origin + '/practice-information/meet-the-team/', title: { rendered: 'Meet the team' }, status: 'publish' },
  { id: 5, link: origin + '/practice-information/patient-participation-group/', title: { rendered: 'Patient Participation Group' }, status: 'publish' },
]
const prose = '<p>Contact our reception team to arrange an appointment with your usual doctor. We offer telephone and face to face appointments. Please tell us if you need an interpreter or help accessing the surgery. You can also contact the practice using our online service during opening hours.</p>'

function apiFixture(queryOnly = false) {
  const calls: URL[] = []
  globalThis.fetch = async (input) => {
    const url = new URL(String(input))
    calls.push(url)
    const path = url.searchParams.get('rest_route') ?? (queryOnly ? '' : url.pathname.replace(/^\/wp-json/, ''))
    const api = url.searchParams.has('rest_route') || (!queryOnly && url.pathname.startsWith('/wp-json/'))
    if (!api) return challenge()
    if (path === '/') return Response.json({ name: 'Abbey Medical Centre', home: origin })
    if (path === '/wp/v2/pages') return Response.json(rows)
    const row = rows.find(p => path === `/wp/v2/pages/${p.id}`)
    if (row) return Response.json({ ...row, content: { protected: false, rendered: row.id === 2 ? '<a href="tel:01159252000">0115 925 2000</a>' + prose : prose } })
    return Response.json({}, { status: 404 })
  }
  return calls
}

test('blocked homepage automatically imports published API pages with original sources', async () => {
  const calls = apiFixture()
  const pages = await crawl(origin)
  assert.equal(pages[0].url, origin + '/')
  assert.ok(pages.some(p => p.kind === 'team'))
  assert.ok(pages.some(p => p.target?.key === 'patient-group'))
  const result = extract(pages)
  assert.ok(result.findings.some(f => f.display === 'Abbey Medical Centre'))
  assert.ok(result.findings.some(f => f.display.includes('0115 925 2000')))
  assert.ok(result.pageFindings.some(f => f.targetKey === 'appointmentsBody'))
  assert.ok(result.pagesRead.every(p => !p.url.includes('wp-json')))
  assert.equal(calls.filter(u => u.pathname === '/wp-json/wp/v2/pages').length, 1)
  assert.equal(calls.filter(u => u.pathname === '/').length, 1)
})

test('query-string REST route works when wp-json is also challenged', async () => {
  const calls = apiFixture(true)
  const pages = await crawl(origin)
  assert.ok(pages.length >= 4)
  assert.ok(calls.some(u => u.searchParams.get('rest_route') === '/wp/v2/pages'))
})

test('a readable homepage can recover blocked subpages', async () => {
  apiFixture()
  const apiFetch = globalThis.fetch
  globalThis.fetch = async (input, init) => String(input) === origin + '/'
    ? new Response(`<title>Abbey Medical Centre</title><a href="/practice-information/appointments/">Appointments</a>`, { headers: { 'content-type': 'text/html' } })
    : apiFetch(input, init)
  const pages = await crawl(origin)
  assert.ok(pages.some(p => p.target?.key === 'appointmentsBody'))
})

test('complete blocking remains an explicit failure rather than challenge content', async () => {
  globalThis.fetch = async () => challenge()
  await assert.rejects(crawl(origin), FetchBlocked)
})

test('ordinary HTML imports do not require WordPress', async () => {
  const calls: string[] = []
  globalThis.fetch = async input => {
    calls.push(String(input))
    return String(input) === origin + '/'
      ? new Response('<title>Example Surgery</title><main>Welcome to our surgery</main>', { headers: { 'content-type': 'text/html' } })
      : new Response('', { status: 404 })
  }
  assert.equal((await crawl(origin)).length, 1)
  assert.ok(calls.every(url => !url.includes('wp-json')))
})

test('nested Practice365 pages map by their own name, not parent folder', () => {
  assert.equal(scoreFor('/practice-information/meet-the-team/', '')?.kind, 'team')
  assert.equal(scoreFor('/practice-information/new-patients/', '')?.kind, 'register')
  assert.equal(targetFor(origin + '/practice-information/patient-participation-group/', '')?.key, 'patient-group')
  assert.equal(targetFor(origin + '/practice-information/new-patients/', '')?.key, 'register')
  assert.equal(targetFor(origin + '/practice-information/', '')?.key, 'aboutBody')
  assert.equal(targetFor(origin + '/news/appointments/', ''), null)
})

test('news links mentioning about do not displace the practice information page', async () => {
  apiFixture()
  const apiFetch = globalThis.fetch
  globalThis.fetch = async (input, init) => {
    const url = String(input)
    if (url.includes('/pages/1?')) return Response.json({ ...rows[0], content: { rendered:
      '<a href="/2026/09/16/event/">Read more about our latest event</a>' + prose,
    } })
    if (url.includes('/pages?')) return Response.json([...rows, {
      id: 6, link: origin + '/practice-information/', title: { rendered: 'About our surgery' }, status: 'publish',
    }])
    if (url.includes('/pages/6?')) return Response.json({
      id: 6, link: origin + '/practice-information/', status: 'publish', content: { rendered: prose },
    })
    return apiFetch(input, init)
  }
  const pages = await crawl(origin)
  assert.equal(pages.find(p => p.kind === 'about')?.url, origin + '/practice-information/')
})

test('link classification uses visible text without SVG and class names', () => {
  const [link] = anchors('<a href="/contact/"><svg class="team-icon"><path /></svg><span class="about-link">Contact</span></a>', origin)
  assert.equal(link.text, 'Contact')
})

test('external NHS mailboxes are offered for review rather than automatically selected', () => {
  const result = extract([{ url: origin, kind: 'home', html: '<title>Abbey Medical Centre</title><a href="mailto:icb.patientexperience@nhs.net">Contact the ICB</a>' }])
  assert.equal(result.findings.find(f => f.id === 'practice.email')?.confidence, 'low')
})

test('API reader rejects foreign links and protected, draft or malformed content', async () => {
  for (const override of [{ status: 'draft' }, { content: { protected: true, rendered: prose } }, { content: { rendered: 123 } }, { link: 'https://example.com/' }]) {
    apiFixture()
    const apiFetch = globalThis.fetch
    globalThis.fetch = async (input, init) => String(input).includes('/pages/1?')
      ? Response.json({ ...rows[0], content: { rendered: prose }, ...override })
      : apiFetch(input, init)
    const reader = await wordpressReader(new URL(origin))
    assert.equal(await reader?.read(origin), null)
  }
})

test('API discovery is paginated and excludes off-site or private sources', async () => {
  const pages: string[] = []
  globalThis.fetch = async input => {
    const url = new URL(String(input))
    if (url.pathname === '/wp-json/') return Response.json({ name: 'Example Surgery' })
    pages.push(url.searchParams.get('page') || '')
    return Response.json(url.searchParams.get('page') === '1'
      ? Array.from({ length: 100 }, (_, i) => ({ ...rows[0], id: i + 1, link: `${origin}/page-${i}/` }))
      : [rows[1], { ...rows[0], link: 'http://127.0.0.1/' }, { ...rows[0], link: 'https://example.com/' }])
  }
  const reader = await wordpressReader(new URL(origin))
  assert.deepEqual(pages, ['1', '2'])
  assert.equal(reader?.links.length, 101)
})

test('JSON and HTML redirects cannot reach private addresses', async () => {
  globalThis.fetch = async () => new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/' } })
  await assert.rejects(fetchJson(origin), FetchRefused)
  await assert.rejects(fetchPage(origin), FetchRefused)
})

test('headerless 403 challenge is recognised', async () => {
  globalThis.fetch = async () => new Response('<title>Just a moment...</title>', { status: 403, headers: { 'content-type': 'text/html' } })
  await assert.rejects(fetchPage(origin), FetchBlocked)
})

test('oversized streaming responses are cancelled before consuming the whole body', async () => {
  let cancelled = false
  globalThis.fetch = async () => new Response(new ReadableStream({
    pull(controller) { controller.enqueue(new Uint8Array(1_000_001)) },
    cancel() { cancelled = true },
  }), { headers: { 'content-type': 'text/html' } })
  assert.equal(await fetchPage(origin), null)
  assert.equal(cancelled, true)
})

test('the crawl deadline prevents further HTML or API requests', async () => {
  globalThis.fetch = async () => { throw new Error('Must not fetch after cancellation') }
  const signal = AbortSignal.abort()
  assert.equal(await fetchPage(origin, signal), null)
  assert.equal(await fetchJson(origin, signal), null)
})

test('unavailable site metadata does not turn Home Page into the practice name', async () => {
  apiFixture()
  const apiFetch = globalThis.fetch
  globalThis.fetch = async (input, init) => new URL(String(input)).pathname === '/wp-json/'
    ? challenge() : apiFetch(input, init)
  const result = extract(await crawl(origin))
  assert.ok(!result.findings.some(f => f.id === 'practice.name' && /home page/i.test(f.display)))
})
