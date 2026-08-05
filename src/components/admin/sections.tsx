'use client'

import type { Closure, SiteConfig } from '@/lib/config/types'
import { ICON_NAMES } from '@/components/Icon'
import { WEEKDAY_LABELS, WEEKDAYS } from '@/lib/hours'
import {
  ColourInput,
  Divider,
  Fieldset,
  ListEditor,
  MarkdownArea,
  Select,
  SmallButton,
  Tabs,
  TextArea,
  TextInput,
  Toggle,
} from './fields'
import { LogoUpload } from './LogoUpload'

export interface SectionProps {
  /** The practice slug, needed for the tenant-scoped upload endpoint. */
  site: string
  config: SiteConfig
  update: (patch: Partial<SiteConfig>) => void
}

/** Stable enough ids for new list items without pulling in a uuid dependency. */
let counter = 0
function newId(prefix: string) {
  counter += 1
  return `${prefix}-${Date.now().toString(36)}-${counter}`
}

const ICON_OPTIONS = ICON_NAMES.map((name) => ({ value: name, label: name }))

/* --------------------------------------------------------------- practice */

export function PracticeSection({ site, config, update }: SectionProps) {
  const { practice } = config
  const set = (patch: Partial<SiteConfig['practice']>) =>
    update({ practice: { ...practice, ...patch } })

  return (
    <div className="grid gap-8">
      <Fieldset legend="Name and logo">
        <TextInput
          label="Practice name"
          required
          value={practice.name}
          onChange={(name) => set({ name })}
        />
        <TextInput
          label="Strapline"
          hint="One short line under your name. It appears at the top of the home page."
          value={practice.strapline}
          onChange={(strapline) => set({ strapline })}
        />
        <LogoUpload
          site={site}
          value={practice.logoUrl}
          onChange={(logoUrl) => set({ logoUrl })}
          hint="A transparent PNG or SVG works best. If you do not add one, your practice name appears as text instead."
        />
        <TextInput
          label="Logo description"
          hint="Read aloud by screen readers. Usually just your practice name."
          value={practice.logoAlt}
          onChange={(logoAlt) => set({ logoAlt })}
        />
        <TextInput
          label="Practice code (ODS code)"
          hint="For example A81001. We use it to link patients to your NHS profile page."
          value={practice.odsCode}
          onChange={(odsCode) => set({ odsCode })}
        />
      </Fieldset>

      <Divider />

      <Fieldset legend="Address" columns={2}>
        <TextInput
          label="Address line 1"
          value={practice.addressLine1}
          onChange={(addressLine1) => set({ addressLine1 })}
        />
        <TextInput
          label="Address line 2"
          value={practice.addressLine2}
          onChange={(addressLine2) => set({ addressLine2 })}
        />
        <TextInput label="Town" value={practice.town} onChange={(town) => set({ town })} />
        <TextInput
          label="County"
          value={practice.county}
          onChange={(county) => set({ county })}
        />
        <TextInput
          label="Postcode"
          value={practice.postcode}
          onChange={(postcode) => set({ postcode })}
        />
      </Fieldset>

      <Divider />

      <Fieldset legend="Contact" columns={2}>
        <TextInput
          label="Main phone number"
          type="tel"
          value={practice.phone}
          onChange={(phone) => set({ phone })}
        />
        <TextInput
          label="Email address"
          type="email"
          hint="Use an nhs.net address. Never publish an address you use for clinical queries."
          value={practice.email}
          onChange={(email) => set({ email })}
        />
        <TextInput
          label="Second phone number"
          type="tel"
          value={practice.phoneSecondary}
          onChange={(phoneSecondary) => set({ phoneSecondary })}
        />
        <TextInput
          label="What the second number is for"
          value={practice.phoneSecondaryLabel}
          onChange={(phoneSecondaryLabel) => set({ phoneSecondaryLabel })}
        />
      </Fieldset>

      <Divider />

      <Fieldset legend="Getting here">
        <TextArea
          label="Public transport"
          value={practice.publicTransportInfo}
          onChange={(publicTransportInfo) => set({ publicTransportInfo })}
          rows={3}
        />
        <TextArea
          label="Parking"
          value={practice.parkingInfo}
          onChange={(parkingInfo) => set({ parkingInfo })}
          rows={3}
        />
        <TextArea
          label="Getting into the building"
          hint="Steps, ramps, automatic doors, accessible toilets, hearing loops. Patients with access needs rely on this."
          value={practice.accessInfo}
          onChange={(accessInfo) => set({ accessInfo })}
          rows={3}
        />
        <TextInput
          label="Map embed address"
          hint="Optional. Paste the src address from a Google Maps embed. Leave blank to show a link to directions instead."
          type="url"
          value={practice.mapEmbedUrl}
          onChange={(mapEmbedUrl) => set({ mapEmbedUrl })}
        />
      </Fieldset>
    </div>
  )
}

