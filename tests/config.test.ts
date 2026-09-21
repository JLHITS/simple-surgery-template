import assert from 'node:assert/strict'
import { test } from 'node:test'
import { defaultConfig, SCHEMA_VERSION } from '../src/lib/config/defaults'
import { demoConfig, stripDemoContent } from '../src/lib/config/demo-content'
import { mergeDeep } from '../src/lib/config/merge'
import { practiceDescription, practiceStrapline, practiceTitle } from '../src/lib/practice'

/**
 * The defaults are what a practice publishes on day one, before they have
 * edited anything. Anything invented in there goes out under their name, so
 * these tests are less about the code and more about the content.
 */

const FICTION =
  /frogmorton|bywater|eastfarthing|baggins|bilbo|gamgee|proudfoot|brandybuck|butterbur|rosie cotton|hamfast|whitfurrows|floating log|four farthings|shire|buckland|01632|\.example\b|Z99999|Z1234567/i

test('the defaults name no practice, real or invented', () => {
  const found: string[] = []

  const walk = (value: unknown, path: string) => {
    if (typeof value === 'string') {
      if (FICTION.test(value)) found.push(`${path}: ${value.slice(0, 60)}`)
    } else if (Array.isArray(value)) {
      value.forEach((item, i) => walk(item, `${path}[${i}]`))
    } else if (value && typeof value === 'object') {
      for (const [key, item] of Object.entries(value)) walk(item, `${path}.${key}`)
    }
  }

  walk(defaultConfig, 'defaultConfig')
  assert.deepEqual(found, [])
})

test('the defaults make no statutory declaration on the practice behalf', () => {
  const { compliance, practice, team, news, notice } = defaultConfig

  assert.equal(compliance.cqcRating, '', 'a CQC rating nobody earned')
  assert.equal(compliance.icoRegistration, '', 'an ICO number nobody registered')
  assert.equal(compliance.gpEarningsAmount, '', 'GP pay nobody declared')
  assert.equal(compliance.gpEarningsYear, '')
  assert.equal(compliance.dataProtectionOfficer, '')
  assert.equal(compliance.complaintsContactName, '')

  assert.equal(practice.name, '')
  assert.equal(practice.phone, '')
  assert.equal(practice.email, '')
  assert.deepEqual(team, [], 'invented clinicians patients could ask for')
  assert.deepEqual(news.practiceNews, [])
  assert.equal(notice.enabled, false, 'a banner announcing something not happening')

  // The address the admin panel's "View website" link used to send everyone to.
  assert.equal(defaultConfig.advanced.siteUrl, '')
})

test('the defaults keep the shared NHS wording that makes a site compliant', () => {
  assert.ok(defaultConfig.content.appointmentsBody.includes('Home visits'))
  assert.ok(defaultConfig.content.prescriptionsBody.length > 500)
  assert.ok(defaultConfig.urgent.emergencyText.includes('999'))
  assert.ok(defaultConfig.compliance.gpEarningsStatement.includes('mean earnings'))
  assert.ok(defaultConfig.compliance.publicationScheme.length >= 10)
  assert.ok(defaultConfig.pages.some((p) => p.slug === 'privacy' && p.statutory))
  assert.ok(defaultConfig.services.length >= 5)
  assert.ok(defaultConfig.news.nhsFeedEnabled, 'the national feed is the whole point')
})

test('the demo still gets its showcase content', () => {
  assert.equal(demoConfig.practice.name, 'Frogmorton Medical Centre')
  assert.equal(demoConfig.team.length, 8)
  assert.equal(demoConfig.notice.enabled, true)
  assert.equal(demoConfig.advanced.siteUrl, 'https://demo.simplesurgery.co')

  // and keeps inheriting the shared wording rather than forking a copy of it
  assert.equal(demoConfig.content.appointmentsBody, defaultConfig.content.appointmentsBody)
  assert.equal(demoConfig.services.length, defaultConfig.services.length)
})

/* ------------------------------------------------ the 1 -> 2 migration */

type Plain = Record<string, unknown>

/** A site seeded before the split, which then had Save pressed on it. */
const bakedIn = () => JSON.parse(JSON.stringify(demoConfig)) as Plain

