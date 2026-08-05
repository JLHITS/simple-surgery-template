# Simple Surgery practice website template

A complete, compliant website for an NHS GP practice. No database, no plugins, no training day.

## What is included

Every page NHS England and the GP contract expect, written in plain English at a reading age
of 9 to 11, already filled in:

**Patient tasks**
Appointments, prescriptions, test results, fit notes, registration, vaccinations, clinics,
self-referral, proxy access, managing your health online.

**Statutory pages**
Complaints, privacy notice, accessibility statement, named GP, GP earnings, freedom of
information, practice policies, and the "You and your general practice" patient charter that
became a contractual requirement on 1 October 2025.

**Automatic**
National NHS news from NHS England's feed, refreshed hourly. Notices that expire on a date you
choose. Closures that drop off the page once they have passed.

## Getting started

```bash
npm install
npm run dev          # http://localhost:3001
```

Create `.env.local` with a password, then sign in at `/admin`:

```
ADMIN_PASSWORD=a-long-password-you-choose
```

Everything else is optional. See [`.env.example`](.env.example).

## How content works

The entire website is one JSON document. There is no schema to migrate, no query language, and
nothing to back up beyond a single value.

```
admin panel  ->  POST /api/admin/save  ->  sanitiser  ->  storage driver
                                                              |
     patient pages  <-  React cache  <-  fetch cache  <--------+
```

`src/lib/config/defaults.ts` holds the seed content. Anything a practice saves is deep-merged
over it, so a template update that adds a new setting picks up its default without the practice
touching anything.

Every save passes through `src/lib/config/sanitise.ts` before it is stored. That is where
length caps, URL scheme allowlisting, slug normalisation and colour validation happen. The
browser is never trusted.

### Storage drivers

Set `STORAGE_DRIVER`, or leave it unset and the right one is detected.

| Driver | When to use it | Setup |
|---|---|---|
| `file` | Local development, or a server with a persistent disk | None |
| `upstash` | **Deployed sites.** The recommended default. | Two env vars |
| `firebase` | You are already inside Google Cloud | Three env vars |

> **The `file` driver cannot work on Vercel, Netlify or Cloudflare.** Their filesystems are
> read-only and reset on every deploy. Add Upstash before you go live, or every edit will be
> lost. The Advanced settings page in the admin panel tells you which driver is active and
> warns you if changes are not being saved permanently.

Adding a driver is about thirty lines: implement `read`, `write` and `isConfigured` from
`src/lib/storage/types.ts` and register it in `src/lib/storage/index.ts`.

## The admin panel

One shared password, verified on the server, exchanged for a signed HttpOnly cookie. The
password never reaches the browser bundle and the cookie cannot be read or forged by client
JavaScript. Failed logins are rate limited to 8 attempts per 10 minutes per IP.

Sections are ordered by how often a practice actually opens them, not by how the data is
shaped. "Notice banner" and "Opening hours" are at the top because that is where a receptionist
goes to close the surgery for a training afternoon.

Body text uses a six-rule Markdown subset with a cheat sheet under every box. There is
deliberately no rich text editor: staff paste from Word, the markup comes with it, and the page
ends up with three fonts and a broken heading structure that fails accessibility. The renderer
in `src/lib/markdown.tsx` produces React elements directly and never emits raw HTML, so there
is no route from the admin panel to script injection on a patient-facing page.

## Design decisions, and the guidance behind them

These are not stylistic preferences. Each one comes from NHS England's
[Creating a highly usable and accessible GP website for patients](https://www.england.nhs.uk/long-read/creating-a-highly-usable-and-accessible-gp-website-for-patients/),
which is based on user testing with over 160 patients.

| Decision | Why |
|---|---|
| Six menu items, no sub menus | "Main menus should not have more than seven items" and "should not have sub menus" |
| Home page opens with task cards, not prose | 80% of patients start their task on the home page |
| The word "Menu", not a hamburger icon | Tested patients missed the icon |
| The word "Search" always visible | Required by the guidance |
| No pop-ups or overlays, ever | 27% of patients who met an overlay on arrival could not get past it |
| No accessibility widgets or toolbars | The guidance advises against them; they create problems rather than solve them |
| No PDFs | "This document format is not accessible" |
| "Request an appointment online", never "online consultation" | 83% of tested patients did not understand the phrase |
| No "triage", no "clinician", no "emergency appointment" | Patients misread all three; the last is confused with A&E |
| No supplier or product names shown to patients | Explicitly required |
| Sentences under 20 words, paragraphs under 3 sentences | Reading age 9 to 11 |
| NHS logo in the header and the footer | Patients use it to tell a real NHS service from a private one |
| Urgent care signposting above everything else | Someone having a heart attack needs "call 999" first |

## Accessibility

Built to WCAG 2.2 AA.

- The NHS focus state: yellow background with a solid black underline, visible on every
  background used on the site
- Every interactive target at least 44px
- Skip link to main content
- Semantic landmarks and one `h1` per page
- `aria-current` on the active menu item
- External links marked visually and announced to screen readers
- The "open now" badge is computed in the browser, so a cached page can never tell a patient
  at 9pm that the surgery is open
- `prefers-reduced-motion` respected

## Environment variables

See [`.env.example`](.env.example). The only required one is `ADMIN_PASSWORD`.

## Deploying to Vercel

1. Import the repository and set the root directory to `apps/template`
2. Storage tab, add Upstash Redis. The two environment variables appear automatically
3. Add `ADMIN_PASSWORD`
4. Deploy

A practice site sits comfortably inside the free tier. Pages are statically generated and
served from the edge; the only dynamic routes are `/admin`, `/search` and the save endpoint.
When a practice saves a change, the config cache tag is purged and the change is live on the
next page view rather than whenever the hourly cache happens to expire.
