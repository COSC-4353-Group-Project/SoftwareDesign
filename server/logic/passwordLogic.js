import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const KEY_LENGTH = 64 // bytes of hash scrypt gives back

// Returns "salt:hash" (both as hex text). This is what goes in user_credentials.password_hash.
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, KEY_LENGTH).toString('hex')
  return `${salt}:${hash}`
}

// True if password is the one that made storedHash.
export function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(':')
  if (!salt || !hash) {
    return false
  }
  const expected = Buffer.from(hash, 'hex')
  const actual = scryptSync(password, salt, KEY_LENGTH)
  // timingSafeEqual takes the same time whether the first byte or the last byte differs,
  // so an attacker can't learn anything from how fast a wrong guess fails. security stoof
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
