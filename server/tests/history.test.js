import {beforeEach, describe, expect, test} from 'vitest'
import { resetStore } from '../data/store'
import {createHistory, getHistoryById, listHistory, updateHistory} from '../logic/historyLogic.js'

//More or less another copy and paste but for History stuff

beforeEach(() => {
    resetStore()
})

describe('listHistory', () => {
    test('Returns history list', () => {
        //Mock entry has 3 items, expected to have 3
        expect(listHistory()).toHaveLength(3)
    })
})

describe('getHistoryById', () => {
    test('Finds a history that exists', () => {
        expect(getHistoryById(1).service).toBe('Dine-in · Party of 1–2')
    })

    test('Returns undefined for an ID that does not exist', () => {
        expect(getHistoryById(999)).toBeUndefined()
    })
})

//Valid history
const NEW_HIST = {
    service: "Backdoor Seating",
    date: '10-15-2026',
    bribe: 86.25,
    status: 'Entered'
}

describe('createHistory', () => {
    test('Adds history with next ID', () => {
        const history = createHistory(NEW_HIST)
        expect(history.id).toBe(4)
        expect(listHistory()).toHaveLength(4)
        expect(getHistoryById(4).service).toBe('Backdoor Seating')
    })

    test('Trims extra spaces off name', () => {
        const history = createHistory({...NEW_HIST, service: '   Booth    '})
        expect(history.service).toBe('Booth')
    })

    test('Ignore fields a History does not have', () => {
        const history = createHistory({...NEW_HIST, id: 2345, present: false})
        expect(history.id).toBe(4)
        expect(history.present).toBeUndefined()
    })
})

describe('updateHistory', () => {
    test('Replaces the Fields and keeps ID', () => {
        const history = updateHistory(3, {...NEW_HIST, service: 'Balcony'})
        expect(history.id).toBe(3)
        expect(history.service).toBe('Balcony')
    })

    test('Returns undefined for an ID that does not exist', () => {
        expect(updateHistory(6734, NEW_HIST)).toBeUndefined()
    })
})