// Validation for creating and editing services. Same rules as the form on
// AdminServicesPage.jsx, plus type checks, since anyone can send the API anything,
// not just our form.

export const NAME_MAX = 100
export const DESCRIPTION_MAX = 300
export const DURATION_MIN = 1
export const DURATION_MAX = 240
export const PRIORITIES = ['high', 'medium', 'low']

// Checks every field and returns an object of error messages, the same shape the
// page uses. An empty string means that field is fine.
// services is the current list (for the duplicate name check). editingId is the id of the
// service being edited, or null when creating, so a service can keep its own name.
export function validateService(body, services, editingId) {
  const errors = { name: '', description: '', duration: '', priority: '', isOpen: '' }

  // no body at all (or not a JSON object): treat it as every field missing
  if (typeof body !== 'object' || body === null) {
    body = {}
  }

  if (body.name === undefined || body.name === null) {
    errors.name = 'Service name is required.'
  } else if (typeof body.name !== 'string') {
    errors.name = 'Service name must be text.'
  } else {
    const name = body.name.trim()
    if (name === '') {
      errors.name = 'Service name is required.'
    } else if (name.length > NAME_MAX) {
      errors.name = `Service name must be ${NAME_MAX} characters or fewer.`
    } else {
      // no two services can share a name (ignoring upper/lower case)
      for (const service of services) {
        if (service.id !== editingId && service.name.toLowerCase() === name.toLowerCase()) {
          errors.name = 'Another service already has this name.'
        }
      }
    }
  }

  if (body.description === undefined || body.description === null) {
    errors.description = 'Description is required.'
  } else if (typeof body.description !== 'string') {
    errors.description = 'Description must be text.'
  } else {
    const description = body.description.trim()
    if (description === '') {
      errors.description = 'Description is required.'
    } else if (description.length > DESCRIPTION_MAX) {
      errors.description = `Description must be ${DESCRIPTION_MAX} characters or fewer.`
    }
  }

  // the page sends duration as a number, so text like "45" is rejected here
  if (body.duration === undefined || body.duration === null) {
    errors.duration = 'Expected duration is required.'
  } else if (typeof body.duration !== 'number' || !Number.isInteger(body.duration)) {
    errors.duration = 'Expected duration must be a whole number of minutes.'
  } else if (body.duration < DURATION_MIN || body.duration > DURATION_MAX) {
    errors.duration = `Expected duration must be between ${DURATION_MIN} and ${DURATION_MAX} minutes.`
  }

  if (body.priority === undefined || body.priority === null || body.priority === '') {
    errors.priority = 'Choose a priority level.'
  } else if (!PRIORITIES.includes(body.priority)) {
    errors.priority = 'Priority level must be high, medium, or low.'
  }

  if (body.isOpen === undefined || body.isOpen === null) {
    errors.isOpen = 'Open for guests is required.'
  } else if (typeof body.isOpen !== 'boolean') {
    errors.isOpen = 'Open for guests must be true or false.'
  }

  return errors
}

// True if any field has an error message.
export function hasErrors(errors) {
  return Object.values(errors).some((message) => message !== '')
}
