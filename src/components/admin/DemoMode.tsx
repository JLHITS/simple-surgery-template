'use client'

import { createContext, useContext } from 'react'

/**
 * Whether the editor around this component is the public demo.
 *
 * A context rather than a prop because the flag is needed at the leaves — the
 * logo picker, the download button — and threading a boolean through every
 * section signature to reach them would be noise in the one part of the admin
 * panel a practice actually reads.
 *
 * False everywhere by default, so a component that forgets to ask gets the real
 * behaviour and the demo is the special case rather than the other way round.
 */
const DemoContext = createContext(false)

export function DemoProvider({ value, children }: { value: boolean; children: React.ReactNode }) {
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
}

export function useDemoMode(): boolean {
  return useContext(DemoContext)
}
