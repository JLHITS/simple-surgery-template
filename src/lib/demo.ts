import { normaliseSlug } from '@/lib/storage'
import { singleTenantSlug } from '@/lib/tenant'

/**
 * The read-only demo of the admin panel, served at /admin-demo.
 *
 * A practice manager deciding whether to move supplier does not want a tour of
 * the editor, they want to open it and change something. So the demo is the
 * real editor, on the real demo practice's content, with no password: the only
 * difference is that Save tells them it would have saved rather than saving.
 *
 * Off unless it is deliberately turned on, because it is an unauthenticated
 * page that renders the whole admin panel. Two ways to turn it on:
 *
 *   - `DEMO_ADMIN=1`, which is explicit and works whatever the deployment is.
 *   - `SITE_KEY=demo`, which is how the demo deployment is already configured,
 *     so demo.simplesurgery.co gets it without another variable being set.
 *
 * Neither applies to a practice we host: they are multi-tenant with no
 * SITE_KEY, and nobody is going to set DEMO_ADMIN on that project. A practice
 * self-hosting from the open source template gets nothing they did not ask for
 * either, which is the point of defaulting it off.
 */
const TRUTHY = new Set(['1', 'true', 'yes', 'on'])

/**
 * The one practice slug the demo editor may render, or null when it is off.
 *
 * Returning the slug rather than a boolean is what stops `/a81001/admin-demo`
 * from being a way to open somebody else's site in an editor on a deployment
 * that happens to have the demo turned on.
 */
export function demoAdminSlug(): string | null {
  const flag = (process.env.DEMO_ADMIN || '').toLowerCase().trim()
  const single = singleTenantSlug()

  if (flag) {
    if (!TRUTHY.has(flag)) return null
    return single || normaliseSlug(process.env.DEMO_SITE || 'demo') || null
  }

  return single === 'demo' ? 'demo' : null
}

/** Whether this request is for the practice the demo editor is allowed to show. */
export function isDemoAdminFor(slug: string): boolean {
  const allowed = demoAdminSlug()
  return allowed !== null && normaliseSlug(slug) === allowed
}

/**
 * Whether this practice is the showcase, and so gets the Frogmorton content.
 *
 * Deliberately stricter than `demoAdminSlug`. That one answers "may the
 * passwordless editor be rendered here", which `DEMO_ADMIN=1` can turn on for
 * any single tenant deployment. This one decides whose *content* a site
 * serves, and getting it wrong means a real practice's patients are shown a
 * fictional address and a fictional practice manager.
 *
 * So it takes both: the deployment must be single tenant, and its one practice
 * must be the demo. A practice we host is multi-tenant and can never match. A
 * self-hoster running the open source template under their own SITE_KEY gets
 * the neutral defaults, which is what they want: their own site, empty, ready
 * to fill in.
 */
export function isDemoContentFor(slug: string): boolean {
  const single = singleTenantSlug()
  if (!single) return false

  const demo = normaliseSlug(process.env.DEMO_SITE || 'demo')
  return single === demo && normaliseSlug(slug) === demo
}
