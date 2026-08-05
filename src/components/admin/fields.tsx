'use client'

import { useId, useRef, useState, type ReactNode } from 'react'

/**
 * Form primitives for the admin panel.
 *
 * Every field has a visible label and an optional hint. There are no
 * placeholder-only fields, because placeholders vanish the moment someone types
 * and a practice manager coming back in six months needs to know what the box
 * was for.
 */

const INPUT =
  'w-full min-h-11 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-[0.95rem] text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10'

export function Field({
  label,
  hint,
  children,
  required,
}: {
  label: string
  hint?: string
  children: (id: string) => ReactNode
  required?: boolean
}) {
  const id = useId()

  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-zinc-900">
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </label>
      {hint && <p className="text-[0.8rem] leading-relaxed text-zinc-500">{hint}</p>}
      {children(id)}
    </div>
  )
}

export function TextInput({
  label,
  hint,
  value,
  onChange,
  type = 'text',
  required,
  placeholder,
}: {
  label: string
  hint?: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'email' | 'tel' | 'url' | 'date' | 'time' | 'number'
  required?: boolean
  placeholder?: string
}) {
  return (
    <Field label={label} hint={hint} required={required}>
      {(id) => (
        <input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={INPUT}
        />
      )}
    </Field>
  )
}

export function TextArea({
  label,
  hint,
  value,
  onChange,
  rows = 4,
}: {
  label: string
  hint?: string
  value: string
  onChange: (value: string) => void
  rows?: number
}) {
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <textarea
          id={id}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${INPUT} resize-y leading-relaxed`}
        />
      )}
    </Field>
  )
}

/**
 * The body text editor.
 *
 * A plain textarea with a short cheat sheet underneath rather than a rich text
 * toolbar. Rich text editors are where practice websites go wrong: staff paste
 * from Word, the markup comes with it, and the page ends up with three fonts
 * and a broken heading structure that fails accessibility. Six rules of
 * Markdown produce clean, consistent, accessible output every time.
 */
export function MarkdownArea({
  label,
  hint,
  value,
  onChange,
  rows = 14,
}: {
  label: string
  hint?: string
  value: string
  onChange: (value: string) => void
  rows?: number
}) {
  return (
    <div className="grid gap-1.5">
      <TextArea label={label} hint={hint} value={value} onChange={onChange} rows={rows} />
      <details className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
        <summary className="cursor-pointer text-[0.8rem] font-semibold text-zinc-700">
          How to format this text
        </summary>
        <dl className="mt-2 grid gap-1 text-[0.8rem] text-zinc-600">
          <div className="flex gap-3">
            <dt className="w-40 shrink-0 font-mono text-zinc-900">## Heading</dt>
            <dd>A section heading</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-40 shrink-0 font-mono text-zinc-900">### Smaller heading</dt>
            <dd>A sub heading</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-40 shrink-0 font-mono text-zinc-900">- Item</dt>
            <dd>A bullet point</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-40 shrink-0 font-mono text-zinc-900">1. Item</dt>
            <dd>A numbered step</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-40 shrink-0 font-mono text-zinc-900">**bold**</dt>
            <dd>Bold text</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-40 shrink-0 font-mono text-zinc-900">[label](https://...)</dt>
            <dd>A link</dd>
          </div>
        </dl>
        <p className="mt-2 text-[0.8rem] text-zinc-500">
          Leave a blank line between paragraphs. Keep sentences under 20 words and paragraphs
          under 3 sentences, which is what NHS England asks for.
        </p>
      </details>
    </div>
  )
}

export function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  const id = useId()

  return (
    <div className="flex items-start gap-3 rounded-lg border border-zinc-200 p-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 accent-zinc-900"
      />
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-semibold text-zinc-900">
          {label}
        </label>
        {hint && <p className="mt-0.5 text-[0.8rem] leading-relaxed text-zinc-500">{hint}</p>}
      </div>
    </div>
  )
}

export function Select<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string
  hint?: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className={INPUT}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  )
}

export function ColourInput({
  label,
  hint,
  value,
  onChange,
}: {
  label: string
  hint?: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <div className="flex gap-2">
          <input
            id={id}
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#005EB8'}
            onChange={(e) => onChange(e.target.value)}
            className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-zinc-300 bg-white p-1"
          />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`${INPUT} font-mono`}
          />
        </div>
      )}
    </Field>
  )
}

/* ------------------------------------------------------------------ layout */

export function Fieldset({
  legend,
  description,
  children,
  columns = 1,
}: {
  legend: string
  description?: string
  children: ReactNode
  columns?: 1 | 2
}) {
  return (
    <fieldset className="border-0 p-0">
      <legend className="mb-1 text-base font-bold text-zinc-900">{legend}</legend>
      {description && <p className="mb-4 text-[0.85rem] text-zinc-500">{description}</p>}
      <div className={`grid gap-4 ${columns === 2 ? 'sm:grid-cols-2' : ''}`}>{children}</div>
    </fieldset>
  )
}

export function Divider() {
  return <hr className="my-8 border-0 border-t border-zinc-200" />
}

/**
 * Tabbed panels.
 *
 * Used where a section holds several long text areas that are edited one at a
 * time. Scrolling past a thousand words of appointments copy to reach the
 * prescriptions box is the kind of small friction that makes staff avoid the
 * admin panel, which is the whole problem this product exists to solve.
 *
 * Implements the ARIA tabs pattern: arrow keys move between tabs, Home and End
 * jump to the ends, and only the selected tab is in the tab order.
 */
export interface TabDef {
  key: string
  label: string
  content: ReactNode
}

export function Tabs({ tabs, ariaLabel }: { tabs: TabDef[]; ariaLabel: string }) {
  const [active, setActive] = useState(tabs[0]?.key)
  const baseId = useId()
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})

  const index = tabs.findIndex((t) => t.key === active)

  function focusTab(next: number) {
    const clamped = (next + tabs.length) % tabs.length
    const key = tabs[clamped].key
    setActive(key)
    refs.current[key]?.focus()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      focusTab(index + 1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      focusTab(index - 1)
    } else if (e.key === 'Home') {
      e.preventDefault()
      focusTab(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      focusTab(tabs.length - 1)
    }
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label={ariaLabel}
        onKeyDown={onKeyDown}
        className="-mx-1 flex gap-1 overflow-x-auto border-b border-zinc-200 px-1"
      >
        {tabs.map((tab) => {
          const selected = tab.key === active
          return (
            <button
              key={tab.key}
              ref={(el) => {
                refs.current[tab.key] = el
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.key}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.key)}
              className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-[0.9rem] font-semibold transition ${
                selected
                  ? 'border-zinc-900 text-zinc-900'
                  : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.key}
          role="tabpanel"
          id={`${baseId}-panel-${tab.key}`}
          aria-labelledby={`${baseId}-tab-${tab.key}`}
          hidden={tab.key !== active}
          tabIndex={0}
          className="pt-7 focus-visible:outline-none"
        >
          {tab.key === active && tab.content}
        </div>
      ))}
    </div>
  )
}

export function SmallButton({
  children,
  onClick,
  tone = 'neutral',
  type = 'button',
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  tone?: 'neutral' | 'danger' | 'primary'
  type?: 'button' | 'submit'
  disabled?: boolean
}) {
  const tones = {
    neutral: 'border-zinc-300 text-zinc-800 hover:bg-zinc-100',
    danger: 'border-red-200 text-red-700 hover:bg-red-50',
    primary: 'border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[0.85rem] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]}`}
    >
      {children}
    </button>
  )
}

