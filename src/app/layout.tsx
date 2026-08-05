import type { Metadata, Viewport } from 'next'
import './globals.css'

/**
 * Root layout.
 *
 * Holds no practice content, because at this level there is no practice: one
 * deployment serves many, and which one is only known once the URL has been
 * matched. Everything practice-specific lives in `[site]/layout.tsx`.
 */
export const metadata: Metadata = {
  title: 'NHS GP surgery',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
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
