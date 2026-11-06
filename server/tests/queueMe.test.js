import request from "supertest";
import { beforeEach, describe, expect, test } from "vitest";
import app from "../app.js";
import { db, resetDatabase } from "../data/db.js";
import { loginUser } from "../logic/authLogic.js";

// JUSTIN BACKEND STOOF: route tests for GET /api/queues/me (the Queue Status page).
// Starting data has no queue entries, so every user starts out not in a queue.

let token;

beforeEach(() => {
  resetDatabase();
  token = loginUser("Justin Hendrix", "7135550123").token;
});

// a valid Join Queue request (party of 2, dine-in = service 1)
const JOIN = { serviceId: 1, partySize: 2, seatingPreference: "Dine-in" };

describe("GET /api/queues/me", () => {
  test("401 when not logged in", async () => {
    const res = await request(app).get("/api/queues/me");
    expect(res.status).toBe(401);
  });

  test("404 when the user is not in a queue", async () => {
    const res = await request(app)
      .get("/api/queues/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  test("returns the spot after joining", async () => {
    await request(app)
      .post("/api/queues/join")
      .set("Authorization", `Bearer ${token}`)
      .send(JOIN);

    const res = await request(app)
      .get("/api/queues/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.position).toBe(1);
    expect(res.body.serviceName).toBe("Dine-in · Party of 1–2");
  });

  test("404 again after leaving the queue", async () => {
    const joined = await request(app)
      .post("/api/queues/join")
      .set("Authorization", `Bearer ${token}`)
      .send(JOIN);
    await request(app)
      .delete(`/api/queues/${joined.body.id}`)
      .set("Authorization", `Bearer ${token}`);

    const res = await request(app)
      .get("/api/queues/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  test("cancellation is saved in SQLite", async () => {
    const joined = await request(app)
      .post("/api/queues/join")
      .set("Authorization", `Bearer ${token}`)
      .send(JOIN);

    expect(joined.status).toBe(201);

    const entryId = joined.body.id;

    const cancelled = await request(app)
      .delete(`/api/queues/${entryId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(cancelled.status).toBe(200);
    expect(cancelled.body.status).toBe("cancelled");
    expect(cancelled.body.position).toBe(0);

    const saved = db
      .prepare(
        `
    SELECT status
    FROM queue_entries
    WHERE id = ?
  `,
      )
      .get(entryId);

    expect(saved.status).toBe("cancelled");

    const response = await request(app)
      .get("/api/queues/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
  });
});
