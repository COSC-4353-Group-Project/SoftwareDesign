import { Router } from 'express'
import { listadminDashItem, getAdminItemById} from '../logic/adminDashLogic.js'
import { requireAdmin } from '../middleware/auth.js'

// BUG FIX (Justin, 11-06): these had no login check, so anyone could see today's skip revenue.
// requireAdmin makes them staff-only (401 if not logged in, 403 for regular users), like the admin queue routes.
// Also removed POST /: it called createAdminItem, which no longer exists, so it crashed with a 500.
// The stats are worked out by admin_dash_view now, so there's nothing to create or update.

const router = Router()

// GET /api/adminDash
router.get('/', requireAdmin, (req, res) => {
    res.json(listadminDashItem())
})

// GET /api/adminDash/:id
router.get('/:id', requireAdmin, (req, res) => {
    const id = Number(req.params.id)
    if(!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Admin Item id must be a whole number.'})
    }

    const item = getAdminItemById(id)
    if(!item) {
        return res.status(404).json({ error: 'Item not found.'})
    }

    res.json(item)
})

export default router
