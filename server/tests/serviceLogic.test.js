import { beforeEach, describe, expect, test } from 'vitest'
import { resetStore } from '../data/store.js'
import { getServiceById, listServices } from '../logic/serviceLogic.js'

// Unit tests: call the logic functions directly, no HTTP involved.

beforeEach(() => {
  resetStore()
})

describe('listServices', () => {
  test('returns the 4 starting services', () => {
    expect(listServices()).toHaveLength(4)
  })
})

describe('getServiceById', () => {
  test('finds a service that exists', () => {
    expect(getServiceById(3).name).toBe('Bar Seating')
  })

  test('returns undefined for an id that does not exist', () => {
    expect(getServiceById(999)).toBeUndefined()
  })
})
