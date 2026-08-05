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
  showSearch: boolean
  showNhsLogo: boolean
  /** Practice URL prefix, or the empty string in single tenant mode. */
  base: string
}

export function Header({
  practiceName,
  logoUrl,
  logoAlt,
  phone,
  showSearch,
  showNhsLogo,
  base,
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
    <header className="border-b border-nhs-grey-4 bg-white">
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
                <NhsLogo height={26} title="NHS" />
                <span className="h-8 w-px shrink-0 bg-nhs-grey-4" aria-hidden="true" />
              </>
            )}
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={logoAlt || practiceName}
                className="h-9 w-auto max-w-[13rem] object-contain sm:h-10"
              />
            ) : (
              <span className="truncate text-base font-bold leading-tight text-nhs-black sm:text-lg">
                {practiceName}
              </span>
            )}
          </Link>

          <div className="flex items-center gap-2">
            {phone && (
              <a
                href={`tel:${phone.replace(/\s+/g, '')}`}
                className="hidden items-center gap-2 radius-card px-3 py-2 text-sm font-bold text-nhs-black no-underline hover:bg-nhs-grey-5 sm:inline-flex"
              >
                <Icon name="phone" size={18} className="accent-text" />
                {phone}
              </a>
            )}

            {showSearch && (
              <button
                type="button"
                onClick={() => setSearchOpen((v) => !v)}
                aria-expanded={searchOpen}
                aria-controls="site-search"
                className="inline-flex min-h-11 items-center gap-2 radius-card border border-nhs-grey-4 px-3 py-2 text-sm font-bold text-nhs-black hover:bg-nhs-grey-5"
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
              className="inline-flex min-h-11 items-center gap-2 radius-card border border-nhs-grey-4 px-3 py-2 text-sm font-bold text-nhs-black hover:bg-nhs-grey-5 lg:hidden"
            >
              {/* Text label, not a hamburger icon, as NHS research recommends. */}
              <span>{menuOpen ? 'Close' : 'Menu'}</span>
            </button>
          </div>
        </div>
      </div>

      {showSearch && searchOpen && (
        <div className="border-t border-nhs-grey-4 bg-nhs-grey-5">
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
                  className="min-h-12 shrink-0 radius-card accent-bg px-5 font-bold text-white"
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
        className={`border-t border-nhs-grey-4 lg:block ${menuOpen ? 'block' : 'hidden'}`}
      >
        <div className="ss-container">
          <ul className="flex flex-col lg:flex-row lg:gap-1">
            {MAIN_NAV.map((item) => {
              const active = isActive(pathname, base, item)
              return (
                <li key={item.path} className="border-b border-nhs-grey-4 lg:border-b-0">
                  <Link
                    href={item.path === '/' ? base || '/' : `${base}${item.path}`}
                    aria-current={active ? 'page' : undefined}
                    className={`flex min-h-12 items-center px-1 py-3 text-base font-semibold no-underline lg:px-4 ${
                      active
                        ? 'text-nhs-black lg:border-b-4 lg:border-b-[color:var(--accent)]'
                        : 'text-nhs-grey-1 hover:text-nhs-black lg:border-b-4 lg:border-b-transparent lg:hover:border-b-nhs-grey-4'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
            {phone && (
              <li className="border-b border-nhs-grey-4 sm:hidden">
                <a
                  href={`tel:${phone.replace(/\s+/g, '')}`}
                  className="flex min-h-12 items-center gap-2 px-1 py-3 text-base font-semibold text-nhs-black no-underline"
                >
                  <Icon name="phone" size={18} className="accent-text" />
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
