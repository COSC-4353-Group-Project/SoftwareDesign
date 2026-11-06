-- Bribesmart tables (A4)
-- db.js runs this on startup but IF NOT EXISTS skips tables that are already there,
-- so saved data is safe. It only actually creates stuff on a brand new database.
-- STRICT = sqlite rejects wrong types (normally it lets you put text in an INTEGER column lol)
-- no booleans in sqlite so true/false is 1/0

-- login info. you log in with name + phone, the phone is the password.
-- phone_hash is the phone hashed (see logic/passwordLogic.js) so the password isn't stored as plain text
CREATE TABLE IF NOT EXISTS user_credentials (
  id INTEGER PRIMARY KEY,
  phone_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

-- everything else about a user. one profile per user, so user_id is the primary key AND the foreign key.
-- phone is 10 digits like '7135550123' (authValidator.normalizePhone), kept here too for table-ready texts.
-- UNIQUE so two accounts can't share a phone
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES user_credentials(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL CHECK (length(trim(full_name)) BETWEEN 1 AND 60),
  phone TEXT NOT NULL UNIQUE CHECK (length(phone) = 10),
  sms_opt_in INTEGER NOT NULL DEFAULT 0 CHECK (sms_opt_in IN (0, 1))
) STRICT;

-- same limits as serviceValidator.js. is_open is the isOpen toggle on AdminServicesPage
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK (length(name) BETWEEN 1 AND 100),
  description TEXT NOT NULL CHECK (length(description) BETWEEN 1 AND 300),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 1 AND 240),
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  is_open INTEGER NOT NULL DEFAULT 1 CHECK (is_open IN (0, 1))
) STRICT;

-- THU: one queue per service. Queue status is open or closed.
CREATE TABLE IF NOT EXISTS queues (
  id INTEGER PRIMARY KEY,
  service_id INTEGER NOT NULL UNIQUE REFERENCES services(id),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

-- a party in line. we never delete these, just change status, so they double as history
-- position = queueOrder from A3, initial_position is for the progress bar on QueueStatusPage
CREATE TABLE IF NOT EXISTS queue_entries (
  id INTEGER PRIMARY KEY,
  service_id INTEGER NOT NULL REFERENCES services(id),
  queue_id INTEGER REFERENCES queues(id), -- THU: temp nullable column
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

-- THU: user can only have one waiting queue entry
-- Served and cancelled entries still available for history
CREATE UNIQUE INDEX IF NOT EXISTS idx_queue_entries_one_waiting_per_user
ON queue_entries (user_id)
WHERE status = 'waiting';

-- THU: for looking up waiting entries by service and position
CREATE INDEX IF NOT EXISTS idx_queue_entries_service_waiting_order
ON queue_entries (service_id, position, id)
WHERE status = 'waiting';

-- THU: for retrieving bribe purchases for a queue entry
CREATE INDEX IF NOT EXISTS idx_queue_skips_entry
ON queue_skips (queue_entry_id);

-- logged in tokens (store.sessions before), saved so a restart doesn't log everyone out
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES user_credentials(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

-- the "Recent notifications" list on the user dashboard (store.notifications before)
-- 'joined' = they got in line, 'almost_ready' = they reached the top 3
-- created_at comes from JS new Date().toISOString() instead of CURRENT_TIMESTAMP, because that one
-- has no Z on the end and the browser would read it as local time instead of UTC
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES user_credentials(id) ON DELETE CASCADE,
  queue_entry_id INTEGER NOT NULL REFERENCES queue_entries(id),
  type TEXT NOT NULL CHECK (type IN ('joined', 'almost_ready')),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 100),
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 200),
  created_at TEXT NOT NULL
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

-- THU: new service gets a queue automatically
CREATE TRIGGER IF NOT EXISTS trg_service_queue_insert
AFTER INSERT ON services
BEGIN
  INSERT INTO queues (service_id, status)
  VALUES (NEW.id, CASE WHEN NEW.is_open = 1 THEN 'open' ELSE 'closed' END);
END;

-- opening/closing service changes queue availability
CREATE TRIGGER IF NOT EXISTS trg_service_queue_availability
AFTER UPDATE OF is_open ON services
BEGIN
  UPDATE queues
  SET status = CASE WHEN NEW.is_open = 1 THEN 'open' ELSE 'closed' END
  WHERE service_id = NEW.id;
END;

-- if entries exist, existing foreign keys prevent deletion
CREATE TRIGGER IF NOT EXISTS trg_service_queue_delete
BEFORE DELETE ON services
BEGIN
  DELETE FROM queues WHERE service_id = OLD.id;
END;

-- Anaya: test table! what's shown on the user dashboard should reference the actual services table but i'll get to that

CREATE TABLE IF NOT EXISTS userdash_info (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK (length(name) BETWEEN 1 AND 100),
  description TEXT NOT NULL CHECK (length(description) BETWEEN 1 AND 300),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 1 AND 240),
  is_open INTEGER NOT NULL DEFAULT 1 CHECK (is_open IN (0, 1)),
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  in_line INTEGER NOT NULL DEFAULT 0
  ) STRICT;