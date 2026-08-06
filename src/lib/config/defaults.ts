import type { SiteConfig } from './types'

export const SCHEMA_VERSION = 1

/**
 * The seed content every new site starts from.
 *
 * The wording here is not filler. It follows NHS England's guidance in
 * "Creating a highly usable and accessible GP website for patients":
 * reading age 9 to 11, sentences under 20 words, paragraphs under 3 sentences,
 * active voice, and no supplier product names. Practices that never edit a word
 * of it still end up with compliant, plain-English content.
 */
export const defaultConfig: SiteConfig = {
  schemaVersion: SCHEMA_VERSION,
  updatedAt: '2026-01-01T00:00:00.000Z',

  practice: {
    name: 'Frogmorton Medical Centre',
    strapline: 'NHS GP surgery in Frogmorton',
    // Deliberately not a real ODS code. Real ones map to real practices.
    odsCode: 'Z99999',
    logoUrl: '',
    logoAlt: 'Frogmorton Medical Centre',
    addressLine1: '14 Bywater Road',
    addressLine2: '',
    town: 'Frogmorton',
    county: 'Eastfarthing',
    postcode: 'SH1 4RE',
    // 01632 960xxx is the range Ofcom reserves for use in fiction, so these
    // numbers cannot ring a real person no matter who types them in.
    phone: '01632 960 118',
    phoneSecondary: '01632 960 119',
    phoneSecondaryLabel: 'Prescriptions line',
    email: 'reception@frogmorton.example',
    mapEmbedUrl: '',
    parkingInfo:
      'We have 12 patient parking spaces at the front of the building. Two of these are blue badge spaces beside the main door.',
    accessInfo:
      'The building is on one level. There are no steps at the entrance. We have an accessible toilet and a hearing loop at reception.',
    publicTransportInfo:
      'The surgery is on the East Road, opposite The Floating Log. The nearest bus stop is a two minute walk.',
    boundaryDescription:
      'We can register you if you live inside our practice area. It covers Frogmorton, Bywater and the villages along the East Road as far as Whitfurrows.',
    boundaryPostcodes: 'SH1, SH2, SH3 4, SH3 5',
    boundaryMapUrl: '',
  },

  hours: {
    days: [
      { day: 'monday', closed: false, open: '08:00', close: '18:30' },
      { day: 'tuesday', closed: false, open: '08:00', close: '18:30' },
      { day: 'wednesday', closed: false, open: '08:00', close: '18:30' },
      { day: 'thursday', closed: false, open: '08:00', close: '18:30' },
      { day: 'friday', closed: false, open: '08:00', close: '18:30' },
      { day: 'saturday', closed: true, open: '09:00', close: '12:00' },
      { day: 'sunday', closed: true, open: '09:00', close: '12:00' },
    ],
    notes:
      'Phone lines open at 8am. The busiest time to call is between 8am and 9:30am.',
    closures: [
      {
        date: '2026-08-31',
        reason: 'Summer bank holiday',
        allDay: true,
      },
      {
        date: '2026-09-17',
        reason: 'Staff training afternoon',
        allDay: false,
        from: '13:00',
        to: '18:30',
      },
      { date: '2026-12-25', reason: 'Christmas Day', allDay: true },
      { date: '2026-12-26', reason: 'Boxing Day', allDay: true },
      { date: '2027-01-01', reason: "New Year's Day", allDay: true },
    ],
    outOfHoursInfo:
      'When we are closed, call NHS 111 free from any phone. They will tell you what to do and can arrange to see you if you need it.',
    receptionNote: 'Reception is open during surgery hours.',

    extendedAccess: {
      enabled: true,
      title: 'Evening and weekend appointments',
      description:
        'You can book appointments outside our normal hours. These are for routine care that can be planned, not for urgent problems.',
      location: 'Four Farthings Health Hub, Bywater',
      days: [
        { day: 'monday', closed: false, open: '18:30', close: '20:00' },
        { day: 'tuesday', closed: true, open: '18:30', close: '20:00' },
        { day: 'wednesday', closed: false, open: '18:30', close: '20:00' },
        { day: 'thursday', closed: true, open: '18:30', close: '20:00' },
        { day: 'friday', closed: true, open: '18:30', close: '20:00' },
        { day: 'saturday', closed: false, open: '09:00', close: '13:00' },
        { day: 'sunday', closed: true, open: '09:00', close: '13:00' },
      ],
      bookingNote:
        'Book these in advance by calling us or asking through the NHS App. You cannot turn up without an appointment.',
    },

    accessModes: {
      enabled: true,
      walkIn: 'Monday to Friday, 8am to 6:30pm',
      telephone: 'Monday to Friday, 8am to 6:30pm',
      onlineConsultation: 'Monday to Friday, 8am to 6:30pm',
      note: 'All three are available throughout our core hours. We are closed on bank holidays.',
    },
  },

  urgent: {
    emergencyText: 'For a life threatening emergency, call 999 now.',
    lifeThreateningText:
      'Signs of an emergency include chest pain, trouble breathing, heavy bleeding, or someone who will not wake up.',
    nhs111Text:
      'If you need help fast but it is not an emergency, call 111 or go to 111.nhs.uk. They are open 24 hours a day.',
    pharmacyText:
      'A pharmacist can help with many everyday illnesses without an appointment.',
  },

  online: {
    requestUrl: 'https://www.nhs.uk/nhs-app/',
    requestOpenNote:
      'You can send us a request from 8am to 6:30pm, Monday to Friday, excluding bank holidays. We reply within 2 working days.',
    prescriptionUrl: 'https://www.nhs.uk/nhs-app/nhs-app-help-and-support/',
    registrationUrl: 'https://gp-registration.nhs.uk/',
    nhsAppUrl: 'https://www.nhs.uk/nhs-app/',
    patientAccessUrl: 'https://www.patientaccess.com/',
    systmOnlineUrl: '',
    extraLinks: [],
  },

  notice: {
    enabled: true,
    level: 'info',
    title: 'Flu and COVID-19 vaccinations',
    body:
      'Our autumn vaccination clinics are now open. If you are eligible we will text you an invitation. You can also book using the NHS App.',
    linkUrl: '/services/vaccinations',
    linkText: 'Read about vaccinations',
    expiresOn: '2026-12-31',
  },

  content: {
    appointmentsIntro:
      'Tell us what is wrong and we will book you with the right person. That may be a doctor, a nurse, a pharmacist or someone else in the team.',
    appointmentsBody: `## Urgent appointments for today

If you need to be seen today, call us as soon as we open at 8am.

We keep appointments back each day for urgent problems. Reception will ask what is wrong so they can book you correctly. They are trained to do this and everything you tell them is confidential.

## Routine appointments

Send us a request online or call us. Tell us what is wrong and when you are free.

We will look at the information you give us. We will then decide the most suitable person for you to see, and when they are available.

We aim to reply within 2 working days.

## What happens after you contact us

We will send you a text or call you. We will tell you who you will see, and when.

You may be offered a face to face appointment, a phone call, a video call, or a reply by text or email. We will always tell you which.

## Seeing a particular doctor

You can ask to see any doctor at the practice. Tell us when you get in touch. You may wait a little longer.

You can also ask to see a female or a male doctor or nurse. Just tell us when you contact us. You do not need to give a reason.

## Home visits

If you are too ill to come to the surgery, call us before 10:30am. A doctor will call you back to discuss it.

Home visits are for people who cannot leave home. Being without transport is not a reason for a home visit.

## If you cannot come

Please tell us as soon as you can. Someone else can then use your appointment.

## Interpreters and extra support

We can book an interpreter for your appointment at no cost to you. We can also book a British Sign Language interpreter.

Tell us when you book so we can arrange it.

If you need a longer appointment, a quiet room, or step free access, tell us and we will sort it out.`,
    prescriptionsIntro:
      'Order your repeat medicines online, through the NHS App, or at the surgery. Allow 3 working days.',
    prescriptionsOrderNote: `The fastest way is the NHS App. You can order in under a minute.

You can also drop your repeat slip into the box at reception, or post it to us.

We cannot take prescription requests over the phone. This is to avoid mistakes with medicine names and doses.`,
    prescriptionsBody: `## How long it takes

Allow 3 working days. This does not include weekends or bank holidays.

Order before you run out. Do not wait until your last tablet.

## Where to collect it

Most people have their prescription sent straight to a pharmacy. This is called nominating a pharmacy.

You can nominate any pharmacy in England. Tell us or your pharmacy which one you want.

If you have not nominated a pharmacy, collect your paper prescription from reception.

## Medication reviews

Most repeat medicines need a review once a year. We will contact you when yours is due.

If your prescription is refused, it usually means a review is overdue. Contact us and we will book one.

## Questions about your medicines

Our clinical pharmacist can help. Send us a request online or ask reception.

A community pharmacist can also answer questions without an appointment.

## Prescription charges

Many people do not pay for prescriptions. You are exempt if you are under 16, over 60, pregnant, or have certain medical conditions.

If you pay for more than 3 items in 3 months, a prepayment certificate will save you money. Search "NHS prescription prepayment certificate" for details.

## Getting rid of old medicines

Take unused or out of date medicines to any pharmacy. Do not put them in the bin or down the toilet.`,
    aboutIntro:
      'Who we are, how we are run, and the information we are required to publish.',
    aboutBody: '',
    contactIntro:
      'How to reach us, where to find us, and when we are open.',
  },

  team: [
    {
      id: 'tm-1',
      name: 'Dr Rosie Cotton',
      gender: 'Female',
      role: 'GP Partner',
      group: 'Doctors',
      bio: 'Dr Cotton has worked at the practice since 2014. She has a special interest in diabetes and long term conditions.',
      availability: 'Monday, Tuesday, Thursday',
    },
    {
      id: 'tm-2',
      name: 'Dr Meriadoc Brandybuck',
      gender: 'Male',
      role: 'GP Partner',
      group: 'Doctors',
      bio: 'Dr Brandybuck leads our work on heart health. He also supervises our trainee doctors.',
      availability: 'Monday to Friday',
    },
    {
      id: 'tm-3',
      name: 'Dr Poppy Proudfoot',
      gender: 'Female',
      role: 'Salaried GP',
      group: 'Doctors',
      bio: "Dr Proudfoot has a special interest in women's health and contraception.",
      availability: 'Wednesday, Thursday, Friday',
    },
    {
      id: 'tm-4',
      name: 'Marigold Gamgee',
      gender: 'Female',
      role: 'Advanced Nurse Practitioner',
      group: 'Nursing team',
      bio: 'Marigold can assess, diagnose and prescribe for many everyday illnesses.',
      availability: 'Monday to Thursday',
    },
    {
      id: 'tm-5',
      name: 'Hamfast Gardner',
      gender: 'Male',
      role: 'Practice Nurse',
      group: 'Nursing team',
      bio: 'Hamfast runs our asthma, diabetes and travel health clinics.',
    },
    {
      id: 'tm-6',
      name: 'Barliman Butterbur',
      gender: 'Male',
      role: 'Clinical Pharmacist',
      group: 'Nursing team',
      bio: 'Barliman reviews medicines and can answer questions about your prescriptions.',
    },
    {
      id: 'tm-7',
      name: 'Bilbo Baggins',
      gender: 'Male',
      role: 'Practice Manager',
      group: 'Management and reception',
      bio: 'Bilbo manages the practice and handles complaints and feedback.',
    },
    {
      id: 'tm-8',
      name: 'Reception team',
      role: 'Patient services',
      group: 'Management and reception',
      bio: 'Our receptionists are trained to help you reach the right person. They will ask what you need so they can book you correctly.',
    },
  ],

  services: [
    {
      id: 'sv-1',
      slug: 'test-results',
      title: 'Test results',
      summary: 'How to get the results of a blood test, scan or sample.',
      icon: 'flask',
      featured: true,
      body: `## When to expect your results

Most blood test results reach us within 3 working days. Some tests take up to 2 weeks.

We will contact you if a result needs action. We do not contact you about normal results.

## How to get your results

The fastest way is the NHS App. Your results appear there as soon as a doctor has checked them.

You can also call us after 2pm. Reception is quieter then.

## What the results mean

Reception staff can read out a result but they cannot explain it. If you have questions, ask us for an appointment to discuss them.`,
    },
    {
      id: 'sv-2',
      slug: 'fit-notes',
      title: 'Fit notes (sick notes)',
      summary: 'How to get a note for your employer when you are ill.',
      icon: 'note',
      featured: true,
      body: `## If you have been ill for 7 days or less

You do not need a note from us. You can fill in your own form. This is called self certification.

Ask your employer for form SC2, or download it from GOV.UK.

## If you have been ill for more than 7 days

You may need a fit note from a doctor or nurse. Send us a request online or call us.

Tell us the dates you have been off and what is wrong. You usually will not need an appointment.

## Backdated notes

A fit note cannot cover a date before we knew you were ill. Contact us as soon as you can.

## Cost

Fit notes for NHS purposes are free. We charge for private certificates. Ask reception for our current fees.`,
    },
    {
      id: 'sv-3',
      slug: 'register',
      title: 'Register with the surgery',
      summary: 'How to join the practice as a new patient.',
      icon: 'user-plus',
      featured: true,
      body: `## Who can register

You can register if you live inside our practice area. Our boundary is shown further down this page.

You do not need proof of address, ID, or immigration status to register.

We welcome everyone, including people who are homeless or seeking asylum.

## How to register

Register online using the NHS service. It takes about 10 minutes.

You can also come in and ask for a paper form.

## What happens next

We will confirm your registration within 5 working days. Your records will be moved from your old surgery.

We may invite you for a new patient health check.

## Temporary patients

If you are staying in the area for less than 3 months, you can register as a temporary patient. Call us to arrange this.`,
    },
    {
      id: 'sv-4',
      slug: 'vaccinations',
      title: 'Vaccinations',
      summary: 'Flu, COVID-19, childhood and travel vaccinations.',
      icon: 'shield',
      featured: true,
      body: `## Flu and COVID-19

We run vaccination clinics each autumn. We will text or write to you if you are eligible.

You can also book a COVID-19 vaccination through the NHS App or the National Booking Service.

## Childhood vaccinations

We follow the NHS vaccination schedule. We will invite you when your child is due.

If you have missed an appointment, call us and we will book another.

## Shingles and pneumonia

These are offered at certain ages. We will contact you when you become eligible.

## Travel vaccinations

Contact us at least 8 weeks before you travel. Some vaccines need more than one dose.

We charge for some travel vaccines. Ask reception for our current fees.`,
    },
    {
      id: 'sv-5',
      slug: 'clinics',
      title: 'Clinics and long term conditions',
      summary: 'Regular check ups for asthma, diabetes, blood pressure and more.',
      icon: 'heart',
      featured: false,
      body: `## What we offer

We run regular clinics for people with long term conditions. These include:

- asthma and COPD
- diabetes
- high blood pressure
- heart disease
- kidney disease

## How often you will be seen

Most people are seen once a year, usually in the month of their birthday. We will contact you when you are due.

Some people need to be seen more often. Your nurse or doctor will tell you.

## Before your appointment

You may be asked for a blood test or urine sample first. Please have this done at least a week before.

Bring a list of your medicines with you.`,
    },
    {
      id: 'sv-6',
      slug: 'self-referral',
      title: 'Refer yourself',
      summary: 'Services you can contact directly without seeing a doctor first.',
      icon: 'arrow-right',
      featured: false,
      body: `## You do not always need to see us first

For some services you can contact the service yourself. This is often faster.

## Talking therapies

If you feel anxious or low, you can refer yourself to NHS Talking Therapies. Search "NHS Talking Therapies" online to find your local service.

## Physiotherapy

For back, joint or muscle pain, you can refer yourself to physiotherapy.

## Sexual health

Sexual health clinics offer testing, contraception and advice. You do not need a referral.

## Stop smoking

Local stop smoking services are free. They can also supply nicotine replacement.

## Weight management

Free NHS weight management programmes are available. Ask reception for details.`,
    },
    {
      id: 'sv-7',
      slug: 'proxy-access',
      title: 'Help someone else with their care',
      summary: 'How to manage appointments or prescriptions for a relative.',
      icon: 'users',
      featured: false,
      body: `## What proxy access means

Proxy access lets you book appointments and order prescriptions for someone else.

You might do this for a partner, a parent, or a child.

## How to apply

Both of you need to fill in a form. You can collect one from reception or ask us to send you one.

We will need to see photo ID for both of you.

## Children

You can usually have proxy access for a child under 11. After that we review it.

Young people aged 11 and over can ask for their own access.

## People who cannot make decisions

If someone cannot make decisions for themselves, we can still grant access. We will check that it is in their best interests.`,
    },
    {
      id: 'sv-8',
      slug: 'online-services',
      title: 'Manage your health online',
      summary: 'Use the NHS App to book, order and see your record.',
      icon: 'phone',
      featured: false,
      body: `## What you can do online

With the NHS App you can:

- order repeat prescriptions
- see your test results
- read your medical record
- see your appointments
- get an NHS COVID Pass

## How to sign up

Download the NHS App from your app store. You will need photo ID to prove who you are.

Setting it up takes about 10 minutes.

## If you cannot use the app

You can still do everything by phone or in person. Nothing is online only.

If you would like help getting started, ask at reception. We are happy to show you.`,
    },
  ],

  pages: [
    {
      id: 'pg-complaints',
      slug: 'complaints',
      title: 'Complaints and feedback',
      summary: 'How to tell us when something has gone wrong.',
      statutory: true,
      showInFooter: true,
      order: 10,
      body: `We want to get things right. If we have not, please tell us so we can put it right and learn from it.

## How to complain

You can complain in person, by phone, by email or by letter.

Ask to speak to the Practice Manager, or write to them at the surgery address.

## Time limits

Please complain within 12 months of the event, or within 12 months of you finding out about it.

We can sometimes look at older complaints. Ask us.

## What happens next

We will acknowledge your complaint within 3 working days.

We will look into it and reply. We aim to reply fully within 20 working days. If it will take longer, we will tell you why.

## Complaining for someone else

We need their written permission first. This protects their privacy.

## If you are not happy with our reply

You can ask the Parliamentary and Health Service Ombudsman to review it. Call 0345 015 4033 or go to ombudsman.org.uk.

## If you would rather not complain to us

You can complain to our Integrated Care Board instead. Since July 2023, Integrated Care Boards handle complaints about GP practices. NHS England no longer does.

You cannot normally ask us and the Integrated Care Board to look at the same complaint at the same time. Choose one.

Their details are at the bottom of this page.

## Free, independent help

NHS Complaints Advocacy can support you through the process. It is free and independent of the NHS. Search "NHS complaints advocacy" for your local service.`,
    },
    {
      id: 'pg-privacy',
      slug: 'privacy',
      title: 'Privacy notice',
      summary: 'How we use and protect your personal information.',
      statutory: true,
      showInFooter: true,
      order: 20,
      body: `This notice explains what we do with information about you. It covers the UK General Data Protection Regulation and the Data Protection Act 2018.

## Who we are

We are the data controller for your medical records. Our details are on the contact page.

## What information we hold

We hold your name, address, date of birth and contact details.

We hold your medical records. These include notes, test results, letters from hospitals, and details of your medicines.

## Why we use it

We use your information to give you care and treatment. This is our main reason.

We also use it to run the practice, to check the quality of our care, and to meet legal duties.

## Our legal basis

Under UK GDPR we rely on Article 6(1)(e) and Article 9(2)(h). In plain terms, we process your data to provide healthcare in the public interest.

## Who we share it with

We share information with other NHS organisations involved in your care. This includes hospitals, out of hours services and community teams.

We share it where the law requires it, for example to report certain infectious diseases.

We do not sell your information. We do not use it for advertising.

## How long we keep it

We follow the NHS Records Management Code of Practice. GP records are usually kept for 10 years after death, or until a child turns 25.

## Your rights

You can ask to see your record. This is called a subject access request. It is free and we will reply within one month.

You can ask us to correct anything that is wrong.

You can object to some uses of your data.

## National data opt-out

You can stop your confidential information being used for research and planning. Your care will not be affected. Go to nhs.uk/your-nhs-data-matters.

## Our Data Protection Officer

Contact details are at the bottom of this page.

## Complaining about how we use your data

Contact us first. You can also complain to the Information Commissioner's Office. Call 0303 123 1113 or go to ico.org.uk.`,
    },
    {
      id: 'pg-accessibility',
      slug: 'accessibility',
      title: 'Accessibility statement',
      summary: 'How accessible this website is and how to get help.',
      statutory: true,
      showInFooter: true,
      order: 30,
      body: `This statement applies to this website only. It does not cover the NHS App, the NHS website, or any online booking or prescription service we link out to. Those services publish their own accessibility statements.

We want as many people as possible to be able to use this website.

## How accessible this website is

This website has been designed and tested against the Web Content Accessibility Guidelines version 2.2 at level AA.

You should be able to:

- change colours, contrast and fonts using your browser or device
- zoom in up to 400% without losing content
- move around the whole site using just a keyboard
- listen to the site using a screen reader
- read every page without needing a mouse

We do not use pop-ups, overlays or accessibility widgets. NHS England advises against them because they get in the way.

We do not publish information as PDF files. Everything is a normal web page.

## Compliance status

This website is partially compliant with the Web Content Accessibility Guidelines version 2.2 level AA, because of the reason set out below.

We are not aware of any part of this website that fails those requirements. We say partially compliant rather than fully compliant because no independent accessibility audit has been carried out, and government guidance is that "fully compliant" should only be claimed where testing gives enough evidence to support it. Our own testing is described at the bottom of this page.

If an audit is carried out and finds nothing, we will update this section.

## Content that is not accessible

Any parts we know about are listed at the bottom of this page. If you find something we have missed, please tell us.

Content published by other organisations, such as maps or documents we link to, is outside our control and may not meet the same standard.

## If you need information in another format

Tell us what you need and we will try to help. You can ask for:

- large print
- easy read
- audio
- another language

Our contact details are on the contact page. We aim to reply within 5 working days.

## Interpreters and British Sign Language

We can book an interpreter for your appointment at no cost to you. Tell us when you book.

We can also arrange a British Sign Language interpreter.

## Reporting a problem

If you find a problem with this website, please tell us using the details at the bottom of this page. We will look at it and reply.

## Enforcement

The Equality and Human Rights Commission enforces the Public Sector Bodies (Websites and Mobile Applications) (No. 2) Accessibility Regulations 2018.

If you are unhappy with how we respond to your complaint, contact the Equality Advisory and Support Service at equalityadvisoryservice.com.

## How we tested this website

Details of when this statement was prepared, when the site was last tested and who tested it are shown at the bottom of this page.`,
    },
    {
      id: 'pg-named-gp',
      slug: 'named-gp',
      title: 'Your named GP',
      summary: 'Every patient has a named GP responsible for their care.',
      statutory: true,
      showInFooter: true,
      order: 40,
      body: `Every patient registered here has a named, accountable GP.

## What this means

Your named GP is responsible for making sure you get the care you need. They oversee your care but they do not have to be the person you see.

## Who your named GP is

Ask at reception or check the NHS App. We are happy to tell you.

## Can I see a different doctor?

Yes. You can ask to see any doctor at the practice. We will try to book you with them, though you may wait longer.

## Can I change my named GP?

Yes. Tell reception and we will change it where we can.

## This does not change your care

Having a named GP does not affect how you book appointments or who you see day to day.`,
    },
    {
      id: 'pg-gp-earnings',
      slug: 'gp-earnings',
      title: 'GP earnings',
      summary: 'The annual earnings declaration all practices must publish.',
      statutory: true,
      showInFooter: true,
      order: 50,
      body: `All GP practices must publish the average earnings of the GPs who work there. NHS England requires this each year.

## Important context

These figures are not a fair way to compare one practice with another. They cover NHS work only. They do not take account of how many hours each person works.

The figures are published because we are required to publish them.

## Our declaration

The declaration for the most recent financial year is shown below. It covers GPs who worked at the practice for six months or more.`,
    },
    {
      id: 'pg-patient-charter',
      slug: 'patient-charter',
      title: 'You and your general practice',
      summary: 'What you can expect from us, and what we ask of you.',
      statutory: true,
      showInFooter: true,
      order: 60,
      body: `NHS England asks every practice to publish this charter. It sets out what you can expect from us.

## The national document

NHS England publishes the official version, [You and your general practice](https://www.england.nhs.uk/long-read/you-and-your-general-practice/). It is also available in other languages and in easy read.

What follows is our own summary of what it means here. The national document is the definitive version.

## What you can expect from us

We will treat you with respect and courtesy.

We will not turn you away or ask you to call back another day. When you contact us, we will assess your request and tell you what happens next.

We will tell you who you will see and when.

We will keep your information confidential.

We will explain your treatment in a way you understand.

You can ask to see your medical record at any time.

## How we decide who you see

When you contact us, we look at the information you give us. We then decide the most suitable person for you to see, and when they are available.

That may be a doctor, a nurse, a pharmacist, or another healthcare professional.

This is not about turning you away. It is about getting you to the right person faster.

## What we ask of you

Please tell us if you cannot make an appointment. Someone else can then use it.

Please give us as much detail as you can when you contact us. It helps us book you correctly.

Please treat our staff with respect. We will not accept abuse of any kind.

Please keep your contact details up to date.

## If you are unhappy

Tell us. Our complaints page explains how.`,
    },
    {
      id: 'pg-foi',
      slug: 'freedom-of-information',
      title: 'Freedom of information',
      summary: 'The information we routinely publish, and how to request more.',
      statutory: true,
      showInFooter: true,
      order: 70,
      body: `The Freedom of Information Act 2000 gives you the right to ask public bodies for information.

## Our publication scheme

We have adopted the Information Commissioner's model publication scheme for GP practices. This commits us to routinely publishing information in seven classes:

- who we are and what we do
- what we spend and how we spend it
- our priorities and how we are doing
- how we make decisions
- our policies and procedures
- lists and registers we hold
- the services we offer

The guide below sets out what we actually hold in those classes, where to get each item, and what it costs. Anything already on this website is free.

## Making a request

Write to the Practice Manager at the surgery address, or email us. Requests must be in writing.

Tell us clearly what information you want.

We will reply within 20 working days.

## What is not covered

The Act covers our NHS work only.

We cannot give you personal information about patients. If you want your own records, that is a subject access request. See our privacy notice.

## Charges

Information published on this website is free.

For anything we have to copy or post, we charge our actual costs: 10p per sheet of A4 photocopying, plus the actual cost of postage. We will tell you the charge and agree it with you before we do the work.

We do not charge for the time it takes us to find the information.

## If you are unhappy with our reply

Ask us to review it. You can then complain to the Information Commissioner's Office at ico.org.uk.`,
    },
    {
      id: 'pg-policies',
      slug: 'policies',
      title: 'Practice policies',
      summary: 'Chaperones, zero tolerance, confidentiality and data sharing.',
      statutory: false,
      showInFooter: true,
      order: 80,
      body: `## Chaperones

You can ask for a chaperone for any examination. A chaperone is a trained member of staff who stays with you.

Just ask when you arrive, or at any point during your appointment. We will never make you explain why.

If a chaperone is not available at that moment, we will offer to rebook you.

## Zero tolerance

We will not accept violence, aggression or abuse towards our staff.

This includes shouting, swearing, threats, and abusive messages or emails.

We may remove patients who behave this way from our list. Serious incidents are reported to the police.

## Confidentiality

Everything you tell us is confidential. This applies to all our staff, not just doctors and nurses.

We only share information without your permission where the law requires it, or where someone is at serious risk of harm.

## Data sharing

We share your record with other NHS staff involved in your care. This helps them treat you safely.

You can opt out of some sharing. Ask us or read our privacy notice.

## Violence and removal from the list

We can remove a patient from our list. We would normally warn you first, unless you have been violent.

We will write to you and tell you why.

## Text messages

We may text you about appointments, results and health campaigns. Tell reception if you would rather we did not.`,
    },
    {
      id: 'pg-ppg',
      slug: 'patient-group',
      title: 'Patient Participation Group',
      summary: 'Have a say in how the practice is run.',
      statutory: false,
      showInFooter: true,
      order: 90,
      body: `Our Patient Participation Group (PPG) is a small group of patients who meet with practice staff.

## What the group does

The group gives us feedback on how we run the practice.

It helps us plan changes and improve services.

It is not a place to raise a personal complaint. Our complaints page explains how to do that.

## Who can join

Any registered patient can join. We would especially like to hear from younger patients, carers, and people who do not often use the surgery.

## How often it meets

The group meets four times a year. Meetings last about an hour.

You can also join as a virtual member. You will get occasional emails and surveys, with no meetings to attend.

## How to join

Leave your name at reception or email us. We will get in touch.`,
    },
    {
      id: 'pg-carers',
      slug: 'carers',
      title: 'Support for carers',
      summary: 'If you look after someone, tell us so we can support you.',
      statutory: false,
      showInFooter: false,
      order: 100,
      body: `A carer is anyone who looks after a family member, partner or friend who needs help.

You might not think of yourself as a carer. You still count.

## Tell us you are a carer

We keep a carers register. Ask reception to add you.

## What we can offer

We can offer you a free flu vaccination.

We can offer a health check.

We can be more flexible with appointment times.

We can refer you to your local carers service for practical support and a carers assessment.

## If you are cared for

Tell us who cares for you. With your permission we can share information with them.`,
    },
  ],

  news: {
    nhsFeedEnabled: true,
    feedUrls: ['https://www.england.nhs.uk/feed/'],
    feedCount: 8,
    homeCount: 3,
    practiceNews: [
      {
        id: 'pn-1',
        title: 'New online request system',
        date: '2026-07-14',
        body: 'You can now send us a request about any health problem online. We reply within 2 working days. Nothing has changed if you prefer to phone us.',
        pinned: false,
      },
      {
        id: 'pn-2',
        title: 'Car park resurfacing in September',
        date: '2026-06-30',
        body: 'Our car park will be resurfaced during the week of 21 September. Parking will be limited. Please allow extra time or use the street parking on Bywater Road.',
        pinned: false,
      },
    ],
  },

  compliance: {
    cqcRating: 'Good',
    cqcReportUrl: 'https://www.cqc.org.uk/',
    icbName: 'NHS Shire and Buckland Integrated Care Board',
    icbUrl: '',
    pcnName: 'Four Farthings Primary Care Network',
    dataProtectionOfficer: 'Bilbo Baggins',
    dataProtectionEmail: 'dpo@frogmorton.example',
    icoRegistration: 'Z1234567',
    complaintsEmail: 'complaints@frogmorton.example',
    complaintsContactName: 'Bilbo Baggins, Practice Manager',
    icbComplaintsEmail: 'complaints@shireandbuckland.example',
    icbComplaintsPhone: '01632 960 940',
    icbComplaintsUrl: '',
    icbComplaintsAddress: 'Patient Experience Team, NHS Shire and Buckland ICB, Bywater',
    gpEarningsStatement:
      'All GP practices are required to declare the mean earnings for GPs working to deliver NHS services at the practice.',
    gpEarningsAmount: '£78,400',
    gpEarningsFullTime: '2',
    gpEarningsPartTime: '3',
    gpEarningsLocum: '0',
    gpEarningsYear: '2025/26',
    accessibilityPreparedOn: '2026-08-06',
    accessibilityReviewedOn: '2026-08-06',
    accessibilityTestedBy:
      'Prepared by the practice, using the accessibility testing built into the Simple Surgery template. No independent audit has been carried out yet.',
    accessibilityKnownIssues:
      'We are not aware of any part of this website that fails WCAG 2.2 level AA. If you find something, please tell us.',
    publicationScheme: [
      {
        id: 'ps-1',
        information: 'Who we are, our staff and how to contact us',
        where: 'About the surgery, and the contact page',
        charge: 'Free',
      },
      {
        id: 'ps-2',
        information: 'The services we offer, and our opening hours',
        where: 'Services, and the contact page',
        charge: 'Free',
      },
      {
        id: 'ps-3',
        information: 'Our policies and procedures',
        where: 'Practice policies',
        charge: 'Free',
      },
      {
        id: 'ps-4',
        information: 'Average GP earnings, published annually',
        where: 'GP earnings',
        charge: 'Free',
      },
      {
        id: 'ps-5',
        information: 'Our complaints procedure, and how to use it',
        where: 'Complaints and feedback',
        charge: 'Free',
      },
      {
        id: 'ps-6',
        information: 'Our CQC inspection rating and report',
        where: 'Linked from About the surgery and the footer',
        charge: 'Free, published by the CQC',
      },
      {
        id: 'ps-7',
        information: 'Priorities, plans and how we are performing',
        where: 'Ask the Practice Manager',
        charge: 'Free by email. Paper copies charged as below',
      },
      {
        id: 'ps-8',
        information: 'What we spend and how we spend it, for our NHS work',
        where: 'Ask the Practice Manager',
        charge: 'Free by email. Paper copies charged as below',
      },
      {
        id: 'ps-9',
        information: 'How we make decisions, including relevant minutes',
        where: 'Ask the Practice Manager',
        charge: 'Free by email. Paper copies charged as below',
      },
      {
        id: 'ps-10',
        information: 'Lists and registers we hold, where publishing them is lawful',
        where: 'Ask the Practice Manager',
        charge: 'Free by email. Paper copies charged as below',
      },
    ],
  },

  advanced: {
    accentColour: '#005EB8',
    colourMode: 'nhs',
    cornerRadius: 'soft',
    showNhsLogo: true,
    showHoursTimeline: true,
    showSearch: true,
    showTeam: true,
    showNewsInNav: false,
    siteUrl: 'https://demo.simplesurgery.co',
    analyticsScriptUrl: '',
    analyticsSiteId: '',
    footerNote: '',
    showCredit: true,
  },
}
