import { beforeEach, describe, expect, test } from "vitest";
import { db, resetDatabase } from "../data/db.js";
import {
  listHistory,
  getHistoryById,
} from "../logic/historyLogic.js";
//Copied from `queueLogic.js` and removed any unused functions
import {
  joinQueue,
  serveQueueEntry,
  purchaseQueueAdvance,
} from "../logic/queueLogic.js";

beforeEach(() => {
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

describe("listHistory", () => {
  test("Returns seed history entries and newly added queue entries", () => {
    //Seed data already includes 3 history items from db.js
    expect(listHistory().length).toBeGreaterThanOrEqual(3);

    const entry = join(2);
    const historyList = listHistory();

    expect(historyList.some((h) => h.id === entry.id)).toBe(true);
  });
});

describe("getHistoryById", () => {
  test("Finds an existing history from database", () => {
    const entry = join(3);
    const history = getHistoryById(entry.id);

    expect(history).toMatchObject({
      id: entry.id,
      userId: 3,
      service: "Dine-in · Party of 1–2",
      status: "waiting",
      bribe: 0,
    });
  });

  test("Returns undefined for an ID that does not exist", () => {
    expect(getHistoryById(999)).toBeUndefined();
  });
});

describe("History Status and Bribe Tracking", () => {
  test("Status updates in history", () => {
    const entry = join(2);
    
    //Serve the entry
    serveQueueEntry(entry.id);

    const history = getHistoryById(entry.id);
    expect(history.status).toBe("served");
  });

  test("Tracks bribe totals correctly in history view", () => {
    join(1);
    join(2);
    const third = join(3);

    //Bribe
    purchaseQueueAdvance(third.id, "front");

    const history = getHistoryById(third.id);
    expect(history.bribe).toBe(40);
  });
});