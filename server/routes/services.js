import { Router } from 'express'
import { createService, getServiceById, listServices, updateService } from '../logic/serviceLogic.js'
import { requireAdmin } from '../middleware/auth.js'
import { hasErrors, validateService } from '../validators/serviceValidator.js'

// Routes stay thin: read the request, call a logic function, send JSON back.
// Anyone can list services. Only staff can create or edit them (requireAdmin).
const router = Router()

// GET /api/services
router.get('/', (req, res) => {
  res.json(listServices())
})

// GET /api/services/:id
router.get('/:id', (req, res) => {
  // URL params always arrive as strings, so turn it into a number first
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Service id must be a whole number.' })
  }

  const service = getServiceById(id)
  if (!service) {
    return res.status(404).json({ error: 'Service not found.' })
  }

  res.json(service)
})

// POST /api/services   body: { name, description, duration, priority, isOpen }
router.post('/', requireAdmin, (req, res) => {
  const errors = validateService(req.body, listServices(), null)
  if (hasErrors(errors)) {
    // fields has one message per field, so the page can show each under its input
    return res.status(400).json({ error: 'Some fields are invalid.', fields: errors })
  }

  const service = createService(req.body)
  // 201 = something new was created
  res.status(201).json(service)
})

// PUT /api/services/:id   same body as POST, replaces the service's fields
router.put('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Service id must be a whole number.' })
  }
  if (!getServiceById(id)) {
    return res.status(404).json({ error: 'Service not found.' })
  }

  const errors = validateService(req.body, listServices(), id)
  if (hasErrors(errors)) {
    return res.status(400).json({ error: 'Some fields are invalid.', fields: errors })
  }

  res.json(updateService(id, req.body))
})

export default router
