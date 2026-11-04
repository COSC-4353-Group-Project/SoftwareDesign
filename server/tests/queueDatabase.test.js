import { beforeEach, describe, expect, test } from 'vitest'
import { db, resetDatabase } from '../data/db.js'
import {
  createService,
  deleteService,
  getServiceById,
  updateService,
} from '../logic/serviceLogic.js'

// Start each database test with the original seed data.
beforeEach(() => {
  resetDatabase()
})

describe('Queue database initialization', () => {
  test('creates a queue for each seeded service', () => {
    const queues = db.prepare(`
      SELECT service_id, status
      FROM queues
      ORDER BY service_id
    `).all()

    expect(queues).toEqual([
      { service_id: 1, status: 'open' },
      { service_id: 2, status: 'open' },
      { service_id: 3, status: 'open' },
      { service_id: 4, status: 'closed' },
    ])
  })

  test('links historical entries to their queues', () => {
    const entries = db.prepare(`
      SELECT
        e.service_id,
        e.queue_id,
        q.service_id AS queue_service_id
      FROM queue_entries AS e
      JOIN queues AS q ON q.id = e.queue_id
    `).all()

    expect(entries).toHaveLength(3)

    for (const entry of entries) {
      expect(entry.queue_id).not.toBeNull()
      expect(entry.service_id).toBe(entry.queue_service_id)
    }
  })

  test('rejects a queue referencing a nonexistent service', () => {
    expect(() => {
      db.prepare(
        'INSERT INTO queues (service_id) VALUES (?)'
      ).run(999)
    }).toThrow()
  })

  test('prevents multiple queues for one service', () => {
    expect(() => {
      db.prepare(
        'INSERT INTO queues (service_id) VALUES (?)'
      ).run(1)
    }).toThrow()
  })

  test('prevents one user from joining two active queues', () => {
    const addEntry = db.prepare(`
      INSERT INTO queue_entries (
        service_id, queue_id, user_id, party_size,
        seating_preference, position, initial_position
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    const firstQueue = db.prepare(
      'SELECT id FROM queues WHERE service_id = 1'
    ).get()

    const secondQueue = db.prepare(
      'SELECT id FROM queues WHERE service_id = 3'
    ).get()

    addEntry.run(1, firstQueue.id, 2, 2, 'Dine-in', 1, 1)

    expect(() => {
      addEntry.run(3, secondQueue.id, 2, 1, 'Bar Seating', 1, 1)
    }).toThrow()
  })
})

describe('Service and Queue relationships', () => {
  const NEW_SERVICE = {
    name: "Chef's counter",
    description: 'Six seats facing the kitchen.',
    duration: 90,
    priority: 'high',
    isOpen: true,
  }

  test('creates a queue automatically for a new service', () => {
    const service = createService(NEW_SERVICE)

    const queue = db.prepare(`
      SELECT service_id, status
      FROM queues
      WHERE service_id = ?
    `).get(service.id)

    expect(queue).toEqual({
      service_id: service.id,
      status: 'open',
    })
  })

  test('closes a queue when its service closes', () => {
    updateService(1, {
      ...NEW_SERVICE,
      name: 'Dine-in · Party of 1–2',
      isOpen: false,
    })

    const queue = db.prepare(`
      SELECT status FROM queues WHERE service_id = 1
    `).get()

    expect(queue.status).toBe('closed')
  })

  test('deletes the queue when an unused service is deleted', () => {
    expect(deleteService(2)).toBe(true)
    expect(getServiceById(2)).toBeUndefined()

    const queue = db.prepare(`
      SELECT id FROM queues WHERE service_id = 2
    `).get()

    expect(queue).toBeUndefined()
  })

  test('preserves services with historical queue entries', () => {
    expect(() => deleteService(1)).toThrow()
    expect(getServiceById(1)).toBeDefined()
  })
})

describe('Queue database reset', () => {
  test('restores the four original queues', () => {
    db.prepare(`
      UPDATE queues SET status = 'closed' WHERE service_id = 1
    `).run()

    resetDatabase()

    const queues = db.prepare(`
      SELECT service_id, status FROM queues ORDER BY service_id
    `).all()

    expect(queues).toHaveLength(4)
    expect(queues[0].status).toBe('open')
  })

  test('restores linked history entries', () => {
    resetDatabase()

    const entries = db.prepare(`
      SELECT COUNT(*) AS count
      FROM queue_entries
      WHERE queue_id IS NOT NULL
    `).get()

    expect(entries.count).toBe(3)
  })

  test('has no foreign-key violations', () => {
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([])
  })
})