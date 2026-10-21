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
