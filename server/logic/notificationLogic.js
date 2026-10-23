import { store } from "../data/store.js";

// make a notif for user
function createNotification(userId, entryId, type, title, body) {
  const notification = {
    id: Math.max(0, ...store.notifications.map((item) => item.id)) + 1,
    userId,
    entryId,
    type,
    title,
    body,
    createdAt: new Date().toISOString(),
  };

  store.notifications.push(notification);
  return notification;
}

// notify when joined
export function notifyQueueJoined(entry, serviceName) {
  return createNotification(
    entry.userId,
    entry.id,
    "joined",
    "You joined the waitlist",
    `${serviceName} · you're #${entry.position} in line`,
  );
}

// notify if user is in top 3 of the queue
export function notifyAlmostReady(queue) {
  queue.forEach((entry, index) => {
    const position = index + 1;

    if (position > 3) return;

    const alreadyNotified = store.notifications.some(
      (item) =>
        item.entryId === entry.id &&
        item.type === "almost_ready",
    );

    if (alreadyNotified) return;

    createNotification(
      entry.userId,
      entry.id,
      "almost_ready",
      `You're #${position} in line`,
      "Head back to the host stand soon.",
    );
  });
}

export function listNotifications(userId) {
  return store.notifications
    .filter((item) => item.userId === userId)
    .sort((a, b) => b.id - a.id);
}
