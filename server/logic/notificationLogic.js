import { db } from "../data/db.js";

// A4: notifications are saved in the notifications table now instead of store.notifications,
// so they're still there after a server restart.

// A row from the notifications table, turned into the shape the dashboard already uses.
function toNotification(row) {
  return {
    id: row.id,
    userId: row.user_id,
    entryId: row.queue_entry_id,
    type: row.type,
    title: row.title,
    body: row.body,
    isRead: row.is_read === 1,
    createdAt: row.created_at,
  };
}

// make a notif for user
function createNotification(userId, entryId, type, title, body) {
  const result = db
    .prepare(
      `
    INSERT INTO notifications (user_id, queue_entry_id, type, title, body, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
    )
    .run(userId, entryId, type, title, body, new Date().toISOString());

  const row = db
    .prepare("SELECT * FROM notifications WHERE id = ?")
    .get(result.lastInsertRowid);
  return toNotification(row);
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

    // .get() gives back undefined when there's no matching row
    const alreadyNotified = db
      .prepare(
        `
      SELECT id FROM notifications
      WHERE queue_entry_id = ? AND type = 'almost_ready'
    `,
      )
      .get(entry.id);

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

// notify when someone pays to skip ahead of them. newPosition = their spot after getting passed
export function notifyPassedBy(entry, newPosition) {
  return createNotification(
    entry.userId,
    entry.id,
    "passed_by",
    "Someone paid to skip ahead of you",
    `You're now #${newPosition} in line`,
  );
}

// notify when an admin serves them
export function notifyTableReady(entry, serviceName) {
  return createNotification(
    entry.userId,
    entry.id,
    "table_ready",
    "Your table is ready",
    `${serviceName} · head to the host stand`,
  );
}

// newest first
export function listNotifications(userId) {
  const rows = db
    .prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC")
    .all(userId);
  return rows.map(toNotification);
}

// called when the user opens the bell, so the red count goes back to 0
export function markNotificationsRead(userId) {
  db.prepare(
    "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
  ).run(userId);
}

// how many times this entry got skipped by someone paying ("Passed by N skippers" on AdminQueuesPage)
export function countPassedBy(entryId) {
  const { count } = db
    .prepare(
      `
    SELECT COUNT(*) AS count FROM notifications
    WHERE queue_entry_id = ? AND type = 'passed_by'
  `,
    )
    .get(entryId);
  return count;
}