/**
 * A repeating list of items with add, delete and reorder.
 *
 * Items are collapsed to a single summary row by default so a team of twenty
 * does not fill the screen, and open one at a time.
 */
export function ListEditor<T extends { id: string }>({
  items,
  onChange,
  renderSummary,
  renderFields,
  addLabel,
  createItem,
  emptyText,
  canDelete,
}: {
  items: T[]
  onChange: (items: T[]) => void
  renderSummary: (item: T) => ReactNode
  renderFields: (item: T, update: (patch: Partial<T>) => void) => ReactNode
  addLabel: string
  createItem: () => T
  emptyText?: string
  canDelete?: (item: T) => boolean
}) {
  const update = (index: number, patch: Partial<T>) => {
    const next = [...items]
    next[index] = { ...next[index], ...patch }
    onChange(next)
  }

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  const remove = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <div className="grid gap-3">
      {items.length === 0 && emptyText && (
        <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
          {emptyText}
        </p>
      )}

      {items.map((item, index) => {
        const deletable = canDelete ? canDelete(item) : true

        return (
          <details
            key={item.id}
            className="group rounded-xl border border-zinc-200 bg-white open:border-zinc-400 open:shadow-sm"
          >
            <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
              <span className="min-w-0 flex-1 text-sm font-semibold text-zinc-900">
                {renderSummary(item)}
              </span>
              <span className="text-[0.75rem] font-semibold uppercase tracking-wide text-zinc-400 group-open:hidden">
                Edit
              </span>
              <span className="hidden text-[0.75rem] font-semibold uppercase tracking-wide text-zinc-400 group-open:inline">
                Close
              </span>
            </summary>

            <div className="border-t border-zinc-200 p-4">
              <div className="grid gap-4">{renderFields(item, (patch) => update(index, patch))}</div>

              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-4">
                <SmallButton onClick={() => move(index, -1)} disabled={index === 0}>
                  Move up
                </SmallButton>
                <SmallButton
                  onClick={() => move(index, 1)}
                  disabled={index === items.length - 1}
                >
                  Move down
                </SmallButton>
                <span className="ml-auto">
                  {deletable ? (
                    <SmallButton tone="danger" onClick={() => remove(index)}>
                      Delete
                    </SmallButton>
                  ) : (
                    <span className="text-[0.8rem] text-zinc-500">
                      Required by the NHS contract, cannot be deleted
                    </span>
                  )}
                </span>
              </div>
            </div>
          </details>
        )
      })}

      <div>
        <SmallButton tone="primary" onClick={() => onChange([...items, createItem()])}>
          {addLabel}
        </SmallButton>
      </div>
    </div>
  )
}
