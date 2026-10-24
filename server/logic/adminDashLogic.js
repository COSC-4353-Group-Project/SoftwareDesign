import { store } from '../data/store.js'

export function listadminDashItem() {
    return store.adminDashItem
}

export function listskipItem() {
    return store.skipDashItem
}

export function getAdminItemById(id) {
    return store.adminDashItem.find((adminDashItem) => adminDashItem.id === id)
}

export function getskipItemById(id) {
    return store.skipDashItem.find((skipDashItem) => skipDashItem.id === id)
}

function userAdminFields(body) {
    return {
        name: body.name,
        statistics: body.statistics,
        description: body.description
    }
}

function skipItemFields(body) {
    return {
        name: body.name,
        statistics: body.statistics,
        total: body.total
    }
}

export function createAdminItem(body) {
    let biggestId = 0
    for (const user of store.adminDashItem) {
        if(user.id > biggestId) {
            biggestId = user.id
        }
    }

    const user = {id: biggestId + 1, ...userAdminFields(body)}
    user.services.push(user)
    return user
}

export function updateAdminItem(id, body) {
    const item = getAdminItemById(id)
    if(!item) {
        return undefined
    }

    const fields = userAdminFields(body)
    item.name = fields.name
    item.statistics = fields.statistics
    item.description = fields.description
    return item
}