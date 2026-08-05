'use client'

import { useEffect, useState } from 'react'
import { getOpenState, type OpenState } from '@/lib/hours'
import type { Closure, OpeningDay } from '@/lib/config/types'

/**
 * Live "open now" badge.
 *
 * Computed in the browser rather than on the server. A server-rendered answer
 * would be baked into the cached HTML and could tell a patient at 9pm that the
 * surgery is open. Renders nothing until it has a real answer, so there is no
 * hydration mismatch and no misleading flash of the wrong state.
 */
export function OpenNow({
  days,
  closures,
  className = '',
}: {
  days: OpeningDay[]
  closures: Closure[]
  className?: string
}) {
  const [state, setState] = useState<OpenState | null>(null)

  useEffect(() => {
    const update = () => setState(getOpenState(days, closures, new Date()))
    update()
    // Re-check every minute so the badge flips at the moment the doors close.
    const timer = setInterval(update, 60_000)
    return () => clearInterval(timer)
  }, [days, closures])

  if (!state) {
    return <span className={`inline-block h-6 w-32 ${className}`} aria-hidden="true" />
  }

  return (
    <span
      className={`inline-flex items-center gap-2 text-sm font-bold ${className}`}
      role="status"
    >
      <span
        className={`inline-block h-2.5 w-2.5 rounded-full ${
          state.open ? 'bg-nhs-green' : 'bg-nhs-red'
        }`}
        aria-hidden="true"
      />
      <span className={state.open ? 'text-nhs-green' : 'text-nhs-red'}>
        {state.open ? 'Open now' : 'Closed now'}
      </span>
      <span className="font-normal text-nhs-grey-1">{state.detail}</span>
    </span>
  )
}
