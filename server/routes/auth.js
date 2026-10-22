import { Router } from 'express'
import { findUserByPhone, loginUser, registerUser } from '../logic/authLogic.js'
import { requireLogin } from '../middleware/auth.js'
import { hasErrors, validateLogin, validateRegister } from '../validators/authValidator.js'

const router = Router()

// POST /api/auth/register   body: { name, phone, email, smsOptIn }
// Creates a regular user and logs them in. Returns { token, user }.
router.post('/register', (req, res) => {
  const errors = validateRegister(req.body)
  if (hasErrors(errors)) {
    return res.status(400).json({ error: 'Some fields are invalid.', fields: errors })
  }
  if (findUserByPhone(req.body.phone)) {
    // 409 = conflicts with something that already exists
    return res.status(409).json({
      error: 'An account with this phone number already exists.',
      fields: { phone: 'This phone number is already registered. Try signing in.' },
    })
  }

  res.status(201).json(registerUser(req.body))
})

// POST /api/auth/login   body: { name, phone }
// Returns { token, user }. The page sends users or admins to different dashboards using user.role.
router.post('/login', (req, res) => {
  const errors = validateLogin(req.body)
  if (hasErrors(errors)) {
    return res.status(400).json({ error: 'Some fields are invalid.', fields: errors })
  }

  const result = loginUser(req.body.name, req.body.phone)
  if (!result) {
    return res.status(401).json({ error: 'No account matches that name and phone number.' })
  }
  res.json(result)
})

// GET /api/auth/me   header: Authorization: Bearer <token>
// Who is logged in. Other pages (dashboards, header) can use this for the user's name and role.
router.get('/me', requireLogin, (req, res) => {
  res.json(req.user)
})

export default router
