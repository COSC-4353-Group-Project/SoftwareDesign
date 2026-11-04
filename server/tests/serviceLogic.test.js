import { beforeEach, describe, expect, test } from 'vitest'
import { db, resetDatabase } from '../data/db.js'
import {
  createService, deleteService, getServiceById, listServices, serviceIsInUse, updateService,
} from '../logic/serviceLogic.js'

// Unit tests: call the logic functions directly, no HTTP involved.
// The services live in the (in-memory) test database now, reset before every test.

beforeEach(() => {
  resetDatabase()
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

  test('turns the table columns back into the shape the pages use', () => {
    expect(getServiceById(4)).toEqual({
      id: 4,
      name: 'Patio',
      description: 'Outdoor tables. Closed when it rains.',
      duration: 40,
      priority: 'low',
      isOpen: false,
      waiting: 0,
    })
  })

  test('counts only the people still waiting (Justin\'s seeded visits are all finished)', () => {
    expect(getServiceById(1).waiting).toBe(0)
    db.prepare(`
      INSERT INTO queue_entries (service_id, user_id, party_size, seating_preference, position, initial_position)
      VALUES (1, 2, 2, 'Dine-in', 1, 1)
    `).run()
    expect(getServiceById(1).waiting).toBe(1)
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

  test('saves it to the services table', () => {
    createService({ ...CHEFS_COUNTER, isOpen: false })
    const row = db.prepare('SELECT duration_minutes, is_open FROM services WHERE id = 5').get()
    expect(row).toEqual({ duration_minutes: 90, is_open: 0 })
  })

  test('the database rejects a duplicate name even if the validator is skipped', () => {
    expect(() => createService({ ...CHEFS_COUNTER, name: 'bar seating' })).toThrow(/UNIQUE/)
  })
})

describe('updateService', () => {
  test('replaces the fields and keeps the id', () => {
    const service = updateService(4, { ...CHEFS_COUNTER, name: 'Patio', isOpen: true })
    expect(service.id).toBe(4)
    expect(service.isOpen).toBe(true)
    expect(getServiceById(4).duration).toBe(90)
  })

  test('only changes that one row', () => {
    updateService(4, { ...CHEFS_COUNTER, name: 'Patio' })
    expect(getServiceById(3).name).toBe('Bar Seating')
    expect(listServices()).toHaveLength(4)
  })

  test('returns undefined for an id that does not exist', () => {
    expect(updateService(999, CHEFS_COUNTER)).toBeUndefined()
  })
})

describe('serviceIsInUse', () => {
  test('true when someone has queued for it (Justin has history on 1, 3 and 4)', () => {
    expect(serviceIsInUse(1)).toBe(true)
  })

  test('false when nobody has', () => {
    expect(serviceIsInUse(2)).toBe(false)
  })
})

describe('deleteService', () => {
  test('removes the service from the table', () => {
    expect(deleteService(2)).toBe(true)
    expect(getServiceById(2)).toBeUndefined()
    expect(listServices()).toHaveLength(3)
  })

  test('returns false for an id that does not exist', () => {
    expect(deleteService(999)).toBe(false)
  })
})
