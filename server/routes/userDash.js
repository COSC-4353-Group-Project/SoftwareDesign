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

// router.post('/', (req, res) => {
//     const user = createUserItem(req.body)
//     res.status(201).json(user)
// })

// router.put('/:id', (req, res) => {
//     const id = Number(req.params.id)
//     if (!Number.isInteger(id)) {
//         return res.status(400).json({ error: 'Service id must be a whole number.' })
//     }
//     if (!getServiceById(id)) {
//         return res.status(404).json({ error: 'Service not found.' })
//     }

//     res.json(updateUserItem(id, req.body))
// })



export default router