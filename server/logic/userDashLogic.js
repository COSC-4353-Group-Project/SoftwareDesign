import { store } from '../data/store.js'

export function listuserDash() {
    return store.userDash
}

export function getUserItemById(id) {
    return store.userDash.find((userDash) => userDash.id === id)
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

export function createUserItem(body) {
    let biggestId = 0
    for (const user of store.userDash) {
        if(user.id > biggestId) {
            biggestId = user.id
        }
    }

    const user = {id: biggestId + 1, ...userDashFields(body)}
    user.services.push(user)
    return user
}

export function updateUserItem(id, body) {
    const user = getUserItemById(id)
    if(!user) {
        return undefined
    }

    const fields = userDashFields(body)
    user.name = fields.name
    user.description = fields.description
    user.duration = fields.duration
    user.isOpen = fields.isOpen
    user.priority = fields.isOpen
    user.inLine = fields.inLine
    return user
}