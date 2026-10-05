<div align="center">

<img src="public/mark.svg" alt="" width="184" height="72">

# Simple Surgery

**A modern, self-manageable website for NHS GP practices.**
No database. No plugins. No training day.

[View the live sample](https://demo.simplesurgery.co) &nbsp;·&nbsp;
[Full deployment guide](GUIDE.md) &nbsp;·&nbsp;
[Have it done for you](https://www.simplesurgery.co/buy)

</div>

---

Most GP practices are on a WordPress platform that is slow, awkward for staff, and needs
constant support. Practices pay upwards of £495 a year for a website nobody at the surgery
enjoys touching, so it goes stale, and then it fails an inspection.

This is the opposite bet. The whole site is one JSON document behind a password. A receptionist
can close the surgery for a training afternoon in under a minute, and the news page keeps itself
current without anybody writing a word.

## What you get

**A page and draft wording for everything the NHS expects you to publish**, in plain English at a reading age of 9 to 11:

- Appointments, prescriptions, test results, fit notes, registration, vaccinations, clinics,
  self-referral, proxy access, managing your health online
- Complaints, privacy notice, accessibility statement, named GP, GP earnings, freedom of
  information, practice policies, patient participation group, support for carers
- The "You and your general practice" patient charter, a contractual requirement since
  1 October 2025

**Things that run themselves**

- National NHS news pulled from NHS England's feed and refreshed hourly
- Notices that disappear on a date you set
- Closures that drop off the page once they have passed
- Opening hours that collapse into "Monday to Friday" automatically
- A live "open now" badge, computed in the browser so a cached page cannot mislead anyone

**Built to the guidance, not around it**

Every design decision below comes from NHS England's
[Creating a highly usable and accessible GP website for patients](https://www.england.nhs.uk/long-read/creating-a-highly-usable-and-accessible-gp-website-for-patients/),
which is based on user testing with over 160 patients.

| Decision | Why |
|---|---|
| Six menu items, no sub menus | "Main menus should not have more than seven items" and "should not have sub menus" |
| Home page opens with task cards, not prose | 80% of patients start their task on the home page |
| The word "Menu", not a hamburger icon | Tested patients missed the icon |
| The word "Search" always visible | Required by the guidance |
| No pop-ups or overlays, ever | 27% of patients who met an overlay on arrival could not get past it |
| No accessibility widgets or toolbars | The guidance advises against them |
| No PDFs | "This document format is not accessible" |
| "Request an appointment online", never "online consultation" | 83% of tested patients did not understand the phrase |
| No "triage", no "clinician", no "emergency appointment" | Patients misread all three; the last is confused with A&E |
| No supplier or product names shown to patients | Explicitly required |
| Urgent care signposting before anything else | Someone having a heart attack needs "call 999" first |

Accessibility targets WCAG 2.2 AA, above the 2.1 AA legal minimum, with the NHS focus state,
44px targets, full keyboard operation and semantic landmarks throughout. It has been tested with
keyboard navigation, automated tooling and screen reader spot checks, but not independently
audited, so treat it as designed and tested to that standard rather than certified against it.

**What this does not do for you.** The wording that ships is a compliant starting point written
for a typical practice. It is not a statement of how yours works, and publishing it unread is not
compliance. Your practice remains the public sector body responsible for its own website, its
accuracy and its accessibility, whoever built it. What the template saves you is the writing and
the structure, not the checking.

## Deploy it

**[There is a complete step by step guide](GUIDE.md)**, written for someone comfortable with a
terminal but not necessarily a developer. It covers every command, every environment variable,
and the exact DNS records to send your IT team. Roughly an hour end to end.

The short version follows.

### 1. Get the code

```bash
git clone https://github.com/JLHITS/simple-surgery-template.git my-practice-website
cd my-practice-website
npm install
```

### 2. Run it

```bash
echo "ADMIN_PASSWORD=pick-something-long" > .env.local
npm run dev
```

Open <http://localhost:3001>, then <http://localhost:3001/admin> to sign in.

### 3. Put it online

Deploy to Vercel, Netlify or Cloudflare. Then add a storage backend, because **the default
local-file driver cannot work on serverless hosting** — those filesystems are read-only and
reset on every deploy, so edits would silently vanish.

On Vercel: Storage tab, add Upstash Redis, and the two environment variables appear on their
own. The free tier is far more than a practice site uses.

| Variable | Required | What it does |
|---|---|---|
| `ADMIN_PASSWORD` | **Yes** | The password your staff use at `/admin` |
| `UPSTASH_REDIS_REST_URL` | For hosting | Injected by the Vercel integration |
| `UPSTASH_REDIS_REST_TOKEN` | For hosting | Injected by the Vercel integration |
| `SITE_KEY` | Multi-site only | Namespaces content so one database serves many practices |
| `SESSION_SECRET` | No | Signs the session cookie. Derived from the password if unset |
| `ADMIN_PASSWORD_HASH` | No | Use instead of the plaintext. `npm run hash-password "..."` |
| `CLOUDINARY_URL` | No | Signed image uploads. Without it, images are stored inline |

Full list with notes in [`.env.example`](.env.example).

The Advanced settings page in the admin panel tells you which storage driver is live and warns
you if changes are not being saved permanently.

## How content works

The entire website is one JSON document. There is no schema to migrate, no query language, and
nothing to back up beyond a single value.

```
admin panel  ->  POST /api/admin/save  ->  sanitiser  ->  storage driver
                                                              |
     patient pages  <-  React cache  <-  fetch cache  <--------+
```

`src/lib/config/defaults.ts` holds the seed content. Anything saved is deep-merged over it, so
a template update that adds a setting picks up its default without you touching anything.

Wording is the exception: once a page has been saved, the saved copy wins. When recommended
wording changes because guidance changed, `src/lib/config/wording-updates.ts` lists it, and the
**Updates** section of the admin panel shows it next to the practice's own words to take or
leave. The same section tells a self-hosted copy when a newer version has been published,
using `CHANGELOG.md`.

Every save passes through `src/lib/config/sanitise.ts` first. Length caps, URL scheme
allowlisting, slug normalisation and colour validation all happen there. The browser is never
trusted, and statutory pages cannot be deleted because publishing them is a contractual
requirement rather than a preference.

### Storage drivers

| Driver | When | Setup |
|---|---|---|
| `file` | Local development, or a server with a persistent disk | None |
| `upstash` | **Deployed sites.** The recommended default | Two env vars |
| `firebase` | You are already inside Google Cloud | Three env vars |

Adding your own is about thirty lines: implement `read`, `write` and `isConfigured` from
`src/lib/storage/types.ts`, then register it in `src/lib/storage/index.ts`.

## The admin panel

One shared password, verified on the server and exchanged for a signed HttpOnly cookie. The
password never reaches the browser bundle and the cookie cannot be read or forged by client
JavaScript. Failed logins are rate limited to 8 attempts per 10 minutes per IP.

Sections are ordered by how often a practice actually opens them, not by how the data is
shaped, so "Notice banner" and "Opening hours" sit at the top.

Body text is edited with formatting buttons over the text as it will look: heading,
subheading, bold, link, bullet and numbered lists, and a callout. That is everything the site
can show and nothing more. There is no font, colour, size or alignment, because those are where
practice websites usually go wrong: staff paste from Word, the markup comes with it, and the
page ends up with three fonts and a broken heading structure that fails accessibility. Anything
typed or pasted is stored as the same small Markdown subset, so pasting from Word keeps the
headings, lists, bold and links and drops the rest. **Edit as plain text** shows the Markdown
for anyone who prefers it. See `src/components/admin/RichText.tsx`.

The renderer in `src/lib/markdown.tsx` emits React elements and never raw HTML, so there is no
route from the admin panel to script injection on a patient-facing page.

### Colour schemes

**Advanced settings** offers six colour schemes, each shown as a small preview:

| Scheme | What changes |
|---|---|
| NHS (default) | White header, NHS Blue buttons, links and details |
| NHS with rainbow | The default, with a thin rainbow on the header, under page titles, under the current page in the menu and along the footer |
| Nightingale | A solid NHS Blue header and menu with the NHS logo reversed out in white, and NHS.UK's green buttons, as NHS.UK and the Nightingale WordPress theme look |
| Nightingale with rainbow | Both of the above |
| NHS purple and pink | NHS Purple buttons and links, with Dark Pink and NHS Pink details |
| Your own colour | Buttons, links and details in a colour the practice chooses |

Only colours change; layout, type and spacing are the same in every scheme. Each is built from
NHS England's [identity colour palette](https://www.england.nhs.uk/nhsidentity/identity-guidelines/colours/)
and follows its rules where a website can: NHS Blue and white stay dominant, highlight colours
are used as thin details rather than large blocks, and the NHS logo is only reversed out of
solid NHS Blue, so the blue header is exactly #005EB8 and cannot take a custom colour. The
rainbow uses only palette colours, as hard stripes. NHS.UK's button green (#007F3B) is used in
place of the palette's NHS Green, which is too light for white text. Every text and background
pairing passes WCAG AA, which `tests/theme.test.ts` checks.

The schemes are defined once, in `src/lib/theme.ts`, which the site layout turns into CSS
custom properties and the admin panel's previews draw from.

### Migration: reading your old website

Moving from another supplier is mostly retyping, so the admin panel has a **Migration** section
that reads your existing website and offers to bring what it finds across. Give it your current
address and nothing else.

It reads the home page, then the handful of pages most likely to carry facts worth having:
contact, opening times, about, staff, appointments, prescriptions. It looks for structured data
first, falls back to patterns, and tells you which it used.

What it can usually find:

| | Where it comes from |
|---|---|
| Practice name | Structured data, Open Graph, or the page title |
| Phone numbers | `tel:` links, then numbers in the text |
| Email address | `mailto:` links, preferring nhs.net |
| Address and postcode | Structured data, the first contact card, then the text around a postcode |
| Other sites | Every contact card after the first, with its own phone number and hours |
| ODS code | Your online consultation or SystmOnline link, which usually contains it |
| Opening hours | Structured data, the first contact card, then tables, then lines of text |
| Online service links | Recognised by supplier: Accurx, eConsult, PATCHS, Klinik, SystmOnline, Patient Access, the NHS App |
| CQC report link | A link to cqc.org.uk |
| Integrated Care Board | The phrase in your page text |
| Logo | Structured data or an image marked as a logo, on your own domain |
| Staff | Names, job titles and groups from your team pages' structure; a guess from prose otherwise |
| Page wording | Converted to Markdown, matched to a template page, checked against NHS England guidance |
| Policies | One offer per policy, from a policies folder or the expanders on an information page |

It also offers **page wording**, matched to the pages this template already has: about,
appointments, prescriptions, the service pages, patient group, carers, and the compliance pages.
HTML is converted into the same Markdown subset the admin panel uses (`src/lib/import/convert.ts`),
with images and forms dropped and tables turned into lists. The conversion reads the page as a
tree rather than hunting for paragraph tags, so text that suppliers leave loose inside a card,
lines separated only by line breaks, and bold lines standing in for headings all come across as
they read. Headings are ranked by how the page uses them rather than by tag, empty ones are
dropped, and links back into the old site become plain text, since they stop working the day
the address moves.

Practice365 puts a dozen unrelated subjects on one "practice information" page, one expander
each. Those pages are split: each expander is matched on its own, so the carers expander is
offered for the carers page and the chaperone expander as a policy, and only what is left goes
to the About page. **Policies** are offered one at a time, and each one ticked is added to the
Practice policies page as its own section. One that covers ground the template already covers,
such as chaperones, replaces that section rather than sitting beside it, and starts unticked.

Two rules decide what starts ticked, and both exist to stop the template quietly becoming an
ordinary website again:

- **Compliance pages start unticked.** Complaints, privacy, accessibility, freedom of
  information, named GP, GP earnings, the patient charter and practice policies are written here
  against current guidance and kept current as it changes. The version on the old site was
  usually written by the outgoing supplier for their whole estate, and is as old as the site
  being left. Ticking one shows why that is a risk before it is applied.
- **Anything that trips the NHS England wording rules starts unticked**, with the phrase and the
  reason shown. "Online consultation" was not understood by 83% of patients tested; "triage" and
  "clinician" tested badly; supplier product names should not be shown to patients at all. In
  testing against real Practice365 sites, most imported pages tripped at least one of these,
  which is the clearest possible statement of what the supplied wording is for.

Three things make this safe to use on a live site:

1. **The scan writes nothing.** It returns a list of findings.
2. **You tick what to bring across.** Confident findings start ticked, guesses do not.
3. **Applying only changes the unsaved draft.** You still have to press Save, and everything
   goes through the same sanitiser as anything you type.

**It will not find everything and it will sometimes be wrong.** It is reading pages written for
people, not for machines. Check the opening hours and the phone number before you save: those
are the two things a patient acts on immediately. Practice news is not imported, and the
compliance pages and core policies start unticked, because the template already ships
compliant wording for those.

**When the old site will not let a server read it.** Some suppliers put their sites behind a
firewall that challenges requests from data centres, which is where any server runs. The
challenge page is recognised rather than imported, and the panel switches to **Add pages from
your own browser**: it lists the pages it would have read (from the sitemap, which firewalls
usually leave open), the practice saves each one from their browser, where the site opens
normally, and drops the files in, or pastes the page source. Those pages go through exactly
the same extraction and review. See `src/lib/import/manual.ts`.

The fetcher refuses private and reserved addresses, checks every redirect hop against the
resolved IP rather than the hostname, caps size and time, and is behind the admin password. An
endpoint that fetches arbitrary URLs is a server side request forgery risk, and it is treated as
one: see `src/lib/import/fetch.ts`.

## Project layout

```
src/
├── app/
│   ├── [site]/          One practice: its public pages and its admin panel
│   │   ├── (site)/      Everything a patient sees
│   │   └── admin/       Password-guarded editor
│   └── api/[site]/      Login, save, export, import and upload, scoped to one practice
├── components/          UI, including the admin editor
└── lib/
    ├── config/          Types, seed content, merge, sanitiser
    ├── import/          Reading a practice's old website: fetch, crawl, extract
    ├── storage/         Pluggable drivers
    ├── auth.ts          Password check and session cookie
    ├── hours.ts         Opening hours, closures, week timeline
    ├── markdown.tsx     The safe Markdown subset
    └── news.ts          NHS feed fetching and parsing
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server on port 3001 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | Type check without emitting |
| `npm run hash-password "..."` | Generate `ADMIN_PASSWORD_HASH` |

## Rather not do any of this?

Fair enough. We will set it up, host it, connect your domain and keep it updated for **£199 a
year**. Your site is live in minutes rather than an afternoon, your own staff still make their
own edits, and because this code is open source you can take the whole thing with you whenever
you like.

No setup fee. No contract.

**[See the hosted option](https://www.simplesurgery.co/buy)**

## Contributing

Issues and pull requests are welcome, particularly from practice staff who have hit something
awkward in the admin panel. That feedback is worth more than a feature.

Before opening a PR, please run `npm run typecheck` and `npm run build`.

Changes to patient-facing wording should stay inside NHS England's guidance: reading age 9 to
11, sentences under 20 words, paragraphs under 3 sentences, active voice, and none of the
terms in the table above.

## Licence

[MIT](LICENSE). Use it, sell it, fork it.

The NHS logo is a registered trademark of the Department of Health and Social Care and is **not**
covered by that licence. Its use is governed by the NHS Identity Guidelines and is permitted only
for organisations providing NHS services. It can be switched off in Advanced settings.

Simple Surgery is an independent product. It is not affiliated with, endorsed by, or supplied by
NHS England or the NHS.
