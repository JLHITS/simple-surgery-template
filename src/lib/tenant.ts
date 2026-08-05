import { cache } from 'react'
import { domainKey, normaliseSlug, readKey, tenantKey, writeKey } from '@/lib/storage'

/**
 * A tenant is one practice we host.
 *
 * The record holds everything that is true about the practice as a customer:
 * who they are, whether they are paying, and the hash of their admin password.
 * Their website content is a separate document, so billing state and content
 * never fight over the same write.
 */
export type TenantStatus =
  /** Paid and serving normally. */
  | 'active'
  /** Payment failed. Still serving; Stripe is retrying and emailing them. */
  | 'past_due'
  /** Grace period expired or subscription cancelled. Not serving. */
  | 'suspended'

export interface Tenant {
  slug: string
  practiceName: string
  odsCode: string
  /** The person who bought it. Where billing and support email goes. */
  email: string
  status: TenantStatus
  /** scrypt hash, same format as the self-hosted ADMIN_PASSWORD_HASH. */
  passwordHash: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  /** Set once their own domain is pointed at us. Blank until then. */
  customDomain: string
  createdAt: string
  updatedAt: string
  /** True until they have signed in and changed the generated password. */
  mustChangePassword: boolean
  /** Empty until the welcome email carrying their password actually went out. */
  welcomeSentAt: string
}

/**
 * Single tenant mode.
 *
 * When SITE_KEY is set the deployment serves exactly one practice at the root
 * of the domain, which is how the demo runs and how anyone self-hosting from
 * the open source repo runs. Multi-tenant resolution is skipped entirely.
 */
export function singleTenantSlug(): string | null {
  const slug = normaliseSlug(process.env.SITE_KEY || '')
  return slug || null
}

export function isMultiTenant(): boolean {
  return singleTenantSlug() === null
}

function parseTenant(raw: string | null): Tenant | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<Tenant>
    if (!value.slug) return null
    return {
      slug: value.slug,
      practiceName: value.practiceName || '',
      odsCode: value.odsCode || '',
      email: value.email || '',
      status: (value.status as TenantStatus) || 'active',
      passwordHash: value.passwordHash || '',
      stripeCustomerId: value.stripeCustomerId || '',
      stripeSubscriptionId: value.stripeSubscriptionId || '',
      customDomain: value.customDomain || '',
      createdAt: value.createdAt || '',
      updatedAt: value.updatedAt || '',
      mustChangePassword: value.mustChangePassword ?? false,
      welcomeSentAt: value.welcomeSentAt || '',
    }
  } catch {
    return null
  }
}

/**
 * Reads a tenant record. Deduplicated per request.
 *
 * In single tenant mode there may be no record at all: a self-hosted site has
 * no billing and authenticates against ADMIN_PASSWORD instead. That is a
 * supported state, not an error, so this returns null rather than throwing.
 */
export const getTenant = cache(async (slug: string): Promise<Tenant | null> => {
  const clean = normaliseSlug(slug)
  if (!clean) return null

  try {
    return parseTenant(await readKey(tenantKey(clean)))
  } catch (err) {
    console.error(`[simple-surgery] failed to read tenant ${clean}:`, err)
    return null
  }
})

export async function saveTenant(tenant: Tenant): Promise<void> {
  const next: Tenant = { ...tenant, updatedAt: new Date().toISOString() }
  await writeKey(tenantKey(next.slug), JSON.stringify(next, null, 2))
}

/**
 * Finds which practice owns a hostname.
 *
 * Used once a practice points their own domain at us. Until then they are
 * reached at /their-ods-code on the platform domain and this returns null.
 */
export const slugForDomain = cache(async (hostname: string): Promise<string | null> => {
  const host = (hostname || '').toLowerCase().replace(/:\d+$/, '')
  if (!host) return null

  try {
    const raw = await readKey(domainKey(host))
    return raw ? normaliseSlug(raw.replace(/^"|"$/g, '')) : null
  } catch {
    return null
  }
})

export async function mapDomain(hostname: string, slug: string): Promise<void> {
  await writeKey(domainKey(hostname), normaliseSlug(slug))
}

/**
 * Whether a tenant's website should be served to patients.
 *
 * `past_due` deliberately still serves. A patient looking for the surgery's
 * phone number should never hit a billing problem because a card expired, and
 * Stripe is still retrying at that point.
 */
export function isServing(tenant: Tenant | null): boolean {
  if (!tenant) return false
  return tenant.status === 'active' || tenant.status === 'past_due'
}
