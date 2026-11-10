import request from "supertest";
import { beforeEach, describe, expect, test } from "vitest";
import app from "../app.js";
import { db, resetDatabase } from "../data/db.js";
import { registerUser, loginUser } from "../logic/authLogic.js";
import {
  joinQueue,
  listQueue,
  getQueueEntry,
  purchaseQueueAdvance,
  serveNext,
} from "../logic/queueLogic.js";
import { getSkipPrices } from "../logic/skipPricingLogic.js";

beforeEach(() => {
  resetDatabase();
});

function addUser(name, phone) {
  return registerUser({
    name,
    phone,
    smsOptIn: false,
  }).user;
}

function createThreePersonQueue() {
  const anaya = addUser("Anaya", "7135550999");
  const vincent = addUser("Vincent", "7135550888");

  const first = joinQueue(2, 1, 2, "Dine-in");
  const second = joinQueue(anaya.id, 1, 2, "Dine-in");
  const third = joinQueue(vincent.id, 1, 2, "Dine-in");

  return { first, second, third };
}

describe("BribeSmart database persistence", () => {
  test("skips one spot for $6 (high priority) and saves the purchase", () => {
    const { first, second, third } = createThreePersonQueue();

    const result = purchaseQueueAdvance(third.id, "spots", 1);

    expect(result.position).toBe(2);
    expect(result.skips).toEqual([
      expect.objectContaining({
        label: "Skip 1 spot",
        from: 3,
        to: 2,
        price: 6,
      }),
    ]);

    expect(listQueue(1).map((entry) => entry.id)).toEqual([
      first.id,
      third.id,
      second.id,
    ]);

    const purchase = db.prepare(`
      SELECT queue_entry_id, from_position, to_position, price
      FROM queue_skips
      WHERE queue_entry_id = ?
    `).get(third.id);

    expect(purchase).toMatchObject({
      queue_entry_id: third.id,
      from_position: 3,
      to_position: 2,
      price: 6,
    });
  });

  test("moves to front for $40 (high priority) and persists the ordering", () => {
    const { first, second, third } = createThreePersonQueue();

    const result = purchaseQueueAdvance(third.id, "front");

    expect(result.position).toBe(1);
    expect(result.skips[0]).toMatchObject({
      label: "Front of line",
      from: 3,
      to: 1,
      price: 40,
    });

    expect(listQueue(1).map((entry) => entry.id)).toEqual([
      third.id,
      first.id,
      second.id,
    ]);

    // Serve Next must respect the purchased position.
    expect(serveNext().id).toBe(third.id);
  });

  test("keeps multiple purchases in SQLite", () => {
    const { third } = createThreePersonQueue();

    const firstPurchase = purchaseQueueAdvance(third.id, "spots", 1);
    expect(firstPurchase.position).toBe(2);

    const secondPurchase = purchaseQueueAdvance(third.id, "front");
    expect(secondPurchase.position).toBe(1);

    const saved = getQueueEntry(third.id);

    expect(saved.skips).toHaveLength(2);
    // JUSTIN (A4+): the first skip makes the second one surge +15% (1 skip in the last hour),
    // so front of line costs 46 instead of 40. See skipPricingLogic.test.js for the surge rules.
    expect(saved.skips.map((skip) => skip.price)).toEqual([6, 46]);

    const purchases = db.prepare(`
      SELECT COUNT(*) AS count
      FROM queue_skips
      WHERE queue_entry_id = ?
    `).get(third.id);

    expect(purchases.count).toBe(2);
  });

  test("rejects invalid purchases without changing queue data", () => {
    const { first, third } = createThreePersonQueue();

    const originalOrder = listQueue(1).map((entry) => entry.id);

    expect(purchaseQueueAdvance(first.id, "front")).toBeUndefined();
    expect(purchaseQueueAdvance(third.id, "spots", 2)).toBeUndefined();
    expect(purchaseQueueAdvance(third.id, "spots", 0)).toBeUndefined();
    expect(purchaseQueueAdvance(third.id, "spots", 1.5)).toBeUndefined();
    expect(purchaseQueueAdvance(third.id, "invalid")).toBeUndefined();
    expect(purchaseQueueAdvance(999, "front")).toBeUndefined();

    expect(listQueue(1).map((entry) => entry.id)).toEqual(originalOrder);

    const purchases = db.prepare(`
      SELECT COUNT(*) AS count
      FROM queue_skips
      WHERE queue_entry_id = ?
    `).get(third.id);

    expect(purchases.count).toBe(0);
  });

  test("rolls back reordering if saving a purchase fails", () => {
    const { third } = createThreePersonQueue();
    const originalOrder = listQueue(1).map((entry) => entry.id);

    // Reject the purchase insert to verify that queue positions are rolled back.
    db.exec(`
      CREATE TEMP TRIGGER reject_queue_purchase
      BEFORE INSERT ON queue_skips
      BEGIN
        SELECT RAISE(ABORT, 'Purchase rejected by database');
      END;
    `);

    try {
      expect(() => {
        purchaseQueueAdvance(third.id, "front");
      }).toThrow();
    } finally {
      db.exec("DROP TRIGGER reject_queue_purchase");
    }

    const updatedOrder = listQueue(1).map((entry) => entry.id);

    expect(updatedOrder).toEqual(originalOrder);
    expect(getQueueEntry(third.id).skips).toHaveLength(0);

    const purchases = db.prepare(`
      SELECT COUNT(*) AS count
      FROM queue_skips
      WHERE queue_entry_id = ?
    `).get(third.id);

    expect(purchases.count).toBe(0);
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });

  test("does not change unrelated service queues", () => {
    const { third } = createThreePersonQueue();
    const barGuest = addUser("Sarah", "7135550777");
    const bar = joinQueue(barGuest.id, 3, 1, "Bar Seating");

    purchaseQueueAdvance(third.id, "front");

    expect(getQueueEntry(bar.id).position).toBe(1);
    expect(listQueue(3)).toHaveLength(1);
  });
});

