import request from 'supertest'
import { beforeEach, describe, expect, test } from 'vitest'
import app from '../app.js'
import { resetStore } from '../data/store.js'

// Route tests: Supertest sends fake HTTP requests to the app, no real server needed.
// googled and used supertest to walk me through this...pretty much have no clue how it works..yet..
beforeEach(() => {
  resetStore()
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
