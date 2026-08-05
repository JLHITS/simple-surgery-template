'use client'

import { useRef, useState } from 'react'
import { SmallButton } from './fields'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || ''
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || ''

/** Longest edge, in pixels, for the inline fallback. Plenty for a header logo. */
const MAX_EDGE = 600
/** Guard against a 4MB base64 string ending up in the config. */
const MAX_INLINE_BYTES = 400_000

/**
 * Logo and photo upload.
 *
 * Two paths, and the practice never has to know which one it is on:
 *
 *   1. If Cloudinary is configured, the file goes straight from the browser to
 *      Cloudinary using an unsigned preset. No secret is involved, nothing
 *      passes through the server, and the image is served from a CDN with
 *      automatic WebP conversion.
 *
 *   2. If it is not, the image is resized in the browser with a canvas and
 *      stored inline as a data URI. That keeps a fresh clone working with zero
 *      accounts and zero setup, which matters for the open source path.
 */
export function LogoUpload({
  value,
  onChange,
  label = 'Practice logo',
  hint,
}: {
  value: string
  onChange: (url: string) => void
  label?: string
  hint?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const cloudinaryReady = Boolean(CLOUD_NAME && UPLOAD_PRESET)

  async function uploadToCloudinary(file: File): Promise<string> {
    const form = new FormData()
    form.append('file', file)
    form.append('upload_preset', UPLOAD_PRESET)

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: form,
    })

    if (!res.ok) {
      throw new Error('Cloudinary rejected the upload. Check your upload preset is unsigned.')
    }

    const body = (await res.json()) as { secure_url?: string }
    if (!body.secure_url) throw new Error('Cloudinary did not return an image URL.')
    return body.secure_url
  }

  function resizeInline(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onerror = () => reject(new Error('Could not read that file.'))
      reader.onload = () => {
        const image = new Image()
        image.onerror = () => reject(new Error('That file is not an image we can read.'))
        image.onload = () => {
          const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height))
          const width = Math.max(1, Math.round(image.width * scale))
          const height = Math.max(1, Math.round(image.height * scale))

          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          if (!ctx) return reject(new Error('Your browser could not process that image.'))
          ctx.drawImage(image, 0, 0, width, height)

          // PNG preserves transparency, which most practice logos rely on.
          let dataUrl = canvas.toDataURL('image/png')
          if (dataUrl.length > MAX_INLINE_BYTES) {
            dataUrl = canvas.toDataURL('image/jpeg', 0.85)
          }
          if (dataUrl.length > MAX_INLINE_BYTES) {
            return reject(
              new Error(
                'That image is too large to store directly. Use a smaller file, or set up image hosting in Advanced settings.',
              ),
            )
          }

          resolve(dataUrl)
        }
        image.src = reader.result as string
      }

      reader.readAsDataURL(file)
    })
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError('')

    if (!file.type.startsWith('image/')) {
      setError('Choose an image file, such as a PNG, JPG or SVG.')
      return
    }

    setBusy(true)
    try {
      const url = cloudinaryReady ? await uploadToCloudinary(file) : await resizeInline(file)
      onChange(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That upload did not work.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="grid gap-2">
      <p className="text-sm font-semibold text-zinc-900">{label}</p>
      {hint && <p className="text-[0.8rem] leading-relaxed text-zinc-500">{hint}</p>}

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-zinc-200 p-4">
        <div className="flex h-20 w-40 shrink-0 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="max-h-16 max-w-36 object-contain" />
          ) : (
            <span className="text-[0.75rem] text-zinc-400">No logo yet</span>
          )}
        </div>

        <div className="grid gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="block w-full text-[0.85rem] text-zinc-600 file:mr-3 file:min-h-10 file:cursor-pointer file:rounded-lg file:border file:border-zinc-300 file:bg-white file:px-3 file:py-2 file:text-[0.85rem] file:font-semibold hover:file:bg-zinc-100"
            disabled={busy}
          />

          <div className="flex flex-wrap items-center gap-2">
            {value && (
              <SmallButton tone="danger" onClick={() => onChange('')} disabled={busy}>
                Remove
              </SmallButton>
            )}
            <span className="text-[0.75rem] text-zinc-500">
              {busy
                ? 'Uploading...'
                : cloudinaryReady
                  ? 'Hosted on Cloudinary'
                  : 'Stored with your site settings'}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[0.85rem] text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