test('a practice who pressed Save has the demo taken back out', () => {
  const stored = bakedIn()
  stored.practice = { ...(stored.practice as Plain), name: 'Hillside Surgery' }

  const loaded = mergeDeep(defaultConfig, stripDemoContent(stored))

  assert.equal(loaded.practice.name, 'Hillside Surgery', 'their own name survives')
  assert.equal(loaded.practice.town, '', 'the demo town does not')
  assert.equal(loaded.practice.phone, '')
  assert.equal(loaded.practice.email, '')
  assert.deepEqual(loaded.team, [], 'Bilbo Baggins is gone')
  assert.deepEqual(loaded.news.practiceNews, [])
  assert.equal(loaded.compliance.cqcRating, '')
  assert.equal(loaded.compliance.dataProtectionOfficer, '')
  assert.equal(loaded.notice.enabled, false)
  assert.equal(loaded.advanced.siteUrl, '')
  assert.equal(loaded.hours.extendedAccess.location, '')

  // and the shared wording is untouched throughout
  assert.equal(loaded.content.appointmentsBody, defaultConfig.content.appointmentsBody)
})

test('anything the practice actually edited is left alone', () => {
  const stored = bakedIn()
  stored.practice = {
    ...(stored.practice as Plain),
    name: 'Hillside Surgery',
    town: 'Ashford',
    phone: '01233 111222',
  }
  stored.compliance = { ...(stored.compliance as Plain), cqcRating: 'Outstanding' }
  stored.team = [{ id: 'tm-1', name: 'Dr Amina Patel', role: 'GP Partner', group: 'Doctors' }]

  const loaded = mergeDeep(defaultConfig, stripDemoContent(stored))

  assert.equal(loaded.practice.town, 'Ashford')
  assert.equal(loaded.practice.phone, '01233 111222')
  assert.equal(loaded.compliance.cqcRating, 'Outstanding')
  assert.equal(loaded.team.length, 1)
  assert.equal(loaded.team[0].name, 'Dr Amina Patel')

  // untouched neighbours in the same object still go
  assert.equal(loaded.practice.county, '')
  assert.equal(loaded.compliance.icoRegistration, '')
})

test('a notice the practice has edited is kept whole, switch and all', () => {
  const stored = bakedIn()
  stored.notice = { ...(stored.notice as Plain), title: 'Flu clinic this Saturday' }

  const loaded = mergeDeep(defaultConfig, stripDemoContent(stored))

  assert.equal(loaded.notice.title, 'Flu clinic this Saturday')
  assert.equal(loaded.notice.enabled, true, 'their banner must not be silently turned off')
  assert.ok(loaded.notice.body.length > 0, 'and must not be emptied under them')
})

test('the demo content is never stripped from the demo itself', () => {
  // config/index.ts skips the migration entirely for the demo slug; this just
  // records what would happen to it if that guard were ever dropped.
  const stripped = stripDemoContent(bakedIn())
  assert.equal((stripped.practice as Plain | undefined)?.name, undefined)
})

test('the schema version is the one the migration runs up to', () => {
  assert.equal(SCHEMA_VERSION, 2)
})

/* ------------------------------------------------- blank-field fallbacks */

test('a half filled practice still reads properly', () => {
  const blank = { ...defaultConfig.practice }
  assert.equal(practiceStrapline(blank), 'NHS GP surgery')
  assert.equal(practiceTitle(blank), 'Our surgery | NHS GP surgery')
  assert.ok(!practiceDescription(blank).includes(' in .'))

  const named = { ...blank, name: 'Hillside Surgery', town: 'Ashford' }
  assert.equal(practiceStrapline(named), 'NHS GP surgery in Ashford')
  assert.equal(practiceTitle(named), 'Hillside Surgery | NHS GP surgery in Ashford')
  assert.ok(practiceDescription(named).startsWith('Hillside Surgery is an NHS GP surgery in Ashford.'))

  const own = { ...named, strapline: 'Caring for Ashford since 1974' }
  assert.equal(practiceTitle(own), 'Hillside Surgery | Caring for Ashford since 1974')
})
