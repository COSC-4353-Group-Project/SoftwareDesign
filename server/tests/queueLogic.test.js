import { beforeEach, describe, expect, test } from "vitest";
import { db, resetDatabase } from "../data/db.js";
import { resetStore, store } from "../data/store.js";
import {
  joinQueue,
  listQueue,
  getQueuePosition,
  getQueueEntry,
  getQueueSummary,
  getAllQueueEntries,
  leaveQueue,
  serveQueueEntry,
  serveNext,
  moveQueueEntry,
  purchaseQueueAdvance,
} from "../logic/queueLogic.js";

beforeEach(() => {
  resetStore();
  resetDatabase();

  const addCredential = db.prepare(
    "INSERT INTO user_credentials (id, phone_hash, role) VALUES (?, ?, ?)",
  );

  const addProfile = db.prepare(
    "INSERT INTO user_profiles (user_id, full_name, phone, sms_opt_in) VALUES (?, ?, ?, ?)",
  );

  for (const [id, name, phone] of [
    [3, "Anaya", "7135550999"],
    [4, "Vincent", "7135550888"],
    [5, "Maria", "7135550777"],
  ]) {
    addCredential.run(id, "test-only-hash", "user");
    addProfile.run(id, name, phone, 0);
  }
});

function join(userId, serviceId = 1, partySize = 2, seating = "Dine-in") {
  return joinQueue(userId, serviceId, partySize, seating);
}

describe("joining and retrieving queues", () => {
  test("joins with position, wait, and linked History record", () => {
    const entry = join(2);

    expect(entry).toMatchObject({
      userId: 2,
      serviceId: 1,
      status: "waiting",
      position: 1,
      queueOrder: 1,
      estimatedWaitMinutes: 45,
    });

    expect(entry.id).toBeGreaterThan(3);
    expect(entry.skips).toEqual([]);

    expect(
      store.history.find((h) => h.queueEntryId === entry.id),
    ).toMatchObject({
      userId: 2,
      status: "Entered",
      bribe: 0,
    });
  });

  test("retrieves queue position and summary in service order", () => {
    const first = join(2);
    const second = join(3);

    expect(listQueue(1).map((entry) => entry.id)).toEqual([
      first.id,
      second.id,
    ]);

    expect(getQueuePosition(second.id)).toBe(2);

    expect(getQueueSummary(1)).toMatchObject({
      serviceId: 1,
      partiesAhead: 2,
      estimatedWaitMinutes: 135,
    });

    expect(getQueueSummary(999)).toBeUndefined();
    expect(getQueueEntry(999)).toBeUndefined();
    expect(getQueuePosition(999)).toBe(0);
  });

  test("keeps separate services independent and displays registered guest names", () => {
    const first = join(2);
    const bar = join(3, 3, 1, "Bar Seating");

    expect(listQueue(1)).toHaveLength(1);
    expect(listQueue(3)).toHaveLength(1);
    expect(getQueuePosition(bar.id)).toBe(1);

    const entries = getAllQueueEntries();

    expect(
      entries.find((entry) => entry.id === first.id).guestName,
    ).toBe("Justin Hendrix");

    expect(
      entries.find((entry) => entry.id === bar.id).guestName,
    ).toBe("Anaya");
  });
});

describe("leaving and serving", () => {
  test("cancels a waiting entry, updates History, and recalculates positions", () => {
    const first = join(2);
    const second = join(3);

    expect(leaveQueue(first.id)).toMatchObject({
      status: "cancelled",
      position: 0,
    });

    expect(getQueuePosition(second.id)).toBe(1);

    expect(
      store.history.find((h) => h.queueEntryId === first.id).status,
    ).toBe("Canceled");

    expect(leaveQueue(first.id)).toBeUndefined();
    expect(leaveQueue(999)).toBeUndefined();
  });

  test("serves an entry once and updates History", () => {
    const entry = join(2);

    expect(serveQueueEntry(entry.id)).toMatchObject({
      status: "served",
      position: 0,
    });

    expect(
      store.history.find((h) => h.queueEntryId === entry.id).status,
    ).toBe("Done");

    expect(serveQueueEntry(entry.id)).toBeUndefined();
    expect(serveQueueEntry(999)).toBeUndefined();
  });

  test("serves the promoted first party and handles an empty queue", () => {
    expect(serveNext()).toBeUndefined();

    const first = join(2);
    const second = join(3);

    moveQueueEntry(second.id, -1);

    expect(serveNext().id).toBe(second.id);
    expect(getQueuePosition(first.id)).toBe(1);
  });
});

describe("admin reorder and BribeSmart", () => {
  test("moves up and down, but cannot move past queue boundaries", () => {
    const first = join(2);
    const second = join(3);
    const third = join(4);

    expect(moveQueueEntry(third.id, -1).position).toBe(2);

    expect(listQueue(1).map((entry) => entry.id)).toEqual([
      first.id,
      third.id,
      second.id,
    ]);

    expect(moveQueueEntry(third.id, 1).position).toBe(3);
    expect(moveQueueEntry(first.id, -1)).toBeUndefined();
    expect(moveQueueEntry(third.id, 1)).toBeUndefined();
    expect(moveQueueEntry(first.id, 0)).toBeUndefined();
    expect(moveQueueEntry(999, -1)).toBeUndefined();
  });

  test("skips a spot for $3 and records the purchase in History", () => {
    join(2);
    join(3);
    const third = join(4);

    const result = purchaseQueueAdvance(third.id, "spots", 1);

    expect(result.position).toBe(2);

    expect(result.skips[0]).toMatchObject({
      from: 3,
      to: 2,
      price: 3,
    });

    expect(
      store.history.find((h) => h.queueEntryId === third.id).bribe,
    ).toBe(3);
  });

  test("moves to front for $20 and serves the new first party", () => {
    join(2);
    join(3);
    const third = join(4);

    const result = purchaseQueueAdvance(third.id, "front");

    expect(result.position).toBe(1);

    expect(result.skips[0]).toMatchObject({
      from: 3,
      to: 1,
      price: 20,
    });

    expect(serveNext().id).toBe(third.id);

    expect(
      store.history.find((h) => h.queueEntryId === third.id),
    ).toMatchObject({
      bribe: 20,
      status: "Done",
    });
  });

  test("rejects invalid advancements without changing queue order", () => {
    const first = join(2);
    join(3);
    const third = join(4);

    const before = listQueue(1).map((entry) => entry.id);

    expect(purchaseQueueAdvance(first.id, "front")).toBeUndefined();
    expect(purchaseQueueAdvance(third.id, "spots", 2)).toBeUndefined();
    expect(purchaseQueueAdvance(third.id, "spots", 0)).toBeUndefined();
    expect(purchaseQueueAdvance(third.id, "spots", 1.5)).toBeUndefined();
    expect(purchaseQueueAdvance(third.id, "invalid")).toBeUndefined();
    expect(purchaseQueueAdvance(999, "front")).toBeUndefined();

    expect(listQueue(1).map((entry) => entry.id)).toEqual(before);
  });

  test("keeps new entrants behind previously reordered parties", () => {
    const first = join(2);
    const second = join(3);
    const third = join(4);

    moveQueueEntry(third.id, -1);
    leaveQueue(first.id);

    const fourth = join(5);

    expect(listQueue(1).map((entry) => entry.id)).toEqual([
      third.id,
      second.id,
      fourth.id,
    ]);
  });
});