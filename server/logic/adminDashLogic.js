// import { store } from '../data/store.js'

import { db } from '../data/db.js'

function toadmin_dash(row) { // Anaya: Because only 2 of the 4 admin blocks have stats within the description, we have to take care of the admin items that do not have updated numbers in their description via null inequality check
    const admin_item = {
        id: row.id,
        name: row.name,
        description: row.description,
        isSkip: row.isSkip === 1,
        statistic: row.statistic
    }

    if(row.descript_stat !== null) {
        admin_item.descript_stat = row.descript_stat
    }

    return admin_item
}

export function listadminDashItem() {
    const rows = db.prepare(`SELECT id, name, description, isSkip, statistic, descript_stat FROM admin_dash_view`).all()
    return rows.map(toadmin_dash)
}

export function getAdminItemById(id) {
    const row = db.prepare(`SELECT id FROM admin_dash_view WHERE id = ?`).get(id)
    if (!row) {
        return undefined
    }
    return toadmin_dash(row)
}