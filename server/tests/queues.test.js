import request from 'supertest'
import { beforeEach, describe, expect, test } from 'vitest'
import app from '../app.js'
import { db, resetDatabase } from '../data/db.js'
import { loginUser, registerUser } from '../logic/authLogic.js'

let adminToken, userToken, secondToken
const valid = { serviceId: 1, partySize: 2, seatingPreference: 'Dine-in' }

beforeEach(() => {
  resetDatabase()
  adminToken = loginUser('Admin', '9035550100').token
  userToken = loginUser('Justin Hendrix', '7135550123').token
  secondToken = registerUser({ name: 'Anaya', phone: '7135550999', smsOptIn: false }).token
})

function auth(token) { return { Authorization: `Bearer ${token}` } }
async function join(token = userToken, body = valid) {
  return request(app).post('/api/queues/join').set(auth(token)).send(body)
}

describe('POST /api/queues/join', () => {
  test('creates a queue entry for the logged-in customer', async () => {
    const res = await join()
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ userId: 2, position: 1, status: 'waiting' })
  })

  test('requires login and rejects duplicate active joins', async () => {
    expect((await request(app).post('/api/queues/join').send(valid)).status).toBe(401)
    expect((await join()).status).toBe(201)
    expect((await join()).status).toBe(409)
  })

  test('returns field errors for invalid or closed service requests', async () => {
    const bad = await join(userToken, { ...valid, partySize: 9 })
    expect(bad.status).toBe(400)
    expect(bad.body.fields).toHaveProperty('partySize')
    const closed = await join(userToken, { ...valid, serviceId: 4 })
    expect(closed.status).toBe(400)
    expect(closed.body.fields).toHaveProperty('serviceId')
  })
})

describe('queue retrieval and cancellation', () => {
  test('returns a service summary and rejects bad IDs', async () => {
    expect((await request(app).get('/api/queues/summary/1')).body.partiesAhead).toBe(0)
    expect((await request(app).get('/api/queues/summary/abc')).status).toBe(400)
    expect((await request(app).get('/api/queues/summary/999')).status).toBe(404)
  })

  test('only owner and admin can view an entry', async () => {
    const entry = (await join()).body
    expect((await request(app).get(`/api/queues/${entry.id}`).set(auth(userToken))).status).toBe(200)
    expect((await request(app).get(`/api/queues/${entry.id}`).set(auth(secondToken))).status).toBe(403)
    expect((await request(app).get(`/api/queues/${entry.id}`).set(auth(adminToken))).status).toBe(200)
    expect((await request(app).get('/api/queues/abc').set(auth(userToken))).status).toBe(400)
    expect((await request(app).get('/api/queues/999').set(auth(userToken))).status).toBe(404)
  })

  test('only owner can cancel; repeated cancellation fails', async () => {
    const entry = (await join()).body
    const url = `/api/queues/${entry.id}`
    expect((await request(app).delete(url).set(auth(secondToken))).status).toBe(403)
    expect((await request(app).delete(url).set(auth(userToken))).body.status).toBe('cancelled')
    expect((await request(app).delete(url).set(auth(userToken))).status).toBe(409)
  })
})

describe('administrator queue routes', () => {
  test('requires admin permissions to list queues', async () => {
    expect((await request(app).get('/api/queues/admin/all')).status).toBe(401)
    expect((await request(app).get('/api/queues/admin/all').set(auth(userToken))).status).toBe(403)
    await join()
    const res = await request(app).get('/api/queues/admin/all').set(auth(adminToken))
    expect(res.status).toBe(200)
    expect(res.body[0].guestName).toBe('Justin Hendrix')
  })

  test('moves entries and rejects invalid direction and boundary moves', async () => {
    const first = (await join()).body
    const second = (await join(secondToken)).body
    const url = `/api/queues/admin/${second.id}/move`
    expect((await request(app).patch(url).set(auth(userToken)).send({ direction: -1 })).status).toBe(403)
    expect((await request(app).patch(url).set(auth(adminToken)).send({ direction: 0 })).status).toBe(400)
    const moved = await request(app).patch(url).set(auth(adminToken)).send({ direction: -1 })
    expect(moved.status).toBe(200)
    expect(moved.body.position).toBe(1)
    expect((await request(app).patch(url).set(auth(adminToken)).send({ direction: -1 })).status).toBe(409)
    expect(first.id).not.toBe(second.id)
  })

  test('serves a chosen entry and rejects serving it again', async () => {
    const entry = (await join()).body
    const url = `/api/queues/admin/${entry.id}/serve`
    expect((await request(app).patch(url).set(auth(userToken))).status).toBe(403)
    expect((await request(app).patch(url).set(auth(adminToken))).body.status).toBe('served')
    expect((await request(app).patch(url).set(auth(adminToken))).status).toBe(409)
  })

  test('serves next, cancels remaining entries, and handles empty queues', async () => {
    expect((await request(app).post('/api/queues/admin/serve-next').set(auth(adminToken))).status).toBe(404)
    const first = (await join()).body
    const second = (await join(secondToken)).body
    expect((await request(app).post('/api/queues/admin/serve-next').set(auth(adminToken))).body.id).toBe(first.id)
    const cancelled = await request(app).delete(`/api/queues/admin/${second.id}`).set(auth(adminToken))
    expect(cancelled.body.status).toBe('cancelled')
    expect((await request(app).delete(`/api/queues/admin/${second.id}`).set(auth(adminToken))).status).toBe(409)
  })
})

