import request from 'supertest'
import { beforeEach, describe, expect, test } from 'vitest'
import app from '../app.js'
import { resetDatabase } from '../data/db.js'
import { loginUser } from '../logic/authLogic.js'

// Route tests: Supertest sends fake HTTP requests to the app, no real server needed.
// googled and used supertest to walk me through this...pretty much have no clue how it works..yet..

// Creating and editing services is staff-only, so those tests log in as the seeded admin first
// and send the token in the Authorization header.
let adminToken

// Services and logins are both in the database now, so resetting it is enough.
beforeEach(() => {
  resetDatabase()
  adminToken = loginUser('Admin', '9035550100').token
})

describe('GET /api/services', () => {
  test('returns every service as JSON', async () => {
    const res = await request(app).get('/api/services')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(4)
  })
})

describe('GET /api/services/:id', () => {
  test('returns one service', async () => {
    const res = await request(app).get('/api/services/1')
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Dine-in · Party of 1–2')
  })

  test('returns 400 when the id is not a number', async () => {
    const res = await request(app).get('/api/services/abc')
    expect(res.status).toBe(400)
  })

  test('returns 404 when the service does not exist', async () => {
    const res = await request(app).get('/api/services/999')
    expect(res.status).toBe(404)
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

describe('POST /api/services', () => {
  test('creates a service and returns it with 201', async () => {
    const res = await request(app).post('/api/services').set('Authorization', `Bearer ${adminToken}`).send(CHEFS_COUNTER)
    expect(res.status).toBe(201)
    expect(res.body.id).toBe(5)
    expect(res.body.name).toBe("Chef's counter")

    // it shows up in the list afterwards
    const list = await request(app).get('/api/services')
    expect(list.body).toHaveLength(5)
  })

  test('returns 400 with a message per field when input is invalid', async () => {
    const res = await request(app).post('/api/services').set('Authorization', `Bearer ${adminToken}`).send({ ...CHEFS_COUNTER, name: '', duration: 500 })
    expect(res.status).toBe(400)
    expect(res.body.fields.name).toBe('Service name is required.')
    expect(res.body.fields.duration).toBe('Expected duration must be between 1 and 240 minutes.')
    expect(res.body.fields.description).toBe('')
  })

  test('returns 400 when the body is missing', async () => {
    const res = await request(app).post('/api/services').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(400)
  })

  test('returns 400 for a duplicate name', async () => {
    const res = await request(app).post('/api/services').set('Authorization', `Bearer ${adminToken}`).send({ ...CHEFS_COUNTER, name: 'Patio' })
    expect(res.status).toBe(400)
    expect(res.body.fields.name).toBe('Another service already has this name.')
  })
})

describe('only staff can create or edit services', () => {
  test('401 when not logged in', async () => {
    const res = await request(app).post('/api/services').send(CHEFS_COUNTER)
    expect(res.status).toBe(401)
  })

  test('403 for a regular user', async () => {
    const userToken = loginUser('Justin Hendrix', '7135550123').token
    const res = await request(app).put('/api/services/4').set('Authorization', `Bearer ${userToken}`).send(CHEFS_COUNTER)
    expect(res.status).toBe(403)
  })
})

describe('PUT /api/services/:id', () => {
  test('updates a service', async () => {
    const res = await request(app).put('/api/services/4').set('Authorization', `Bearer ${adminToken}`).send({ ...CHEFS_COUNTER, name: 'Patio' })
    expect(res.status).toBe(200)
    expect(res.body.duration).toBe(90)

    const patio = await request(app).get('/api/services/4')
    expect(patio.body.isOpen).toBe(true)
  })

  test('returns 400 when the input is invalid', async () => {
    const res = await request(app).put('/api/services/4').set('Authorization', `Bearer ${adminToken}`).send({ ...CHEFS_COUNTER, priority: 'urgent' })
    expect(res.status).toBe(400)
    expect(res.body.fields.priority).toBe('Priority level must be high, medium, or low.')
  })

  test('returns 400 when the id is not a number', async () => {
    const res = await request(app).put('/api/services/abc').set('Authorization', `Bearer ${adminToken}`).send(CHEFS_COUNTER)
    expect(res.status).toBe(400)
  })

  test('returns 404 when the service does not exist', async () => {
    const res = await request(app).put('/api/services/999').set('Authorization', `Bearer ${adminToken}`).send(CHEFS_COUNTER)
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/services/:id', () => {
  test('deletes a service nobody has queued for and sends it back', async () => {
    const res = await request(app).delete('/api/services/2').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Dine-in · Party of 3–6')

    const gone = await request(app).get('/api/services/2')
    expect(gone.status).toBe(404)
  })

  test('returns 409 when guests have queued for it', async () => {
    const res = await request(app).delete('/api/services/1').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/Close it instead/)
  })

  test('returns 400 when the id is not a number', async () => {
    const res = await request(app).delete('/api/services/abc').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(400)
  })

  test('returns 404 when the service does not exist', async () => {
    const res = await request(app).delete('/api/services/999').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(404)
  })

  test('401 when not logged in', async () => {
    const res = await request(app).delete('/api/services/2')
    expect(res.status).toBe(401)
  })
})

describe('app-wide handling', () => {
  test('health check works', async () => {
    const res = await request(app).get('/api/health')
    expect(res.body).toEqual({ status: 'ok' })
  })

  test('unknown routes return 404', async () => {
    const res = await request(app).get('/api/nope')
    expect(res.status).toBe(404)
  })

  test('broken JSON body returns 400', async () => {
    const res = await request(app)
      .post('/api/services')
      .set('Content-Type', 'application/json')
      .send('{ not json')
    expect(res.status).toBe(400)
  })
})
