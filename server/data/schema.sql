-- Bribesmart tables (A4)
-- db.js runs this on startup but IF NOT EXISTS skips tables that are already there,
-- so saved data is safe. It only actually creates stuff on a brand new database.
-- STRICT = sqlite rejects wrong types (normally it lets you put text in an INTEGER column lol)
-- no booleans in sqlite so true/false is 1/0

-- login info. password_hash is hashed, see logic/passwordLogic.js
CREATE TABLE IF NOT EXISTS user_credentials (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK (length(email) <= 254 AND email LIKE '%_@_%._%'),
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;
-- NOCASE so Bob@x.com and bob@x.com count as the same email

-- same limits as serviceValidator.js. is_open is the isOpen toggle on AdminServicesPage
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK (length(name) BETWEEN 1 AND 100),
  description TEXT NOT NULL CHECK (length(description) BETWEEN 1 AND 300),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 1 AND 240),
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  is_open INTEGER NOT NULL DEFAULT 1 CHECK (is_open IN (0, 1))
) STRICT;

-- a party in line. we never delete these, just change status, so they double as history
-- position = queueOrder from A3, initial_position is for the progress bar on QueueStatusPage
CREATE TABLE IF NOT EXISTS queue_entries (
  id INTEGER PRIMARY KEY,
  service_id INTEGER NOT NULL REFERENCES services(id),
  user_id INTEGER NOT NULL REFERENCES user_credentials(id),
  party_size INTEGER NOT NULL CHECK (party_size BETWEEN 1 AND 6),
  seating_preference TEXT NOT NULL CHECK (seating_preference IN ('Dine-in', 'Bar Seating')),
  position INTEGER NOT NULL CHECK (position >= 1),
  initial_position INTEGER NOT NULL CHECK (initial_position >= 1),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'served', 'cancelled')),
  type TEXT NOT NULL DEFAULT 'walk-in' CHECK (type IN ('walk-in', 'reservation')),
  notes TEXT NOT NULL DEFAULT '' CHECK (length(notes) <= 200),
  joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

-- bribes. one row every time someone pays to skip (was the skips array on each entry)
CREATE TABLE IF NOT EXISTS queue_skips (
  id INTEGER PRIMARY KEY,
  queue_entry_id INTEGER NOT NULL REFERENCES queue_entries(id),
  label TEXT NOT NULL CHECK (length(label) BETWEEN 1 AND 50),
  from_position INTEGER NOT NULL CHECK (from_position >= 1),
  to_position INTEGER NOT NULL CHECK (to_position >= 1),
  price REAL NOT NULL CHECK (price >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

-- logged in tokens (store.sessions before), saved so a restart doesn't log everyone out
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES user_credentials(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

-- history isn't its own table, it's a view (saved SELECT) over queue_entries
-- so it can't get out of sync. bribe = total of that entry's skips, 0 if none
CREATE VIEW IF NOT EXISTS queue_history AS
SELECT
  queue_entries.id AS id,
  queue_entries.user_id AS user_id,
  services.name AS service,
  date(queue_entries.joined_at) AS date,
  COALESCE(SUM(queue_skips.price), 0) AS bribe,
  queue_entries.status AS status
FROM queue_entries
JOIN services ON services.id = queue_entries.service_id
LEFT JOIN queue_skips ON queue_skips.queue_entry_id = queue_entries.id
GROUP BY queue_entries.id;
