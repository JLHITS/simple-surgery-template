import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AdminEditor } from '@/components/admin/AdminEditor'
import { getSiteConfig } from '@/lib/config'
import { isDemoAdminFor } from '@/lib/demo'
import { siteBase } from '@/lib/routing'
import { describeDriver } from '@/lib/storage'

export const metadata: Metadata = {
  title: 'Try the editor',
  description:
    'The Simple Surgery editor, open to anyone, on the demo practice. Change whatever you like. Nothing is saved.',
  // Useful to a practice manager, useless in a search result, and it would be
  // competing with the demo practice's own pages for the same domain.
  robots: { index: false, follow: false },
}

// The demo shows the demo practice's live content, so it must not be captured
// at build time and served stale months later.
export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ site: string }>
}

/**
 * The admin panel with no password and no save.
 *
 * The point it is making is a commercial one. A practice manager comparing us
 * with their current supplier has usually been told their website is easy to
 * edit, and has usually found otherwise. Screenshots do not settle that. Ten
 * seconds inside the actual editor does.
 *
 * So this is the same `AdminEditor` a paying practice gets, with the same
 * sections and the same fields, reading the same content the demo website is
 * serving. `demo` changes exactly two things: nothing is written, and Save says
 * so.
 */
export default async function AdminDemoPage({ params }: Props) {
  const { site } = await params

  // Off unless this deployment turned it on, for this practice. See lib/demo.
  if (!isDemoAdminFor(site)) notFound()

  const config = await getSiteConfig(site)
  const base = siteBase(site)

  return (
    <AdminEditor
      demo
      site={site}
      initialConfig={config}
      storage={await describeDriver()}
      siteUrl={config.advanced.siteUrl || base || '/'}
      billing={null}
    />
  )
}