describe("BribeSmart API", () => {
  test("allows only the owner to purchase advancement", async () => {
    const anaya = addUser("Anaya", "7135550999");

    joinQueue(2, 1, 2, "Dine-in");
    const second = joinQueue(anaya.id, 1, 2, "Dine-in");

    const justinToken = loginUser(
      "Justin Hendrix",
      "7135550123",
    ).token;

    const anayaToken = loginUser(
      "Anaya",
      "7135550999",
    ).token;

    const url = `/api/queues/${second.id}/advance`;

    const denied = await request(app)
      .post(url)
      .set("Authorization", `Bearer ${justinToken}`)
      .send({ mode: "front" });

    expect(denied.status).toBe(403);

    const purchased = await request(app)
      .post(url)
      .set("Authorization", `Bearer ${anayaToken}`)
      .send({ mode: "front" });

    expect(purchased.status).toBe(200);
    expect(purchased.body.position).toBe(1);
    expect(purchased.body.skips[0].price).toBe(40);

    const saved = db.prepare(`
      SELECT COUNT(*) AS count
      FROM queue_skips
      WHERE queue_entry_id = ?
    `).get(second.id);

    expect(saved.count).toBe(1);
  });
});
// JUSTIN: bribe prices depend on the service's priority (SKIP_PRICES in queueLogic.js).
// Service 1 is high (the tests above), service 3 (Bar Seating) is medium.
describe("BribeSmart prices by service priority", () => {
  function createBarQueue() {
    const anaya = addUser("Anaya", "7135550999");
    const vincent = addUser("Vincent", "7135550888");

    joinQueue(2, 3, 1, "Bar Seating");
    joinQueue(anaya.id, 3, 1, "Bar Seating");
    return joinQueue(vincent.id, 3, 1, "Bar Seating");
  }

  test("gives each priority its own prices", () => {
    expect(getSkipPrices("high")).toEqual({ perSpot: 6, front: 40 });
    expect(getSkipPrices("medium")).toEqual({ perSpot: 5, front: 30 });
    expect(getSkipPrices("low")).toEqual({ perSpot: 3, front: 20 });
    // anything unexpected falls back to the cheapest prices
    expect(getSkipPrices(undefined)).toEqual({ perSpot: 3, front: 20 });
  });

  test("sends the line's prices with the queue entry", () => {
    const third = createBarQueue();

    // 3 parties and no skips yet, so no surge: normal medium prices
    expect(getQueueEntry(third.id).skipPrices).toEqual({
      perSpot: 5,
      front: 30,
      surgePercent: 0,
      reasons: [],
    });
  });

  test("charges medium prices in a medium priority line", () => {
    const third = createBarQueue();

    const result = purchaseQueueAdvance(third.id, "spots", 1);

    expect(result.skips[0]).toMatchObject({ from: 3, to: 2, price: 5 });
  });

  test("uses the new price after the admin changes the priority", () => {
    const third = createBarQueue();
    db.prepare("UPDATE services SET priority = 'low' WHERE id = 3").run();

    const result = purchaseQueueAdvance(third.id, "front");

    expect(result.skips[0]).toMatchObject({ from: 3, to: 1, price: 20 });
  });
});
