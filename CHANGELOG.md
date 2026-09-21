# Changelog

What has changed in the Simple Surgery template, newest first.

If you run your own copy, your admin panel reads this file to tell you when an update is out,
so each entry is written for the person who looks after the website rather than for developers.
Anything you have to do yourself is listed under **Action needed**.

## Unreleased

- **Your new website no longer starts with the demo practice's details in it.** The example
  content we use for the demo surgery, including its staff list, address, opening notice and
  CQC rating, used to double as the starting point for every new site. Anything you had not
  yet edited showed those details as though they were yours. New sites now start blank in
  those places, and any demo details still sitting in an existing site are removed
  automatically the next time it loads. Anything you have typed yourself is left alone.
- **Nothing is claimed on your behalf.** CQC rating, ICO registration number and the GP
  earnings figures are no longer filled in with example values. Until you enter your own, the
  GP earnings page says the declaration has not been published yet rather than showing a
  figure nobody at the practice has checked. The wording and structure of every page is
  unchanged.
- **"View website" in the admin panel now opens your website.** It was sending everyone to the
  demo site. It now goes to your own address: your domain once it is pointed at us, and your
  practice page until then. Your sitemap no longer points at the demo either.
- **Clearer news settings.** The two boxes under News read as the same question. They now say
  which page each one controls.

### Action needed

Open your admin panel and check three sections, because anything still holding the example
content is now blank rather than showing the example practice's details:

- **Practice details** and **Team** - your address, phone, email and staff list.
- **Compliance** - your CQC rating, ICO registration number and GP earnings figures. Your GP
  earnings page tells patients the declaration is not published yet until you enter them.
- **Opening hours** - bank holidays and any other closures, and extended access if you offer
  it. Extended access is switched off until you turn it on and say where the appointments are.

Anything you had already filled in yourself is untouched. Nothing else needs doing, and there
are no new environment variables.

## 1.1.0 - 2026-09-21

- **Automatic migration from Practice365 and other WordPress sites.** When the old site shows
  our reader a security check, migration now tries its public page API automatically. No API
  key, browser extension or saved files are needed when that API is available. Review the
  findings as usual; opening hours or other details held only in the old site's theme may
  still need entering yourself.
- **Better page matching during migration.** Team, registration and patient group pages inside
  a practice-information folder are now recognised correctly. News links no longer displace
  the practice information page. External email addresses start unticked for you to check.
- **An Updates section in the admin panel.** It tells you when a new version of the template is
  out, what is in it, and how to take it: on GitHub, press Sync fork. Your content is not
  touched.
- **Recommended wording you can review.** When we update the wording that comes with the
  template because NHS guidance has changed, pages you have already edited now show the new
  version side by side with yours. Use it, or keep your own. Nothing changes until you choose
  and press Save.
- **New required pages appear straight away.** If a future version adds a page every practice
  must publish, it now shows on your website without you having to save first.

## 1.0.0 - 2026-08-05

- First public release.
