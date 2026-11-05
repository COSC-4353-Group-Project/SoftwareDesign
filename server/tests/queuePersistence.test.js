import request from "supertest";
import { beforeEach, describe, expect, test } from "vitest";
import app from "../app.js";
import { db, resetDatabase } from "../data/db.js";
import { resetStore } from "../data/store.js";
import { loginUser, registerUser } from "../logic/authLogic.js";
import {
  joinQueue,
  listQueue,
  leaveQueue,
  getQueueEntry,
  getQueuePosition,
  getQueueSummary,
  getActiveQueueEntryForUser,
} from "../logic/queueLogic.js";

const VALID_JOIN = {
  serviceId: 1,
  partySize: 2,
  seatingPreference: "Dine-in",
};

beforeEach(() => {
  resetStore();
  resetDatabase();
});

describe("SQLite queue persistence", () => {
  test("joins a service queue and saves the entry in SQLite", () => {
    const entry = joinQueue(2, 1, 2, "Dine-in");

    expect(entry).toMatchObject({
      userId: 2,
      serviceId: 1,
      partySize: 2,
      seatingPreference: "Dine-in",
      status: "waiting",
      position: 1,
      queueOrder: 1,
      estimatedWaitMinutes: 45,
    });

    const saved = db
      .prepare(
        `
      SELECT user_id, service_id, queue_id, status
      FROM queue_entries
      WHERE id = ?
    `,
      )
      .get(entry.id);

    expect(saved.user_id).toBe(2);
    expect(saved.service_id).toBe(1);
    expect(saved.queue_id).not.toBeNull();
    expect(saved.status).toBe("waiting");
  });

  test("retrieves a saved entry without relying on store.queueEntries", () => {
    const joined = joinQueue(2, 1, 2, "Dine-in");

    resetStore();

    const saved = getQueueEntry(joined.id);

    expect(saved).toMatchObject({
      id: joined.id,
      userId: 2,
      position: 1,
      serviceName: "Dine-in · Party of 1–2",
    });
  });

  test("calculates positions from SQLite waiting entries", () => {
    const secondUser = registerUser({
      name: "Anaya",
      phone: "7135550999",
      smsOptIn: false,
    }).user;

    const first = joinQueue(2, 1, 2, "Dine-in");
    const second = joinQueue(secondUser.id, 1, 2, "Dine-in");

    expect(listQueue(1).map((entry) => entry.id)).toEqual([
      first.id,
      second.id,
    ]);

    expect(getQueuePosition(first.id)).toBe(1);
    expect(getQueuePosition(second.id)).toBe(2);

    expect(getQueueSummary(1)).toMatchObject({
      partiesAhead: 2,
      estimatedWaitMinutes: 135,
    });
  });

  test("finds the logged-in customer's active registration", () => {
    const joined = joinQueue(2, 1, 2, "Dine-in");

    expect(getActiveQueueEntryForUser(2).id).toBe(joined.id);
    expect(getActiveQueueEntryForUser(1)).toBeUndefined();
  });

  test("preserves historical entries and BribeSmart records", () => {
    const history = getQueueEntry(2);

    expect(history).toMatchObject({
      status: "served",
      position: 0,
      serviceId: 4,
    });

    expect(history.skips).toEqual([
      expect.objectContaining({
        label: "Front of line",
        from: 6,
        to: 1,
        price: 20,
      }),
    ]);
  });

  test("excludes served entries from active queue positions", () => {
    const entry = joinQueue(2, 1, 2, "Dine-in");

    db.prepare(
      `
      UPDATE queue_entries
      SET status = 'served'
      WHERE id = ?
    `,
    ).run(entry.id);

    expect(getQueuePosition(entry.id)).toBe(0);
    expect(listQueue(1)).toHaveLength(0);
    expect(getActiveQueueEntryForUser(2)).toBeUndefined();
  });

  test("cancellation updates the next customer's position", () => {
    const secondUser = registerUser({
      name: "Anaya",
      phone: "7135550999",
      smsOptIn: false,
    }).user;

    const first = joinQueue(2, 1, 2, "Dine-in");
    const second = joinQueue(secondUser.id, 1, 2, "Dine-in");

    expect(getQueuePosition(first.id)).toBe(1);
    expect(getQueuePosition(second.id)).toBe(2);

    const cancelled = leaveQueue(first.id);

    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.position).toBe(0);

    expect(getQueuePosition(second.id)).toBe(1);
    expect(listQueue(1)).toHaveLength(1);

    const saved = db
      .prepare(
        `
    SELECT status
    FROM queue_entries
    WHERE id = ?
  `,
      )
      .get(first.id);

    expect(saved.status).toBe("cancelled");
  });

  test("customer can join again after cancelling", () => {
    const first = joinQueue(2, 1, 2, "Dine-in");

    expect(first.status).toBe("waiting");

    const cancelled = leaveQueue(first.id);

    expect(cancelled.status).toBe("cancelled");
    expect(getActiveQueueEntryForUser(2)).toBeUndefined();

    expect(getQueueEntry(first.id).status).toBe("cancelled");

    const second = joinQueue(2, 1, 2, "Dine-in");

    expect(second.status).toBe("waiting");
    expect(second.position).toBe(1);
    expect(second.id).not.toBe(first.id);

    const saved = db
      .prepare(
        `
    SELECT status
    FROM queue_entries
    WHERE user_id = ?
    ORDER BY id
  `,
      )
      .all(2);

    expect(saved.filter((entry) => entry.status === "waiting")).toHaveLength(1);
  });
});

describe("Join Queue API", () => {
  test("joins through the API and retrieves the current entry", async () => {
    const token = loginUser("Justin Hendrix", "7135550123").token;

    const joinResponse = await request(app)
      .post("/api/queues/join")
      .set("Authorization", `Bearer ${token}`)
      .send(VALID_JOIN);

    expect(joinResponse.status).toBe(201);
    expect(joinResponse.body.position).toBe(1);

    const statusResponse = await request(app)
      .get("/api/queues/me")
      .set("Authorization", `Bearer ${token}`);

    expect(statusResponse.status).toBe(200);
    expect(statusResponse.body.id).toBe(joinResponse.body.id);
  });

  test("rejects duplicate active queue registrations", async () => {
    const token = loginUser("Justin Hendrix", "7135550123").token;

    const first = await request(app)
      .post("/api/queues/join")
      .set("Authorization", `Bearer ${token}`)
      .send(VALID_JOIN);

    const duplicate = await request(app)
      .post("/api/queues/join")
      .set("Authorization", `Bearer ${token}`)
      .send(VALID_JOIN);

    expect(first.status).toBe(201);
    expect(duplicate.status).toBe(409);

    const count = db
      .prepare(
        `
      SELECT COUNT(*) AS count
      FROM queue_entries
      WHERE user_id = 2 AND status = 'waiting'
    `,
      )
      .get().count;

    expect(count).toBe(1);
  });

  test("returns a database-backed summary", async () => {
    joinQueue(2, 1, 2, "Dine-in");

    const response = await request(app).get("/api/queues/summary/1");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      serviceId: 1,
      partiesAhead: 1,
      estimatedWaitMinutes: 90,
    });
  });
});
