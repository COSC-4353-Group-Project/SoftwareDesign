import {beforeEach, describe, expect, test} from 'vitest'
import { db, resetDatabase } from '../data/db.js'
import {notifyQueueJoined, notifyAlmostReady, listNotifications} from '../logic/notificationLogic'

// A4: notifications live in the database now, so these use the seeded data from db.js:
// user 1 = Admin, user 2 = Justin, queue entries 1-3 are Justin's past visits.
// The ids have to be real because the table won't save a notification for a user or entry that doesn't exist.

beforeEach(() => {
    resetDatabase()
})

describe('listNotifications', () => {
    test('Return notification list (There should be no notifications)', () => {
        expect(listNotifications(2)).toHaveLength(0)
    })

    test('Newest notification comes first', () => {
        notifyQueueJoined({userId: 2, id: 1, position: 4}, 'Patio')
        notifyQueueJoined({userId: 2, id: 2, position: 2}, 'Bar Seating')

        const list = listNotifications(2)
        expect(list[0].entryId).toBe(2)
        expect(list[1].entryId).toBe(1)
    })
})

describe('createNotification', () => {
    test('Creates a notification', () => {
        const NOTI = {userId: 2, id: 3, position: 3}
        const notification = notifyQueueJoined(NOTI, 'Backdoor Seating')

        expect(notification).toMatchObject({
            userId: 2,
            entryId: 3,
            type: 'joined',
            title: 'You joined the waitlist',
            body: "Backdoor Seating · you're #3 in line"
        })
        expect(notification.createdAt).toBeDefined()
        expect(listNotifications(2)).toHaveLength(1)
    })

    test('Saves the notification in the database', () => {
        const notification = notifyQueueJoined({userId: 2, id: 3, position: 3}, 'Bar Seating')

        const saved = db.prepare('SELECT * FROM notifications WHERE id = ?').get(notification.id)
        expect(saved.user_id).toBe(2)
        expect(saved.queue_entry_id).toBe(3)
        expect(saved.type).toBe('joined')
    })
})

//I don't know how to implement this properly
//I can only figure out that it notifies users when queued up to 3
//Past 4, no notification should be sent
describe('notifyAlmostReady', () => {
    test('Notifies user when almost ready', () => {
        const queue = [
            {userId: 2, id: 1},
            {userId: 2, id: 2},
            {userId: 2, id: 3},
            //Notify should skip the 4th person (Admin here)
            {userId: 1, id: 1}
        ]

        notifyAlmostReady(queue)
        expect(listNotifications(2)).toHaveLength(3)
        expect(listNotifications(1)).toHaveLength(0)
    })

    test('Does not notify the same entry twice', () => {
        const queue = [{userId: 2, id: 1}]

        notifyAlmostReady(queue)
        notifyAlmostReady(queue)
        expect(listNotifications(2)).toHaveLength(1)
    })
})
