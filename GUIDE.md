# Deploy your own GP practice website

A complete walkthrough, from an empty GitHub account to a live NHS practice website on your own domain. About an hour, and it costs nothing to run.

**15 minutes to read, about an hour to do.** Costs nothing to run.

> There is a nicer version of this guide, with copyable commands, at [https://www.simplesurgery.co/guide](https://www.simplesurgery.co/guide).

---

## Contents

1. [Before you start](#before-you-start) — What you need, and what this actually gets you.
2. [Get it running on your own machine](#get-it-running-on-your-own-machine) — Prove it works locally before you put it anywhere near the internet.
3. [Put it online](#put-it-online) — Two services, both free at practice traffic levels.
4. [Keeping it running](#keeping-it-running) — What to do afterwards, which is almost nothing.

---

## Before you start

What you need, and what this actually gets you.

### What you end up with

A complete, compliant practice website that your own staff can edit.

A page and draft wording for each thing the NHS and CQC expect a practice website to cover, written in plain English at a reading age of 9 to 11:

- Appointments, prescriptions, test results, fit notes, registration, vaccinations, clinics, self-referral, proxy access
- Complaints, privacy notice, accessibility statement, named GP, GP earnings, freedom of information, practice policies
- The "You and your general practice" patient charter, a contractual requirement since 1 October 2025

If you already have a website, the admin panel can read it and bring your details across, so you are checking rather than retyping.

Plus the parts that keep it current without anyone writing anything: national NHS news pulled from NHS England hourly, notices that expire on a date you set, and closures that drop off the page once they have passed.

It is designed to NHS England's guidance on GP websites, which is based on user testing with over 160 patients. Six menu items, no sub menus, no PDFs, no pop-ups, and none of the words patients told them they did not understand.

You still have to review the wording so it matches your own services, and your practice remains legally and contractually responsible for what it publishes. What this saves you is the writing, not the checking.

### What you need *(10 minutes)*

Four free accounts and a terminal.

- **Node.js 20 or newer.** Download it from nodejs.org and accept every default. Check it worked by running `node --version` in a terminal.
- **A GitHub account.** Free. This is where your website's code lives.
- **A Vercel account.** Free. This is what actually serves the website. Sign in with GitHub.
- **An Upstash account.** Free. This is where your content is saved.

You do not need to know how to write code. You need to be comfortable copying commands into a terminal and filling in forms.

If any of that already sounds like more than you want to take on, there is a link at the bottom of this page to have it done for you.

---

## Get it running on your own machine

Prove it works locally before you put it anywhere near the internet.

### Copy the code *(5 minutes)*

Fork the repository so you have your own copy, then download it.

On the repository page, click **Fork** in the top right. That gives you your own copy under your own account, which is what you will deploy from.

Then in a terminal:

```
git clone https://github.com/YOUR-USERNAME/simple-surgery-template.git my-practice-website
cd my-practice-website
npm install
```

`npm install` downloads the pieces the site is built from. It takes a minute or two and prints a lot of text. That is normal.

### Run it *(2 minutes)*

One command, and the site is on your own machine.

Create a file called `.env.local` in the folder you just made, containing one line:

```
ADMIN_PASSWORD=pick-something-long-here
```

That is the password you will use to edit the site. Then:

```
npm run dev
```

Open **http://localhost:3001** and you will see a complete practice website, filled in with a fictional surgery. Open **http://localhost:3001/admin** and sign in with the password you just set.

Have a look around the admin panel before changing anything. Practice details and Opening hours are the two sections you will use most.

### Make it yours *(20 minutes)*

Replace the demo details with your practice.

**If you already have a website, start with Migration.** Put your current address into the Migration section and it will read your existing site: your name, phone, address, ODS code, opening hours, online service links, CQC link and often your staff list. You tick what to bring across, and nothing is saved until you press Save.

It also offers the wording of any page this template already has. The compliance pages, your complaints procedure, privacy notice, accessibility statement and the rest, start unticked: those are written here against current guidance and kept up to date, and the version on your old site was usually written by your previous supplier rather than by you.

It will not get everything, and it will occasionally get something wrong, so check what it brings you. It saves most of the typing, which is the point. Then carry on below with whatever it missed.

Work through the admin panel in this order:

1. **Practice details.** Name, logo, address, phone, email, ODS code. Your ODS code is on your NHS profile page and looks like A81001.
2. **Opening hours.** Your hours, plus bank holidays and training afternoons under Closures. These remove themselves once the date passes.
3. **Online services.** Paste in the links to whatever you already use for appointment requests and prescriptions. Patients never see the supplier name.
4. **Compliance.** CQC rating, ICB, Primary Care Network, Data Protection Officer, GP earnings.
5. **Team.** Optional, but patients like knowing who they will see.

Everything else already has draft wording that follows the guidance. Read it through before you go live: it is a starting point written for a typical practice, not a statement of how yours works.

Changes save straight away. Refresh the site to see them.

---

## Put it online

Two services, both free at practice traffic levels.

### Set up storage *(5 minutes)*

Somewhere for your content to live once it is not on your laptop.

The local version saves to a file on your machine. That cannot work once it is deployed, because hosting platforms have read-only filesystems that reset on every deploy. Your edits would silently vanish.

So, before deploying:

1. Sign up at **upstash.com** and create a **Redis** database. Any region near you.
2. On the database page, find the **REST API** section.
3. Copy **UPSTASH_REDIS_REST_URL** and **UPSTASH_REDIS_REST_TOKEN**. You will paste them into Vercel in a moment.

The free tier is 500,000 commands a month. A practice website uses a tiny fraction of that, because pages are cached.

### Deploy to Vercel *(10 minutes)*

Connect your repository and it builds itself.

1. Push your changes to GitHub: `git add -A`, then `git commit -m "Our practice details"`, then `git push`.
2. Go to **vercel.com**, click **Add New, Project**, and pick your forked repository.
3. Leave every build setting alone. Vercel recognises what this is.
4. Before clicking Deploy, open **Environment Variables** and add:

```
ADMIN_PASSWORD=your-long-password
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
SITE_KEY=my-practice
```

`SITE_KEY` can be anything short and lowercase. It tells the site it is serving one practice rather than many, which is what gives you clean web addresses.

5. Click **Deploy**. About two minutes later you have a live website at a vercel.app address.

Sign in at **your-site.vercel.app/admin** and check your content is there.

### Use your own web address *(15 minutes, plus DNS propagation)*

Point your existing nhs.uk address at the new site.

In Vercel, open your project, then **Settings, Domains**, and add your address.

Vercel will show you exactly which DNS records to create. Usually:

- An **A** record for the bare domain, pointing at `76.76.21.21`
- A **CNAME** for `www`, pointing at `cname.vercel-dns.com`

Whoever manages your DNS makes those changes. For an nhs.uk address that is usually your ICB's digital team or your IT supplier. Send them the two records above; they will know what to do.

The certificate is issued automatically once the records resolve. Nothing changes for patients: the old address keeps working until you switch it.

---

## Keeping it running

What to do afterwards, which is almost nothing.

### Getting improvements *(5 minutes, occasionally)*

Pull in changes to the template as they are made.

The template gets updates as NHS guidance changes. To take them:

```
git remote add upstream https://github.com/JLHITS/simple-surgery-template.git
git fetch upstream
git merge upstream/main
git push
```

Vercel redeploys automatically. Your content is untouched, because it lives in the database rather than in the code.

You do not have to do this. A site that never updates keeps working.

### The annual review *(30 minutes a year)*

The one thing the GP contract actually requires of you.

Practice websites must be reviewed at least once a year. The footer shows when content was last updated, which makes that visible to you, to patients and to inspectors.

Once a year, check:

- Opening hours and next year's bank holidays
- The team list
- Your GP earnings declaration, which changes annually
- Your CQC rating
- That the online service links still work

That is the whole maintenance burden.

### When something breaks

The three things that actually go wrong.

**"My edits disappeared."** You deployed without setting up Upstash. Check Advanced settings in the admin panel: it tells you which storage is in use and warns you if changes are not being saved permanently.

**"I cannot sign in."** `ADMIN_PASSWORD` is not set on the deployment, or was changed without redeploying. Environment variables on Vercel only take effect after a redeploy.

**"The news section is empty."** NHS England's feed was briefly unreachable. It retries by itself. The rest of the page is unaffected by design.

Anything else, open an issue on the repository.

---

## Or skip all of it

Everything above, done for you in about the time it takes to read this. We set it up, host it, connect your domain and keep it updated. Your staff still make their own edits, and you can take the site with you whenever you like.

No setup fee. No contract. The code is open source either way, so you are never locked in.

[See the hosted option](https://www.simplesurgery.co/buy)

---

<sub>This file is generated from the guide content on the Simple Surgery site.
Edit `apps/marketing/src/content/guide.ts` in the main repository and run
`npm run guide`, rather than editing this file directly.</sub>
