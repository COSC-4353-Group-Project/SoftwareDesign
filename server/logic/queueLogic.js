import { store } from "../data/store.js";
import { getServiceById } from "./serviceLogic.js";
import { estimateWaitForService } from "./waitTimeLogic.js";

// adding a guest to a queue
export function joinQueue(userId, serviceId, partySize, seatingPreference) {
  const service = getServiceById(serviceId);

  // number of waiting parties for a service
  const partiesAhead = store.queueEntries.filter(
    (entry) => entry.serviceId === serviceId && entry.status === "waiting",
  ).length;

  const position = partiesAhead + 1;

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
    joinedAt: new Date().toISOString(),
    type: "walk-in",
    notes: "",
    skips: [],
  };

  // store the entry and return the entry with information needed by QueueStatusPage
  store.queueEntries.push(entry);

  return {
    ...entry,
    serviceName: service.name,
    position,
    partiesAhead,
    estimatedWaitMinutes: estimateWaitForService(serviceId, position),
    minutesPerParty: service.duration,
  };
}

// list all waiting entries for a service in order
export function listQueue(serviceId) {
  return store.queueEntries
    .filter(
      (entry) => entry.serviceId === serviceId && entry.status === "waiting",
    )
    .sort((a, b) => a.id - b.id);
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

  return getQueueEntry(entryId);
}

// serve earliest waiting party
export function serveNext() {
  const nextEntry = store.queueEntries
    .filter((entry) => entry.status === "waiting")
    .sort((a, b) => a.id - b.id)[0];

  if (!nextEntry) {
    return undefined;
  }

  return serveQueueEntry(nextEntry.id);
}
