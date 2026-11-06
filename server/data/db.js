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
const SCHEMA = readFileSync(path.join(import.meta.dirname, 'schema.sql'), 'utf8')
db.exec(SCHEMA)

// JUSTIN: notifications got 2 new types (passed_by, table_ready) and an is_read column.
// CREATE TABLE IF NOT EXISTS won't change a table that's already there, and sqlite can't edit a CHECK,
// so an older notifications table gets rebuilt once: rename it, make the new one, copy the rows over.
// Old rows get is_read = 0 (the default).
const notificationColumns = db.prepare('PRAGMA table_info(notifications)').all()

if (!notificationColumns.some((column) => column.name === 'is_read')) {
  db.exec('BEGIN')
  try {
    db.exec('ALTER TABLE notifications RENAME TO notifications_old')
    db.exec(SCHEMA) // makes the new notifications table, everything else already exists
    db.exec(`
      INSERT INTO notifications (id, user_id, queue_entry_id, type, title, body, created_at)
      SELECT id, user_id, queue_entry_id, type, title, body, created_at FROM notifications_old;
      DROP TABLE notifications_old;
    `)
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

// THU: CREATE TABLE IF NOT EXISTS does not update existing tables
const entryColumns = db.prepare('PRAGMA table_info(queue_entries)').all()

if (!entryColumns.some((column) => column.name === 'queue_id')) {
  db.exec('ALTER TABLE queue_entries ADD COLUMN queue_id INTEGER REFERENCES queues(id)')
}

// THU: create any missing service queues and link older entries(new services will be handled  trigger)
function linkServiceQueues() {
  db.exec(`
    INSERT INTO queues (service_id, status)
    SELECT
      s.id,
      CASE WHEN s.is_open = 1 THEN 'open' ELSE 'closed' END
    FROM services AS s
    WHERE NOT EXISTS (
      SELECT 1
      FROM queues AS q
      WHERE q.service_id = s.id
    );

    UPDATE queue_entries
    SET queue_id = (
      SELECT q.id
      FROM queues AS q
      WHERE q.service_id = queue_entries.service_id
    )
    WHERE queue_id IS NULL;
  `)
}

// Hashing is slow on purpose, so the seed phones are hashed once here and reused by
// every reset instead of being hashed again before each test.
// Seed logins (name + phone): Admin / 9035550100   Justin Hendrix / 7135550123
const ADMIN_PHONE_HASH = hashPassword('9035550100')
const JUSTIN_PHONE_HASH = hashPassword('7135550123')

// Starting data, the same as the seeds in store.js. Ids are given so they match A3
// (admin is user 1, Justin is user 2, services 1-4).
function seedDatabase() {
  const addCredentials = db.prepare(
    'INSERT INTO user_credentials (id, phone_hash, role) VALUES (?, ?, ?)'
  )
  addCredentials.run(1, ADMIN_PHONE_HASH, 'admin')
  addCredentials.run(2, JUSTIN_PHONE_HASH, 'user')

  const addProfile = db.prepare(
    'INSERT INTO user_profiles (user_id, full_name, phone, sms_opt_in) VALUES (?, ?, ?, ?)'
  )
  addProfile.run(1, 'Admin', '9035550100', 0)
  addProfile.run(2, 'Justin Hendrix', '7135550123', 1)

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

  // Anaya: testing for proper connection to frontend
  const addAdmininfo = db.prepare(`
    INSERT INTO admin_dash (id, name, statistic, description, isSkip)
    VALUES (?, ?, ?, ?, ?)`)

  addAdmininfo.run(1, 'Parties Waiting', 28, '79 guests total', 0)
  addAdmininfo.run(2, 'Open Services', 3, 'Accepting new guests', 0)
  addAdmininfo.run(3, 'Seated Today', 420, 'Across All Services', 0)
  addAdmininfo.run(4, 'Skip Revenue Today', 69, '7 guests paid to skip', 1)

}

// A line of made up guests waiting right now, so the queue pages have people in them.
// Kept out of seedDatabase on purpose: the tests expect only Admin + Justin (next new user is id 3)
// and nobody queued for service 2. So this only runs for the real bribesmart.db, never in tests.
// Seed logins for these are name + phone, same as Justin.
const DEMO_GUESTS = [
  // id, full name, phone, sms opt in
  [3, 'Maria Gonzalez', '7135550142', 1],
  [4, 'Derek Okafor', '2815550177', 0],
  [5, 'Priya Patel', '8325550118', 1],
  [6, 'Tommy Nguyen', '7135550163', 1],
  [7, 'Sarah Whitfield', '2815550125', 0],
  [8, 'Marcus Bell', '8325550190', 1],
  [9, 'Aiko Tanaka', '7135550111', 1],
  [10, 'Luis Ramirez', '2815550136', 0],
  [11, 'Hannah Brooks', '8325550154', 1],
]

// Who is in line. position = their spot in that service's line, initial_position = where they started.
// Patio (service 4) is closed, so nobody is waiting for it.
const DEMO_LINE = [
  // id, service, user, party size, seating, position, initial position, type, notes, minutes ago
  [4, 1, 3, 2, 'Dine-in', 1, 1, 'walk-in', '', 34],
  [5, 1, 5, 2, 'Dine-in', 2, 4, 'walk-in', 'Anniversary dinner', 6], // paid to skip from 4 to 2
  [6, 1, 9, 1, 'Dine-in', 3, 2, 'reservation', '', 18],
  [7, 1, 11, 2, 'Dine-in', 4, 3, 'walk-in', 'High chair please', 12],
  [8, 2, 4, 5, 'Dine-in', 1, 1, 'reservation', 'Birthday, bringing a cake', 41],
  [9, 2, 7, 4, 'Dine-in', 2, 2, 'walk-in', 'Wheelchair accessible table', 22],
  [10, 2, 10, 6, 'Dine-in', 3, 3, 'walk-in', '', 9],
  [11, 3, 6, 1, 'Bar Seating', 1, 1, 'walk-in', '', 15],
  [12, 3, 8, 2, 'Bar Seating', 2, 2, 'walk-in', 'Watching the game', 4],
]

// "minutes ago" as the same 'YYYY-MM-DD HH:MM:SS' (UTC) format the other seed rows use
function minutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60_000).toISOString().slice(0, 19).replace('T', ' ')
}

