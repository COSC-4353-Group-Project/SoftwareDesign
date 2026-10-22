import { getUserByToken } from '../logic/authLogic.js'

// Middleware runs BEFORE a route. Put it in front of any route that needs it:
//   router.get('/me', requireLogin, (req, res) => { ... req.user ... })
//   router.post('/', requireAdmin, (req, res) => { ... })
// If the check passes it calls next() to continue to the route, otherwise it sends the error.

// Reads "Authorization: Bearer <token>" and returns the matching user, or undefined.
function userFromRequest(req) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return undefined
  }
  const token = header.slice('Bearer '.length)
  return getUserByToken(token)
}

// Any logged-in user. Sets req.user so the route knows who is asking.
export function requireLogin(req, res, next) {
  const user = userFromRequest(req)
  if (!user) {
    // 401 = we don't know who you are
    return res.status(401).json({ error: 'Please log in first.' })
  }
  req.user = user
  next()
}

// Staff only.
export function requireAdmin(req, res, next) {
  const user = userFromRequest(req)
  if (!user) {
    return res.status(401).json({ error: 'Please log in first.' })
  }
  if (user.role !== 'admin') {
    // 403 = we know who you are, but you aren't allowed
    return res.status(403).json({ error: 'Only staff can do this.' })
  }
  req.user = user
  next()
}
