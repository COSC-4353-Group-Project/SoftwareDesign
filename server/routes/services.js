import { Router } from 'express'
import { getServiceById, listServices } from '../logic/serviceLogic.js'

// Routes stay thin: read the request, call a logic function, send JSON back.
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

export default router
