import { beforeEach, describe, expect, test } from 'vitest'
import { resetDatabase } from '../data/db.js'
import { updateService } from '../logic/serviceLogic.js'
import { estimateWait, estimateWaitForService } from '../logic/waitTimeLogic.js'

// Unit tests for the wait-time rule: position × expected duration.

beforeEach(() => {
  resetDatabase()
})

describe('estimateWait', () => {
  test('is position times the duration', () => {
    expect(estimateWait(3, 45)).toBe(135)
  })

  test('next in line waits one party\'s duration', () => {
    expect(estimateWait(1, 20)).toBe(20)
  })

  test('is 0 once the party is being served', () => {
    expect(estimateWait(0, 45)).toBe(0)
  })

  test('never goes negative', () => {
    expect(estimateWait(-2, 45)).toBe(0)
  })
})

describe('estimateWaitForService', () => {
  test('uses the service\'s expected duration', () => {
    // Bar Seating is 20 minutes per party
    expect(estimateWaitForService(3, 4)).toBe(80)
  })

  test('follows the duration when an admin changes it', () => {
    updateService(3, {
      name: 'Bar Seating',
      description: 'First-come bar stools.',
      duration: 30,
      priority: 'medium',
      isOpen: true,
    })
    expect(estimateWaitForService(3, 4)).toBe(120)
  })

  test('returns undefined for a service that does not exist', () => {
    expect(estimateWaitForService(999, 2)).toBeUndefined()
  })
})
