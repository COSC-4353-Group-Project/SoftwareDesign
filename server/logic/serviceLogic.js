import { store } from '../data/store.js'

// Business logic for services. These are plain functions with no Express code in them,
// so the tests can call them directly. The route validates the input before calling
// createService or updateService.

export function listServices() {
  return store.services
}

// Returns the service, or undefined if there is no service with that id.
export function getServiceById(id) {
  return store.services.find((service) => service.id === id)
}
// new services my pages (justin) uses
// Only keeps the fields a service is allowed to have (anything else in the request is ignored) and trims the extra spaces off the text.

function serviceFields(body) {
  return {
    name: body.name.trim(),
    description: body.description.trim(),
    duration: body.duration,
    priority: body.priority,
    isOpen: body.isOpen,
  }
}

// Adds a new service and returns it. The new id is one higher than the biggest id so far, tldr iterative so no dup.s 
export function createService(body) {
  let biggestId = 0
  for (const service of store.services) {
    if (service.id > biggestId) {
      biggestId = service.id
    }
  }

  const service = { id: biggestId + 1, ...serviceFields(body) }
  store.services.push(service)
  return service
}

// Replaces the fields of an existing service and returns it,
// or undefined if there is no service with that id.
// fields = the new info = sercice = old info.
export function updateService(id, body) {
  const service = getServiceById(id)
  if (!service) {
    return undefined
  }

  const fields = serviceFields(body)
  service.name = fields.name
  service.description = fields.description
  service.duration = fields.duration
  service.priority = fields.priority
  service.isOpen = fields.isOpen
  return service
}
