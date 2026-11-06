// import { store } from '../data/store.js'

import { db } from '../data/db.js'

function toadmin_dash(row) {
    return {
        id: row.id,
        name: row.name,
        statistics: row.statistic,
        description: row.description,
        isSkip: row.isSkip === 1
    }
}

// export function listadminDashItem() {
//     return store.adminDashItem
// }

export function listadminDashItem() {
    const rows = db.prepare(`SELECT * FROM admin_dash`).all()
    return rows.map(toadmin_dash)
}

// export function getAdminItemById(id) {
//     return store.adminDashItem.find((adminDashItem) => adminDashItem.id === id)
// }

export function getAdminItemById(id) {
    const row = db.prepare(`SELECT id FROM admin_dash WHERE id = ?`).get(id)
    if (!row) {
        return undefined
    }
    return toadmin_dash(row)
}

function userAdminFields(body) {
    return {
        name: body.name,
        statistics: body.statistics,
        description: body.description,
        isSkip: body.isSkip
    }
}

export function createAdminItem(body) {
    const fields = userAdminFields(body)
    const result = db.prepare(`
        INSERT INTO admin_dash (name, statistics, description, isSkip)
        VALUES (?, ?, ?, ?)
        `).run(fields.name, fields.statistics, fields.description, fields.isSkip ? 1 : 0)

        return getAdminItemById(result.lastInsertRowid)
}

export function updateAdminItem(id, body) {
    const fields = userAdminFields(body)
    const result = db.prepare(`
        UPDATE admin_dash
        SET name = ?, statistics = ?, description = ?, isSkip = ?
        WHERE id = ?
      `).run(fields.name, fields.statistics, fields.description, fields.isSkip ? 1 : 0, id)

      if (result.changes === 0) {
        return undefined
      }
      return getAdminItemById(id)
}