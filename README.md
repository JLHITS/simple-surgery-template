<div align="center">

<img src="public/mark.svg" alt="" width="72" height="72">

# Simple Surgery

**A modern, self-manageable website for NHS GP practices.**
No database. No plugins. No training day.

[View the live sample](https://demo.simplesurgery.co) &nbsp;·&nbsp;
[Simple Surgery](https://simplesurgery.co) &nbsp;·&nbsp;
[Deploy your own](#deploy-in-about-ten-minutes)

</div>

---

Most GP practices are on a WordPress platform that is slow, awkward for staff, and needs
constant support. Practices pay upwards of £495 a year for a website nobody at the surgery
enjoys touching, so it goes stale, and then it fails an inspection.

This is the opposite bet. The whole site is one JSON document behind a password. A receptionist
can close the surgery for a training afternoon in under a minute, and the news page keeps itself
current without anybody writing a word.

## What you get

**Every page the NHS expects, already written**, in plain English at a reading age of 9 to 11:

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

Accessibility is WCAG 2.2 AA, above the 2.1 AA legal minimum, with the NHS focus state,
44px targets, full keyboard operation and semantic landmarks throughout.

## Deploy in about ten minutes

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

Body text uses a six-rule Markdown subset with a cheat sheet under every box. There is
deliberately no rich text editor: staff paste from Word, the markup comes with it, and the page
ends up with three fonts and a broken heading structure that fails accessibility. The renderer
in `src/lib/markdown.tsx` emits React elements and never raw HTML, so there is no route from
the admin panel to script injection on a patient-facing page.

## Project layout

```
src/
├── app/
│   ├── (site)/          Everything a patient sees
│   ├── admin/           Password-guarded editor
│   └── api/admin/       Login, save and image upload
├── components/          UI, including the admin editor
└── lib/
    ├── config/          Types, seed content, merge, sanitiser
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

We will set it up, move your content across, connect your domain and host it for
£199 a year. No setup fee, no contract, and you still make your own edits.

[simplesurgery.co](https://simplesurgery.co)

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
