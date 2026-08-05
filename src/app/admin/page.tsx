import type { Metadata } from 'next'
import { AdminEditor } from '@/components/admin/AdminEditor'
import { LoginForm } from '@/components/admin/LoginForm'
import { isAdminConfigured, isAuthenticated } from '@/lib/auth'
import { getSiteConfig } from '@/lib/config'
import { describeDriver } from '@/lib/storage'

export const metadata: Metadata = {
  title: 'Website settings',
  robots: { index: false, follow: false },
}

// Always rendered fresh: this page depends on the session cookie, and stale
// admin content would be both confusing and a small security smell.
export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const config = await getSiteConfig()

  if (!(await isAuthenticated())) {
    return (
      <LoginForm
        practiceName={config.practice.name}
        configured={isAdminConfigured()}
        showNhsLogo={config.advanced.showNhsLogo}
      />
    )
  }

  const storage = await describeDriver()

  return (
    <AdminEditor
      initialConfig={config}
      storage={storage}
      siteUrl={config.advanced.siteUrl || '/'}
    />
  )
}
