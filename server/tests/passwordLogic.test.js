import { describe, expect, test } from 'vitest'
import { hashPassword, verifyPassword } from '../logic/passwordLogic.js'

describe('password hashing', () => {
  test('hash is salt:hash and does not contain the password', () => {
    const stored = hashPassword('hunter22')
    expect(stored).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/)
    expect(stored).not.toContain('hunter22')
  })

  test('same password gets a different hash each time', () => {
    expect(hashPassword('hunter22')).not.toBe(hashPassword('hunter22'))
  })

  test('verify accepts the right password and rejects others', () => {
    const stored = hashPassword('hunter22')
    expect(verifyPassword('hunter22', stored)).toBe(true)
    expect(verifyPassword('Hunter22', stored)).toBe(false)
  })

  test('verify rejects a broken stored hash', () => {
    expect(verifyPassword('hunter22', 'no-colon-here')).toBe(false)
    expect(verifyPassword('hunter22', 'abcd:1234')).toBe(false)
  })
})
