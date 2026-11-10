import { beforeEach, describe, expect, test } from "vitest";
import { db, resetDatabase } from "../data/db.js";
import {
  joinQueue,
  getQueueEntry,
  leaveQueue,
  serveQueueEntry,
  serveNext,
} from "../logic/queueLogic.js";

// JUSTIN (A4+): served_at is saved when an admin serves a party, so reports can
// work out how long people actually waited (served_at - joined_at).

beforeEach(() => {
  resetDatabase();
});

describe("served_at", () => {
  test("is empty while the party is still waiting", () => {
    const joined = joinQueue(2, 1, 2, "Dine-in");

    expect(joined.servedAt).toBeNull();
  });

  test("is saved when an admin serves the party", () => {
    const joined = joinQueue(2, 1, 2, "Dine-in");
    const before = Date.now();

    const served = serveQueueEntry(joined.id);

    // saved as a UTC ISO string, the same format as joined_at
    expect(served.servedAt).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
    expect(Date.parse(served.servedAt)).toBeGreaterThanOrEqual(before);
    expect(Date.parse(served.servedAt)).toBeGreaterThanOrEqual(
      Date.parse(served.joinedAt),
    );
  });

  test("is saved by serve next too", () => {
    joinQueue(2, 1, 2, "Dine-in");

    const served = serveNext();

    expect(served.servedAt).not.toBeNull();
  });

  test("stays empty when the party leaves instead", () => {
    const joined = joinQueue(2, 1, 2, "Dine-in");

    const cancelled = leaveQueue(joined.id);

    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.servedAt).toBeNull();
  });

  test("serving twice keeps the first time", () => {
    const joined = joinQueue(2, 1, 2, "Dine-in");
    const first = serveQueueEntry(joined.id);

    // already served, so this does nothing
    expect(serveQueueEntry(joined.id)).toBeUndefined();
    expect(getQueueEntry(joined.id).servedAt).toBe(first.servedAt);
  });

  test("seed visits have served times so reports have history to show", () => {
    expect(getQueueEntry(1).servedAt).toBe("2026-09-17 19:12:00");
    expect(getQueueEntry(2).servedAt).toBe("2026-09-19 19:16:00");
    expect(getQueueEntry(3).servedAt).toBeNull(); // cancelled

    // how long seed visit 1 waited, the way a report would work it out in SQL
    const { minutes } = db
      .prepare(
        `
      SELECT ROUND((julianday(served_at) - julianday(joined_at)) * 24 * 60) AS minutes
      FROM queue_entries
      WHERE id = 1
    `,
      )
      .get();

    expect(minutes).toBe(42);
  });
});
