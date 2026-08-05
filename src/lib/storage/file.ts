import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { StorageDriver } from './types'

/**
 * Writes JSON files under data/. This is the zero configuration default: clone
 * the repo, run it, and the admin panel works immediately with no accounts.
 *
 * Suitable for local development and for self-hosting on a server with a
 * persistent disk. Not suitable for serverless hosting, where the filesystem is
 * read-only and resets on every deploy. Use the Upstash driver there.
 */
const DATA_DIR = join(process.cwd(), 'data')

/**
 * Storage keys become filenames. Everything outside a safe alphabet is
 * stripped, which both keeps the path inside data/ and stops a crafted key
 * escaping the directory.
 */
function fileFor(key: string): string {
  const name = key.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'store'
  return join(DATA_DIR, `${name}.json`)
}

export const fileDriver: StorageDriver = {
  name: 'Local file',

  isConfigured() {
    return true
  },

  async read(key) {
    try {
      return await readFile(fileFor(key), 'utf8')
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw err
    }
  },

  async write(key, json) {
    await mkdir(DATA_DIR, { recursive: true })
    const target = fileFor(key)
    // Write to a temp file then rename, so a crash mid-write cannot leave a
    // truncated config behind and take the whole site down.
    const tmp = `${target}.${process.pid}.tmp`
    await writeFile(tmp, json, 'utf8')
    await rename(tmp, target)
  },
}
