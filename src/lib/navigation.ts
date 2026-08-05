/**
 * The main menu.
 *
 * Six items, no sub menus. NHS England's guidance is unambiguous on this:
 * "Main menus should not have more than seven items" and "Main menus should not
 * have sub menus." Everything else is reached from a page, not the nav.
 *
 * News deliberately sits outside the main menu. NHS guidance is to put news in
 * the pages it relates to, not to give it top level real estate that patients
 * looking for an appointment have to read past.
 */
export interface NavItem {
  /** Root-relative, without the practice prefix. */
  path: string
  label: string
}

export const MAIN_NAV: NavItem[] = [
  { path: '/', label: 'Home' },
  { path: '/appointments', label: 'Appointments' },
  { path: '/prescriptions', label: 'Prescriptions' },
  { path: '/services', label: 'Services' },
  { path: '/about', label: 'About the surgery' },
  { path: '/contact', label: 'Contact us' },
]

/**
 * Whether a nav item is the current page.
 * `base` is the practice prefix, or the empty string in single tenant mode.
 */
export function isActive(pathname: string, base: string, item: NavItem): boolean {
  const target = item.path === '/' ? base || '/' : `${base}${item.path}`
  if (item.path === '/') return pathname === target || pathname === `${target}/`
  return pathname === target || pathname.startsWith(`${target}/`)
}
