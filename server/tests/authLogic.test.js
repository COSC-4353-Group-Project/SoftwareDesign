import { beforeEach, describe, expect, test } from 'vitest'
import { db, resetDatabase } from '../data/db.js'
import {
  findUserByPhone, getUserById, getUserByToken, loginUser, logoutUser, registerUser,
} from '../logic/authLogic.js'

// Unit tests for accounts and sessions. Starting users (data/db.js):
//   Admin / 903-555-0100 (admin), Justin Hendrix / 713-555-0123 (user)

beforeEach(() => {
  resetDatabase()
})

const JORDAN = { name: ' Jordan Lee ', phone: '(713) 555-0199', smsOptIn: true }

describe('registerUser', () => {
  test('creates a regular user with a cleaned-up name and phone', () => {
    const { user } = registerUser(JORDAN)
    expect(user).toEqual({
      id: 3,
      name: 'Jordan Lee',
      phone: '7135550199',
      smsOptIn: true,
      role: 'user',
    })
  })

  test('saves a row in both user tables', () => {
    registerUser(JORDAN)
    expect(db.prepare('SELECT COUNT(*) AS count FROM user_credentials').get().count).toBe(3)
    expect(db.prepare('SELECT full_name FROM user_profiles WHERE user_id = 3').get().full_name).toBe('Jordan Lee')
  })

  test('the login table has a hash, not the phone itself', () => {
    registerUser(JORDAN)
    const row = db.prepare('SELECT phone_hash FROM user_credentials WHERE id = 3').get()
    expect(row.phone_hash).not.toContain('7135550199')
  })

  test('logs the new user in right away', () => {
    const { token, user } = registerUser(JORDAN)
    expect(getUserByToken(token)).toEqual(user)
  })

  test('the database rejects a second account with the same phone', () => {
    registerUser(JORDAN)
    expect(() => registerUser({ ...JORDAN, name: 'Someone Else', phone: '713-555-0199' })).toThrow(/UNIQUE/)
  })
})

describe('loginUser', () => {
  test('works with any phone format and any upper/lower case name', () => {
    const result = loginUser('admin', '(903) 555-0100')
    expect(result.user.role).toBe('admin')
    expect(result.token).toBeTruthy()
  })

  test('saves the session in the sessions table', () => {
    const { token } = loginUser('Justin Hendrix', '7135550123')
    expect(db.prepare('SELECT user_id FROM sessions WHERE token = ?').get(token).user_id).toBe(2)
  })

  test('fails when the name does not match the phone', () => {
    expect(loginUser('Someone Else', '9035550100')).toBeUndefined()
  })

  test('fails for a phone with no account', () => {
    expect(loginUser('Admin', '2815550000')).toBeUndefined()
  })

  test('fails if the saved hash does not match the phone', () => {
    // someone edits the phone in user_profiles directly, the hash still has the old one
    db.prepare("UPDATE user_profiles SET phone = '2815550000' WHERE user_id = 1").run()
    expect(loginUser('Admin', '2815550000')).toBeUndefined()
  })
})

describe('finding users', () => {
  test('findUserByPhone works with any phone format', () => {
    expect(findUserByPhone('713-555-0123').id).toBe(2)
    expect(findUserByPhone('2815550000')).toBeUndefined()
  })

  test('getUserById never includes the phone hash', () => {
    expect(getUserById(1)).not.toHaveProperty('phone_hash')
    expect(getUserById(999)).toBeUndefined()
  })
})

describe('getUserByToken and logoutUser', () => {
  test('returns undefined for a token that was never handed out', () => {
    expect(getUserByToken('made-up-token')).toBeUndefined()
  })

  test('a token stops working after logging out', () => {
    const { token } = loginUser('Justin Hendrix', '7135550123')
    logoutUser(token)
    expect(getUserByToken(token)).toBeUndefined()
  })
})
