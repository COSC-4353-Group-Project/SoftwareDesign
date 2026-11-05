// import { store } from '../data/store.js'
import { db } from '../data/db.js' // now we import from the db!! :3

function touserdash_info(row) { // return shape the frontend can use
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        duration: row.duration_minutes,
        isOpen: row.is_open === 1,
        priority: row.priority,
        inLine: row.in_line
    }
}

export function listuserDash() {
    const rows = db.prepare(`SELECT * FROM userdash_info`).all()
    return rows.map(touserdash_info)
}

// export function listuserDash() {
//     return store.userDash
// }

// export function getUserItemById(id) {
//     return store.userDash.find((userDash) => userDash.id === id)
// }

export function getUserItemById(id) {
    const row = db.prepare(`SELECT id FROM userdash_info WHERE id = ?`).get(id)
    if(!row) {
        return undefined
    }
    return touserdash_info(row)
}

function userDashFields(body) {
    return {
        name: body.name,
        description: body.description,
        duration: body.duration,
        isOpen: body.isOpen,
        priority: body.priority,
        inLine: body.inLine
    }
}

// export function createUserItem(body) {
//     let biggestId = 0
//     for (const user of store.userDash) {
//         if(user.id > biggestId) {
//             biggestId = user.id
//         }
//     }

//     const user = {id: biggestId + 1, ...userDashFields(body)}
//     user.services.push(user)
//     return user
// }

export function createUserItem(body) {
    const fields = userDashFields(body)
    const result = db.prepare(`
        INSERT INTO userdash_info (name, desciprtion, duration_minutes, is_open, priority, in_line)
        VALUES (?, ?, ?, ?, ?, ?)`).run(fields.name, fields.description, fields.duration, fields.isOpen ? 1 : 0, fields.priority, fields.inLine)

        return getUserItemById(result.lastInsertRowid)
}

// export function updateUserItem(id, body) {
//     const user = getUserItemById(id)
//     if(!user) {
//         return undefined
//     }

//     const fields = userDashFields(body)
//     user.name = fields.name
//     user.description = fields.description
//     user.duration = fields.duration
//     user.isOpen = fields.isOpen
//     user.priority = fields.isOpen
//     user.inLine = fields.inLine
//     return user
// }

export function updateUserItem(id, body) {
    const fields = userDashFields(body)
    const result = db.prepare(`
        UPDATE userdash_info
        SET name = ?, description = ?, duration_minutes = ?, is_open = ?, priority = ?, in_line = ?
        WHERE id = ?
        `).run(fields.name, fields.description, fields.duration, fields.isOpen, fields.priority, fields.inLine)

        if (result.changes === 0) {
            return undefined
        }
        return getUserItemById(id)
}