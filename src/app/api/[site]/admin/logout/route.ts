import { NextResponse } from 'next/server'
import { destroySession } from '@/lib/auth'
import { normaliseSlug } from '@/lib/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Context {
  params: Promise<{ site: string }>
}

export async function POST(_request: Request, { params }: Context) {
  const { site } = await params
  await destroySession(normaliseSlug(site))
  return NextResponse.json({ ok: true })
}
