'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import { NhsLogo } from './NhsLogo'
import { isActive, MAIN_NAV } from '@/lib/navigation'

interface HeaderProps {
  practiceName: string
  logoUrl: string
  logoAlt: string
  phone: string
  /** The online request tool, or empty to leave the button out. */
  requestUrl: string
  showSearch: boolean
  showNhsLogo: boolean
  /** Practice URL prefix, or the empty string in single tenant mode. */
  base: string
  /**
   * True when the colour scheme makes the header solid NHS Blue. The NHS
   * logo is then reversed out in white, which the identity guidelines allow
   * only on 100% NHS Blue.
   */
  blueHeader?: boolean
}

export function Header({
  practiceName,
  logoUrl,
  logoAlt,
  phone,
  requestUrl,
  showSearch,
  showNhsLogo,
  base,
  blueHeader = false,
}: HeaderProps) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Close the menu on navigation, so a tap on a link does not leave the panel
  // covering the page the patient just asked for.
  useEffect(() => {
    setMenuOpen(false)
    setSearchOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  return (
    <header className="ss-header">
      {/* A thin stripe in the schemes that have one, such as the rainbow. */}
      <div className="ss-header-stripe" aria-hidden="true" />
      {/*
       * When enabled, the NHS logo sits in the top strip beside the practice
       * name. Patients use it to confirm they are on a real NHS service rather
       * than a private clinic or a copycat site. Practices can turn it off in
       * Advanced settings, because the mark is a trademark and displaying it is
       * their call to make.
       */}
      <div className="ss-container">
        <div className="flex items-center justify-between gap-4 py-4">
          <Link
            href={base || '/'}
            className="flex min-w-0 items-center gap-3 no-underline sm:gap-4"
            aria-label={`${practiceName}, home page`}
          >
            {showNhsLogo && (
              <>
                <NhsLogo height={26} title="NHS" variant={blueHeader ? 'reverse' : 'default'} />
                <span className="ss-header-divider h-8 w-px shrink-0" aria-hidden="true" />
              </>
            )}
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={logoAlt || practiceName}
                // A practice's logo is usually dark artwork on a transparent
                // background, and would disappear on a blue header, so it
                // sits on a white plate there.
                className={`h-9 w-auto max-w-[13rem] object-contain sm:h-10 ${
                  blueHeader ? 'rounded bg-white px-2 py-1' : ''
                }`}
              />
            ) : (
              <span className="ss-header-text truncate text-base font-bold leading-tight sm:text-lg">
                {practiceName}
              </span>
            )}
          </Link>

          <div className="flex items-center gap-2">
            {phone && (
              <a
                href={`tel:${phone.replace(/\s+/g, '')}`}
                className="ss-header-link hidden items-center gap-2 radius-card px-3 py-2 text-sm font-bold no-underline sm:inline-flex"
              >
                <Icon name="phone" size={18} className="ss-header-icon" />
                {phone}
              </a>
            )}

            {/*
             * The online route, beside the phone number rather than a click
             * away on the appointments page: a patient looking for how to get
             * in touch sees both together. Worded as NHS England recommends,
             * for what it does rather than what the supplier calls it. Below
             * the large breakpoint it is the first thing in the menu instead,
             * as the phone number is on a phone.
             */}
            {requestUrl && (
              <a
                href={requestUrl}
                className="ss-header-cta hidden min-h-11 items-center gap-2 radius-card px-3 py-2 text-sm font-bold no-underline lg:inline-flex"
              >
                <Icon name="message" size={18} />
                Contact us online
              </a>
            )}

            {showSearch && (
              <button
                type="button"
                onClick={() => setSearchOpen((v) => !v)}
                aria-expanded={searchOpen}
                aria-controls="site-search"
                className="ss-header-control inline-flex min-h-11 items-center gap-2 radius-card px-3 py-2 text-sm font-bold"
              >
                <Icon name="search" size={18} />
                {/* NHS guidance: the word "search" must be visible, not just an icon. */}
                <span>Search</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-controls="main-menu"
              className="ss-header-control inline-flex min-h-11 items-center gap-2 radius-card px-3 py-2 text-sm font-bold lg:hidden"
            >
              {/* Text label, not a hamburger icon, as NHS research recommends. */}
              <span>{menuOpen ? 'Close' : 'Menu'}</span>
            </button>
          </div>
        </div>
      </div>

      {showSearch && searchOpen && (
        <div className="border-t border-nhs-grey-4 bg-nhs-grey-5 text-nhs-black">
          <div className="ss-container py-4">
            <form action={`${base}/search`} method="get" role="search" id="site-search">
              <label htmlFor="q" className="mb-2 block text-sm font-bold">
                Search this website
              </label>
              <div className="flex gap-2">
                <input
                  id="q"
                  name="q"
                  type="search"
                  autoFocus
                  placeholder="For example, repeat prescriptions"
                  className="min-h-12 w-full radius-card border-2 border-nhs-black bg-white px-4 text-base"
                />
                <button
                  type="submit"
                  className="ss-button min-h-12 shrink-0 radius-card px-5 font-bold"
                >
                  Search
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <nav
        id="main-menu"
        aria-label="Main menu"
        ref={panelRef}
        className={`ss-nav lg:block ${menuOpen ? 'block' : 'hidden'}`}
      >
        <div className="ss-container">
          <ul className="flex flex-col lg:flex-row lg:gap-1">
            {requestUrl && (
              <li className="ss-nav-item py-3 lg:hidden">
                <a
                  href={requestUrl}
                  className="ss-header-cta flex min-h-12 items-center justify-center gap-2 radius-card px-4 py-3 text-base font-bold no-underline"
                >
                  <Icon name="message" size={18} />
                  Contact us online
                </a>
              </li>
            )}
            {MAIN_NAV.map((item) => {
              const active = isActive(pathname, base, item)
              return (
                <li key={item.path} className="ss-nav-item">
                  <Link
                    href={item.path === '/' ? base || '/' : `${base}${item.path}`}
                    aria-current={active ? 'page' : undefined}
                    className="ss-nav-link flex min-h-12 items-center px-1 py-3 text-base font-semibold no-underline lg:px-4"
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
            {phone && (
              <li className="ss-nav-item sm:hidden">
                <a
                  href={`tel:${phone.replace(/\s+/g, '')}`}
                  className="ss-header-text flex min-h-12 items-center gap-2 px-1 py-3 text-base font-semibold no-underline"
                >
                  <Icon name="phone" size={18} className="ss-header-icon" />
                  Call {phone}
                </a>
              </li>
            )}
          </ul>
        </div>
      </nav>
    </header>
  )
}
