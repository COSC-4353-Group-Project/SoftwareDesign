import request from 'supertest'
import { beforeEach, describe, expect, test } from 'vitest'
import app from '../app.js'
import { resetDatabase } from '../data/db.js'
import { loginUser, registerUser } from '../logic/authLogic.js'
import { joinQueue } from '../logic/queueLogic.js'

// Route tests for /api/history. The starting data has 3 history rows, all Justin's (seeded in data/db.js).
// BUG FIX (Justin, 11-06): the POST/PUT tests are gone along with those routes (history is a read-only
// view now), and the list / look-up tests log in as admin since those routes are staff-only.

let adminToken
let justinToken

beforeEach(() => {
  resetDatabase()
  adminToken = loginUser('Admin', '9035550100').token
  justinToken = loginUser('Justin Hendrix', '7135550123').token
})

describe('GET /api/history', () => {
  test('returns every history row to staff', async () => {
    const res = await request(app).get('/api/history').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(3)
  })

  test('401 when not logged in, 403 for a regular guest', async () => {
    expect((await request(app).get('/api/history')).status).toBe(401)
    expect((await request(app).get('/api/history').set('Authorization', `Bearer ${justinToken}`)).status).toBe(403)
  })
})

describe('GET /api/history/mine', () => {
  test("returns only the logged-in guest's rows, newest first", async () => {
    // a second guest joins a line, which must not show up in Justin's history
    const anaya = registerUser({ name: 'Anaya', phone: '7135550999', smsOptIn: false }).user
    joinQueue(anaya.id, 1, 2, 'Dine-in')

    const res = await request(app).get('/api/history/mine').set('Authorization', `Bearer ${justinToken}`)
    expect(res.status).toBe(200)
    expect(res.body.map((row) => row.id)).toEqual([3, 2, 1])
    expect(res.body.every((row) => row.userId === 2)).toBe(true)
  })

  test('401 when not logged in', async () => {
    expect((await request(app).get('/api/history/mine')).status).toBe(401)
  })
})

describe('GET /api/history/:id', () => {
  test('returns one row to staff', async () => {
    const res = await request(app).get('/api/history/1').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.service).toBe('Dine-in · Party of 1–2')
  })

  test('400 when the id is not a number, 404 when it does not exist', async () => {
    expect((await request(app).get('/api/history/abc').set('Authorization', `Bearer ${adminToken}`)).status).toBe(400)
    expect((await request(app).get('/api/history/999').set('Authorization', `Bearer ${adminToken}`)).status).toBe(404)
  })

  test('403 for a regular guest', async () => {
    expect((await request(app).get('/api/history/1').set('Authorization', `Bearer ${justinToken}`)).status).toBe(403)
  })
})

describe('history is read-only', () => {
  test('POST and PUT are not routes anymore (404)', async () => {
    const row = { service: 'Patio', date: '10-15-2026', bribe: 5, status: 'Done' }
    expect((await request(app).post('/api/history').send(row)).status).toBe(404)
    expect((await request(app).put('/api/history/3').send(row)).status).toBe(404)
  })
})
