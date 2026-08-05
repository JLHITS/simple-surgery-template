import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Suspended } from '@/components/Suspended'
import { siteBase } from '@/lib/routing'
import { getTenant, isServing, singleTenantSlug } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Website temporarily unavailable',
  // Never index a holding page. If a practice lapses briefly, we do not want
  // "temporarily unavailable" to be what patients find in search afterwards.
  robots: { index: false, follow: false },
}

interface Props {
  params: Promise<{ site: string }>
}

/**
 * The holding page for a lapsed subscription.
 *
 * Lives outside the (site) route group so none of the practice's own pages are
 * rendered or serialised while it is showing.
 */
export default async function UnavailablePage({ params }: Props) {
  const { site } = await params

  if (singleTenantSlug()) notFound()

  const tenant = await getTenant(site)
  if (!tenant) notFound()

  // Send them back if the subscription has been sorted out in the meantime.
  if (isServing(tenant)) redirect(siteBase(site) || '/')

  return <Suspended practiceName={tenant.practiceName} />
}
