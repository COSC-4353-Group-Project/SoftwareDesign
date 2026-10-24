import { Router } from 'express'
import { listadminDashItem, getAdminItemById, createAdminItem, updateAdminItem, listskipItem, getskipItemById } from '../logic/adminDashLogic.js'

const router = Router()

// GET /api/adminDash
router.get('/', (req, res) => {
    res.json(listadminDashItem())
    res.json(listskipItem())
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

router.get('/:skip', (req, res) => {
    const skipid = Number(req.params.id)
    if(!Number.isInteger(skipid)) {
        return res.status(400).json({ error: 'Skip Item id must be a whole number.'})
    }

    const item = getskipItemById(skipid)
    if(!item) {
        return res.status(404).json({ error: 'Item not found.'})
    }

    res.json(item)
})

router.post('/', (req, res) => {
    const item = createAdminItem(req.body)
    res.status(201).json(item)
})

router.put('/:id', (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Admin Item id must be a whole number.' })
    }
    if (!getAdminItemById(id)) {
        return res.status(404).json({ error: 'Item not found.' })
    }

    res.json(updateAdminItem(id, req.body))
})



export default router