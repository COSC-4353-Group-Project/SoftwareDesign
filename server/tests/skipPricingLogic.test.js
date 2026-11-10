import { beforeEach, describe, expect, test } from "vitest";
import { db, resetDatabase } from "../data/db.js";
import { registerUser } from "../logic/authLogic.js";
import {
  joinQueue,
  getQueueEntry,
  purchaseQueueAdvance,
  leaveQueue,
} from "../logic/queueLogic.js";
import {
  applySurge,
  demandSurgePercent,
  getSurgeSkipPrices,
  lineSurgePercent,
  priceForSkip,
} from "../logic/skipPricingLogic.js";

// JUSTIN (A4+): tests for the smart feature, surge pricing on skips.
// Service 1 (Dine-in 1-2) is high priority: normally $6 per spot, $40 for front of line.

beforeEach(() => {
  resetDatabase();
});

// puts `count` new guests in line for a service and returns their entries in order.
// phones are 713555 + 4 digits so they never clash with the seed users.
// pass a different firstPhone when filling a second line, phones have to be unique.
function fillLine(serviceId, count, firstPhone = 7000) {
  const entries = [];
  for (let i = 0; i < count; i++) {
    const user = registerUser({
      name: `Guest ${i + 1}`,
      phone: `713555${firstPhone + i}`,
      smsOptIn: false,
    }).user;
    entries.push(joinQueue(user.id, serviceId, 2, "Dine-in"));
  }
  return entries;
}

// saves a skip for an entry that happened `minutesAgo` minutes ago, without moving anyone
function addSkipFromMinutesAgo(entryId, minutesAgo) {
  const at = new Date(Date.now() - minutesAgo * 60_000).toISOString();
  db.prepare(
    `
    INSERT INTO queue_skips (queue_entry_id, label, from_position, to_position, price, created_at)
    VALUES (?, 'Skip 1 spot', 3, 2, 6, ?)
  `,
  ).run(entryId, at);
}

describe("surge rules", () => {
  test("a short line adds nothing, each party past 3 adds 10%", () => {
    expect(lineSurgePercent(0)).toBe(0);
    expect(lineSurgePercent(3)).toBe(0);
    expect(lineSurgePercent(4)).toBe(10);
    expect(lineSurgePercent(6)).toBe(30);
  });

  test("line surge stops at +50%", () => {
    expect(lineSurgePercent(8)).toBe(50);
    expect(lineSurgePercent(100)).toBe(50);
  });

  test("each recent skip adds 15%, up to +45%", () => {
    expect(demandSurgePercent(0)).toBe(0);
    expect(demandSurgePercent(1)).toBe(15);
    expect(demandSurgePercent(3)).toBe(45);
    expect(demandSurgePercent(10)).toBe(45);
  });

  test("rounds surged prices up to whole dollars", () => {
    expect(applySurge(40, 0)).toBe(40);
    expect(applySurge(6, 20)).toBe(8); // 7.20 -> 8
    expect(applySurge(40, 15)).toBe(46);
  });

  test("prices a skip: front is flat, spots are per spot", () => {
    const prices = { perSpot: 8, front: 48 };

    expect(priceForSkip(prices, "front")).toBe(48);
    expect(priceForSkip(prices, "spots", 3)).toBe(24);
  });

  test("doesn't add a dollar from decimal rounding errors", () => {
    // 20 * 1.1 is 22.000000000000004 in JavaScript, which would round up to 23
    expect(applySurge(20, 10)).toBe(22);
  });
});

describe("surge prices for a line", () => {
  test("normal prices when the line is short and nobody skipped", () => {
    fillLine(1, 3);

    expect(getSurgeSkipPrices(1)).toEqual({
      perSpot: 6,
      front: 40,
      surgePercent: 0,
      reasons: [],
    });
  });

  test("a long line raises the price and says why", () => {
    fillLine(1, 5);

    expect(getSurgeSkipPrices(1)).toEqual({
      perSpot: 8,
      front: 48,
      surgePercent: 20,
      reasons: ["5 parties in line (+20%)"],
    });
  });

  test("skips from the last hour raise the price", () => {
    const [first, second] = fillLine(1, 3);
    addSkipFromMinutesAgo(first.id, 10);
    addSkipFromMinutesAgo(second.id, 50);

    expect(getSurgeSkipPrices(1)).toMatchObject({
      perSpot: 8, // 6 * 1.30 = 7.80 -> 8
      front: 52,
      surgePercent: 30,
      reasons: ["2 skips bought in the last hour (+30%)"],
    });
  });

  test("skips older than an hour stop counting", () => {
    const [first] = fillLine(1, 3);
    addSkipFromMinutesAgo(first.id, 61);

    expect(getSurgeSkipPrices(1).surgePercent).toBe(0);
  });

  test("skips in a different line don't count", () => {
    fillLine(1, 3);
    const [barGuest] = fillLine(3, 1, 8000);
    addSkipFromMinutesAgo(barGuest.id, 5);

    expect(getSurgeSkipPrices(1).surgePercent).toBe(0);
    expect(getSurgeSkipPrices(3).surgePercent).toBe(15);
  });

  test("the seed skip from September doesn't count", () => {
    // seed entry 2 (Patio, service 4) has a skip from 2026-09-19
    expect(getSurgeSkipPrices(4).surgePercent).toBe(0);
  });

  test("long line and recent skips add together", () => {
    const line = fillLine(1, 6); // +30%
    addSkipFromMinutesAgo(line[0].id, 5); // +15%

    expect(getSurgeSkipPrices(1)).toEqual({
      perSpot: 9, // 6 * 1.45 = 8.70 -> 9
      front: 58,
      surgePercent: 45,
      reasons: [
        "6 parties in line (+30%)",
        "1 skip bought in the last hour (+15%)",
      ],
    });
  });

  test("leaving the line brings the price back down", () => {
    const line = fillLine(1, 4);
    expect(getSurgeSkipPrices(1).surgePercent).toBe(10);

    leaveQueue(line[0].id);

    expect(getSurgeSkipPrices(1).surgePercent).toBe(0);
  });
});

describe("surge pricing in the queue", () => {
  test("the queue entry carries the surged prices for the page", () => {
    const line = fillLine(1, 5);

    expect(getQueueEntry(line[4].id).skipPrices).toMatchObject({
      perSpot: 8,
      front: 48,
      surgePercent: 20,
    });
  });

  test("buying a skip charges the surged price", () => {
    const line = fillLine(1, 5); // +20%

    const result = purchaseQueueAdvance(line[4].id, "spots", 2);

    expect(result.skips[0]).toMatchObject({ from: 5, to: 3, price: 16 }); // 2 x $8
  });

  test("each skip makes the next one cost more", () => {
    const line = fillLine(1, 3);

    purchaseQueueAdvance(line[2].id, "spots", 1);
    const after = getQueueEntry(line[1].id);

    expect(after.skipPrices.surgePercent).toBe(15);
    expect(after.skipPrices.front).toBe(46);
  });

  test("can still buy every spot up to front of line during a surge", () => {
    const line = fillLine(1, 8); // +50%: $9 per spot, $60 front

    // 60 / 9 = 6.67 -> up to 6 single spots, and the guest at #8 can skip at most 6 (not onto #1)
    const result = purchaseQueueAdvance(line[7].id, "spots", 6);

    expect(result.skips[0]).toMatchObject({ from: 8, to: 2, price: 54 });
  });
});
