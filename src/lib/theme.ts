import type { SiteConfig, ThemeKey } from '@/lib/config/types'

/**
 * Colour schemes.
 *
 * Every scheme is built from NHS England's identity colour palette
 * (england.nhs.uk/nhsidentity/identity-guidelines/colours), and follows its
 * rules where a website can:
 *
 *   - NHS Blue and white stay the dominant colours. Every scheme keeps a white
 *     page, and the NHS logo in NHS Blue.
 *   - Highlight colours (the pinks, purple, reds, oranges and yellows) are used
 *     "minimally", never as "large blocks": thin stripes, underlines, buttons
 *     and links, not backgrounds.
 *   - The NHS logo is only ever reversed out of 100% solid NHS Blue, which is
 *     why the blue header is exactly #005EB8 and cannot take a custom colour.
 *   - Type is always in a solid colour, and every pairing of text and
 *     background here passes WCAG AA.
 *
 * The schemes change colour only. Layout, type and spacing are the same in
 * all of them.
 */

/** NHS England identity palette, plus the NHS.UK service manual's tones. */
export const NHS_COLOURS = {
  blue: '#005EB8',
  darkBlue: '#003087',
  brightBlue: '#0072CE',
  black: '#212B32',
  grey1: '#4C6272',
  grey4: '#D8DDE0',
  grey5: '#F0F4F5',
  paleGrey: '#E8EDEE',
  white: '#FFFFFF',
  green: '#009639',
  purple: '#330072',
  darkPink: '#7C2855',
  pink: '#AE2573',
  red: '#DA291C',
  orange: '#ED8B00',
  warmYellow: '#FFB81C',
  /**
   * NHS.UK's button green. The identity palette's NHS Green (#009639) is
   * 3.9 to 1 against white text, below AA, so NHS.UK uses this darker green
   * for its buttons, and so does the Nightingale WordPress theme.
   */
  buttonGreen: '#007F3B',
  buttonGreenHover: '#00662F',
  buttonGreenShadow: '#00401E',
} as const

const C = NHS_COLOURS

/**
 * A rainbow made only of palette colours, as hard stripes rather than a
 * blend, so each colour stays a true NHS colour.
 */
export const NHS_RAINBOW = `linear-gradient(90deg, ${C.red} 0 16.67%, ${C.orange} 16.67% 33.33%, ${C.warmYellow} 33.33% 50%, ${C.green} 50% 66.67%, ${C.brightBlue} 66.67% 83.33%, ${C.purple} 83.33% 100%)`

/** NHS Purple, Dark Pink and NHS Pink, in equal stripes. */
export const NHS_PURPLE_STRIPE = `linear-gradient(90deg, ${C.purple} 0 33.33%, ${C.darkPink} 33.33% 66.67%, ${C.pink} 66.67% 100%)`

/** Every colour a scheme sets. Each becomes a CSS custom property on the page. */
export interface Palette {
  /** Icons, chart bars, focus bars and other small details. */
  accent: string
  accentDark: string
  button: string
  buttonHover: string
  /** The NHS.UK style shadow under a button, or transparent for none. */
  buttonShadow: string
  link: string
  linkHover: string
  headerBg: string
  headerText: string
  headerIcon: string
  headerBorder: string
  headerDivider: string
  headerControlBorder: string
  headerHover: string
  headerCta: string
  headerCtaText: string
  headerCtaHover: string
  navText: string
  navTextActive: string
  navBorder: string
  /** The bar under the current page in the menu. A colour or a stripe. */
  navActive: string
  navHover: string
  /** A thin stripe along the top of the header, or none. */
  stripe: string
  stripeHeight: string
  /** The stripe along the top of the footer. */
  footerStripe: string
  /** A short bar under each page's title, or none. */
  titleBar: string
  titleBarHeight: string
}

