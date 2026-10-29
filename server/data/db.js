import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { hashPassword } from '../logic/passwordLogic.js'

// The database for Assignment 4. This replaces store.js.
// node:sqlite is built into Node (no package to install). Every call is synchronous,
// so logic functions can keep returning values directly, just like with store.js.
//
// How to use it in a logic file:
//   import { db } from '../data/db.js'
//   db.prepare('SELECT * FROM services WHERE id = ?').get(id)   -> one row or undefined
//   db.prepare('SELECT * FROM services').all()                  -> array of rows
//   db.prepare('INSERT INTO ... VALUES (?, ?)').run(a, b)       -> { changes, lastInsertRowid }
// Always pass values with ? like this. Never paste them into the SQL string yourself,
// that's how SQL injection happens.
// Rows come back with the column names from schema.sql (snake_case). Use AS to rename
// one for the frontend, e.g. SELECT full_name AS name ...

// Vitest sets process.env.VITEST while tests run. Tests get a database that only lives
// in memory, so they start clean and never touch the real file.
// The real one is bribesmart.db next to this file. SQLite creates it the first time.
const DB_FILE = process.env.VITEST ? ':memory:' : path.join(import.meta.dirname, 'bribesmart.db')

export const db = new DatabaseSync(DB_FILE)

// SQLite ignores REFERENCES (foreign keys) unless this is switched on.
db.exec('PRAGMA foreign_keys = ON')

// Create any tables that don't exist yet.
db.exec(readFileSync(path.join(import.meta.dirname, 'schema.sql'), 'utf8'))

// Hashing is slow on purpose, so the seed passwords are hashed once here and reused by
// every reset instead of being hashed again before each test.
// Seed logins: admin@bribesmart.test / Admin123!   justin@bribesmart.test / Password123!
const ADMIN_PASSWORD_HASH = hashPassword('Admin123!')
const GUEST_PASSWORD_HASH = hashPassword('Password123!')

// Starting data, the same as the seeds in store.js. Ids are given so they match A3
// (admin is user 1, Justin is user 2, services 1-4).
function seedDatabase() {
  const addCredentials = db.prepare(
    'INSERT INTO user_credentials (id, email, password_hash, role) VALUES (?, ?, ?, ?)'
  )
  addCredentials.run(1, 'admin@bribesmart.test', ADMIN_PASSWORD_HASH, 'admin')
  addCredentials.run(2, 'justin@bribesmart.test', GUEST_PASSWORD_HASH, 'user')

  const addService = db.prepare(
    'INSERT INTO services (id, name, description, duration_minutes, priority, is_open) VALUES (?, ?, ?, ?, ?, ?)'
  )
  addService.run(1, 'Dine-in · Party of 1–2', 'Standard table seating for dates.', 45, 'high', 1)
  addService.run(2, 'Dine-in · Party of 3–6', 'Larger tables and booths. Longer Wait-Time.', 60, 'medium', 1)
  addService.run(3, 'Bar Seating', 'First-come bar stools. Bartender Service', 20, 'medium', 1)
  addService.run(4, 'Patio', 'Outdoor tables. Closed when it rains.', 40, 'low', 0)

  // Justin's past visits, so the history page has something to show (seedHistory in store.js).
  const addEntry = db.prepare(`
    INSERT INTO queue_entries
      (id, service_id, user_id, party_size, seating_preference, position, initial_position, status, joined_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  addEntry.run(1, 1, 2, 2, 'Dine-in', 1, 4, 'served', '2026-09-17 18:30:00')
  addEntry.run(2, 4, 2, 2, 'Dine-in', 1, 6, 'served', '2026-09-19 19:05:00')
  addEntry.run(3, 3, 2, 1, 'Bar Seating', 1, 3, 'cancelled', '2026-09-27 21:10:00')

  db.prepare(`
    INSERT INTO queue_skips (queue_entry_id, label, from_position, to_position, price, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(2, 'Front of line', 6, 1, 20, '2026-09-19 19:07:00')
}

// Only seed a brand new database. After that the data is whatever people have saved.
const { count } = db.prepare('SELECT COUNT(*) AS count FROM user_credentials').get()
if (count === 0) {
  seedDatabase()
}

// Empties every table and puts the starting data back. Tests call this before each test,
// the same way they called resetStore().
// Children are deleted before their parents, otherwise the foreign keys block the delete.
export function resetDatabase() {
  db.exec(`
    DELETE FROM sessions;
    DELETE FROM queue_skips;
    DELETE FROM queue_entries;
    DELETE FROM services;
    DELETE FROM user_credentials;
  `)
  seedDatabase()
}
