import {beforeEach, describe, expect, test} from 'vitest'
import { resetStore, store } from '../data/store'
import {createNotification, notifyQueueJoined, notifyAlmostReady, listNotifications} from '../logic/notificationLogic'

//Doing the tests the way it is now because I'm unable to find any mock data
//If we have any for Notifications

beforeEach(() => {
    resetStore()
})

describe('listNotifications', () => {
    test('Return notification list (There should be no notifications)', () => {
        expect(listNotifications('user1')).toHaveLength(0)
    })
})

describe('createNotification', () => {
    test('Creates a notification', () => {
        const NOTI = {userId: 'user1', id: 3, position: 3}
        const notification = notifyQueueJoined(NOTI, 'Backdoor Seating')

        expect(notification).toMatchObject({
            entryId: 3,
            type: 'joined',
            title: 'You joined the waitlist',
            body: "Backdoor Seating · you're #3 in line"
        })
        expect(notification.createdAt).toBeDefined()
        expect(store.notifications).toHaveLength(1)
    })
})

//I don't know how to implement this properly
//I can only figure out that it notifies users when queued up to 3
//Past 4, no notification should be sent
describe('notifyAlmostReady', () => {
    test('Notifies user when almost ready', () => {
        const queue = [
            {userId: 'user1', id: 1},
            {userId: 'user2', id: 2},
            {userId: 'user3', id: 3},
            //Notify should skip user 4
            {userId: 'user4', id: 4}
        ]

        notifyAlmostReady(queue)
        expect(store.notifications).toHaveLength(3)
    })
})