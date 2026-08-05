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
  href: string
  label: string
  /** Used to decide the active state for nested routes. */
  match: string
}

export const MAIN_NAV: NavItem[] = [
  { href: '/', label: 'Home', match: '/' },
  { href: '/appointments', label: 'Appointments', match: '/appointments' },
  { href: '/prescriptions', label: 'Prescriptions', match: '/prescriptions' },
  { href: '/services', label: 'Services', match: '/services' },
  { href: '/about', label: 'About the surgery', match: '/about' },
  { href: '/contact', label: 'Contact us', match: '/contact' },
]

export function isActive(pathname: string, item: NavItem): boolean {
  if (item.match === '/') return pathname === '/'
  return pathname === item.match || pathname.startsWith(`${item.match}/`)
}
