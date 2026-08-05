import type { SVGProps } from 'react'

/**
 * A small, fixed set of line icons.
 *
 * Kept as a closed set on purpose. Practices pick an icon from a dropdown
 * rather than pasting SVG, which means no one can break the layout or inject
 * markup, and the site keeps a consistent visual language without design input.
 */
export type IconName =
  | 'calendar'
  | 'pill'
  | 'flask'
  | 'note'
  | 'user-plus'
  | 'shield'
  | 'heart'
  | 'users'
  | 'phone'
  | 'arrow-right'
  | 'external'
  | 'clock'
  | 'pin'
  | 'search'
  | 'alert'
  | 'info'
  | 'check'
  | 'chevron'
  | 'mail'
  | 'stethoscope'

const PATHS: Record<IconName, string> = {
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
  pill: 'M10.5 20.5a6.36 6.36 0 0 1-9-9l7-7a6.36 6.36 0 0 1 9 9ZM8.5 8.5l7 7',
  flask: 'M9 2v6.5L3.8 18A2 2 0 0 0 5.6 21h12.8a2 2 0 0 0 1.8-3L15 8.5V2M8 2h8M7.5 14h9',
  note: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm0 0v6h6M9 13h6M9 17h4',
  'user-plus': 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM19 8v6M22 11h-6',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10ZM9 12l2 2 4-4',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8Z',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  phone: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2ZM11 18h2',
  'arrow-right': 'M5 12h14M13 6l6 6-6 6',
  external: 'M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v6l4 2',
  pin: 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0ZM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3',
  alert: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 16v-4M12 8h.01',
  check: 'M20 6 9 17l-5-5',
  chevron: 'm9 18 6-6-6-6',
  mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM22 7l-10 6L2 7',
  stethoscope:
    'M4 2v6a5 5 0 0 0 10 0V2M4 2h3M11 2h3M9 13v3a5 5 0 0 0 10 0v-1M19 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
}

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName | string
  size?: number
}

export function Icon({ name, size = 24, className = '', ...rest }: IconProps) {
  const path = PATHS[name as IconName] ?? PATHS['arrow-right']

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      <path d={path} />
    </svg>
  )
}

export const ICON_NAMES = Object.keys(PATHS) as IconName[]