const NHS: Palette = {
  accent: C.blue,
  accentDark: C.darkBlue,
  button: C.blue,
  buttonHover: C.darkBlue,
  buttonShadow: 'transparent',
  link: C.blue,
  linkHover: C.darkBlue,
  headerBg: C.white,
  headerText: C.black,
  headerIcon: C.blue,
  headerBorder: C.grey4,
  headerDivider: C.grey4,
  headerControlBorder: C.grey4,
  headerHover: C.grey5,
  headerCta: C.blue,
  headerCtaText: C.white,
  headerCtaHover: C.darkBlue,
  navText: C.grey1,
  navTextActive: C.black,
  navBorder: C.grey4,
  navActive: C.blue,
  navHover: C.grey4,
  stripe: 'none',
  stripeHeight: '0px',
  footerStripe: C.blue,
  titleBar: 'none',
  titleBarHeight: '0px',
}

/**
 * The look of NHS.UK and of the Nightingale WordPress theme many practices
 * have used: a solid NHS Blue header and menu with the NHS logo reversed out
 * in white, and NHS.UK's green buttons with their shadow.
 */
const NIGHTINGALE: Palette = {
  ...NHS,
  button: C.buttonGreen,
  buttonHover: C.buttonGreenHover,
  buttonShadow: C.buttonGreenShadow,
  // NHS.UK's link hover colour.
  linkHover: C.darkPink,
  headerBg: C.blue,
  headerText: C.white,
  headerIcon: C.white,
  headerBorder: C.blue,
  headerDivider: 'rgba(255, 255, 255, 0.5)',
  headerControlBorder: C.white,
  headerHover: C.darkBlue,
  headerCta: C.white,
  headerCtaText: C.blue,
  headerCtaHover: C.paleGrey,
  navText: C.white,
  navTextActive: C.white,
  navBorder: 'rgba(255, 255, 255, 0.3)',
  navActive: C.white,
  navHover: 'rgba(255, 255, 255, 0.5)',
}

/** Rainbow details: a header stripe, the menu underline, title bars, footer. */
const RAINBOW = {
  stripe: NHS_RAINBOW,
  stripeHeight: '4px',
  navActive: NHS_RAINBOW,
  footerStripe: NHS_RAINBOW,
  titleBar: NHS_RAINBOW,
  titleBarHeight: '4px',
} satisfies Partial<Palette>

/**
 * NHS Purple for buttons, links and details, with Dark Pink and NHS Pink as
 * highlights. The page stays white and the NHS logo stays NHS Blue, because
 * the guidance says highlights must not become large blocks.
 */
const PURPLE: Palette = {
  ...NHS,
  accent: C.purple,
  accentDark: C.darkPink,
  button: C.purple,
  buttonHover: C.darkPink,
  link: C.purple,
  linkHover: C.pink,
  headerIcon: C.purple,
  headerCta: C.purple,
  headerCtaHover: C.darkPink,
  navActive: C.pink,
  stripe: NHS_PURPLE_STRIPE,
  stripeHeight: '4px',
  footerStripe: NHS_PURPLE_STRIPE,
  titleBar: NHS_PURPLE_STRIPE,
  titleBarHeight: '4px',
}

export interface ThemeInfo {
  key: ThemeKey
  label: string
  description: string
  /** Whether the header is white or NHS Blue, which decides the logo variant. */
  header: 'white' | 'blue'
}

export const THEMES: ThemeInfo[] = [
  {
    key: 'nhs',
    label: 'NHS',
    description: 'A white header with NHS Blue buttons, links and details. Our default.',
    header: 'white',
  },
  {
    key: 'nhs-rainbow',
    label: 'NHS with rainbow',
    description:
      'The default, with a thin rainbow in NHS colours across the header, under page titles, under the current page in the menu and along the footer.',
    header: 'white',
  },
  {
    key: 'nightingale',
    label: 'Nightingale',
    description:
      'A solid NHS Blue header and menu with the NHS logo in white, and green buttons, like NHS.UK and the Nightingale theme for NHS WordPress sites.',
    header: 'blue',
  },
  {
    key: 'nightingale-rainbow',
    label: 'Nightingale with rainbow',
    description: 'The NHS Blue header, with the same thin rainbow details.',
    header: 'blue',
  },
  {
    key: 'nhs-purple',
    label: 'NHS purple and pink',
    description:
      'NHS Purple buttons and links, with Dark Pink and NHS Pink details. Your page stays white and the NHS logo stays blue, as NHS England asks.',
    header: 'white',
  },
  {
    key: 'custom',
    label: 'Your own colour',
    description:
      'Your colour for buttons, links and details, with a white header. NHS colours are strongly recommended.',
    header: 'white',
  },
]

