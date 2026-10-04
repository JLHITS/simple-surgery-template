import assert from 'node:assert/strict'
import { test } from 'node:test'
import { importPage, mergePolicySection, targetFor } from '../src/lib/import/content'
import { toMarkdown } from '../src/lib/import/convert'
import { extract } from '../src/lib/import/extract'
import type { CrawledPage } from '../src/lib/import/crawl'

/**
 * Migration from Practice365, using the markup Orchard Surgery's site really
 * has. Each of these failed before: the staff list found nobody, policies were
 * swept into the About page, care cards came across as headings with nothing
 * under them, and the opening hours could not be read at all.
 */

const site = 'https://www.example-surgery.nhs.uk'

const page = (path: string, body: string, title = 'Page'): string =>
  `<html><head><title>${title} - Example Surgery</title></head><body>` +
  `<header class="nhsuk-header"><a href="/">Example Surgery</a></header>` +
  `<main id="maincontent"><article><header class="entry-header"><h1 class="entry-title">${title}</h1></header>` +
  `<div class="entry-content">${body}</div></article></main></body></html>`

const homeHtml = page(
  '/',
  `<p>Welcome to Example Surgery, serving the village and the surrounding area for many years.</p>
  <div class="widget widget_bpfwp_contact_card_widget"><address class="bp-contact-card">
    <div class="bp-name">Example Surgery (Main)</div>
    <div class="bp-address">Dragwell,<br />Kegworth,<br />DE74 2EL<br /><br />*PHONE LINES ARE OPEN 8:00am-6:30pm Mon-Fri*</div>
    <div class="bp-phone"><a href="tel:01509 672419">01509 672419</a></div>
    <div class="bp-opening-hours"><span class="bp-title">Opening Hours</span>
      ${['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        .map(
          (d) =>
            `<div class="bp-weekday"><span class="bp-weekday-name bp-weekday-${d}">${d[0].toUpperCase()}${d.slice(1)}</span><span class="bp-times"><span class="bp-time">8:00 am&thinsp;to&thinsp;6:30 pm</span></span></div>`,
        )
        .join('')}
      <div class="bp-weekday"><span class="bp-weekday-name bp-weekday-saturday">Saturday</span><span class="bp-times"><span class="bp-time">Closed</span></span></div>
      <div class="bp-weekday"><span class="bp-weekday-name bp-weekday-sunday">Sunday</span><span class="bp-times"><span class="bp-time">Closed</span></span></div>
    </div>
  </address></div>
  <div class="widget"><address class="bp-contact-card"><div class="bp-name">Branch</div>
    <div class="bp-address">Nottingham Road,<br />Gotham,<br />NG11 0HE</div>
    <div class="bp-phone"><a href="tel:0115 983 0011">0115 983 0011</a></div>
    <div class="bp-opening-hours">
      <div class="bp-weekday"><span class="bp-weekday-name bp-weekday-monday">Monday</span><span class="bp-times"><span class="bp-time">8:30 am&thinsp;to&thinsp;1:00 pm</span></span></div>
    </div>
  </address></div>
  <div class="widget"><div class="bp-phone"><a href="tel:0115 983 0011">0115 983 0011</a></div></div>
  <a href="https://systmonline.tpp-uk.com/2/OnlineConsultation?OrgId=C82040">Submit a medical query</a>
  <a href="https://patchs.ai/patchs_for_patients">PATCHS</a>`,
  'Home',
)

const teamHtml = page(
  '/practice-information/meet-the-team/',
  `<div class="wp-block-advgb-accordions">
    <div class="wp-block-advgb-accordion-item advgb-accordion-item"><div class="advgb-accordion-header"><span class="advgb-accordion-header-icon"></span><h4 class="advgb-accordion-header-title">Doctors</h4></div>
      <div class="advgb-accordion-body">
        <h4 class="wp-block-heading">DR CLARE POLLOCK (F)</h4><p>GP Partner</p>
        <h4 class="wp-block-heading">DR PHILIP GARNER (M)</h4><p>GP Partner</p>
        <h4 class="wp-block-heading">DR TIM DANIEL (M)</h4><p>Salaried GP</p>
      </div></div>
    <div class="wp-block-advgb-accordion-item advgb-accordion-item"><div class="advgb-accordion-header"><h4 class="advgb-accordion-header-title">&#8203;Additional Roles</h4></div>
      <div class="advgb-accordion-body">
        <h4 class="wp-block-heading">DONNA LOONAM (F)</h4><p>Clinical Pharmacist</p>
        <p><strong>SALAHA ANWAR (F)</strong></p><p>First Contact Physiotherapist</p>
      </div></div>
    <div class="wp-block-advgb-accordion-item advgb-accordion-item"><div class="advgb-accordion-header"><h4 class="advgb-accordion-header-title">Practice Management</h4></div>
      <div class="advgb-accordion-body">
        <h4 class="wp-block-heading">NIKKI LUCAS </h4><p>Practice Manager</p>
        <h4 class="wp-block-heading">SHAUN BROOMHEAD</h4><p>Operations Manager</p>
      </div></div>
  </div>`,
  'Meet the Team',
)

