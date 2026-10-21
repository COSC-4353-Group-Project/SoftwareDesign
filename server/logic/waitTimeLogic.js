import { getServiceById } from './serviceLogic.js'


// the assignment only calls for a simple rule based algo, this should suffice. if not then they should've specified.


// Estimated wait in minutes for a spot in line, given the minutes each party takes.
export function estimateWait(position, duration) {
  if (position < 1) {
    return 0
  }
  return position * duration
}

// Same estimate, but looks up the duration from the service.
// Returns undefined if there is no service with that id, so it doesnt crash on null.
export function estimateWaitForService(serviceId, position) {
  const service = getServiceById(serviceId)
  if (!service) {
    return undefined
  }
  return estimateWait(position, service.duration)
}
