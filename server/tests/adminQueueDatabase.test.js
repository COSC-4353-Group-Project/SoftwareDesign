import { beforeEach, describe, expect, test } from "vitest";
import { db, resetDatabase } from "../data/db.js";
import { resetStore } from "../data/store.js";
import { registerUser } from "../logic/authLogic.js";
import {
  joinQueue,
  listQueue,
  getQueueEntry,
  getAllQueueEntries,
  moveQueueEntry,
  serveQueueEntry,
  serveNext,
} from "../logic/queueLogic.js";

beforeEach(() => {
  resetStore();
  resetDatabase();
});

function addUser(name, phone) {
  return registerUser({
    name,
    phone,
    smsOptIn: false,
  }).user;
}

describe("Administrator queue retrieval", () => {
  test("lists database entries with registered guest names", () => {
    const joined = joinQueue(2, 1, 2, "Dine-in");

    const entries = getAllQueueEntries();
    const entry = entries.find((item) => item.id === joined.id);

    expect(entry).toMatchObject({
      id: joined.id,
      guestName: "Justin Hendrix",
      serviceId: 1,
      status: "waiting",
      position: 1,
    });
  });

  test("includes served and cancelled entries", () => {
    const joined = joinQueue(2, 1, 2, "Dine-in");

    serveQueueEntry(joined.id);

    const entries = getAllQueueEntries();
    const served = entries.find((item) => item.id === joined.id);

    expect(served.status).toBe("served");
    expect(served.position).toBe(0);
  });
});

describe("Administrator queue ordering", () => {
  test("moves customers and saves their positions in SQLite", () => {
    const anaya = addUser("Anaya", "7135550999");

    const first = joinQueue(2, 1, 2, "Dine-in");
    const second = joinQueue(anaya.id, 1, 2, "Dine-in");

    const moved = moveQueueEntry(second.id, -1);

    expect(moved.position).toBe(1);
    expect(listQueue(1).map((entry) => entry.id)).toEqual([
      second.id,
      first.id,
    ]);

    const rows = db.prepare(`
      SELECT id, position
      FROM queue_entries
      WHERE service_id = 1 AND status = 'waiting'
      ORDER BY position
    `).all();

    expect(rows.map((row) => row.id)).toEqual([
      second.id,
      first.id,
    ]);

    expect(rows.map((row) => row.position)).toEqual([1, 2]);

    expect(moveQueueEntry(second.id, -1)).toBeUndefined();

    expect(moveQueueEntry(second.id, 1).position).toBe(2);
  });

  test("keeps separate service queues independent", () => {
    const anaya = addUser("Anaya", "7135550999");
    const vincent = addUser("Vincent", "7135550888");

    joinQueue(2, 1, 2, "Dine-in");
    const second = joinQueue(anaya.id, 1, 2, "Dine-in");
    const bar = joinQueue(vincent.id, 3, 1, "Bar Seating");

    moveQueueEntry(second.id, -1);

    expect(getQueueEntry(bar.id).position).toBe(1);
    expect(listQueue(3)).toHaveLength(1);
    expect(listQueue(1)).toHaveLength(2);
  });
});

describe("Serving customers", () => {
  test("serves a waiting party and retains the database record", () => {
    const joined = joinQueue(2, 1, 2, "Dine-in");

    const served = serveQueueEntry(joined.id);

    expect(served.status).toBe("served");
    expect(served.position).toBe(0);

    const saved = db.prepare(`
      SELECT status
      FROM queue_entries
      WHERE id = ?
    `).get(joined.id);

    expect(saved.status).toBe("served");
    expect(listQueue(1)).toHaveLength(0);

    expect(serveQueueEntry(joined.id)).toBeUndefined();
  });

  test("Serve Next respects manual queue ordering", () => {
    const anaya = addUser("Anaya", "7135550999");

    const first = joinQueue(2, 1, 2, "Dine-in");
    const second = joinQueue(anaya.id, 1, 2, "Dine-in");

    moveQueueEntry(second.id, -1);

    const served = serveNext();

    expect(served.id).toBe(second.id);
    expect(served.status).toBe("served");

    expect(getQueueEntry(first.id).position).toBe(1);

    const next = serveNext();

    expect(next.id).toBe(first.id);
    expect(serveNext()).toBeUndefined();
  });
});