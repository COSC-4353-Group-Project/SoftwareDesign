import { describe, expect, test } from 'vitest'
import { hasErrors, validateHistory } from '../validators/historyValidator.js'

// Unit tests for history validation. '' means the field is fine.
// The field is called "service", the same name the store and historyLogic.js use.

// A valid history row. Each test changes one field to break it.
const VALID = { service: 'Patio', date: '10-15-2026', bribe: 5, status: 'Done' }

describe('a valid history row', () => {
  test('has no errors', () => {
    expect(hasErrors(validateHistory(VALID))).toBe(false)
  })

  test('a $0 bribe is allowed', () => {
    expect(validateHistory({ ...VALID, bribe: 0 }).bribe).toBe('')
  })
})

describe('required fields', () => {
  test('an empty body has an error on every field', () => {
    const errors = validateHistory({})
    expect(errors.service).toBe('Service name is required.')
    expect(errors.date).toBe('Date is required')
    expect(errors.bribe).toBe('Bribe amount was expected')
    expect(errors.status).toBe('Queue status must be confirmed')
  })

  test('no body at all is treated the same as an empty one', () => {
    expect(validateHistory(undefined).date).toBe('Date is required')
  })

  test('only spaces counts as empty', () => {
    expect(validateHistory({ ...VALID, service: '   ' }).service).toBe('Service name is required.')
    expect(validateHistory({ ...VALID, date: '  ' }).date).toBe('Date is required')
  })
})

describe('field types', () => {
  test('service, date and status must be text', () => {
    expect(validateHistory({ ...VALID, service: 42 }).service).toBe('Service name must be text.')
    expect(validateHistory({ ...VALID, date: 20261015 }).date).toBe('Date must be a valid string input')
    expect(validateHistory({ ...VALID, status: 1 }).status).toBe('Status must be a valid string input.')
  })

  test('bribe must be a number that is not negative', () => {
    const message = 'Bribe amount expected to be a value greater than 0.00.'
    expect(validateHistory({ ...VALID, bribe: '5' }).bribe).toBe(message)
    expect(validateHistory({ ...VALID, bribe: -1 }).bribe).toBe(message)
  })
})

describe('field length limits', () => {
  test('service name can be 100 characters but not 101', () => {
    expect(validateHistory({ ...VALID, service: 'a'.repeat(100) }).service).toBe('')
    expect(validateHistory({ ...VALID, service: 'a'.repeat(101) }).service).toBe(
      'Service name must be 100 characters or fewer.',
    )
  })
})