const details = (title: string, body: string) =>
  `<details class="wp-block-nhsblocks-reveal1 nhsuk-details"><summary class="nhsuk-details__summary">${title}</summary><div class="nhsuk-details__text" aria-hidden="true">${body}</div></details>`

/** Distinct wording for each, as real policies have: near copies are merged. */
const PROSE: Record<string, string> = {
  carers:
    '<p>A carer is anyone who looks after a friend or relative who could not manage without them. Tell reception and we will add you to our carers register.</p><p>Being on the register means we can offer flexible appointments, a flu vaccination and information about local support groups.</p>',
  chaperone:
    '<p>This policy protects patients and staff during intimate examinations. Any patient may ask for a trained chaperone, and we will never examine you without one if you ask.</p><p>If no chaperone is free, we will rebook the examination for a time when one is.</p>',
  complaints:
    '<p>We take complaints seriously and aim to put things right. Contact the practice manager in person, by phone or in writing, and we will acknowledge it within three working days.</p><p>Making a complaint will not affect your care here.</p>',
  flying:
    '<p>We no longer prescribe diazepam or other sedatives for a fear of flying. Sedation slows reactions in an emergency, raises the risk of blood clots, and is illegal to carry into some countries.</p><p>Courses run by airlines are a safer alternative and work well for most people.</p>',
  seatbelts:
    '<p>We do not issue seat belt exemption certificates. Government guidance says no medical condition justifies automatic exemption, and seat belts save lives in nearly every collision.</p><p>Adapted belts are available for people with stomas, disabilities or chest problems.</p>',
}

const hubHtml = page(
  '/practice-information/',
  `<div class="nhsuk-card"><div class="nhsuk-card__content"><h2>About Kegworth</h2><div class="nhsuk-card__description"><p>Located at the heart of the village, our surgery has a rich history of providing high quality care to local residents, dating back to at least the early 19<sup>th</sup>&nbsp;century and still going strong today.</p><p>Our branch in the next village offers the same high quality care and has a well established dispensary.</p></div></div></div>
  ${details('Carers Information', PROSE.carers)}
  ${details('Chaperone Policy', `<h2>Introduction</h2>${PROSE.chaperone}`)}
  ${details('Complaints', PROSE.complaints)}
  ${details('Diazepam prescribing for Fear of Flying', PROSE.flying)}
  ${details('Seat Belt Exemption Certificates', PROSE.seatbelts)}
  ${details('Change or Update Personal Details', '<form><input name="x"></form>')}`,
  'Practice Policies &amp; Patient Information',
)

const appointmentsHtml = page(
  '/practice-information/appointments/',
  `<div class="nhsuk-care-card"><div class="nhsuk-care-card__heading-container"><h3 class="nhsuk-care-card__heading"><span><span class="nhsuk-u-visually-hidden">Non-urgent advice: </span><span class="nhsuk-care-card__heading-text"><strong>Booking an Appointment</strong></span></span></h3><span class="nhsuk-care-card__arrow" aria-hidden="true"></span></div>
  <div class="nhsuk-care-card__content">We offer routine and same-day appointments.<br/> <br/>You may be offered an appointment at <strong>either of our surgeries</strong>, depending on availability.<br/><br/>&#8212;<br/><br/>&#128222;<strong> How to Book</strong><br/> <br/>You can cancel easily by:<br/> Replying to the reminder message<br/> Using the <a href="https://www.nhsapp.service.nhs.uk/login">NHS App</a> or <a href="https://systmonline.tpp-uk.com/2/Login">SystmOnline.</a><br/> Phoning us<br/> <br/>> &#9888;&#65039; We do not perform blood tests requested by private providers.</div></div>
  <h2>Getting Started</h2>
  <h2>Enhanced Access</h2><p>As a patient you can access<strong> routine appointments in the evenings</strong>. See <a href="${site}/practice-information/contact-us/">our contact page</a> or <a href="https://gbr01.safelinks.protection.outlook.com/?url=https%3A%2F%2Fwww.nhs.uk%2Fnhsapp&amp;data=05">the NHS App page</a>.</p>
  <p><strong>PLEASE NOTE THAT ALL ENHANCED HOURS APPOINTMENTS ARE PREBOOKABLE ONLY BY CONTACTING YOUR OWN GP PRACTICE.</strong></p>`,
  'Appointments',
)

