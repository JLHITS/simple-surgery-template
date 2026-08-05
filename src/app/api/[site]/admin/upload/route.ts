import { NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { normaliseSlug } from '@/lib/storage'
import { isCloudinaryConfigured, uploadToCloudinary } from '@/lib/cloudinary'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BYTES = 8 * 1024 * 1024
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif']

/**
 * Signed image upload.
 *
 * Behind the admin session, so only signed-in practice staff can reach it. The
 * Cloudinary secret is used here on the server and never leaves it.
 *
 * Returns 501 when Cloudinary is not set up, which is the browser's cue to fall
 * back to resizing the image itself and storing it inline. That keeps a fresh
 * clone working with no accounts at all.
 */
interface Context {
  params: Promise<{ site: string }>
}

export async function POST(request: Request, { params }: Context) {
  const { site: rawSite } = await params
  const site = normaliseSlug(rawSite)

  if (!site || !(await isAuthenticated(site))) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json({ error: 'Image hosting is not set up.' }, { status: 501 })
  }

  let file: File | null = null
  try {
    const form = await request.formData()
    const entry = form.get('file')
    if (entry instanceof File) file = entry
  } catch {
    return NextResponse.json({ error: 'Could not read that upload.' }, { status: 400 })
  }

  if (!file) {
    return NextResponse.json({ error: 'No file was sent.' }, { status: 400 })
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'That image is larger than 8MB. Please use a smaller file.' },
      { status: 413 },
    )
  }

  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: 'Choose a PNG, JPG, WebP, GIF or SVG image.' },
      { status: 415 },
    )
  }

  try {
    const result = await uploadToCloudinary(file)
    return NextResponse.json({ url: result.url })
  } catch (err) {
    console.error('[simple-surgery] cloudinary upload failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'That upload did not work.' },
      { status: 502 },
    )
  }
}
