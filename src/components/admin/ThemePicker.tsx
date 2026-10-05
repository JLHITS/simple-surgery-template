'use client'

import type { ThemeKey } from '@/lib/config/types'
import { NhsLogo } from '@/components/NhsLogo'
import { paletteFor, THEMES } from '@/lib/theme'

/**
 * The colour scheme chooser.
 *
 * Each scheme is shown as a small picture of the top of a page in it, drawn
 * from the same palette the website uses, so what a practice picks here is
 * exactly what patients will see.
 */
function Preview({ theme, colour, blue }: { theme: ThemeKey; colour: string; blue: boolean }) {
  const p = paletteFor(theme, colour)
  const hasTitleBar = p.titleBarHeight !== '0px'

  return (
    <div aria-hidden="true" className="overflow-hidden rounded-lg border border-zinc-200 bg-white text-left">
      {p.stripeHeight !== '0px' && <div className="h-1" style={{ background: p.stripe }} />}
      <div
        className="flex items-center gap-2 px-2.5 py-2"
        style={{ background: p.headerBg }}
      >
        <NhsLogo height={12} title="" variant={blue ? 'reverse' : 'default'} />
        <span className="h-1.5 w-12 rounded-full" style={{ background: p.headerText }} />
        <span
          className="ml-auto rounded px-1.5 py-0.5 text-[0.55rem] font-bold"
          style={{ background: p.headerCta, color: p.headerCtaText }}
        >
          Contact us online
        </span>
      </div>
      <div
        className="flex gap-3 px-2.5 text-[0.55rem] font-semibold"
        style={{ background: p.headerBg, borderTop: `1px solid ${p.navBorder}`, borderBottom: `1px solid ${p.headerBorder}` }}
      >
        <span className="relative py-1.5" style={{ color: p.navTextActive }}>
          Home
          <span className="absolute inset-x-0 bottom-0 h-0.5" style={{ background: p.navActive }} />
        </span>
        <span className="py-1.5" style={{ color: p.navText }}>
          Appointments
        </span>
        <span className="py-1.5" style={{ color: p.navText }}>
          Prescriptions
        </span>
      </div>
      <div className="bg-[#F0F4F5] px-2.5 py-2.5">
        <div className="h-2 w-24 rounded-full bg-[#212B32]" />
        {hasTitleBar && <div className="mt-1.5 h-[3px] w-7" style={{ background: p.titleBar }} />}
        <div className="mt-2.5 flex items-center gap-2.5">
          <span
            className="rounded px-2 py-0.5 text-[0.55rem] font-bold text-white"
            style={{ background: p.button, boxShadow: `0 2px 0 ${p.buttonShadow}` }}
          >
            Request an appointment
          </span>
          <span className="text-[0.6rem] underline" style={{ color: p.link }}>
            A link
          </span>
        </div>
      </div>
      <div className="h-[3px]" style={{ background: p.footerStripe }} />
    </div>
  )
}

export function ThemePicker({
  value,
  colour,
  onChange,
}: {
  value: ThemeKey
  /** The practice's own colour, for the 'custom' scheme's preview. */
  colour: string
  onChange: (theme: ThemeKey) => void
}) {
  return (
    <fieldset className="border-0 p-0">
      <legend className="text-sm font-semibold text-zinc-900">Colour scheme</legend>
      <p className="mt-1 text-[0.8rem] leading-relaxed text-zinc-500">
        Every scheme uses NHS England&apos;s identity colours and keeps your pages white and the
        NHS logo in NHS Blue, as its guidance asks, because patients use NHS colours to tell a
        real NHS service from a private one. Only the colours change: your pages stay laid out
        the same.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {THEMES.map((theme) => {
          const selected = theme.key === value
          return (
            <label
              key={theme.key}
              className={`flex cursor-pointer flex-col gap-3 rounded-xl border p-3 transition ${
                selected ? 'border-zinc-900 ring-2 ring-zinc-900/10' : 'border-zinc-200 hover:border-zinc-400'
              }`}
            >
              <Preview theme={theme.key} colour={colour} blue={theme.header === 'blue'} />
              <span className="flex items-start gap-2.5">
                <input
                  type="radio"
                  name="colour-scheme"
                  value={theme.key}
                  checked={selected}
                  onChange={() => onChange(theme.key)}
                  className="mt-1 h-4 w-4 shrink-0 accent-zinc-900"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-zinc-900">
                    {theme.label}
                    {theme.key === 'nhs' && <span className="ml-1.5 font-normal text-zinc-500">(recommended)</span>}
                  </span>
                  <span className="mt-0.5 block text-[0.8rem] leading-relaxed text-zinc-500">
                    {theme.description}
                  </span>
                </span>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