/* ------------------------------------------------------------------ hours */

export function HoursSection({ config, update }: SectionProps) {
  const { hours } = config
  const set = (patch: Partial<SiteConfig['hours']>) => update({ hours: { ...hours, ...patch } })

  const setDay = (day: string, patch: Record<string, unknown>) => {
    set({
      days: hours.days.map((d) => (d.day === day ? { ...d, ...patch } : d)),
    })
  }

  const extended = hours.extendedAccess
  const setExtended = (patch: Partial<SiteConfig['hours']['extendedAccess']>) =>
    set({ extendedAccess: { ...extended, ...patch } })

  const setExtendedDay = (day: string, patch: Record<string, unknown>) => {
    setExtended({
      days: extended.days.map((d) => (d.day === day ? { ...d, ...patch } : d)),
    })
  }

  /** The same seven-row time editor, used for core and for extended access. */
  const dayRows = (
    source: typeof hours.days,
    onChange: (day: string, patch: Record<string, unknown>) => void,
    openLabel = 'Open',
  ) => (
    <div className="grid gap-2">
      {WEEKDAYS.map((weekday) => {
        const day = source.find((d) => d.day === weekday)
        if (!day) return null

        return (
          <div
            key={weekday}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2.5"
          >
            <span className="w-24 shrink-0 text-sm font-semibold">
              {WEEKDAY_LABELS[weekday]}
            </span>

            <label className="flex items-center gap-2 text-[0.85rem]">
              <input
                type="checkbox"
                checked={!day.closed}
                onChange={(e) => onChange(weekday, { closed: !e.target.checked })}
                className="h-4 w-4 accent-zinc-900"
              />
              {openLabel}
            </label>

            {!day.closed && (
              <>
                <label className="flex items-center gap-1.5 text-[0.85rem]">
                  <span className="text-zinc-500">from</span>
                  <input
                    type="time"
                    value={day.open}
                    onChange={(e) => onChange(weekday, { open: e.target.value })}
                    className="min-h-10 rounded-lg border border-zinc-300 px-2 py-1 text-[0.85rem]"
                  />
                </label>
                <label className="flex items-center gap-1.5 text-[0.85rem]">
                  <span className="text-zinc-500">to</span>
                  <input
                    type="time"
                    value={day.close}
                    onChange={(e) => onChange(weekday, { close: e.target.value })}
                    className="min-h-10 rounded-lg border border-zinc-300 px-2 py-1 text-[0.85rem]"
                  />
                </label>
              </>
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="grid gap-8">
      <Fieldset
        legend="Opening hours"
        description="Days with the same hours are grouped together automatically on the website."
      >
        {dayRows(hours.days, setDay)}

        <TextArea
          label="Note under the hours"
          hint='For example "Phone lines open at 8am."'
          value={hours.notes}
          onChange={(notes) => set({ notes })}
          rows={2}
        />
      </Fieldset>

      <Divider />

      <Fieldset
        legend="Extended access"
        description="Evening and weekend appointments, often called enhanced access. Leave this switched off if your practice does not offer them."
      >
        <Toggle
          label="We offer extended access appointments"
          hint="These appear on your website in their own panel, clearly separated from your normal hours so nobody turns up to a locked door."
          checked={extended.enabled}
          onChange={(enabled) => setExtended({ enabled })}
        />

        {extended.enabled && (
          <>
            <TextInput
              label="Heading"
              value={extended.title}
              onChange={(title) => setExtended({ title })}
            />
            <TextArea
              label="Description"
              hint="What these appointments are for, and what they are not for."
              value={extended.description}
              onChange={(description) => setExtended({ description })}
              rows={2}
            />

            {dayRows(extended.days, setExtendedDay, 'Available')}

            <TextInput
              label="Where they are held"
              hint="Leave blank if they are at your own surgery. Fill it in if they are at a hub, because patients will go to the wrong place otherwise."
              value={extended.location}
              onChange={(location) => setExtended({ location })}
            />
            <TextArea
              label="How to book"
              value={extended.bookingNote}
              onChange={(bookingNote) => setExtended({ bookingNote })}
              rows={2}
            />
          </>
        )}
      </Fieldset>

      <Divider />

      <Fieldset
        legend="Closures"
        description="Bank holidays and training afternoons. These disappear from the website by themselves once the date has passed, so there is nothing to tidy up."
      >
        <ListEditor<Closure & { id: string }>
          items={hours.closures.map((c, i) => ({ ...c, id: `${c.date}-${i}` }))}
          onChange={(items) =>
            set({
              closures: items.map(({ id: _id, ...rest }) => rest),
            })
          }
          addLabel="Add a closure"
          emptyText="No closures added yet."
          createItem={() => ({
            id: newId('cl'),
            date: new Date().toISOString().slice(0, 10),
            reason: '',
            allDay: true,
          })}
          renderSummary={(item) => (
            <>
              {item.date || 'New closure'}
              <span className="ml-2 font-normal text-zinc-500">{item.reason}</span>
            </>
          )}
          renderFields={(item, patch) => (
            <>
              <TextInput
                label="Date"
                type="date"
                value={item.date}
                onChange={(date) => patch({ date })}
              />
              <TextInput
                label="Reason"
                hint='For example "Christmas Day" or "Staff training".'
                value={item.reason}
                onChange={(reason) => patch({ reason })}
              />
              <Toggle
                label="Closed all day"
                checked={item.allDay}
                onChange={(allDay) => patch({ allDay })}
              />
              {!item.allDay && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextInput
                    label="Closed from"
                    type="time"
                    value={item.from || '13:00'}
                    onChange={(from) => patch({ from })}
                  />
                  <TextInput
                    label="Closed until"
                    type="time"
                    value={item.to || '18:30'}
                    onChange={(to) => patch({ to })}
                  />
                </div>
              )}
            </>
          )}
        />
      </Fieldset>

      <Divider />

      <Fieldset legend="When you are closed">
        <TextArea
          label="What patients should do"
          value={hours.outOfHoursInfo}
          onChange={(outOfHoursInfo) => set({ outOfHoursInfo })}
          rows={3}
        />
        <TextInput
          label="Reception note"
          value={hours.receptionNote}
          onChange={(receptionNote) => set({ receptionNote })}
        />
      </Fieldset>
    </div>
  )
}

/* ----------------------------------------------------------------- notice */

export function NoticeSection({ config, update }: SectionProps) {
  const { notice } = config
  const set = (patch: Partial<SiteConfig['notice']>) =>
    update({ notice: { ...notice, ...patch } })

  return (
    <div className="grid gap-6">
      <p className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-[0.85rem] leading-relaxed text-zinc-600">
        The notice appears at the top of the home page. It is never a pop-up. NHS England
        advises against pop-ups because more than a quarter of patients tested could not get
        past one, and the message disappears the moment it is closed.
      </p>

      <Toggle
        label="Show the notice"
        checked={notice.enabled}
        onChange={(enabled) => set({ enabled })}
      />

      <Fieldset legend="Message">
        <Select
          label="How important is it?"
          value={notice.level}
          options={[
            { value: 'info', label: 'Information (blue)' },
            { value: 'warning', label: 'Important (yellow)' },
            { value: 'urgent', label: 'Urgent (red)' },
          ]}
          onChange={(level) => set({ level })}
        />
        <TextInput label="Title" value={notice.title} onChange={(title) => set({ title })} />
        <TextArea label="Message" value={notice.body} onChange={(body) => set({ body })} rows={3} />
      </Fieldset>

      <Fieldset legend="Optional link" columns={2}>
        <TextInput
          label="Link text"
          value={notice.linkText || ''}
          onChange={(linkText) => set({ linkText })}
        />
        <TextInput
          label="Link address"
          hint="A page on this site such as /services/vaccinations, or a full web address."
          value={notice.linkUrl || ''}
          onChange={(linkUrl) => set({ linkUrl })}
        />
      </Fieldset>

      <Fieldset legend="Remove it automatically">
        <TextInput
          label="Hide after this date"
          type="date"
          hint="Set this and the notice removes itself. This is the single best way to stop a website looking out of date."
          value={notice.expiresOn || ''}
          onChange={(expiresOn) => set({ expiresOn })}
        />
      </Fieldset>
    </div>
  )
}

/* ----------------------------------------------------------------- online */

export function OnlineSection({ config, update }: SectionProps) {
  const { online } = config
  const set = (patch: Partial<SiteConfig['online']>) =>
    update({ online: { ...online, ...patch } })

  return (
    <div className="grid gap-8">
      <p className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-[0.85rem] leading-relaxed text-zinc-600">
        Paste in the addresses of the online tools you already use. Patients never see the
        supplier name, only what the link does. NHS England asks for this: 83% of patients they
        tested did not understand the phrase &quot;online consultation&quot;.
      </p>

      <Fieldset legend="Requesting an appointment">
        <TextInput
          label="Online request address"
          type="url"
          hint="Your Accurx, eConsult, PATCHS, Klinik or similar link. Leave blank to hide the button."
          value={online.requestUrl}
          onChange={(requestUrl) => set({ requestUrl })}
        />
        <TextInput
          label="When patients can use it"
          hint='For example "You can send us a request from 8am to 6pm, Monday to Friday."'
          value={online.requestOpenNote}
          onChange={(requestOpenNote) => set({ requestOpenNote })}
        />
      </Fieldset>

      <Divider />

      <Fieldset legend="Other online services" columns={2}>
        <TextInput
          label="NHS App"
          type="url"
          value={online.nhsAppUrl}
          onChange={(nhsAppUrl) => set({ nhsAppUrl })}
        />
        <TextInput
          label="Repeat prescriptions"
          type="url"
          value={online.prescriptionUrl}
          onChange={(prescriptionUrl) => set({ prescriptionUrl })}
        />
        <TextInput
          label="Register as a new patient"
          type="url"
          hint="The national NHS registration service works for most practices."
          value={online.registrationUrl}
          onChange={(registrationUrl) => set({ registrationUrl })}
        />
        <TextInput
          label="Patient Access"
          type="url"
          value={online.patientAccessUrl}
          onChange={(patientAccessUrl) => set({ patientAccessUrl })}
        />
        <TextInput
          label="SystmOnline"
          type="url"
          value={online.systmOnlineUrl}
          onChange={(systmOnlineUrl) => set({ systmOnlineUrl })}
        />
      </Fieldset>

      <Divider />

      <Fieldset
        legend="Extra buttons"
        description="Anything else you want on the home page, such as a local self referral service."
      >
        <ListEditor
          items={online.extraLinks}
          onChange={(extraLinks) => set({ extraLinks })}
          addLabel="Add a button"
          emptyText="No extra buttons."
          createItem={() => ({
            id: newId('ql'),
            label: '',
            description: '',
            href: '',
            icon: 'arrow-right',
            external: true,
          })}
          renderSummary={(item) => item.label || 'New button'}
          renderFields={(item, patch) => (
            <>
              <TextInput
                label="Button text"
                value={item.label}
                onChange={(label) => patch({ label })}
              />
              <TextInput
                label="Description"
                value={item.description}
                onChange={(description) => patch({ description })}
              />
              <TextInput
                label="Address"
                type="url"
                value={item.href}
                onChange={(href) => patch({ href })}
              />
              <Select
                label="Icon"
                value={item.icon || 'arrow-right'}
                options={ICON_OPTIONS}
                onChange={(icon) => patch({ icon })}
              />
            </>
          )}
        />
      </Fieldset>
    </div>
  )
}

/* ---------------------------------------------------------------- content */

export function ContentSection({ config, update }: SectionProps) {
  const { content } = config
  const set = (patch: Partial<SiteConfig['content']>) =>
    update({ content: { ...content, ...patch } })

  return (
    <div className="grid gap-8">
      <p className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-[0.85rem] leading-relaxed text-zinc-600">
        The wording that comes with the template has been written to NHS England&apos;s
        guidance: reading age 9 to 11, short sentences, no jargon. Edit it if you need to, but
        the words here are safe to leave exactly as they are.
      </p>

      <Tabs
        ariaLabel="Choose a page to edit"
        tabs={[
          {
            key: 'appointments',
            label: 'Appointments',
            content: (
              <Fieldset
                legend="Appointments page"
                description="The page patients visit most. NHS England calls it the most critical page on a GP website."
              >
                <TextInput
                  label="Opening line"
                  value={content.appointmentsIntro}
                  onChange={(appointmentsIntro) => set({ appointmentsIntro })}
                />
                <MarkdownArea
                  label="Page content"
                  value={content.appointmentsBody}
                  onChange={(appointmentsBody) => set({ appointmentsBody })}
                  rows={18}
                />
              </Fieldset>
            ),
          },
          {
            key: 'prescriptions',
            label: 'Prescriptions',
            content: (
              <Fieldset
                legend="Prescriptions page"
                description="The second most common reason patients come to a GP website."
              >
                <TextInput
                  label="Opening line"
                  value={content.prescriptionsIntro}
                  onChange={(prescriptionsIntro) => set({ prescriptionsIntro })}
                />
                <MarkdownArea
                  label="Page content"
                  value={content.prescriptionsBody}
                  onChange={(prescriptionsBody) => set({ prescriptionsBody })}
                  rows={18}
                />
              </Fieldset>
            ),
          },
          {
            key: 'about',
            label: 'About the surgery',
            content: (
              <Fieldset legend="About page">
                <TextInput
                  label="Opening line"
                  value={content.aboutIntro}
                  onChange={(aboutIntro) => set({ aboutIntro })}
                />
                <MarkdownArea
                  label="Extra text on the About page"
                  hint="Optional. Leave blank if you have nothing to add. Your team, CQC rating and policies appear automatically."
                  value={content.aboutBody}
                  onChange={(aboutBody) => set({ aboutBody })}
                  rows={12}
                />
              </Fieldset>
            ),
          },
          {
            key: 'contact',
            label: 'Contact us',
            content: (
              <Fieldset
                legend="Contact page"
                description="Your address, phone number and opening hours are pulled from Practice details and Opening hours, so there is only the opening line to write here."
              >
                <TextInput
                  label="Opening line"
                  value={content.contactIntro}
                  onChange={(contactIntro) => set({ contactIntro })}
                />
              </Fieldset>
            ),
          },
        ]}
      />
    </div>
  )
}

/* --------------------------------------------------------------- services */

export function ServicesSection({ config, update }: SectionProps) {
  return (
    <div className="grid gap-6">
      <p className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-[0.85rem] leading-relaxed text-zinc-600">
        Each service gets its own page. Ticking &quot;Show on the home page&quot; puts it in the
        grid patients see first.
      </p>

      <ListEditor
        items={config.services}
        onChange={(services) => update({ services })}
        addLabel="Add a service"
        emptyText="No services yet."
        createItem={() => ({
          id: newId('sv'),
          slug: '',
          title: '',
          summary: '',
          body: '',
          icon: 'heart',
          featured: false,
        })}
        renderSummary={(item) => (
          <>
            {item.title || 'New service'}
            {item.featured && (
              <span className="ml-2 rounded bg-zinc-900 px-1.5 py-0.5 text-[0.7rem] font-semibold text-white">
                Home page
              </span>
            )}
          </>
        )}
        renderFields={(item, patch) => (
          <>
            <TextInput
              label="Title"
              value={item.title}
              onChange={(title) =>
                patch({
                  title,
                  // Keep the address in step with the title until it is published.
                  slug: item.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                })
              }
            />
            <TextInput
              label="Web address"
              hint={`Patients will see /services/${item.slug || 'your-service'}`}
              value={item.slug}
              onChange={(slug) => patch({ slug })}
            />
            <TextInput
              label="One line summary"
              hint="Shown on the card. Keep it under 15 words."
              value={item.summary}
              onChange={(summary) => patch({ summary })}
            />
            <Select
              label="Icon"
              value={item.icon || 'heart'}
              options={ICON_OPTIONS}
              onChange={(icon) => patch({ icon })}
            />
            <Toggle
              label="Show on the home page"
              checked={item.featured}
              onChange={(featured) => patch({ featured })}
            />
            <MarkdownArea
              label="Page content"
              value={item.body}
              onChange={(body) => patch({ body })}
            />
          </>
        )}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ pages */

export function PagesSection({ config, update }: SectionProps) {
  return (
    <div className="grid gap-6">
      <p className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-[0.85rem] leading-relaxed text-zinc-600">
        Your policies and statements. The pages marked as required are ones the NHS contract
        says every practice must publish, so they cannot be deleted. You can still edit them.
      </p>

      <ListEditor
        items={config.pages}
        onChange={(pages) => update({ pages })}
        addLabel="Add a page"
        emptyText="No pages yet."
        canDelete={(item) => !item.statutory}
        createItem={() => ({
          id: newId('pg'),
          slug: '',
          title: '',
          summary: '',
          body: '',
          statutory: false,
          showInFooter: true,
          order: (config.pages.length + 1) * 10,
        })}
        renderSummary={(item) => (
          <>
            {item.title || 'New page'}
            {item.statutory && (
              <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-[0.7rem] font-semibold text-zinc-600">
                Required
              </span>
            )}
          </>
        )}
        renderFields={(item, patch) => (
          <>
            <TextInput label="Title" value={item.title} onChange={(title) => patch({ title })} />
            <TextInput
              label="Web address"
              hint={`Patients will see /about/${item.slug || 'your-page'}`}
              value={item.slug}
              onChange={(slug) => patch({ slug })}
            />
            <TextInput
              label="One line summary"
              value={item.summary}
              onChange={(summary) => patch({ summary })}
            />
            <Toggle
              label="Show in the footer"
              checked={item.showInFooter}
              onChange={(showInFooter) => patch({ showInFooter })}
            />
            <MarkdownArea
              label="Page content"
              value={item.body}
              onChange={(body) => patch({ body })}
            />
          </>
        )}
      />
    </div>
  )
}

/* ------------------------------------------------------------------- team */

export function TeamSection({ site, config, update }: SectionProps) {
  return (
    <div className="grid gap-6">
      <p className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-[0.85rem] leading-relaxed text-zinc-600">
        People with the same group name appear together. Common groups are Doctors, Nursing
        team, and Management and reception.
      </p>

      <ListEditor
        items={config.team}
        onChange={(team) => update({ team })}
        addLabel="Add a team member"
        emptyText="No team members yet."
        createItem={() => ({
          id: newId('tm'),
          name: '',
          role: '',
          group: 'Doctors',
          bio: '',
          availability: '',
        })}
        renderSummary={(item) => (
          <>
            {item.name || 'New person'}
            <span className="ml-2 font-normal text-zinc-500">{item.role}</span>
          </>
        )}
        renderFields={(item, patch) => (
          <>
            <TextInput label="Name" value={item.name} onChange={(name) => patch({ name })} />
            <TextInput
              label="Job title"
              hint='For example "GP Partner" or "Practice Nurse".'
              value={item.role}
              onChange={(role) => patch({ role })}
            />
            <TextInput
              label="Group"
              hint="People with the same group name are shown together."
              value={item.group}
              onChange={(group) => patch({ group })}
            />
            <Select
              label="Gender"
              hint="Optional. Some patients want to ask for a female or male clinician. Showing it here saves them a phone call. Only add it with the person's agreement."
              value={item.gender || ''}
              options={[
                { value: '', label: 'Do not show' },
                { value: 'Female', label: 'Female' },
                { value: 'Male', label: 'Male' },
                { value: 'Non-binary', label: 'Non-binary' },
              ]}
              onChange={(gender) => patch({ gender })}
            />
            <TextArea
              label="About this person"
              value={item.bio || ''}
              onChange={(bio) => patch({ bio })}
              rows={3}
            />
            <TextInput
              label="Usually here"
              hint='For example "Monday, Tuesday, Thursday". Leave blank to hide.'
              value={item.availability || ''}
              onChange={(availability) => patch({ availability })}
            />
            <LogoUpload
              site={site}
              label="Photo"
              value={item.photoUrl || ''}
              onChange={(photoUrl) => patch({ photoUrl })}
              hint="Optional. A square photo works best."
            />
          </>
        )}
      />
    </div>
  )
}

/* ------------------------------------------------------------------- news */

export function NewsSection({ config, update }: SectionProps) {
  const { news } = config
  const set = (patch: Partial<SiteConfig['news']>) => update({ news: { ...news, ...patch } })

  return (
    <div className="grid gap-8">
      <Fieldset
        legend="National NHS news"
        description="Pulled automatically from NHS England and refreshed every hour. This is what keeps your website looking current without anyone having to write anything."
      >
        <Toggle
          label="Show national NHS news"
          checked={news.nhsFeedEnabled}
          onChange={(nhsFeedEnabled) => set({ nhsFeedEnabled })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Stories on the news page"
            type="number"
            value={String(news.feedCount)}
            onChange={(value) => set({ feedCount: Number(value) || 8 })}
          />
          <TextInput
            label="Stories on the home page"
            hint="Set to 0 to keep the home page free of news."
            type="number"
            value={String(news.homeCount)}
            onChange={(value) => set({ homeCount: Number(value) || 0 })}
          />
        </div>
      </Fieldset>

      <Divider />

      <Fieldset
        legend="Your own news"
        description="Only add something here when you genuinely need to. The national feed above does the work of keeping the page alive."
      >
        <ListEditor
          items={news.practiceNews}
          onChange={(practiceNews) => set({ practiceNews })}
          addLabel="Add a news item"
          emptyText="No practice news. That is fine, the national feed fills this page."
          createItem={() => ({
            id: newId('pn'),
            title: '',
            date: new Date().toISOString().slice(0, 10),
            body: '',
            linkUrl: '',
            pinned: false,
          })}
          renderSummary={(item) => (
            <>
              {item.title || 'New item'}
              <span className="ml-2 font-normal text-zinc-500">{item.date}</span>
            </>
          )}
          renderFields={(item, patch) => (
            <>
              <TextInput
                label="Title"
                value={item.title}
                onChange={(title) => patch({ title })}
              />
              <TextInput
                label="Date"
                type="date"
                value={item.date}
                onChange={(date) => patch({ date })}
              />
              <MarkdownArea
                label="Content"
                value={item.body}
                onChange={(body) => patch({ body })}
                rows={6}
              />
              <TextInput
                label="Link"
                hint="Optional."
                type="url"
                value={item.linkUrl || ''}
                onChange={(linkUrl) => patch({ linkUrl })}
              />
              <Toggle
                label="Pin to the top"
                checked={item.pinned}
                onChange={(pinned) => patch({ pinned })}
              />
            </>
          )}
        />
      </Fieldset>
    </div>
  )
}

/* ------------------------------------------------------------- compliance */

export function ComplianceSection({ config, update }: SectionProps) {
  const { compliance } = config
  const set = (patch: Partial<SiteConfig['compliance']>) =>
    update({ compliance: { ...compliance, ...patch } })

  return (
    <div className="grid gap-8">
      <Fieldset legend="Inspection and commissioning" columns={2}>
        <TextInput
          label="CQC rating"
          value={compliance.cqcRating}
          onChange={(cqcRating) => set({ cqcRating })}
        />
        <TextInput
          label="Link to your CQC report"
          type="url"
          value={compliance.cqcReportUrl}
          onChange={(cqcReportUrl) => set({ cqcReportUrl })}
        />
        <TextInput
          label="Integrated Care Board"
          value={compliance.icbName}
          onChange={(icbName) => set({ icbName })}
        />
        <TextInput
          label="ICB website"
          type="url"
          value={compliance.icbUrl}
          onChange={(icbUrl) => set({ icbUrl })}
        />
        <TextInput
          label="Primary Care Network"
          value={compliance.pcnName}
          onChange={(pcnName) => set({ pcnName })}
        />
      </Fieldset>

      <Divider />

      <Fieldset legend="Data protection" columns={2}>
        <TextInput
          label="Data Protection Officer"
          value={compliance.dataProtectionOfficer}
          onChange={(dataProtectionOfficer) => set({ dataProtectionOfficer })}
        />
        <TextInput
          label="Their email address"
          type="email"
          value={compliance.dataProtectionEmail}
          onChange={(dataProtectionEmail) => set({ dataProtectionEmail })}
        />
        <TextInput
          label="ICO registration number"
          value={compliance.icoRegistration}
          onChange={(icoRegistration) => set({ icoRegistration })}
        />
      </Fieldset>

      <Divider />

      <Fieldset legend="Complaints" columns={2}>
        <TextInput
          label="Who handles complaints"
          value={compliance.complaintsContactName}
          onChange={(complaintsContactName) => set({ complaintsContactName })}
        />
        <TextInput
          label="Complaints email address"
          type="email"
          value={compliance.complaintsEmail}
          onChange={(complaintsEmail) => set({ complaintsEmail })}
        />
      </Fieldset>

      <Divider />

      <Fieldset
        legend="GP earnings"
        description="Every practice must publish this each year. It appears on the GP earnings page."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Financial year"
            value={compliance.gpEarningsYear}
            onChange={(gpEarningsYear) => set({ gpEarningsYear })}
          />
          <TextInput
            label="Average pay before tax"
            value={compliance.gpEarningsAmount}
            onChange={(gpEarningsAmount) => set({ gpEarningsAmount })}
          />
          <TextInput
            label="Number of full time GPs"
            value={compliance.gpEarningsFullTime}
            onChange={(gpEarningsFullTime) => set({ gpEarningsFullTime })}
          />
          <TextInput
            label="Number of part time GPs"
            value={compliance.gpEarningsPartTime}
            onChange={(gpEarningsPartTime) => set({ gpEarningsPartTime })}
          />
          <TextInput
            label="Number of locum GPs"
            value={compliance.gpEarningsLocum}
            onChange={(gpEarningsLocum) => set({ gpEarningsLocum })}
          />
        </div>
        <TextArea
          label="Explanatory statement"
          value={compliance.gpEarningsStatement}
          onChange={(gpEarningsStatement) => set({ gpEarningsStatement })}
          rows={3}
        />
      </Fieldset>
    </div>
  )
}

/* --------------------------------------------------------------- advanced */

export function AdvancedSection({
  config,
  update,
  storage,
}: SectionProps & { storage: { name: string; configured: boolean; persistent: boolean } }) {
  const { advanced, urgent } = config
  const set = (patch: Partial<SiteConfig['advanced']>) =>
    update({ advanced: { ...advanced, ...patch } })
  const setUrgent = (patch: Partial<SiteConfig['urgent']>) =>
    update({ urgent: { ...urgent, ...patch } })

  return (
    <div className="grid gap-8">
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-[0.85rem] leading-relaxed text-amber-900">
        You should not need anything on this page day to day. Everything here is set up
        correctly already.
      </p>

      <Fieldset legend="Appearance">
        <Select
          label="Colours"
          hint="NHS Blue is strongly recommended. Patients use NHS colours to tell a real NHS service from a private one."
          value={advanced.colourMode}
          options={[
            { value: 'nhs', label: 'NHS Blue (recommended)' },
            { value: 'custom', label: 'Use my own colour' },
          ]}
          onChange={(colourMode) => set({ colourMode })}
        />
        {advanced.colourMode === 'custom' && (
          <ColourInput
            label="Your colour"
            hint="Must be dark enough for white text to be readable on it. Aim for a contrast ratio of at least 4.5 to 1."
            value={advanced.accentColour}
            onChange={(accentColour) => set({ accentColour })}
          />
        )}
        <Select
          label="Corner style"
          value={advanced.cornerRadius}
          options={[
            { value: 'square', label: 'Square' },
            { value: 'soft', label: 'Softly rounded' },
            { value: 'round', label: 'Rounded' },
          ]}
          onChange={(cornerRadius) => set({ cornerRadius })}
        />
      </Fieldset>

      <Divider />

      <Fieldset legend="What to show">
        <Toggle
          label="Show the NHS logo"
          hint="Appears in the header and the footer. NHS England recommends showing it, because patients use the NHS logo to tell a real NHS service from a private clinic. Turn it off only if your practice has a reason to."
          checked={advanced.showNhsLogo}
          onChange={(showNhsLogo) => set({ showNhsLogo })}
        />
        <Toggle
          label="Show the search box"
          checked={advanced.showSearch}
          onChange={(showSearch) => set({ showSearch })}
        />
        <Toggle
          label="Show the team on the About page"
          checked={advanced.showTeam}
          onChange={(showTeam) => set({ showTeam })}
        />
        <Toggle
          label='Show the "Built with Simple Surgery" credit'
          checked={advanced.showCredit}
          onChange={(showCredit) => set({ showCredit })}
        />
      </Fieldset>

      <Divider />

      <Fieldset legend="Urgent care wording">
        <TextArea
          label="999 message"
          value={urgent.emergencyText}
          onChange={(emergencyText) => setUrgent({ emergencyText })}
          rows={2}
        />
        <TextArea
          label="Signs of an emergency"
          value={urgent.lifeThreateningText}
          onChange={(lifeThreateningText) => setUrgent({ lifeThreateningText })}
          rows={2}
        />
        <TextArea
          label="111 message"
          value={urgent.nhs111Text}
          onChange={(nhs111Text) => setUrgent({ nhs111Text })}
          rows={2}
        />
        <TextArea
          label="Pharmacy message"
          value={urgent.pharmacyText}
          onChange={(pharmacyText) => setUrgent({ pharmacyText })}
          rows={2}
        />
      </Fieldset>

      <Divider />

      <Fieldset legend="Website address and analytics">
        <TextInput
          label="Your website address"
          type="url"
          hint="Used for your sitemap and for links shared on social media."
          value={advanced.siteUrl}
          onChange={(siteUrl) => set({ siteUrl })}
        />
        <TextInput
          label="Analytics script address"
          type="url"
          hint="Optional. Use a privacy friendly service such as Plausible or Fathom. Leave blank for no tracking at all."
          value={advanced.analyticsScriptUrl}
          onChange={(analyticsScriptUrl) => set({ analyticsScriptUrl })}
        />
        <TextInput
          label="Analytics site identifier"
          value={advanced.analyticsSiteId}
          onChange={(analyticsSiteId) => set({ analyticsSiteId })}
        />
        <TextInput
          label="Extra footer note"
          value={advanced.footerNote}
          onChange={(footerNote) => set({ footerNote })}
        />
      </Fieldset>

      <Divider />

      <Fieldset legend="News sources">
        <div className="grid gap-2">
          {config.news.feedUrls.map((feed, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="url"
                value={feed}
                onChange={(e) => {
                  const feedUrls = [...config.news.feedUrls]
                  feedUrls[index] = e.target.value
                  update({ news: { ...config.news, feedUrls } })
                }}
                className="w-full min-h-11 rounded-lg border border-zinc-300 px-3 py-2 text-[0.9rem]"
              />
              <SmallButton
                tone="danger"
                onClick={() =>
                  update({
                    news: {
                      ...config.news,
                      feedUrls: config.news.feedUrls.filter((_, i) => i !== index),
                    },
                  })
                }
              >
                Remove
              </SmallButton>
            </div>
          ))}
          <div>
            <SmallButton
              onClick={() =>
                update({
                  news: {
                    ...config.news,
                    feedUrls: [...config.news.feedUrls, 'https://www.england.nhs.uk/feed/'],
                  },
                })
              }
            >
              Add a feed
            </SmallButton>
          </div>
          <p className="text-[0.8rem] text-zinc-500">
            RSS or Atom addresses. NHS England&apos;s feed is included by default.
          </p>
        </div>
      </Fieldset>

      <Divider />

      <Fieldset legend="Where your content is stored">
        <dl className="grid gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-[0.85rem]">
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Storage</dt>
            <dd className="font-semibold text-zinc-900">{storage.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Set up correctly</dt>
            <dd className="font-semibold text-zinc-900">{storage.configured ? 'Yes' : 'No'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Changes are saved permanently</dt>
            <dd className="font-semibold text-zinc-900">{storage.persistent ? 'Yes' : 'No'}</dd>
          </div>
        </dl>
        {!storage.persistent && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-[0.85rem] text-red-700">
            Your changes are not being saved permanently. Add an Upstash Redis database and
            redeploy, or your edits will be lost.
          </p>
        )}
      </Fieldset>
    </div>
  )
}
