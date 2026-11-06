import { Router } from 'express'
import { listuserDash, getUserItemById } from '../logic/userDashLogic.js'

const router = Router()

// GET /api/userDash
router.get('/', (req, res) => {
    res.json(listuserDash())
})

// GET /api/userDash/:id
router.get('/:id', (req, res) => {
    const id = Number(req.params.id)
    if(!Number.isInteger(id)) {
        return res.status(400).json({ error: 'User id must be a whole number.'})
    }

    const user = getUserItemById(id)
    if(!user) {
        return res.status(404).json({ error: 'Name not found.'})
    }

    res.json(user)
})


export default router