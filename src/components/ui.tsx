import Link from 'next/link'
import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

/* ------------------------------------------------------------------ layout */

export function Section({
  children,
  className = '',
  tint = false,
  id,
}: {
  children: ReactNode
  className?: string
  tint?: boolean
  id?: string
}) {
  return (
    <section
      id={id}
      className={`${tint ? 'bg-nhs-grey-5' : ''} py-12 sm:py-16 ${className}`}
    >
      <div className="ss-container">{children}</div>
    </section>
  )
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h2>{title}</h2>
        {description && <p className="mt-2 text-nhs-grey-1">{description}</p>}
      </div>
      {action}
    </div>
  )
}

/* ------------------------------------------------------------------ buttons */

type ButtonVariant = 'primary' | 'secondary' | 'quiet'

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 radius-card px-5 py-3 text-base font-bold no-underline transition-colors duration-150 min-h-11'

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'accent-bg text-white hover:brightness-90',
  secondary:
    'bg-white text-nhs-black border-2 border-nhs-grey-4 hover:border-nhs-black hover:bg-nhs-grey-5',
  quiet: 'bg-transparent accent-text underline underline-offset-4 px-0 py-1 hover:brightness-75',
}

export function ButtonLink({
  href,
  children,
  variant = 'primary',
  external,
  className = '',
  icon,
}: {
  href: string
  children: ReactNode
  variant?: ButtonVariant
  external?: boolean
  className?: string
  icon?: IconName
}) {
  const isExternal = external ?? /^https?:\/\//.test(href)
  const classes = `${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${className}`

  const inner = (
    <>
      {icon && <Icon name={icon} size={20} />}
      <span>{children}</span>
      {isExternal && (
        <>
          <Icon name="external" size={16} className="opacity-70" />
          
        </>
      )}
    </>
  )

  if (isExternal) {
    return (
      <a href={href} className={classes}>
        {inner}
      </a>
    )
  }

  return (
    <Link href={href} className={classes}>
      {inner}
    </Link>
  )
}

/* -------------------------------------------------------------------- cards */

/**
 * The main way patients get anywhere on this site.
 *
 * NHS research found 80% of patients start their task on the home page, so the
 * top of every important page is a grid of these rather than paragraphs of
 * prose. Whole card is clickable, with a real link inside for screen readers.
 */
export function ActionCard({
  href,
  title,
  description,
  icon,
  external,
}: {
  href: string
  title: string
  description?: string
  icon?: IconName | string
  external?: boolean
}) {
  const isExternal = external ?? /^https?:\/\//.test(href)

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        {icon && (
          <span className="accent-text shrink-0" aria-hidden="true">
            <Icon name={icon} size={26} />
          </span>
        )}
        <span className="ml-auto text-nhs-grey-3 transition-transform duration-150 group-hover:translate-x-1 group-hover:text-nhs-black">
          <Icon name={isExternal ? 'external' : 'arrow-right'} size={20} />
        </span>
      </div>
      <span className="mt-4 block text-lg font-bold text-nhs-black">
        {title}
        
      </span>
      {description && (
        <span className="mt-1.5 block text-[0.95rem] leading-relaxed text-nhs-grey-1">
          {description}
        </span>
      )}
    </>
  )

  const classes =
    'group flex h-full flex-col radius-card border border-nhs-grey-4 bg-white p-5 no-underline transition-all duration-150 hover:border-nhs-black hover:shadow-[0_2px_0_0_var(--color-nhs-black)] focus-visible:shadow-none sm:p-6'

  if (isExternal) {
    return (
      <a href={href} className={classes}>
        {content}
      </a>
    )
  }

  return (
    <Link href={href} className={classes}>
      {content}
    </Link>
  )
}

export function CardGrid({
  children,
  columns = 3,
}: {
  children: ReactNode
  columns?: 2 | 3 | 4
}) {
  const cols = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
  }[columns]

  return <div className={`grid grid-cols-1 gap-3 sm:gap-4 ${cols}`}>{children}</div>
}

/* ----------------------------------------------------------------- callouts */

type CalloutTone = 'info' | 'warning' | 'urgent' | 'success'

const CALLOUT_TONES: Record<CalloutTone, { bar: string; icon: IconName; label: string }> = {
  info: { bar: 'border-nhs-blue', icon: 'info', label: 'Information' },
  warning: { bar: 'border-nhs-yellow', icon: 'alert', label: 'Important' },
  urgent: { bar: 'border-nhs-red', icon: 'alert', label: 'Urgent' },
  success: { bar: 'border-nhs-green', icon: 'check', label: 'Good to know' },
}

/**
 * Used instead of pop-ups and overlays, which NHS England explicitly advises
 * against: 27% of tested patients could not get past an overlay they met on
 * arrival, and the information vanishes once dismissed.
 */
export function Callout({
  tone = 'info',
  title,
  children,
}: {
  tone?: CalloutTone
  title?: string
  children: ReactNode
}) {
  const config = CALLOUT_TONES[tone]

  return (
    <div className={`border-l-8 ${config.bar} bg-nhs-grey-5 p-4 sm:p-5`} role="note">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-nhs-grey-1" aria-hidden="true">
          <Icon name={config.icon} size={22} />
        </span>
        <div className="min-w-0">
          {title && <p className="text-lg font-bold text-nhs-black">{title}</p>}
          <div className={`text-[0.98rem] leading-relaxed ${title ? 'mt-1' : ''}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- page header */

export function PageHeader({
  title,
  intro,
  breadcrumbs,
}: {
  title: string
  intro?: string
  breadcrumbs?: { label: string; href: string }[]
}) {
  return (
    <div className="border-b border-nhs-grey-4 bg-nhs-grey-5">
      <div className="ss-container py-8 sm:py-12">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-nhs-grey-1">
              {breadcrumbs.map((crumb) => (
                <li key={crumb.href} className="flex items-center gap-2">
                  <Link href={crumb.href} className="ss-link">
                    {crumb.label}
                  </Link>
                  <Icon name="chevron" size={14} className="text-nhs-grey-3" />
                </li>
              ))}
            </ol>
          </nav>
        )}
        <h1>{title}</h1>
        {intro && <p className="mt-3 max-w-2xl text-lg text-nhs-grey-1">{intro}</p>}
      </div>
    </div>
  )
}
