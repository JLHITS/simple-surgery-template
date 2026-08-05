import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AdminEditor } from '@/components/admin/AdminEditor'
import { LoginForm } from '@/components/admin/LoginForm'
import { isAdminConfigured, isAuthenticated } from '@/lib/auth'
import { getSiteConfig } from '@/lib/config'
import { siteBase } from '@/lib/routing'
import { describeDriver } from '@/lib/storage'
import { getTenant, singleTenantSlug } from '@/lib/tenant'

export const metadata: Metadata = {
  title: 'Website settings',
  robots: { index: false, follow: false },
}

// Always rendered fresh: this page depends on the session cookie, and stale
// admin content would be both confusing and a small security smell.
export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ site: string }>
}

export default async function AdminPage({ params }: Props) {
  const { site } = await params
  const single = singleTenantSlug()
  const tenant = single ? null : await getTenant(site)

  // A practice code nobody has bought is not an invitation to guess passwords.
  if (!single && !tenant) notFound()

  const config = await getSiteConfig(site)
  const base = siteBase(site)

  if (!(await isAuthenticated(site))) {
    return (
      <LoginForm
        site={site}
        practiceName={tenant?.practiceName || config.practice.name}
        configured={await isAdminConfigured(site)}
        showNhsLogo={config.advanced.showNhsLogo}
      />
    )
  }

  const storage = await describeDriver()

  return (
    <AdminEditor
      site={site}
      initialConfig={config}
      storage={storage}
      siteUrl={config.advanced.siteUrl || base || '/'}
      billing={
        tenant
          ? {
              status: tenant.status,
              email: tenant.email,
              customDomain: tenant.customDomain,
              mustChangePassword: tenant.mustChangePassword,
            }
          : null
      }
    />
  )
}