function crawled(): CrawledPage[] {
  const at = (path: string) => site + path
  return [
    { url: at('/'), html: homeHtml, kind: 'home' },
    { url: at('/practice-information/meet-the-team/'), html: teamHtml, kind: 'team' },
    { url: at('/practice-information/'), html: hubHtml, kind: 'about', target: targetFor(at('/practice-information/'), '') ?? undefined },
    {
      url: at('/practice-information/appointments/'),
      html: appointmentsHtml,
      kind: 'appointments',
      target: targetFor(at('/practice-information/appointments/'), '') ?? undefined,
    },
  ]
}

test('staff are read from the page structure: capitals, gender markers, roles and groups', () => {
  const result = extract(crawled())
  const team = result.findings.find((f) => f.id === 'team')
  assert.ok(team, 'expected a team finding')
  assert.notEqual(team.confidence, 'low')

  const members = team.patch.team ?? []
  const byName = new Map(members.map((m) => [m.name, m]))
  assert.deepEqual(
    members.map((m) => m.name),
    ['Dr Clare Pollock', 'Dr Philip Garner', 'Dr Tim Daniel', 'Donna Loonam', 'Salaha Anwar', 'Nikki Lucas', 'Shaun Broomhead'],
  )
  assert.equal(byName.get('Dr Clare Pollock')?.role, 'GP Partner')
  assert.equal(byName.get('Dr Clare Pollock')?.group, 'Doctors')
  assert.equal(byName.get('Dr Clare Pollock')?.gender, 'Female')
  assert.equal(byName.get('Salaha Anwar')?.role, 'First Contact Physiotherapist')
  assert.equal(byName.get('Salaha Anwar')?.group, 'Additional Roles')
  assert.equal(byName.get('Nikki Lucas')?.group, 'Practice Management')
})

test('the contact card gives the main surgery, not the branch', () => {
  const result = extract(crawled())
  const get = (id: string) => result.findings.find((f) => f.id === id)

  assert.equal(get('practice.phone')?.display, '01509 672 419')
  assert.equal(get('practice.address')?.display, 'Dragwell, Kegworth, DE74 2EL')

  const hours = get('hours.days')?.patch.hours?.days ?? []
  assert.deepEqual(
    hours.map((d) => (d.closed ? `${d.day} closed` : `${d.day} ${d.open}-${d.close}`)),
    [
      'monday 08:00-18:30',
      'tuesday 08:00-18:30',
      'wednesday 08:00-18:30',
      'thursday 08:00-18:30',
      'friday 08:00-18:30',
      'saturday closed',
      'sunday closed',
    ],
  )
})

test('the practice code is read from a SystmOnline link, and the request link is the practice own', () => {
  const result = extract(crawled())
  assert.equal(result.findings.find((f) => f.id === 'practice.odsCode')?.display, 'C82040')
  assert.match(result.findings.find((f) => f.id === 'online.requestUrl')?.display ?? '', /OrgId=C82040/)
})

