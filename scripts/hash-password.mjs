#!/usr/bin/env node
/**
 * Turns a password into a scrypt hash for ADMIN_PASSWORD_HASH.
 *
 * Optional. Setting ADMIN_PASSWORD to the plain password works fine and is what
 * most practices will do. Use this when you would rather not have the plaintext
 * sitting in a hosting dashboard that several people can read.
 *
 *   npm run hash-password "your password here"
 */
import { randomBytes, scryptSync } from 'node:crypto'

const password = process.argv[2]

if (!password) {
  console.error('Usage: npm run hash-password "your password here"')
  process.exit(1)
}

if (password.length < 10) {
  console.error('Use at least 10 characters. This is the only thing protecting your website.')
  process.exit(1)
}

const salt = randomBytes(16)
const hash = scryptSync(password, salt, 64)

console.log('')
console.log('Add this to your environment variables:')
console.log('')
console.log(`ADMIN_PASSWORD_HASH=scrypt$${salt.toString('hex')}$${hash.toString('hex')}`)
console.log('')
console.log('Then remove ADMIN_PASSWORD if you had set it.')
console.log('')
