import { store } from '../data/store.js'

export function listHistory() {
    return store.history
}

// Returns the service, or undefined if there is no service with that id.
export function getHistoryById(id) {
  return store.history.find((history) => history.id === id)
}
// new services my pages (justin) uses
// Only keeps the fields a service is allowed to have (anything else in the request is ignored) and trims the extra spaces off the text.

function historyFields(body) {
  return {
    service: body.service.trim(),
    date: body.date,
    bribe: body.bribe,
    status: body.status,
  }
}

// Adds a new service and returns it. The new id is one higher than the biggest id so far, tldr iterative so no dup.s 
export function createHistory(body) {
  let biggestId = 0
  for (const history of store.history) {
    if (history.id > biggestId) {
      biggestId = history.id
    }
  }

  const history = { id: biggestId + 1, ...historyFields(body) }
  store.history.push(history)
  return history
}

// Replaces the fields of an existing service and returns it,
// or undefined if there is no service with that id.
// fields = the new info = sercice = old info.
export function updateHistory(id, body) {
  const history = getHistoryById(id)
  if (!history) {
    return undefined
  }

  const fields = historyFields(body)
  history.service = fields.service
  history.date = fields.date
  history.bribe = fields.bribe
  history.status = fields.status
  return history
}