test('a practice information page is split: policies, compliance pages and the rest each go where they belong', () => {
  const result = extract(crawled())
  const offers = new Map(result.pageFindings.map((p) => [`${p.targetKind}:${p.targetKey}`, p]))

  assert.ok(offers.has('page:carers'), 'carers information goes to the carers page')
  assert.ok(offers.has('page:complaints'), 'complaints goes to the complaints page')
  assert.ok(offers.get('page:complaints')?.statutory)

  const policies = result.pageFindings.filter((p) => p.targetKind === 'policy')
  assert.deepEqual(
    policies.map((p) => p.targetLabel),
    ['Chaperone Policy', 'Diazepam prescribing for Fear of Flying', 'Seat Belt Exemption Certificates'],
  )
  // The template writes its own chaperone policy, so that one starts unticked.
  assert.equal(policies[0].statutory, true)
  assert.equal(policies[1].statutory, false)
  // Headings inside a policy sit under the policy's own heading.
  assert.match(policies[0].markdown, /^### Introduction/m)
  assert.doesNotMatch(policies[0].markdown, /^## /m)

  const about = offers.get('contentField:aboutBody')
  assert.ok(about, 'what is left is the About page')
  assert.match(about.markdown, /19th century/)
  assert.doesNotMatch(about.markdown, /chaperone|Change or Update/i)
})

test('care cards, line breaks and bold lines come across as a page reads', () => {
  const [offer] = importPage(appointmentsHtml, `${site}/practice-information/appointments/`, '', targetFor(`${site}/appointments/`, '')!).pages
  const md = offer.markdown

  // The visually hidden "Non-urgent advice:" is not part of the heading, and
  // bold is not kept inside headings.
  assert.match(md, /^## Booking an Appointment$/m)
  assert.doesNotMatch(md, /Non-urgent advice/)
  // Text with no paragraph tags around it is kept.
  assert.match(md, /^We offer routine and same-day appointments\.$/m)
  // A bold line on its own is a heading, without its emoji.
  assert.match(md, /^### How to Book$/m)
  // Lines introduced with a colon are a list, and the full stop leaves the link.
  assert.match(
    md,
    /You can cancel easily by:\n\n- Replying to the reminder message\n- Using the \[NHS App\]\(https:\/\/www\.nhsapp\.service\.nhs\.uk\/login\) or \[SystmOnline\]\(https:\/\/systmonline\.tpp-uk\.com\/2\/Login\)\.\n- Phoning us/,
  )
  // A line typed with ">" is a callout. Separator lines are gone.
  assert.match(md, /^> We do not perform blood tests requested by private providers\.$/m)
  assert.doesNotMatch(md, /—/)
  // A heading with nothing under it is dropped.
  assert.doesNotMatch(md, /Getting Started/)
  // Spaces either side of bold survive.
  assert.match(md, /access \*\*routine appointments in the evenings\*\*\./)
  // Links back into the old site become text; Outlook's wrapper is removed.
  assert.match(md, /See our contact page or \[the NHS App page\]\(https:\/\/www\.nhs\.uk\/nhsapp\)\./)
  // Capitals are turned into a sentence, keeping GP.
  assert.match(md, /\*\*Please note that all enhanced hours appointments are prebookable only by contacting your own GP practice\.\*\*/)
})

test('policies are matched by name, folder and subject, after the compliance pages', () => {
  const at = (path: string, title = '') => targetFor(site + path, title)?.key
  assert.equal(at('/policies/it-policy/'), 'policies')
  assert.equal(at('/policies/missed-appointments-policy/'), 'policies')
  assert.equal(at('/policies/complaints/'), 'complaints')
  assert.equal(at('/policies/privacy-policy/'), 'privacy')
  assert.equal(at('/policies/3979/', 'Carers Information'), 'carers')
  assert.equal(targetFor('', 'GP Earnings')?.key, 'gp-earnings')
  assert.equal(targetFor('', 'Named accountable GP')?.key, 'named-gp')
  assert.equal(targetFor('', 'Data Protection')?.key, 'policies')
  assert.equal(targetFor('', 'Seat Belt Exemption Certificates')?.key, 'policies')
})

test('a policy brought across replaces the template section on the same subject, once', () => {
  const template = '## Chaperones\n\nAsk for one.\n\n## Zero tolerance\n\nNo abuse.\n\n## Text messages\n\nWe may text you.'
  const once = mergePolicySection(template, 'Chaperone Policy', 'Our own chaperone policy.\n\n### Guidelines\n\nDetail.')
  assert.doesNotMatch(once, /## Chaperones/)
  assert.match(once, /## Zero tolerance/)
  assert.match(once, /## Chaperone Policy\n\nOur own chaperone policy\.\n\n### Guidelines/)

  const twice = mergePolicySection(once, 'Chaperone Policy', 'Our own chaperone policy.')
  assert.equal(twice.match(/## Chaperone Policy/g)?.length, 1)

  const other = mergePolicySection(twice, 'Seat belt exemptions', 'We do not issue these.')
  assert.match(other, /## Chaperone Policy[\s\S]*## Seat belt exemptions/)
})

test('pasting from Word keeps the structure and drops the rest', () => {
  const word = `<html><body><!--StartFragment--><h1 style="mso-x">Flu clinics</h1>
    <p class=MsoNormal><b>Saturday 4 October</b></p>
    <p class=MsoListParagraph><span style='mso-list:Ignore'>·<span>&nbsp;&nbsp;</span></span>Over 65s</p>
    <p class=MsoListParagraph><span style='mso-list:Ignore'>·<span>&nbsp;&nbsp;</span></span>Pregnant women</p>
    <p class=MsoNormal><span style="font-family:Comic Sans">Book <a href="https://example.org/flu">online</a>.</span></p><!--EndFragment--></body></html>`
  const md = toMarkdown(word, { tidy: true })
  assert.equal(md, '## Flu clinics\n\n**Saturday 4 October**\n\n- Over 65s\n- Pregnant women\n\nBook [online](https://example.org/flu).')
})

test('the editor converts its own HTML back exactly, guessing at nothing', () => {
  const html =
    '<h2>Heading</h2><p>Some <b>bold</b> and a <a href="https://www.nhs.uk">link</a>.</p><p><b>A bold line</b></p>' +
    '<ul><li>One</li><li>Two</li></ul><blockquote><p>Call 999.</p></blockquote><div>A new line in Chrome</div>'
  assert.equal(
    toMarkdown(html),
    '## Heading\n\nSome **bold** and a [link](https://www.nhs.uk).\n\n**A bold line**\n\n- One\n- Two\n\n> Call 999.\n\nA new line in Chrome',
  )
})
