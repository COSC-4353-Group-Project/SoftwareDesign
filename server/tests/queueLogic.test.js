import { beforeEach, describe, expect, test } from 'vitest'
import { resetStore, store } from '../data/store.js'
import {
  joinQueue, listQueue, getQueuePosition, getQueueEntry, getQueueSummary,
  getAllQueueEntries, leaveQueue, serveQueueEntry, serveNext,
  moveQueueEntry, purchaseQueueAdvance,
} from '../logic/queueLogic.js'

beforeEach(() => resetStore())

function join(userId, serviceId = 1, partySize = 2, seating = 'Dine-in') {
  return joinQueue(userId, serviceId, partySize, seating)
}

describe('joining and retrieving queues', () => {
  test('joins with position, wait, and linked History record', () => {
    const entry = join(2)
    expect(entry).toMatchObject({ id: 1, userId: 2, serviceId: 1, status: 'waiting', position: 1, queueOrder: 1, estimatedWaitMinutes: 45 })
    expect(entry.skips).toEqual([])
    expect(store.history.find((h) => h.queueEntryId === entry.id)).toMatchObject({ userId: 2, status: 'Entered', bribe: 0 })
  })

  test('retrieves queue position and summary in service order', () => {
    join(2)
    join(3)
    expect(listQueue(1).map((entry) => entry.id)).toEqual([1, 2])
    expect(getQueuePosition(2)).toBe(2)
    expect(getQueueSummary(1)).toMatchObject({ serviceId: 1, partiesAhead: 2, estimatedWaitMinutes: 135 })
    expect(getQueueSummary(999)).toBeUndefined()
    expect(getQueueEntry(999)).toBeUndefined()
    expect(getQueuePosition(999)).toBe(0)
  })

  test('keeps separate services independent and displays registered guest names', () => {
    join(2)
    join(3, 3, 1, 'Bar Seating')
    expect(listQueue(1)).toHaveLength(1)
    expect(listQueue(3)).toHaveLength(1)
    expect(getQueuePosition(2)).toBe(1)
    expect(getAllQueueEntries()[0].guestName).toBe('Justin Hendrix')
    expect(getAllQueueEntries()[1].guestName).toBe('Guest #3')
  })
})

describe('leaving and serving', () => {
  test('cancels a waiting entry, updates History, and recalculates positions', () => {
    join(2)
    join(3)
    expect(leaveQueue(1)).toMatchObject({ status: 'cancelled', position: 0 })
    expect(getQueuePosition(2)).toBe(1)
    expect(store.history.find((h) => h.queueEntryId === 1).status).toBe('Canceled')
    expect(leaveQueue(1)).toBeUndefined()
    expect(leaveQueue(999)).toBeUndefined()
  })

  test('serves an entry once and updates History', () => {
    join(2)
    expect(serveQueueEntry(1)).toMatchObject({ status: 'served', position: 0 })
    expect(store.history.find((h) => h.queueEntryId === 1).status).toBe('Done')
    expect(serveQueueEntry(1)).toBeUndefined()
    expect(serveQueueEntry(999)).toBeUndefined()
  })

  test('serves the promoted first party and handles an empty queue', () => {
    expect(serveNext()).toBeUndefined()
    join(2)
    join(3)
    moveQueueEntry(2, -1)
    expect(serveNext().id).toBe(2)
    expect(getQueuePosition(1)).toBe(1)
  })
})

describe('admin reorder and BribeSmart', () => {
  test('moves up and down, but cannot move past queue boundaries', () => {
    join(2)
    join(3)
    join(4)
    expect(moveQueueEntry(3, -1).position).toBe(2)
    expect(listQueue(1).map((entry) => entry.id)).toEqual([1, 3, 2])
    expect(moveQueueEntry(3, 1).position).toBe(3)
    expect(moveQueueEntry(1, -1)).toBeUndefined()
    expect(moveQueueEntry(3, 1)).toBeUndefined()
    expect(moveQueueEntry(1, 0)).toBeUndefined()
    expect(moveQueueEntry(999, -1)).toBeUndefined()
  })

  test('skips a spot for $3 and records the purchase in History', () => {
    join(2)
    join(3)
    join(4)
    const result = purchaseQueueAdvance(3, 'spots', 1)
    expect(result.position).toBe(2)
    expect(result.skips[0]).toMatchObject({ from: 3, to: 2, price: 3 })
    expect(store.history.find((h) => h.queueEntryId === 3).bribe).toBe(3)
  })

  test('moves to front for $20 and serves the new first party', () => {
    join(2)
    join(3)
    join(4)
    const result = purchaseQueueAdvance(3, 'front')
    expect(result.position).toBe(1)
    expect(result.skips[0]).toMatchObject({ from: 3, to: 1, price: 20 })
    expect(serveNext().id).toBe(3)
    expect(store.history.find((h) => h.queueEntryId === 3)).toMatchObject({ bribe: 20, status: 'Done' })
  })

  test('rejects invalid advancements without changing queue order', () => {
    join(2)
    join(3)
    join(4)
    const before = listQueue(1).map((entry) => entry.id)
    expect(purchaseQueueAdvance(1, 'front')).toBeUndefined()
    expect(purchaseQueueAdvance(3, 'spots', 2)).toBeUndefined() // regular skips cannot reach #1
    expect(purchaseQueueAdvance(3, 'spots', 0)).toBeUndefined()
    expect(purchaseQueueAdvance(3, 'spots', 1.5)).toBeUndefined()
    expect(purchaseQueueAdvance(3, 'invalid')).toBeUndefined()
    expect(purchaseQueueAdvance(999, 'front')).toBeUndefined()
    expect(listQueue(1).map((entry) => entry.id)).toEqual(before)
  })

  test('keeps new entrants behind previously reordered parties', () => {
    join(2)
    join(3)
    join(4)
    moveQueueEntry(3, -1)
    leaveQueue(1)
    join(5)
    expect(listQueue(1).map((entry) => entry.id)).toEqual([3, 2, 4])
  })
})