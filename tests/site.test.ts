import assert from 'node:assert/strict'
import { test } from 'node:test'
import { normaliseLink } from '../src/components/admin/RichText'
import { defaultConfig } from '../src/lib/config/defaults'
import { sanitiseConfig } from '../src/lib/config/sanitise'
import type { OpeningDay, Weekday } from '../src/lib/config/types'
import { buildTimeline } from '../src/lib/hours'
import { toMarkdown } from '../src/lib/import/convert'
import { markdownToHtml } from '../src/lib/markdown'
import { addressSummary, nhsProfileUrl, practiceSites } from '../src/lib/practice'

const week = (open: string, close: string): OpeningDay[] =>
  (['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as Weekday[]).map((day) => ({
    day,
    closed: day === 'saturday' || day === 'sunday',
    open,
    close,
  }))

test('the hours chart runs from opening to closing, and says so at both ends', () => {
  const { ticks, days } = buildTimeline(week('08:00', '18:30'), null)
  assert.equal(ticks[0].label, '8am')
  assert.equal(ticks[0].position, 0)
  assert.equal(ticks[ticks.length - 1].label, '6:30pm')
  assert.equal(ticks[ticks.length - 1].position, 100)
  assert.deepEqual(
    ticks.map((t) => t.label),
    ['8am', '10am', '12pm', '2pm', '4pm', '6:30pm'],
  )
  // Monday's bar ends exactly where the axis does.
  const monday = days[0].core!
  assert.equal(Math.round(monday.start + monday.width), 100)
})

test('extended hours stretch the chart to the latest closing time', () => {
  const extended = week('18:30', '20:00').map((d) => ({ ...d, closed: d.day !== 'tuesday' }))
  const { ticks } = buildTimeline(week('08:00', '18:30'), extended)
  assert.equal(ticks[ticks.length - 1].label, '8pm')
})

test('the NHS profile link carries a name part, which nhs.uk needs', () => {
  const practice = { ...defaultConfig.practice, name: "Orchard Surgery & St Paul's", odsCode: 'c82040' }
  assert.equal(nhsProfileUrl(practice), 'https://www.nhs.uk/services/gp-surgery/orchard-surgery-and-st-pauls/C82040')
  assert.equal(nhsProfileUrl({ ...practice, name: '' }), 'https://www.nhs.uk/services/gp-surgery/gp-surgery/C82040')
  assert.equal(nhsProfileUrl({ ...practice, odsCode: '' }), '')
})

test('the online request button in the header is on unless a practice turns it off', () => {
  assert.equal(defaultConfig.online.showRequestInHeader, true)

  const saved = JSON.parse(JSON.stringify(defaultConfig))
  saved.practice.name = 'Orchard Surgery'
  delete saved.online.showRequestInHeader
  assert.equal(sanitiseConfig(saved, defaultConfig).online.showRequestInHeader, true)

  saved.online.showRequestInHeader = false
  assert.equal(sanitiseConfig(saved, defaultConfig).online.showRequestInHeader, false)
})

test('every supplied page survives a trip through the editor unchanged', () => {
  const bodies = [
    ...defaultConfig.pages.map((p) => p.body),
    ...defaultConfig.services.map((s) => s.body),
    ...Object.values(defaultConfig.content),
  ].filter(Boolean)

  for (const body of bodies) {
    const normalised = body.replace(/^(\d+)[.)] /gm, '1. ').replace(/^\* /gm, '- ').trim()
    const roundTrip = toMarkdown(markdownToHtml(body))
    // Paragraph lines joined by the renderer are joined by the editor too.
    const expected = normalised
      .split(/\n{2,}/)
      .map((block) => (/^(#|- |1\. |> )/m.test(block) ? block : block.replace(/\n/g, ' ')))
      .join('\n\n')
    assert.equal(roundTrip, expected)
  }
})

test('the link box accepts what people actually type', () => {
  assert.equal(normaliseLink('www.nhs.uk'), 'https://www.nhs.uk')
  assert.equal(normaliseLink('nhs.uk/conditions'), 'https://nhs.uk/conditions')
  assert.equal(normaliseLink('https://111.nhs.uk'), 'https://111.nhs.uk')
  assert.equal(normaliseLink('reception@nhs.net'), 'mailto:reception@nhs.net')
  assert.equal(normaliseLink('0115 983 0011'), 'tel:01159830011')
  assert.equal(normaliseLink('javascript:alert(1)'), '')
  assert.equal(normaliseLink('click here'), '')
})

test('links the public pages allow survive the editor, and nothing else does', () => {
  const html =
    '<p><a href="#opening-hours">Hours</a> <a href="/about/complaints">Complaints</a> ' +
    '<a href="mailto:practice@nhs.net">Email</a> <a href="javascript:alert(1)">Bad</a></p>'
  assert.equal(
    toMarkdown(html),
    '[Hours](#opening-hours) [Complaints](/about/complaints) [Email](mailto:practice@nhs.net) Bad',
  )
})

const branch = {
  id: 'site-1',
  name: 'Gotham',
  addressLine1: 'Nottingham Road',
  addressLine2: '',
  town: 'Gotham',
  county: '',
  postcode: 'ng11 0he',
  phone: '0115 983 0011',
  sameHours: false,
  days: [],
  notes: 'This site has a dispensary.',
}

test('branch surgeries are kept, tidied and capped, and empty ones dropped', () => {
  const saved = JSON.parse(JSON.stringify(defaultConfig))
  saved.practice.name = 'Orchard Surgery'
  saved.practice.sites = [branch, { id: 'x', name: '', addressLine1: '', postcode: '' }, ...Array(12).fill(branch)]
  const sites = sanitiseConfig(saved, defaultConfig).practice.sites

  assert.equal(sites.length, 10)
  assert.equal(sites[0].postcode, 'NG11 0HE')
  // A branch with its own hours but none given starts from the main surgery's week.
  assert.equal(sites[0].days.length, 7)
  assert.deepEqual(sites[0].days[0], defaultConfig.hours.days[0])

  delete saved.practice.sites
  assert.deepEqual(sanitiseConfig(saved, defaultConfig).practice.sites, [])
})

test('every site is listed main surgery first, each telling patients what they need', () => {
  const practice = {
    ...defaultConfig.practice,
    name: 'Orchard Surgery',
    phone: '01509 672 419',
    addressLine1: 'Dragwell',
    town: 'Kegworth',
    postcode: 'DE74 2EL',
  }

  // One site reads as it always did.
  assert.deepEqual(
    practiceSites(practice).map((s) => s.label),
    ['Orchard Surgery'],
  )
  assert.equal(addressSummary(practice), 'Dragwell, DE74 2EL')

  const several = { ...practice, mainSiteName: 'Kegworth', sites: [{ ...branch, postcode: 'NG11 0HE', days: week('08:30', '13:00') }] }
  const [main, gotham] = practiceSites(several)
  assert.equal(main.label, 'Kegworth (main surgery)')
  assert.deepEqual(main.addressLines, ['Dragwell', 'Kegworth', 'DE74 2EL'])
  assert.equal(gotham.label, 'Gotham')
  assert.equal(gotham.phone, '0115 983 0011')
  assert.equal(gotham.days?.[0].close, '13:00')
  assert.match(gotham.directionsUrl, /Nottingham%20Road/)
  assert.equal(addressSummary(several), 'Surgeries in Kegworth and Gotham')

  // Same number as the main surgery, same hours: nothing extra to print.
  const plain = practiceSites({ ...several, sites: [{ ...branch, phone: '01509 672 419', sameHours: true }] })[1]
  assert.equal(plain.phone, '')
  assert.equal(plain.days, null)
})
