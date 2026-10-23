import { beforeEach, describe, expect, test } from 'vitest'
import { resetStore } from '../data/store.js'
import { validateJoinQueue } from '../validators/queueValidator.js'

beforeEach(() => resetStore())

const valid = { serviceId: 1, partySize: 2, seatingPreference: 'Dine-in' }

describe('validateJoinQueue', () => {
  test('accepts valid small, large, and bar seating requests', () => {
    expect(validateJoinQueue(valid)).toEqual({})
    expect(validateJoinQueue({ serviceId: 2, partySize: 6, seatingPreference: 'Dine-in' })).toEqual({})
    expect(validateJoinQueue({ serviceId: 3, partySize: 1, seatingPreference: 'Bar Seating' })).toEqual({})
  })

  test('rejects missing and non-object request bodies', () => {
    expect(validateJoinQueue(undefined)).toHaveProperty('request')
    expect(validateJoinQueue([])).toHaveProperty('request')
    expect(validateJoinQueue('invalid')).toHaveProperty('request')
  })

  test('rejects invalid service IDs', () => {
    for (const serviceId of [undefined, 0, -1, 1.5, '1']) {
      expect(validateJoinQueue({ ...valid, serviceId })).toHaveProperty('serviceId')
    }
    expect(validateJoinQueue({ ...valid, serviceId: 999 }).serviceId).toBe('Service not found.')
    expect(validateJoinQueue({ ...valid, serviceId: 4 }).serviceId).toBe('This service is currently closed.')
  })

  test('rejects invalid party sizes', () => {
    for (const partySize of [undefined, 0, 7, 1.5, '2']) {
      expect(validateJoinQueue({ ...valid, partySize })).toHaveProperty('partySize')
    }
  })

  test('rejects invalid seating preferences', () => {
    for (const seatingPreference of [undefined, '', 'Patio', 'bar', 3]) {
      expect(validateJoinQueue({ ...valid, seatingPreference })).toHaveProperty('seatingPreference')
    }
  })

  test('rejects a service that does not match party size or seating', () => {
    expect(validateJoinQueue({ ...valid, serviceId: 2 })).toHaveProperty('serviceId')
    expect(validateJoinQueue({ ...valid, serviceId: 3 })).toHaveProperty('serviceId')
    expect(validateJoinQueue({ serviceId: 1, partySize: 4, seatingPreference: 'Dine-in' })).toHaveProperty('serviceId')
  })

  test('can report multiple invalid fields in the same request', () => {
    const errors = validateJoinQueue({ serviceId: 0, partySize: 8, seatingPreference: 'Other' })
    expect(Object.keys(errors)).toEqual(expect.arrayContaining(['serviceId', 'partySize', 'seatingPreference']))
  })
})