import { db } from '../data/db.js'

// Business logic for services. These are plain functions with no Express code in them,
// so the tests can call them directly. The route validates the input before calling
// createService or updateService.
// A4: reads and writes the services table now instead of store.services.

// A row from the services table, turned into the shape the pages already use.
// The table says duration_minutes and stores is_open as 1/0 (sqlite has no true/false which is dumb),
// the pages want duration and isOpen as true/false.
function toService(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    duration: row.duration_minutes,
    priority: row.priority,
    isOpen: row.is_open === 1,
  }
}

export function listServices() {
  const rows = db.prepare('SELECT * FROM services ORDER BY id').all()
  return rows.map(toService)
}

// Returns the service, or undefined if there is no service with that id.
export function getServiceById(id) {
  const row = db.prepare('SELECT * FROM services WHERE id = ?').get(id)
  if (!row) {
    return undefined
  }
  return toService(row)
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

// Adds a new service and returns it. No more biggestId loop, sqlite picks the next id itself
// and hands it back as lastInsertRowid.
export function createService(body) {
  const fields = serviceFields(body)
  const result = db.prepare(`
    INSERT INTO services (name, description, duration_minutes, priority, is_open)
    VALUES (?, ?, ?, ?, ?)
  `).run(fields.name, fields.description, fields.duration, fields.priority, fields.isOpen ? 1 : 0)

  return getServiceById(result.lastInsertRowid)
}

// Replaces the fields of an existing service and returns it,
// or undefined if there is no service with that id.
// result.changes is how many rows the UPDATE touched, 0 means that id doesn't exist so no additioanl stuff needed 
export function updateService(id, body) {
  const fields = serviceFields(body)
  const result = db.prepare(`
    UPDATE services
    SET name = ?, description = ?, duration_minutes = ?, priority = ?, is_open = ?
    WHERE id = ?
  `).run(fields.name, fields.description, fields.duration, fields.priority, fields.isOpen ? 1 : 0, id)

  if (result.changes === 0) {
    return undefined
  }
  return getServiceById(id)
}

// True if any queue entry, waiting or finished, points at this service.
// Those entries are people's history, so the service can't be deleted out from under them
// (the foreign key on queue_entries would stop it anyway). Close it instead.
export function serviceIsInUse(id) {
  const row = db.prepare('SELECT COUNT(*) AS count FROM queue_entries WHERE service_id = ?').get(id)
  return row.count > 0
}

// Deletes a service. Returns true if it was deleted, false if there's no service with that id.
// Check serviceIsInUse first, the route does.
export function deleteService(id) {
  const result = db.prepare('DELETE FROM services WHERE id = ?').run(id)
  return result.changes > 0
}
