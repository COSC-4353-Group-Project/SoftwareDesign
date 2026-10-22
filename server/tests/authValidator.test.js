import { describe, expect, test } from 'vitest'
import { hasErrors, normalizePhone, validateLogin, validateRegister } from '../validators/authValidator.js'

// Unit tests for register/login validation. '' means the field is fine.

const VALID = { name: 'Jordan Lee', phone: '(713) 555-0199', email: 'jordan@example.com', smsOptIn: true }

describe('normalizePhone', () => {
  test('turns common formats into 10 digits', () => {
    expect(normalizePhone('(713) 555-0199')).toBe('7135550199')
    expect(normalizePhone('1-713-555-0199')).toBe('7135550199')
  })

  test('rejects too few digits and area codes starting with 0 or 1', () => {
    expect(normalizePhone('555-0199')).toBeNull()
    expect(normalizePhone('(113) 555-0199')).toBeNull()
  })
})

describe('validateRegister', () => {
  test('a valid account has no errors', () => {
    expect(hasErrors(validateRegister(VALID))).toBe(false)
  })

  test('email is optional', () => {
    expect(validateRegister({ ...VALID, email: '' }).email).toBe('')
  })

  test('name and phone are required', () => {
    const errors = validateRegister({})
    expect(errors.name).toBe('Name is required.')
    expect(errors.phone).toBe('Phone number is required.')
  })

  test('name must be letters and at most 60 characters', () => {
    expect(validateRegister({ ...VALID, name: 'R2D2' }).name).toBe('Name can only contain letters.')
    expect(validateRegister({ ...VALID, name: 'a'.repeat(61) }).name).toBe('Name must be 60 characters or fewer.')
  })

  test('phone must be a real US number', () => {
    expect(validateRegister({ ...VALID, phone: '12345' }).phone).toBe('Enter a valid 10-digit US phone number.')
  })

  test('email must look like an email', () => {
    expect(validateRegister({ ...VALID, email: 'not-an-email' }).email).toBe('Enter a valid email address.')
  })

  test('checks field types', () => {
    expect(validateRegister({ ...VALID, phone: 7135550199 }).phone).toBe('Phone number must be text.')
    expect(validateRegister({ ...VALID, smsOptIn: 'yes' }).smsOptIn).toBe('Text updates must be true or false.')
  })
})

describe('validateLogin', () => {
  test('needs a name and phone', () => {
    expect(hasErrors(validateLogin({ name: 'Admin', phone: '903-555-0100' }))).toBe(false)
    expect(hasErrors(validateLogin(undefined))).toBe(true)
  })
})
