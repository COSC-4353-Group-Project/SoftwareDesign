import { db } from "../data/db.js";
import { store } from "../data/store.js";
import { getServiceById } from "./serviceLogic.js";
import { estimateWaitForService } from "./waitTimeLogic.js";
import { notifyQueueJoined, notifyAlmostReady } from "./notificationLogic.js";
import { createHistory, updateHistory } from "./historyLogic.js";
import { getUserById } from "./authLogic.js";

const PRICE_PER_SPOT = 3;
const FRONT_OF_LINE_PRICE = 20;

// THU: convert sql queue entry to proper format
function toQueueEntry(row) {
  return {
    id: row.id,
    userId: row.user_id,
    serviceId: row.service_id,
    partySize: row.party_size,
    seatingPreference: row.seating_preference,
    status: row.status,
    initialPosition: row.initial_position,
    queueOrder: row.position,
    joinedAt: row.joined_at,
    type: row.type,
    notes: row.notes,
    skips: [],
  };
}

// create a record when customer joins queue
function recordQueueHistory(entry, serviceName) {
  const history = createHistory({
    service: serviceName,
    date: entry.joinedAt.slice(0, 10),
    bribe: 0,
    status: "Entered",
  });

  history.userId = entry.userId;
  history.queueEntryId = entry.id;
}

// ppdate record after a queue change
function updateQueueHistory(entry) {
  const history = store.history.find((item) => item.queueEntryId === entry.id);

  if (!history) return;

  const status =
    entry.status === "cancelled"
      ? "Canceled"
      : entry.status === "served"
        ? "Done"
        : "Entered";

  const bribe = (entry.skips ?? []).reduce(
    (total, skip) => total + skip.price,
    0,
  );

  updateHistory(history.id, {
    service: history.service,
    date: history.date,
    bribe,
    status,
  });
}

