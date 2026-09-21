type Plain = Record<string, unknown>

export function isPlainObject(value: unknown): value is Plain {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Deep merges one config document over another.
 *
 * Arrays replace wholesale rather than merging element by element, because a
 * practice that deletes a team member means it. Objects merge key by key, so a
 * template upgrade that adds a new setting picks up its default without the
 * practice having to do anything.
 *
 * This is also what lets provisioning write a three-field document. A brand new
 * practice only needs its name and ODS code stored; everything else comes from
 * the compliant defaults until they edit it.
 *
 * It lives in its own file because three things need it: loading a practice's
 * saved content, building the demo practice from the defaults plus its own
 * showcase content, and the migration that takes that showcase content back
 * out of sites which were seeded before the two were separated.
 */
export function mergeDeep<T>(base: T, override: unknown): T {
  if (override === undefined || override === null) return base
  if (Array.isArray(base)) return (Array.isArray(override) ? override : base) as T
  if (!isPlainObject(base) || !isPlainObject(override)) return override as T

  const out: Plain = { ...base }
  for (const [key, value] of Object.entries(override)) {
    out[key] = key in (base as Plain) ? mergeDeep((base as Plain)[key], value) : value
  }
  return out as T
}

/** Structural equality, enough for comparing two pieces of stored config. */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((item, i) => deepEqual(item, b[i]))
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = Object.keys(a)
    if (keys.length !== Object.keys(b).length) return false
    return keys.every((key) => key in b && deepEqual(a[key], b[key]))
  }

  return false
}
