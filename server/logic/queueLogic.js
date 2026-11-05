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

// save updated order within a queue
function updateQueueOrder(orderedEntries) {
  orderedEntries.forEach((entry, index) => {
    entry.queueOrder = index + 1;
  });
}

// for notifying front of queue
function updateQueueNotifications(serviceId) {
  notifyAlmostReady(listQueue(serviceId));
}

// enable moviing a waiting party up or down
export function moveQueueEntry(entryId, direction) {
  const entry = store.queueEntries.find(
    (item) => item.id === entryId && item.status === "waiting",
  );

  if (!entry || ![-1, 1].includes(direction)) {
    return undefined;
  }

  const queue = listQueue(entry.serviceId);
  const currentIndex = queue.findIndex((item) => item.id === entryId);
  const newIndex = currentIndex + direction;

  // no wrapping
  if (currentIndex < 0 || newIndex < 0 || newIndex >= queue.length) {
    return undefined;
  }

  [queue[currentIndex], queue[newIndex]] = [
    queue[newIndex],
    queue[currentIndex],
  ];

  updateQueueOrder(queue);
  updateQueueNotifications(entry.serviceId);

  return getQueueEntry(entryId);
}

// paying bribe to move up in queue
export function purchaseQueueAdvance(entryId, mode, spots) {
  const entry = store.queueEntries.find(
    (item) => item.id === entryId && item.status === "waiting",
  );

  if (!entry) {
    return undefined;
  }

  const queue = listQueue(entry.serviceId);
  const currentIndex = queue.findIndex((item) => item.id === entryId);

  // already first in line
  if (currentIndex <= 0) {
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
    const maxSpots = Math.min(
      from - 2,
      Math.ceil(FRONT_OF_LINE_PRICE / PRICE_PER_SPOT) - 1,
    );

    if (!Number.isInteger(spots) || spots < 1 || spots > maxSpots) {
      return undefined;
    }

    to = from - spots;
    price = spots * PRICE_PER_SPOT;
    label = `Skip ${spots} spot${spots === 1 ? "" : "s"}`;
  } else {
    return undefined;
  }

  // move entry to its purchased position
  const [movedEntry] = queue.splice(currentIndex, 1);
  queue.splice(to - 1, 0, movedEntry);

  updateQueueOrder(queue);

  // record keeping purchase
  entry.skips ??= [];

  entry.skips.push({
    label,
    from,
    to,
    price,
    at: new Date().toISOString(),
  });

  updateQueueHistory(entry);
  updateQueueNotifications(entry.serviceId);

  return getQueueEntry(entryId);
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
  const entry = store.queueEntries.find((item) => item.id === entryId);

  // only active entries can leave
  if (!entry || entry.status !== "waiting") {
    return undefined;
  }
  entry.status = "cancelled";
  updateQueueHistory(entry);
  updateQueueNotifications(entry.serviceId);

  return getQueueEntry(entryId);
}

// return all queue entries with current info
export function getAllQueueEntries() {
  return store.queueEntries.map((entry) => {
    // JUSTIN: users are in the database now (authLogic), not store.users
    const user = getUserById(entry.userId);

    return {
      ...getQueueEntry(entry.id),
      guestName: user?.name ?? `Guest #${entry.userId}`,
    };
  });
}

// mark entry as served
export function serveQueueEntry(entryId) {
  const entry = store.queueEntries.find(
    (item) => item.id === entryId && item.status === "waiting",
  );

  if (!entry) {
    return undefined;
  }

  entry.status = "served";
  updateQueueHistory(entry);
  updateQueueNotifications(entry.serviceId);

  return getQueueEntry(entryId);
}

// serve earliest waiting party
export function serveNext() {
  const serviceIds = [
    ...new Set(
      store.queueEntries
        .filter((entry) => entry.status === "waiting")
        .map((entry) => entry.serviceId),
    ),
  ];

  // only first party
  const nextEntry = serviceIds
    .map((serviceId) => listQueue(serviceId)[0])
    .filter(Boolean)
    .sort((a, b) => a.id - b.id)[0];

  if (!nextEntry) {
    return undefined;
  }

  return serveQueueEntry(nextEntry.id);
}
