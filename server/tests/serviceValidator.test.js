import { describe, expect, test } from 'vitest'
import { hasErrors, validateService } from '../validators/serviceValidator.js'

// Unit tests for the service validation rules. No store needed:
// the validator is handed the list of services to check names against.

const SERVICES = [
  { id: 1, name: 'Bar Seating' },
  { id: 2, name: 'Patio' },
]

// A valid new service. Each test changes one field to break it.
const VALID = {
  name: "Chef's counter",
  description: 'Six seats facing the kitchen.',
  duration: 90,
  priority: 'high',
  isOpen: true,
}

describe('a valid service', () => {
  test('has no errors', () => {
    const errors = validateService(VALID, SERVICES, null)
    expect(hasErrors(errors)).toBe(false)
  })
})

describe('required fields', () => {
  test('an empty body has an error on every field', () => {
    const errors = validateService({}, SERVICES, null)
    expect(errors.name).toBe('Service name is required.')
    expect(errors.description).toBe('Description is required.')
    expect(errors.duration).toBe('Expected duration is required.')
    expect(errors.priority).toBe('Choose a priority level.')
    expect(errors.isOpen).toBe('Open for guests is required.')
  })

  test('no body at all is treated the same as an empty one', () => {
    expect(validateService(undefined, SERVICES, null).name).toBe('Service name is required.')
  })

  test('only spaces counts as empty', () => {
    expect(validateService({ ...VALID, name: '   ' }, SERVICES, null).name).toBe('Service name is required.')
    expect(validateService({ ...VALID, description: '  ' }, SERVICES, null).description).toBe('Description is required.')
  })
})

describe('field types', () => {
  test('name and description must be text', () => {
    expect(validateService({ ...VALID, name: 42 }, SERVICES, null).name).toBe('Service name must be text.')
    expect(validateService({ ...VALID, description: ['a'] }, SERVICES, null).description).toBe('Description must be text.')
  })

  test('duration must be a whole number, not text or a decimal', () => {
    const message = 'Expected duration must be a whole number of minutes.'
    expect(validateService({ ...VALID, duration: '45' }, SERVICES, null).duration).toBe(message)
    expect(validateService({ ...VALID, duration: 12.5 }, SERVICES, null).duration).toBe(message)
  })

  test('priority must be high, medium, or low', () => {
    expect(validateService({ ...VALID, priority: 'urgent' }, SERVICES, null).priority).toBe(
      'Priority level must be high, medium, or low.',
    )
  })

  test('isOpen must be true or false', () => {
    expect(validateService({ ...VALID, isOpen: 'yes' }, SERVICES, null).isOpen).toBe(
      'Open for guests must be true or false.',
    )
  })
})

describe('field length limits', () => {
  test('name can be 100 characters but not 101', () => {
    expect(validateService({ ...VALID, name: 'a'.repeat(100) }, SERVICES, null).name).toBe('')
    expect(validateService({ ...VALID, name: 'a'.repeat(101) }, SERVICES, null).name).toBe(
      'Service name must be 100 characters or fewer.',
    )
  })

  test('description can be 300 characters but not 301', () => {
    expect(validateService({ ...VALID, description: 'a'.repeat(300) }, SERVICES, null).description).toBe('')
    expect(validateService({ ...VALID, description: 'a'.repeat(301) }, SERVICES, null).description).toBe(
      'Description must be 300 characters or fewer.',
    )
  })

  test('duration must be between 1 and 240 minutes', () => {
    const message = 'Expected duration must be between 1 and 240 minutes.'
    expect(validateService({ ...VALID, duration: 0 }, SERVICES, null).duration).toBe(message)
    expect(validateService({ ...VALID, duration: 241 }, SERVICES, null).duration).toBe(message)
    expect(validateService({ ...VALID, duration: 1 }, SERVICES, null).duration).toBe('')
    expect(validateService({ ...VALID, duration: 240 }, SERVICES, null).duration).toBe('')
  })
})

describe('duplicate names', () => {
  test('cannot reuse another service\'s name, ignoring upper/lower case', () => {
    expect(validateService({ ...VALID, name: 'bar seating' }, SERVICES, null).name).toBe(
      'Another service already has this name.',
    )
  })

  test('a service being edited can keep its own name', () => {
    expect(validateService({ ...VALID, name: 'Patio' }, SERVICES, 2).name).toBe('')
  })
})