describe('POST /api/queues/:entryId/advance', () => {
  test('allows only the owner to purchase a front-of-line advancement', async () => {
    await join()
    const second = (await join(secondToken)).body
    const url = `/api/queues/${second.id}/advance`
    expect((await request(app).post(url).set(auth(userToken)).send({ mode: 'front' })).status).toBe(403)
    const response = await request(app).post(url).set(auth(secondToken)).send({ mode: 'front' })
    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ position: 1, skips: [expect.objectContaining({ price: 40 })] })
  })

  test('rejects invalid selections and advancing a finished entry', async () => {
    await join()
    const second = (await join(secondToken)).body
    const url = `/api/queues/${second.id}/advance`
    expect((await request(app).post(url).set(auth(secondToken)).send({ mode: 'spots', spots: 0 })).status).toBe(400)
    expect((await request(app).post(url).set(auth(secondToken)).send({ mode: 'spots', spots: 1 })).status).toBe(409)
    await request(app).delete(`/api/queues/${second.id}`).set(auth(secondToken))
    expect((await request(app).post(url).set(auth(secondToken)).send({ mode: 'front' })).status).toBe(409)
  })
})

// JUSTIN (A4+): the page sends expectedPrice (the price it showed) so surge pricing
// can never charge someone more than they agreed to. Service 1 front of line is normally $40.
describe('POST /api/queues/:entryId/advance with expectedPrice', () => {
  // a skip bought in service 1 just now, so prices surge +15% (front of line $40 -> $46)
  function addRecentSkip(entryId) {
    db.prepare(`
      INSERT INTO queue_skips (queue_entry_id, label, from_position, to_position, price, created_at)
      VALUES (?, 'Skip 1 spot', 3, 2, 6, ?)
    `).run(entryId, new Date().toISOString())
  }

  test('buys the skip when the price still matches', async () => {
    await join()
    const second = (await join(secondToken)).body
    const res = await request(app).post(`/api/queues/${second.id}/advance`)
      .set(auth(secondToken)).send({ mode: 'front', expectedPrice: 40 })
    expect(res.status).toBe(200)
    expect(res.body.skips[0].price).toBe(40)
  })

  test('refuses if the price went up, sends the new prices, and leaves the line alone', async () => {
    const first = (await join()).body
    const second = (await join(secondToken)).body
    const url = `/api/queues/${second.id}/advance`
    addRecentSkip(first.id) // prices surge after the page loaded

    const refused = await request(app).post(url).set(auth(secondToken)).send({ mode: 'front', expectedPrice: 40 })
    expect(refused.status).toBe(409)
    expect(refused.body.priceChanged).toBe(true)
    expect(refused.body.error).toContain('$46')
    expect(refused.body.entry.skipPrices.front).toBe(46)
    expect(refused.body.entry.position).toBe(2) // didn't move
    expect(refused.body.entry.skips).toHaveLength(0) // wasn't charged

    // they saw the new price and tried again
    const bought = await request(app).post(url).set(auth(secondToken)).send({ mode: 'front', expectedPrice: 46 })
    expect(bought.status).toBe(200)
    expect(bought.body.skips[0].price).toBe(46)
  })

  test('charges the lower price if it went down', async () => {
    await join()
    const second = (await join(secondToken)).body
    const res = await request(app).post(`/api/queues/${second.id}/advance`)
      .set(auth(secondToken)).send({ mode: 'front', expectedPrice: 55 })
    expect(res.status).toBe(200)
    expect(res.body.skips[0].price).toBe(40)
  })

  test('rejects an expectedPrice that is not a number of dollars', async () => {
    await join()
    const second = (await join(secondToken)).body
    const url = `/api/queues/${second.id}/advance`
    expect((await request(app).post(url).set(auth(secondToken)).send({ mode: 'front', expectedPrice: '40' })).status).toBe(400)
    expect((await request(app).post(url).set(auth(secondToken)).send({ mode: 'front', expectedPrice: -1 })).status).toBe(400)
  })
})