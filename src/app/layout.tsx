import type { Metadata, Viewport } from 'next'
import './globals.css'

/**
 * Root layout.
 *
 * Holds no practice content, because at this level there is no practice: one
 * deployment serves many, and which one is only known once the URL has been
 * matched. Everything practice-specific lives in `[site]/layout.tsx`.
 */
/**
 * Practice sites wear the NHS logo in the browser tab, not ours.
 *
 * A patient with a dozen tabs open is scanning for the NHS mark, and these are
 * the official letterforms from nhsuk-frontend, so it is the same icon they see
 * on nhs.uk. Putting a Simple Surgery logo there would be confusing for them
 * and free advertising at the practice's expense.
 *
 * The SVG is listed first: browsers that support it get a mark that stays sharp
 * at any size and on any display, and the .ico is the fallback for those that
 * do not.
 */
export const metadata: Metadata = {
  title: 'NHS GP surgery',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#005EB8',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  )
}
