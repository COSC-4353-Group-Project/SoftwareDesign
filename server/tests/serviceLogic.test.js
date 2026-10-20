import { beforeEach, describe, expect, test } from 'vitest'
import { resetStore } from '../data/store.js'
import { createService, getServiceById, listServices, updateService } from '../logic/serviceLogic.js'

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

// A valid service, the same shape the page sends
const CHEFS_COUNTER = {
  name: "Chef's counter",
  description: 'Six seats facing the kitchen.',
  duration: 90,
  priority: 'high',
  isOpen: true,
}

describe('createService', () => {
  test('adds the service with the next id', () => {
    const service = createService(CHEFS_COUNTER)
    expect(service.id).toBe(5)
    expect(listServices()).toHaveLength(5)
    expect(getServiceById(5).name).toBe("Chef's counter")
  })

  test('trims extra spaces off the name and description', () => {
    const service = createService({ ...CHEFS_COUNTER, name: '  Booth  ', description: ' Cozy. ' })
    expect(service.name).toBe('Booth')
    expect(service.description).toBe('Cozy.')
  })

  test('ignores fields a service does not have', () => {
    const service = createService({ ...CHEFS_COUNTER, id: 999, hacked: true })
    expect(service.id).toBe(5)
    expect(service.hacked).toBeUndefined()
  })
})

describe('updateService', () => {
  test('replaces the fields and keeps the id', () => {
    const service = updateService(4, { ...CHEFS_COUNTER, name: 'Patio', isOpen: true })
    expect(service.id).toBe(4)
    expect(service.isOpen).toBe(true)
    expect(getServiceById(4).duration).toBe(90)
  })

  test('returns undefined for an id that does not exist', () => {
    expect(updateService(999, CHEFS_COUNTER)).toBeUndefined()
  })
})
