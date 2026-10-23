import { store } from "../data/store.js";
import { getServiceById } from "./serviceLogic.js";
import { estimateWaitForService } from "./waitTimeLogic.js";
import { notifyQueueJoined, notifyAlmostReady } from "./notificationLogic.js";

const PRICE_PER_SPOT = 3;
const FRONT_OF_LINE_PRICE = 20;

// adding a guest to a queue
export function joinQueue(userId, serviceId, partySize, seatingPreference) {
  const service = getServiceById(serviceId);

  // number of waiting parties for a service
  const partiesAhead = listQueue(serviceId).length;
  const position = partiesAhead + 1;
  const queueOrder =
    Math.max(
      0,
      ...listQueue(serviceId).map((entry) => entry.queueOrder ?? entry.id),
    ) + 1;

  // create unique entry ID (and make sure it's in order)
  const nextId =
    Math.max(0, ...store.queueEntries.map((entry) => entry.id)) + 1;

  // queue entry
  const entry = {
    id: nextId,
    userId,
    serviceId,
    partySize,
    seatingPreference,
    status: "waiting",
    initialPosition: position,
    queueOrder,
    joinedAt: new Date().toISOString(),
    type: "walk-in",
    notes: "",
    skips: [],
  };

  // store the entry and return the entry with information needed by QueueStatusPage
  store.queueEntries.push(entry);

  const joinedEntry = getQueueEntry(entry.id);

  notifyQueueJoined(joinedEntry, service.name);
  updateQueueNotifications(serviceId);

  return joinedEntry;
}

// list all waiting entries for a service in order
export function listQueue(serviceId) {
  return store.queueEntries
    .filter(
      (entry) => entry.serviceId === serviceId && entry.status === "waiting",
    )
    .sort(
      (a, b) => (a.queueOrder ?? a.id) - (b.queueOrder ?? b.id) || a.id - b.id,
    );
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

  updateQueueNotifications(entry.serviceId);

  return getQueueEntry(entryId);
}

// return current position of a queue entry
export function getQueuePosition(entryId) {
  const entry = store.queueEntries.find((item) => item.id === entryId);

  if (!entry || entry.status !== "waiting") {
    return 0;
  }

  const queue = listQueue(entry.serviceId);

  return queue.findIndex((item) => item.id === entryId) + 1;
}

// return an entry with its info
export function getQueueEntry(entryId) {
  const entry = store.queueEntries.find((item) => item.id === entryId);

  if (!entry) {
    return undefined;
  }

  const service = getServiceById(entry.serviceId);
  const position = getQueuePosition(entryId);

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

  const partiesAhead = listQueue(serviceId).length;

  return {
    serviceId: service.id,
    serviceName: service.name,
    description: service.description,
    isOpen: service.isOpen,
    partiesAhead,
    estimatedWaitMinutes: estimateWaitForService(serviceId, partiesAhead + 1),
  };
}

// cancel queue
export function leaveQueue(entryId) {
  const entry = store.queueEntries.find((item) => item.id === entryId);

  // only active entries can leave
  if (!entry || entry.status !== "waiting") {
    return undefined;
  }
  entry.status = "cancelled";
  updateQueueNotifications(entry.serviceId);

  return getQueueEntry(entryId);
}

// return all queue entries with current info
export function getAllQueueEntries() {
  return store.queueEntries.map((entry) => {
    const user = store.users.find((user) => user.id === entry.userId);

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
