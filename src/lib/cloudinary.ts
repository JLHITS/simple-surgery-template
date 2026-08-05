import { createHash } from 'node:crypto'

/**
 * Server side Cloudinary uploads.
 *
 * The API secret stays on the server and is used to sign each upload. Nothing
 * about your Cloudinary account reaches the browser, and the upload endpoint
 * sits behind the admin session cookie, so only someone already signed in to
 * the practice website can upload anything.
 *
 * This is the reason to prefer it over an unsigned upload preset. An unsigned
 * preset has to be published in the JavaScript bundle, which means anyone who
 * finds it can upload to your account.
 *
 * Accepts credentials in whichever form Cloudinary gave you:
 *
 *   CLOUDINARY_URL=cloudinary://<key>:<secret>@<cloud>
 *   NEXT_CLOUDINARY_API_ENV_VARIABLE=cloudinary://<key>:<secret>@<cloud>
 *   CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
 *
 * The value copied from the Cloudinary dashboard includes a leading
 * "CLOUDINARY_URL=", so that is stripped if present.
 */

export interface CloudinaryCredentials {
  cloudName: string
  apiKey: string
  apiSecret: string
}

/** Everything uploaded goes in one folder, so it is easy to find and to purge. */
const FOLDER = process.env.CLOUDINARY_FOLDER || 'simple-surgery'

export function getCloudinaryCredentials(): CloudinaryCredentials | null {
  const raw = (
    process.env.CLOUDINARY_URL ||
    process.env.NEXT_CLOUDINARY_API_ENV_VARIABLE ||
    ''
  )
    .trim()
    .replace(/^CLOUDINARY_URL\s*=\s*/i, '')
    .replace(/^["']|["']$/g, '')

  if (raw.startsWith('cloudinary://')) {
    const match = raw.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/)
    if (match) {
      return { apiKey: match[1], apiSecret: match[2], cloudName: match[3].replace(/\/.*$/, '') }
    }
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || ''
  const apiKey = process.env.CLOUDINARY_API_KEY || ''
  const apiSecret = process.env.CLOUDINARY_API_SECRET || ''
  if (cloudName && apiKey && apiSecret) return { cloudName, apiKey, apiSecret }

  return null
}

export function isCloudinaryConfigured(): boolean {
  return getCloudinaryCredentials() !== null
}

/**
 * Cloudinary's signature: every parameter except file, api_key and
 * resource_type, sorted by key, joined as a query string, with the API secret
 * appended, then SHA-1.
 */
function sign(params: Record<string, string>, apiSecret: string): string {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')

  return createHash('sha1').update(`${payload}${apiSecret}`).digest('hex')
}

export interface UploadResult {
  url: string
  width?: number
  height?: number
  bytes?: number
}

export async function uploadToCloudinary(file: File): Promise<UploadResult> {
  const credentials = getCloudinaryCredentials()
  if (!credentials) throw new Error('Cloudinary is not configured.')

  const timestamp = Math.floor(Date.now() / 1000).toString()

  // Cap the stored image. A header logo never needs to be larger than this, and
  // it stops a 6000px photo becoming the heaviest thing on the home page.
  const signedParams: Record<string, string> = {
    folder: FOLDER,
    timestamp,
    transformation: 'c_limit,w_1200,h_1200,q_auto',
  }

  const form = new FormData()
  form.append('file', file)
  form.append('api_key', credentials.apiKey)
  for (const [key, value] of Object.entries(signedParams)) form.append(key, value)
  form.append('signature', sign(signedParams, credentials.apiSecret))

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${credentials.cloudName}/image/upload`,
    { method: 'POST', body: form, cache: 'no-store' },
  )

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
    throw new Error(body?.error?.message || `Cloudinary returned ${res.status}`)
  }

  const body = (await res.json()) as {
    secure_url?: string
    width?: number
    height?: number
    bytes?: number
  }

  if (!body.secure_url) throw new Error('Cloudinary did not return an image address.')

  return { url: body.secure_url, width: body.width, height: body.height, bytes: body.bytes }
}