// adding a guest to a queue
export function joinQueue(userId, serviceId, partySize, seatingPreference) {
  const service = getServiceById(serviceId);

  const queue = db
    .prepare(
      `
    SELECT id, status
    FROM queues
    WHERE service_id = ?
  `,
    )
    .get(serviceId);

  if (!service || !service.isOpen || !queue || queue.status !== "open") {
    return undefined;
  }

  let entryId;

  // save new entry and position together
  db.exec("BEGIN IMMEDIATE");

  try {
    const waiting = db
      .prepare(
        `
      SELECT
        COUNT(*) AS count,
        COALESCE(MAX(position), 0) AS last_order
      FROM queue_entries
      WHERE service_id = ? AND status = 'waiting'
    `,
      )
      .get(serviceId);

    const position = waiting.count + 1;
    const queueOrder = waiting.last_order + 1;

    const result = db
      .prepare(
        `
      INSERT INTO queue_entries (
        queue_id,
        service_id,
        user_id,
        party_size,
        seating_preference,
        position,
        initial_position,
        status,
        joined_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'waiting', ?)
    `,
      )
      .run(
        queue.id,
        serviceId,
        userId,
        partySize,
        seatingPreference,
        queueOrder,
        position,
        new Date().toISOString(),
      );

    entryId = Number(result.lastInsertRowid);

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  const joinedEntry = getQueueEntry(entryId);

  recordQueueHistory(joinedEntry, service.name);
  notifyQueueJoined(joinedEntry, service.name);
  updateQueueNotifications(serviceId);

  return joinedEntry;
}

// list all waiting entries for a service in order
export function listQueue(serviceId) {
  const rows = db
    .prepare(
      `
    SELECT *
    FROM queue_entries
    WHERE service_id = ? AND status = 'waiting'
    ORDER BY position ASC, id ASC
  `,
    )
    .all(serviceId);

  return rows.map(toQueueEntry);
}

// save current waiting order in SQLite
function saveQueueOrder(orderedEntries) {
  const update = db.prepare(`
    UPDATE queue_entries
    SET position = ?
    WHERE id = ? AND status = 'waiting'
  `);

  orderedEntries.forEach((entry, index) => {
    update.run(index + 1, entry.id);
  });
}

// for notifying front of queue
function updateQueueNotifications(serviceId) {
  notifyAlmostReady(listQueue(serviceId));
}

// enable moviing a waiting party up or down
export function moveQueueEntry(entryId, direction) {
  if (![-1, 1].includes(direction)) {
    return undefined;
  }

  // reorder and save positions together
  db.exec("BEGIN IMMEDIATE");

  let serviceId;

  try {
    const entry = db
      .prepare(
        `
      SELECT id, service_id
      FROM queue_entries
      WHERE id = ? AND status = 'waiting'
    `,
      )
      .get(entryId);

    if (!entry) {
      db.exec("ROLLBACK");
      return undefined;
    }

    serviceId = entry.service_id;

    const queue = listQueue(serviceId);
    const currentIndex = queue.findIndex((item) => item.id === entryId);

    const newIndex = currentIndex + direction;

    // no move beyond the first or last position
    if (currentIndex < 0 || newIndex < 0 || newIndex >= queue.length) {
      db.exec("ROLLBACK");
      return undefined;
    }

    // fetty swap
    [queue[currentIndex], queue[newIndex]] = [
      queue[newIndex],
      queue[currentIndex],
    ];

    saveQueueOrder(queue);

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  updateQueueNotifications(serviceId);

  return getQueueEntry(entryId);
}

// paying bribe to move up in queue
export function purchaseQueueAdvance(entryId, mode, spots) {
  let serviceId;

  // save the purchase and queue movement together
  db.exec("BEGIN IMMEDIATE");

  try {
    // find waiting entry in SQLite
    const saved = db
      .prepare(
        `
      SELECT id, service_id
      FROM queue_entries
      WHERE id = ? AND status = 'waiting'
    `,
      )
      .get(entryId);

    if (!saved) {
      db.exec("ROLLBACK");
      return undefined;
    }

    serviceId = saved.service_id;
    const queue = listQueue(serviceId);
    const currentIndex = queue.findIndex((item) => item.id === entryId);

    // already first or not in waiting list
    if (currentIndex <= 0) {
      db.exec("ROLLBACK");
      return undefined;
    }

    const from = currentIndex + 1;
    let to;
    let price;
    let label;

    if (mode === "front") {
      to = 1;
      price = FRONT_OF_LINE_PRICE;
      label = "Front of line";
    } else if (mode === "spots") {
      // regular skips cannot reach #1 spot and must cost less than front of line
      const maxSpots = Math.min(
        from - 2,
        Math.ceil(FRONT_OF_LINE_PRICE / PRICE_PER_SPOT) - 1,
      );

      if (!Number.isInteger(spots) || spots < 1 || spots > maxSpots) {
        db.exec("ROLLBACK");
        return undefined;
      }

      to = from - spots;
      price = spots * PRICE_PER_SPOT;
      label = `Skip ${spots} spot${spots === 1 ? "" : "s"}`;
    } else {
      db.exec("ROLLBACK");
      return undefined;
    }

    // move customer to the purchased position
    const [movedEntry] = queue.splice(currentIndex, 1);
    queue.splice(to - 1, 0, movedEntry);

    saveQueueOrder(queue);

    // record in db
    db.prepare(
      `
      INSERT INTO queue_skips (
        queue_entry_id,
        label,
        from_position,
        to_position,
        price,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    ).run(entryId, label, from, to, price, new Date().toISOString());

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  const entry = getQueueEntry(entryId);

  updateQueueHistory(entry);
  updateQueueNotifications(serviceId);

  return entry;
}

// return current position of a queue entry
export function getQueuePosition(entryId) {
  const entry = db
    .prepare(
      `
    SELECT id, service_id, position, status
    FROM queue_entries
    WHERE id = ?
  `,
    )
    .get(entryId);

  if (!entry || entry.status !== "waiting") {
    return 0;
  }

  const { count } = db
    .prepare(
      `
    SELECT COUNT(*) AS count
    FROM queue_entries
    WHERE service_id = ?
      AND status = 'waiting'
      AND (
        position < ?
        OR (position = ? AND id < ?)
      )
  `,
    )
    .get(entry.service_id, entry.position, entry.position, entry.id);

  return count + 1;
}

// return an entry with its info
export function getQueueEntry(entryId) {
  const row = db
    .prepare(
      `
    SELECT *
    FROM queue_entries
    WHERE id = ?
  `,
    )
    .get(entryId);

  if (!row) {
    return undefined;
  }

  const entry = toQueueEntry(row);
  const service = getServiceById(entry.serviceId);
  const position = getQueuePosition(entryId);

  // include existing purchases in the API response
  entry.skips = db
    .prepare(
      `
    SELECT
      label,
      from_position AS "from",
      to_position AS "to",
      price,
      created_at AS "at"
    FROM queue_skips
    WHERE queue_entry_id = ?
    ORDER BY id ASC
  `,
    )
    .all(entryId);

  return {
    ...entry,
    serviceName: service?.name ?? "Unknown service",
    position,
    partiesAhead: Math.max(0, position - 1),
    estimatedWaitMinutes:
      position > 0 ? estimateWaitForService(entry.serviceId, position) : 0,
    minutesPerParty: service?.duration ?? 0,
  };
}

// return service info and estimated wait for next in queue
export function getQueueSummary(serviceId) {
  const service = getServiceById(serviceId);

  if (!service) {
    return undefined;
  }

  const queue = db
    .prepare(
      `
    SELECT status
    FROM queues
    WHERE service_id = ?
  `,
    )
    .get(serviceId);

  const partiesAhead = listQueue(serviceId).length;

  return {
    serviceId: service.id,
    serviceName: service.name,
    description: service.description,
    isOpen: service.isOpen && queue?.status === "open",
    partiesAhead,
    estimatedWaitMinutes: estimateWaitForService(serviceId, partiesAhead + 1),
  };
}

// find customer's current waiting entry
export function getActiveQueueEntryForUser(userId) {
  const row = db
    .prepare(
      `
    SELECT id
    FROM queue_entries
    WHERE user_id = ? AND status = 'waiting'
    LIMIT 1
  `,
    )
    .get(userId);

  return row ? getQueueEntry(row.id) : undefined;
}

// cancel queue
export function leaveQueue(entryId) {
  // only waiting entries can be cancelled
  const result = db
    .prepare(
      `
    UPDATE queue_entries
    SET status = 'cancelled'
    WHERE id = ? AND status = 'waiting'
  `,
    )
    .run(entryId);

  if (result.changes === 0) {
    return undefined;
  }

  // get the updated entry from SQLite
  const entry = getQueueEntry(entryId);

  updateQueueHistory(entry);
  updateQueueNotifications(entry.serviceId);

  return entry;
}

// return all queue entries with current info
export function getAllQueueEntries() {
  // read queue entries from SQLite
  // waiting entries appear first, completed entries stay for Admin Queues
  const rows = db
    .prepare(
      `
    SELECT id, user_id
    FROM queue_entries
    ORDER BY
      CASE WHEN status = 'waiting' THEN 0 ELSE 1 END,
      service_id,
      position,
      id
  `,
    )
    .all();

  return rows.map((row) => {
    const entry = getQueueEntry(row.id);
    const user = getUserById(row.user_id);

    return {
      ...entry,
      guestName: user?.name ?? `Guest #${row.user_id}`,
    };
  });
}

// mark entry as served
export function serveQueueEntry(entryId) {
  // update saved queue entry
  const result = db
    .prepare(
      `
    UPDATE queue_entries
    SET status = 'served'
    WHERE id = ? AND status = 'waiting'
  `,
    )
    .run(entryId);

  if (result.changes === 0) {
    return undefined;
  }

  const entry = getQueueEntry(entryId);

  updateQueueHistory(entry);
  updateQueueNotifications(entry.serviceId);

  return entry;
}

// serve earliest waiting party
export function serveNext() {
  // find services with waiting entries in SQLite
  const services = db
    .prepare(
      `
    SELECT DISTINCT service_id
    FROM queue_entries
    WHERE status = 'waiting'
  `,
    )
    .all();

  // find the first waiting party from each service queue
  const nextEntry = services
    .map(({ service_id }) => listQueue(service_id)[0])
    .filter(Boolean)
    .sort((a, b) => a.id - b.id)[0];

  if (!nextEntry) {
    return undefined;
  }

  return serveQueueEntry(nextEntry.id);
}
