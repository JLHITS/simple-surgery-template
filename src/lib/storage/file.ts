import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { StorageDriver } from './types'

/**
 * Writes to a JSON file on disk. This is the zero configuration default: clone
 * the repo, run it, and the admin panel works immediately with no accounts.
 *
 * Suitable for local development and for self-hosting on a server with a
 * persistent disk. Not suitable for serverless hosting, where the filesystem is
 * read-only and resets on every deploy. Use the Upstash driver there.
 */
/**
 * Always `<project>/data/<filename>`.
 *
 * Only the filename is configurable, and it is stripped of any path separators
 * first. That keeps the path statically scoped to one folder, which stops the
 * bundler tracing the entire project into the deployment, and means a stray env
 * var cannot point writes at somewhere unexpected on the host.
 */
const DATA_DIR = join(process.cwd(), 'data')

function dataPath(): string {
  const name = (process.env.SITE_DATA_FILE || 'site.json').replace(/[/\\:]/g, '')
  return join(DATA_DIR, name || 'site.json')
}

export const fileDriver: StorageDriver = {
  name: 'Local file',

  isConfigured() {
    return true
  },

  async read() {
    try {
      return await readFile(dataPath(), 'utf8')
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw err
    }
  },

  async write(json) {
    const target = dataPath()
    await mkdir(dirname(target), { recursive: true })
    // Write to a temp file then rename, so a crash mid-write cannot leave a
    // truncated config behind and take the whole site down.
    const tmp = `${target}.${process.pid}.tmp`
    await writeFile(tmp, json, 'utf8')
    await rename(tmp, target)
  },
}
