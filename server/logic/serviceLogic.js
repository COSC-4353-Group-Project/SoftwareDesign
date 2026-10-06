import { store } from '../data/store.js'

// Business logic for services. These are plain functions with no Express code in them,
// so the tests can call them directly when we reach that stage. this file will need to be fixed.

export function listServices() {
  return store.services
}

// Returns the service, or undefined if there is no service with that id.
export function getServiceById(id) {
  return store.services.find((service) => service.id === id)
}
