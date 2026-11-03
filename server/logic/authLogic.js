import { randomUUID } from 'node:crypto'
import { db } from '../data/db.js'
import { hashPassword, verifyPassword } from './passwordLogic.js'
import { normalizePhone } from '../validators/authValidator.js'


// How login works (A4: everything is in the database now, not store.js)
//   1. log in with name + phone. the phone is the password
//   2. the server makes a random token and saves ( token, user_id ) in the sessions table
//   3. the browser saves the token and sends it back on later requests
//        Authorization: Bearer <token>
//   4. middleware/auth.js uses getUserByToken to find out who is asking, can be used to gatekeep.
// Since sessions are saved, restarting the server doesn't log everyone out anymore.

// A user is split across 2 tables: user_credentials (phone_hash, role) and
// user_profiles (name, phone, sms). This SELECT glues them back together into one object.
// phone_hash is left out on purpose so it never gets sent to the browser, big ol saftey issue with that
const SELECT_USER = `
  SELECT
    user_credentials.id AS id,
    user_profiles.full_name AS name,
    user_profiles.phone AS phone,
    user_profiles.sms_opt_in AS sms_opt_in,
    user_credentials.role AS role
  FROM user_credentials
  JOIN user_profiles ON user_profiles.user_id = user_credentials.id
`

// Turns a row into the user object the pages use (sms_opt_in 1/0 -> smsOptIn true/false).
function toUser(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    smsOptIn: row.sms_opt_in === 1,
    role: row.role,
  }
}

// Returns the user with that id, or undefined.
export function getUserById(id) {
  const row = db.prepare(`${SELECT_USER} WHERE user_credentials.id = ?`).get(id)
  if (!row) {
    return undefined
  }
  return toUser(row)
}

// Returns the user with that phone (any format), or undefined. googled function for phonenormal.
export function findUserByPhone(phone) {
  const row = db.prepare(`${SELECT_USER} WHERE user_profiles.phone = ?`).get(normalizePhone(phone))
  if (!row) {
    return undefined
  }
  return toUser(row)
}

// Makes a new session for the user and returns its token.
function createSession(userId) {
  const token = randomUUID() // long random string nobody can guess, unless very lucky XD
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, userId)
  return token
}

// Creates a 'user' account (never admin) and logs them in. Returns { token, user }.
// The route checks the phone isn't taken first. Two inserts: the login info (phone hashed),
// then the profile that points at it with the new id.
export function registerUser(body) {
  const phone = normalizePhone(body.phone)

  const credentials = db.prepare(
    'INSERT INTO user_credentials (phone_hash, role) VALUES (?, ?)'
  ).run(hashPassword(phone), 'user')

  const userId = credentials.lastInsertRowid
  db.prepare(
    'INSERT INTO user_profiles (user_id, full_name, phone, sms_opt_in) VALUES (?, ?, ?, ?)'
  ).run(userId, body.name.trim(), phone, body.smsOptIn === true ? 1 : 0)

  return { token: createSession(userId), user: getUserById(userId) }
}

// Returns { token, user } if the name matches the account with that phone
// (ignoring upper/lower case) and the phone matches the saved hash, or undefined if not.
// Same answer for every way it can fail, so nobody can use the login form
// to find out which phones have accounts. common cybersec failure.
export function loginUser(name, phone) {
  const user = findUserByPhone(phone)
  if (!user || user.name.toLowerCase() !== name.trim().toLowerCase()) {
    return undefined
  }

  // the "check the password" step: hash what they typed and compare it to phone_hash
  const { phone_hash } = db.prepare('SELECT phone_hash FROM user_credentials WHERE id = ?').get(user.id)
  if (!verifyPassword(normalizePhone(phone), phone_hash)) {
    return undefined
  }

  return { token: createSession(user.id), user }
}

// Returns the logged-in user for a token, or undefined if the token is unknown.
export function getUserByToken(token) {
  const session = db.prepare('SELECT user_id FROM sessions WHERE token = ?').get(token)
  if (!session) {
    return undefined
  }
  return getUserById(session.user_id)
}

// Sign out: forget that token so it stops working.
export function logoutUser(token) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
}
