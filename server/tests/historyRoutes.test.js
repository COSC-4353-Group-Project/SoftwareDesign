import request from 'supertest'
import { beforeEach, describe, expect, test } from 'vitest'
import app from '../app.js'
import { resetDatabase } from '../data/db.js'

// Route tests for /api/history. The starting data has 3 history rows (seeded in data/db.js).

beforeEach(() => {
  resetDatabase()
})

// A valid history row, same shape the API returns
const NEW_ROW = { service: 'Patio', date: '10-15-2026', bribe: 5, status: 'Done' }

describe('GET /api/history', () => {
  test('returns every history row', async () => {
    const res = await request(app).get('/api/history')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(3)
  })
})

describe('GET /api/history/:id', () => {
  test('returns one row', async () => {
    const res = await request(app).get('/api/history/1')
    expect(res.status).toBe(200)
    expect(res.body.service).toBe('Dine-in · Party of 1–2')
  })

  test('400 when the id is not a number, 404 when it does not exist', async () => {
    expect((await request(app).get('/api/history/abc')).status).toBe(400)
    expect((await request(app).get('/api/history/999')).status).toBe(404)
  })
})

describe('POST /api/history', () => {
  test('creates a row and returns it with 201', async () => {
    const res = await request(app).post('/api/history').send(NEW_ROW)
    expect(res.status).toBe(201)
    expect(res.body.id).toBe(4)

    const list = await request(app).get('/api/history')
    expect(list.body).toHaveLength(4)
  })

  test('400 with a message per field when input is invalid', async () => {
    const res = await request(app).post('/api/history').send({ ...NEW_ROW, bribe: -5 })
    expect(res.status).toBe(400)
    expect(res.body.fields.bribe).toBe('Bribe amount expected to be a value greater than 0.00.')
  })

  test('400 when the body is missing', async () => {
    const res = await request(app).post('/api/history')
    expect(res.status).toBe(400)
  })
})

describe('PUT /api/history/:id', () => {
  test('updates a row and keeps its id', async () => {
    const res = await request(app).put('/api/history/3').send({ ...NEW_ROW, status: 'Canceled' })
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(3)
    expect(res.body.status).toBe('Canceled')
  })

  test('400 when the input is invalid', async () => {
    const res = await request(app).put('/api/history/3').send({ ...NEW_ROW, date: '' })
    expect(res.status).toBe(400)
  })

  test('400 when the id is not a number, 404 when it does not exist', async () => {
    expect((await request(app).put('/api/history/abc').send(NEW_ROW)).status).toBe(400)
    expect((await request(app).put('/api/history/999').send(NEW_ROW)).status).toBe(404)
  })
})
