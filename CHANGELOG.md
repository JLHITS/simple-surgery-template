# Changelog

What has changed in the Simple Surgery template, newest first.

If you run your own copy, your admin panel reads this file to tell you when an update is out,
so each entry is written for the person who looks after the website rather than for developers.
Anything you have to do yourself is listed under **Action needed**.

## Unreleased

- **New colour schemes.** Choose one in **Advanced settings**, where each is shown as a
  small preview. Only the colours change: your pages stay laid out exactly as they are.
  - **NHS with rainbow:** our usual look, with a thin rainbow in NHS colours across the top
    of the header, under each page title, under the page you are on in the menu, and along
    the footer.
  - **Nightingale:** a solid NHS Blue header and menu with the NHS logo in white, and green
    buttons, like NHS.UK and the Nightingale theme many NHS WordPress sites use.
  - **Nightingale with rainbow:** the blue header with the same thin rainbow.
  - **NHS purple and pink:** NHS Purple buttons and links, with Dark Pink and NHS Pink details.
- **Every scheme follows NHS England's colour guidance.** Your pages stay white and the NHS
  logo stays in NHS Blue, and the brighter colours are used only as small details, never as
  large blocks, as the guidance asks. Every scheme's text is easy to read.
- **Choosing your own colour still works.** If you chose your own colour before, your website
  looks exactly as it did, and **Your own colour** is now one of the schemes.
- **The page you are on is marked in the phone menu**, with a short bar under its name.

Nothing needs doing. Your website keeps its current colours until you choose a new scheme.

## 1.4.0 - 2026-10-05

- **More than one surgery.** If you see patients at a branch surgery as well, add it in
  **Practice details**, under **Other sites**. Each site has its own address, and can have its
  own phone number, its own opening hours and a note for patients, such as where to park or
  that it has a dispensary. Your Contact page then shows every surgery with directions to each,
  and the opening hours of any branch that keeps different hours. Your footer lists every
  address, and the top of your home page says where your surgeries are.
- **Name your main surgery.** Once you have more than one site, give your main surgery a name
  in **Practice details**, such as the village it is in, so patients can tell your sites apart.
- **Migration brings your branches across.** Reading a Practice365 website now finds each of
  your surgeries from the contact cards on your old site, with their phone numbers and opening
  hours, and offers them as your other sites.

Nothing changes for a practice with one surgery, and nothing needs doing.

## 1.3.0 - 2026-10-04

- **Formatting buttons in the text editor.** Every page's wording now opens with buttons for
  headings, bold, links, bullet and numbered lists and callouts, over the text as it will look
  on your website. Select some words and press a button. Adding a link asks for the words and
  the address, and takes a web address, an email address or a phone number. Pasting from Word
  or another website keeps the headings, lists, bold and links and tidies away the fonts and
  colours. Your existing wording is unchanged, and **Edit as plain text** is still there if you
  prefer it.
- **A "Contact us online" button beside your phone number.** It sits at the top of every page,
  so patients see the online route before they join the phone queue, and it is the first thing
  in the menu on a phone. It is on unless you turn it off, in **Online services**, and it only
  appears when you have an online request address.
- **Migration from Practice365 is much better.** In testing against a real Practice365 site:
  - **Your team comes across** with job titles and the groups they are listed under, including
    staff pages that list names in capitals, like "DR JANE SMITH (F)".
  - **Your policies come across**, one at a time. Policies kept in a policies folder or as
    expanders on a "Practice information" page are each offered separately, and each one you
    tick is added to your Practice policies page as its own section. One covering the same
    ground as ours, such as chaperones, replaces ours rather than sitting beside it.
  - **Pages read as they did**, with far less tidying up afterwards. Text inside NHS-style cards,
    lines separated by line breaks, bold lines used as headings, and lists typed as separate
    lines all come across properly. "Non-urgent advice:" no longer appears in front of
    headings, empty headings are left out, text in capitals is turned into a normal sentence,
    and links back to pages on your old website become plain text, because those pages will
    not exist once your address moves.
  - **Opening hours, address and practice code** are read from Practice365's contact cards and
    SystmOnline links, and the main surgery is no longer mistaken for a branch.
  - The preview shows each page as it will look, not as code.
- **Your NHS profile link works.** The "Our NHS profile" link used to go to a page that does not
  exist. It now goes to your practice's page on nhs.uk.
- **The opening hours chart matches your hours.** It now runs from your opening time to your
  closing time and labels both, rather than stopping at 5pm with the bar running past it.
- **Smaller fixes.** The pill on the "Order a repeat prescription" tile is no longer cut off. The
  Page wording tabs no longer show a scroll bar, and no longer make the page scroll sideways on
  a phone.

Nothing needs doing, and there are no new environment variables.

## 1.2.0 - 2026-09-21

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
