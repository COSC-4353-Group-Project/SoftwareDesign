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
        inLine: row.inLine
    }
}

// Using Justin's SELECT_SERVICE variable and logic to list the services and party waiting for user view

const SELECT_SERVICE = `
  SELECT services.*,
    (SELECT COUNT(*) FROM queue_entries
     WHERE queue_entries.service_id = services.id AND queue_entries.status = 'waiting') AS inLine
  FROM services
`

export function listuserDash() {
    const rows = db.prepare(`${SELECT_SERVICE} ORDER BY id`).all()
    return rows.map(touserdash_info)
}

export function getUserItemById(id) {
    const row = db.prepare(`${SELECT_SERVICE} WHERE id = ?`).get(id)
    if(!row) {
        return undefined
    }
    return touserdash_info(row)
}