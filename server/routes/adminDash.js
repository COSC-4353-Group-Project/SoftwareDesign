import { Router } from 'express'
import { listadminDashItem, getAdminItemById} from '../logic/adminDashLogic.js'

const router = Router()

// GET /api/adminDash
router.get('/', (req, res) => {
    res.json(listadminDashItem())
})

// GET /api/adminDash/:id
router.get('/:id', (req, res) => {
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

router.post('/', (req, res) => {
    const item = createAdminItem(req.body)
    res.status(201).json(item)
})



export default router