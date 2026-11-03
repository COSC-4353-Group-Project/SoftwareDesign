import request from 'supertest'
import { beforeEach, describe, expect, test } from 'vitest'
import app from '../app.js'
import { resetDatabase } from '../data/db.js'

// Route tests for /api/auth. Seeded admin: Admin / 903-555-0100

beforeEach(() => {
  resetDatabase()
})

const JORDAN = { name: 'Jordan Lee', phone: '(713) 555-0199', smsOptIn: true }
const ADMIN_LOGIN = { name: 'Admin', phone: '903-555-0100' }

describe('POST /api/auth/register', () => {
  test('creates the account and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send(JORDAN)
    expect(res.status).toBe(201)
    expect(res.body.token).toBeTruthy()
    expect(res.body.user.role).toBe('user')
  })

  test('400 with a message per field for bad input', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...JORDAN, name: '' })
    expect(res.status).toBe(400)
    expect(res.body.fields.name).toBe('Name is required come on.')
  })

  test('409 when the phone is already registered', async () => {
    await request(app).post('/api/auth/register').send(JORDAN)
    const res = await request(app).post('/api/auth/register').send({ ...JORDAN, phone: '713-555-0199' })
    expect(res.status).toBe(409)
  })

  test('the new account can log in afterwards', async () => {
    await request(app).post('/api/auth/register').send(JORDAN)
    const res = await request(app).post('/api/auth/login').send({ name: 'jordan lee', phone: '7135550199' })
    expect(res.status).toBe(200)
    expect(res.body.user.name).toBe('Jordan Lee')
  })
})

describe('POST /api/auth/login', () => {
  test('logs in and returns the role', async () => {
    const res = await request(app).post('/api/auth/login').send(ADMIN_LOGIN)
    expect(res.status).toBe(200)
    expect(res.body.user.role).toBe('admin')
  })

  test('401 when no account matches', async () => {
    const res = await request(app).post('/api/auth/login').send({ name: 'Admin', phone: '281-555-0000' })
    expect(res.status).toBe(401)
  })

  test('400 when fields are missing', async () => {
    const res = await request(app).post('/api/auth/login').send({})
    expect(res.status).toBe(400)
  })
})

describe('GET /api/auth/me', () => {
  test('returns the logged-in user without the phone hash', async () => {
    const login = await request(app).post('/api/auth/login').send(ADMIN_LOGIN)
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login.body.token}`)
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Admin')
    expect(res.body.phone_hash).toBeUndefined()
  })

  test('401 without a token', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/auth/logout', () => {
  test('the token stops working afterwards', async () => {
    const login = await request(app).post('/api/auth/login').send(ADMIN_LOGIN)
    const auth = { Authorization: `Bearer ${login.body.token}` }

    const res = await request(app).post('/api/auth/logout').set(auth)
    expect(res.status).toBe(200)

    const me = await request(app).get('/api/auth/me').set(auth)
    expect(me.status).toBe(401)
  })
})
