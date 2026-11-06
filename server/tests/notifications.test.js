import request from "supertest";
import { beforeEach, describe, expect, test } from "vitest";
import app from "../app.js";
import { resetStore } from "../data/store.js";
import { resetDatabase } from "../data/db.js";
import { loginUser, registerUser } from "../logic/authLogic.js";
import {
  joinQueue,
  getQueueEntry,
  purchaseQueueAdvance,
  serveQueueEntry,
} from "../logic/queueLogic.js";
import { listNotifications } from "../logic/notificationLogic.js";

// JUSTIN: the notifications the queue sends (passed_by, table_ready) and the bell's routes.
// Justin (user 2) is first in line, Anaya second, Vincent third, all for service 1.

let anaya;
let vincent;

beforeEach(() => {
  resetStore();
  resetDatabase();
  anaya = registerUser({ name: "Anaya", phone: "7135550999", smsOptIn: false }).user;
  vincent = registerUser({ name: "Vincent", phone: "7135550888", smsOptIn: false }).user;
});

function createThreePersonQueue() {
  const first = joinQueue(2, 1, 2, "Dine-in");
  const second = joinQueue(anaya.id, 1, 2, "Dine-in");
  const third = joinQueue(vincent.id, 1, 2, "Dine-in");
  return { first, second, third };
}

// only one kind of notification for a user, newest first
function notificationsOfType(userId, type) {
  return listNotifications(userId).filter((notif) => notif.type === type);
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

describe("passed_by notifications", () => {
  test("tells everyone who got skipped by a front of line purchase their new spot", () => {
    const { first, second, third } = createThreePersonQueue();

    purchaseQueueAdvance(third.id, "front");

    expect(notificationsOfType(2, "passed_by")).toEqual([
      expect.objectContaining({ entryId: first.id, body: "You're now #2 in line" }),
    ]);
    expect(notificationsOfType(anaya.id, "passed_by")).toEqual([
      expect.objectContaining({ entryId: second.id, body: "You're now #3 in line" }),
    ]);
    // the person who paid doesn't get one
    expect(notificationsOfType(vincent.id, "passed_by")).toHaveLength(0);
  });

  test("only tells the parties that were actually skipped", () => {
    const { third } = createThreePersonQueue();

    // #3 skips 1 spot to #2, so only Anaya (#2) gets passed, Justin (#1) doesn't
    purchaseQueueAdvance(third.id, "spots", 1);

    expect(notificationsOfType(2, "passed_by")).toHaveLength(0);
    expect(notificationsOfType(anaya.id, "passed_by")).toHaveLength(1);
  });

  test("counts how many times a party was passed for the admin queue page", () => {
    const { first, third } = createThreePersonQueue();

    expect(getQueueEntry(first.id).passedBy).toBe(0);

    purchaseQueueAdvance(third.id, "front");

    expect(getQueueEntry(first.id).passedBy).toBe(1);
    expect(getQueueEntry(third.id).passedBy).toBe(0);
  });

  test("a failed purchase sends nothing", () => {
    const { first } = createThreePersonQueue();

    // already first, can't buy anything
    expect(purchaseQueueAdvance(first.id, "front")).toBeUndefined();

    expect(notificationsOfType(anaya.id, "passed_by")).toHaveLength(0);
    expect(notificationsOfType(vincent.id, "passed_by")).toHaveLength(0);
  });
});

describe("table_ready notifications", () => {
  test("tells the guest when an admin serves them", () => {
    const { first } = createThreePersonQueue();

    serveQueueEntry(first.id);

    expect(notificationsOfType(2, "table_ready")).toEqual([
      expect.objectContaining({
        entryId: first.id,
        title: "Your table is ready",
        body: "Dine-in · Party of 1–2 · head to the host stand",
      }),
    ]);
    expect(notificationsOfType(anaya.id, "table_ready")).toHaveLength(0);
  });

  test("serving someone twice only sends it once", () => {
    const { first } = createThreePersonQueue();

    serveQueueEntry(first.id);
    expect(serveQueueEntry(first.id)).toBeUndefined();

    expect(notificationsOfType(2, "table_ready")).toHaveLength(1);
  });
});

describe("/api/notifications", () => {
  test("new notifications start unread", async () => {
    createThreePersonQueue();
    const token = loginUser("Justin Hendrix", "7135550123").token;

    const res = await request(app).get("/api/notifications").set(auth(token));

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((notif) => notif.isRead === false)).toBe(true);
  });

  test("POST /read needs a login", async () => {
    const res = await request(app).post("/api/notifications/read");
    expect(res.status).toBe(401);
  });

  test("POST /read marks only the logged-in user's notifications as read", async () => {
    createThreePersonQueue();
    const token = loginUser("Justin Hendrix", "7135550123").token;

    const res = await request(app).post("/api/notifications/read").set(auth(token));

    expect(res.status).toBe(200);
    expect(res.body.every((notif) => notif.isRead === true)).toBe(true);
    // Anaya hasn't opened her bell yet
    expect(listNotifications(anaya.id).every((notif) => notif.isRead === false)).toBe(true);
  });
});
