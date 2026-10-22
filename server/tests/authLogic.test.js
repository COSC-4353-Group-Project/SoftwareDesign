import { beforeEach, describe, expect, test } from 'vitest'
import { resetStore, store } from '../data/store.js'
import { getUserByToken, loginUser, registerUser } from '../logic/authLogic.js'

// Unit tests for accounts and sessions. Starting users (data/store.js):
//   Admin / 903-555-0100 (admin), Justin Hendrix / 713-555-0123 (user)

beforeEach(() => {
  resetStore()
})

describe('registerUser', () => {
  test('creates a regular user with a cleaned-up phone number', () => {
    const { user } = registerUser({ name: ' Jordan Lee ', phone: '(713) 555-0199', email: '' })
    expect(user.id).toBe(3)
    expect(user.name).toBe('Jordan Lee')
    expect(user.phone).toBe('7135550199')
    expect(user.role).toBe('user')
    expect(store.users).toHaveLength(3)
  })

  test('logs the new user in right away', () => {
    const { token, user } = registerUser({ name: 'Jordan Lee', phone: '7135550199' })
    expect(getUserByToken(token)).toBe(user)
  })
})

describe('loginUser', () => {
  test('works with any phone format and any upper/lower case name', () => {
    const result = loginUser('admin', '(903) 555-0100')
    expect(result.user.role).toBe('admin')
    expect(result.token).toBeTruthy()
  })

  test('fails when the name does not match the phone', () => {
    expect(loginUser('Someone Else', '9035550100')).toBeUndefined()
  })

  test('fails for a phone with no account', () => {
    expect(loginUser('Admin', '2815550000')).toBeUndefined()
  })
})

describe('getUserByToken', () => {
  test('returns undefined for a token that was never handed out', () => {
    expect(getUserByToken('made-up-token')).toBeUndefined()
  })
})
