import { randomUUID } from 'node:crypto'
import { store } from '../data/store.js'
import { normalizePhone } from '../validators/authValidator.js'


// How login works
//   1. log in with name + phone
//   2. the server makes a random token and remembers ( token, userId ) in store.sessions
//   3. the browser saves the token and sends it back on later requests
//        Authorization: Bearer <token>
//   4. middleware/auth.js uses getUserByToken to find out who is asking, can be used to gatekeep.

// Returns the user with that phone (any format), or undefined. googled function for phonenormal.
export function findUserByPhone(phone) {
  const normalized = normalizePhone(phone)
  return store.users.find((user) => user.phone === normalized)
}

// Makes a new session for the user and returns its token.
function createSession(user) {
  const token = randomUUID() // long random string nobody can guess, unless very lucky. 
  store.sessions.push({ token, userId: user.id })
  return token
}

// Creates a 'user' account (never admin) and logs them in. Returns { token, user }. admin should be made later.
export function registerUser(body) {
  let biggestId = 0
  for (const user of store.users) {
    if (user.id > biggestId) {
      biggestId = user.id
    }
  }

  const user = {
    id: biggestId + 1,
    name: body.name.trim(),
    phone: normalizePhone(body.phone),
    smsOptIn: body.smsOptIn === true,
    role: 'user',
  }
  store.users.push(user)

  return { token: createSession(user), user }
}

// Returns { token, user } if the name matches the account with that phone
// (ignoring upper/lower case), or undefined if not.
export function loginUser(name, phone) {
  const user = findUserByPhone(phone)
  if (!user || user.name.toLowerCase() !== name.trim().toLowerCase()) {
    return undefined
  }
  return { token: createSession(user), user }
}

// Returns the logged-in user for a token, or undefined if the token is unknown.
export function getUserByToken(token) {
  const session = store.sessions.find((s) => s.token === token)
  if (!session) {
    return undefined
  }
  return store.users.find((user) => user.id === session.userId)
}