export const THEME_KEYS = THEMES.map((t) => t.key)

/**
 * The scheme a practice is using.
 *
 * Sites saved before schemes existed chose between NHS Blue and their own
 * colour with `colourMode`, and still have the default scheme stored, so
 * their own colour is honoured rather than reset.
 */
export function themeOf(advanced: Pick<SiteConfig['advanced'], 'theme' | 'colourMode'>): ThemeKey {
  const theme = THEME_KEYS.includes(advanced.theme) ? advanced.theme : 'nhs'
  if (theme === 'nhs' && advanced.colourMode === 'custom') return 'custom'
  return theme
}

export function themeInfo(key: ThemeKey): ThemeInfo {
  return THEMES.find((t) => t.key === key) ?? THEMES[0]
}

/** Only ever emit a value we are certain is a colour. */
export function safeColour(value: string, fallback: string = C.blue): string {
  return /^#[0-9a-f]{6}$/i.test((value || '').trim()) ? value.trim() : fallback
}

/** A darker version of a colour, for hover states on a custom colour. */
export function shade(hex: string): string {
  const clean = safeColour(hex).replace('#', '')
  const channels = [0, 2, 4].map((i) => Math.max(0, Math.round(parseInt(clean.slice(i, i + 2), 16) * 0.72)))
  return `#${channels.map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

/** Every colour of a scheme. */
export function paletteFor(key: ThemeKey, customColour = ''): Palette {
  switch (key) {
    case 'nhs-rainbow':
      return { ...NHS, ...RAINBOW }
    case 'nightingale':
      return NIGHTINGALE
    case 'nightingale-rainbow':
      return { ...NIGHTINGALE, ...RAINBOW }
    case 'nhs-purple':
      return PURPLE
    case 'custom': {
      const colour = safeColour(customColour)
      const dark = shade(colour)
      return {
        ...NHS,
        accent: colour,
        accentDark: dark,
        button: colour,
        buttonHover: dark,
        link: colour,
        linkHover: dark,
        headerIcon: colour,
        headerCta: colour,
        headerCtaHover: dark,
        navActive: colour,
        footerStripe: colour,
      }
    }
    default:
      return NHS
  }
}

/** The scheme as CSS custom properties, for the element that wraps a site. */
export function themeStyle(palette: Palette): Record<string, string> {
  return {
    '--accent': palette.accent,
    '--accent-dark': palette.accentDark,
    '--button-bg': palette.button,
    '--button-bg-hover': palette.buttonHover,
    '--button-shadow': palette.buttonShadow,
    '--link': palette.link,
    '--link-hover': palette.linkHover,
    '--header-bg': palette.headerBg,
    '--header-text': palette.headerText,
    '--header-icon': palette.headerIcon,
    '--header-border': palette.headerBorder,
    '--header-divider': palette.headerDivider,
    '--header-control-border': palette.headerControlBorder,
    '--header-hover': palette.headerHover,
    '--header-cta-bg': palette.headerCta,
    '--header-cta-text': palette.headerCtaText,
    '--header-cta-hover': palette.headerCtaHover,
    '--nav-text': palette.navText,
    '--nav-text-active': palette.navTextActive,
    '--nav-border': palette.navBorder,
    '--nav-active': palette.navActive,
    '--nav-hover': palette.navHover,
    '--stripe': palette.stripe,
    '--stripe-height': palette.stripeHeight,
    '--footer-stripe': palette.footerStripe,
    '--title-bar': palette.titleBar,
    '--title-bar-height': palette.titleBarHeight,
  }
}