function seedDemoLine() {
  const addCredentials = db.prepare(
    'INSERT INTO user_credentials (id, phone_hash, role) VALUES (?, ?, ?)'
  )
  const addProfile = db.prepare(
    'INSERT INTO user_profiles (user_id, full_name, phone, sms_opt_in) VALUES (?, ?, ?, ?)'
  )
  for (const [id, name, phone, smsOptIn] of DEMO_GUESTS) {
    addCredentials.run(id, hashPassword(phone), 'user')
    addProfile.run(id, name, phone, smsOptIn)
  }

  const addEntry = db.prepare(`
    INSERT INTO queue_entries
      (id, service_id, user_id, party_size, seating_preference, position, initial_position, type, notes, joined_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  for (const [id, serviceId, userId, partySize, seating, position, initialPosition, type, notes, ago] of DEMO_LINE) {
    addEntry.run(id, serviceId, userId, partySize, seating, position, initialPosition, type, notes, minutesAgo(ago))
  }

  // Priya (entry 5) paid to skip 2 spots
  db.prepare(`
    INSERT INTO queue_skips (queue_entry_id, label, from_position, to_position, price, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(5, 'Skip 2 spots', 4, 2, 6, minutesAgo(3))
}

// Only seed a brand new database. After that the data is whatever people have saved.
const { count } = db.prepare('SELECT COUNT(*) AS count FROM user_credentials').get()
if (count === 0) {
  seedDatabase()
  if (!process.env.VITEST) {
    seedDemoLine()
  }
}
// THU: link service queues after database init
linkServiceQueues()

// Empties every table and puts the starting data back. Tests call this before each test,
// the same way they called resetStore().
// Children are deleted before their parents, otherwise the foreign keys block the delete.
// THU: reset database records in one transaction
// Delete child records before parent records to preserve integrity
export function resetDatabase() {
  db.exec('BEGIN')

  try {
    db.exec(`
      DELETE FROM sessions;
      DELETE FROM notifications;
      DELETE FROM queue_skips;
      DELETE FROM queue_entries;
      DELETE FROM queues;
      DELETE FROM services;
      DELETE FROM user_profiles;
      DELETE FROM user_credentials;
    `)

    seedDatabase()
    linkServiceQueues()

    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
