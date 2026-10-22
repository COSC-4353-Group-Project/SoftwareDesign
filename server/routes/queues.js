import { Router } from "express";
import {
  joinQueue,
  getQueueEntry,
  getQueueSummary,
  leaveQueue,
  getAllQueueEntries,
  serveQueueEntry,
  serveNext,
} from "../logic/queueLogic.js";
import { validateJoinQueue } from "../validators/queueValidator.js";
import { store } from "../data/store.js";
import { requireLogin, requireAdmin } from "../middleware/auth.js";

const router = Router();

// POST /api/queues/join
// using existing auth
router.post("/join", requireLogin, (req, res) => {
  // validate request body
  const errors = validateJoinQueue(req.body);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      error: "Invalid queue information.",
      fields: errors,
    });
  }

  // identify the logged-in user
  const userId = req.user.id;

  // check whether user is already in an active queue
  const alreadyWaiting = store.queueEntries.some(
    (entry) => entry.userId === userId && entry.status === "waiting",
  );

  if (alreadyWaiting) {
    return res.status(409).json({
      error: "You are already waiting in a queue.",
    });
  }

  // create queue entry
  const entry = joinQueue(
    userId,
    req.body.serviceId,
    req.body.partySize,
    req.body.seatingPreference,
  );

  // return newly created entry
  res.status(201).json(entry);
});

// GET /api/queues/summary/:serviceId
router.get("/summary/:serviceId", (req, res) => {
  const serviceId = Number(req.params.serviceId);

  if (!Number.isSafeInteger(serviceId) || serviceId < 1) {
    return res.status(400).json({
      error: "Service ID must be a positive whole number.",
    });
  }

  const summary = getQueueSummary(serviceId);

  if (!summary) {
    return res.status(404).json({
      error: "Service not found.",
    });
  }

  res.json(summary);
});

// GET /api/queues/:entryId
router.get("/:entryId", requireLogin, (req, res) => {
  const entryId = Number(req.params.entryId);

  if (!Number.isSafeInteger(entryId) || entryId < 1) {
    return res.status(400).json({
      error: "Entry ID must be a positive whole number.",
    });
  }

  const entry = getQueueEntry(entryId);

  if (!entry) {
    return res.status(404).json({
      error: "Queue entry not found.",
    });
  }
  if (entry.userId !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({
      error: "Authentication failed. Cannot view queue entry.",
    });
  }

  res.json(entry);
});

// DELETE /api/queues/:entryId
router.delete("/:entryId", requireLogin, (req, res) => {
  const entryId = Number(req.params.entryId);

  // check entry ID
  if (!Number.isSafeInteger(entryId) || entryId < 1) {
    return res.status(400).json({
      error: "Entry ID must be a positive whole number.",
    });
  }

  // check if entry exists
  const entry = getQueueEntry(entryId);
  if (!entry) {
    return res.status(404).json({
      error: "Queue entry not found.",
    });
  }

  // only cancel a waiting queue
  if (entry.status !== "waiting") {
    return res.status(409).json({
      error: "This queue entry is no longer active.",
    });
  }

  const userId = req.user.id;

  if (entry.userId !== userId) {
    return res.status(403).json({
      error: "You cannot leave another user's queue.",
    });
  }

  const cancelledEntry = leaveQueue(entryId);

  res.json(cancelledEntry);
});

// GET /api/queues/admin/all
router.get("/admin/all", requireAdmin, (req, res) => {
  res.json(getAllQueueEntries());
});

// PATCH /api/queues/admin/:entryId/serve
router.patch("/admin/:entryId/serve", requireAdmin, (req, res) => {
  const entryId = Number(req.params.entryId);

  if (!Number.isSafeInteger(entryId) || entryId < 1) {
    return res.status(400).json({
      error: "Invalid queue entry ID.",
    });
  }

  const entry = getQueueEntry(entryId);

  if (!entry) {
    return res.status(404).json({
      error: "Queue entry not found.",
    });
  }

  if (entry.status !== "waiting") {
    return res.status(409).json({
      error: "This queue entry is no longer waiting.",
    });
  }

  res.json(serveQueueEntry(entryId));
});

// reusing some logic from customer pov
// POST /api/queues/admin/serve-next
router.post("/admin/serve-next", requireAdmin, (req, res) => {
  const entry = serveNext();

  if (!entry) {
    return res.status(404).json({
      error: "No waiting parties found.",
    });
  }

  res.json(entry);
});

// DELETE /api/queues/admin/:entryId
router.delete("/admin/:entryId", requireAdmin, (req, res) => {
  const entryId = Number(req.params.entryId);

  if (!Number.isSafeInteger(entryId) || entryId < 1) {
    return res.status(400).json({
      error: "Invalid queue entry ID.",
    });
  }

  const entry = getQueueEntry(entryId);

  if (!entry) {
    return res.status(404).json({
      error: "Queue entry not found.",
    });
  }

  if (entry.status !== "waiting") {
    return res.status(409).json({
      error: "This queue entry is no longer waiting.",
    });
  }

  res.json(leaveQueue(entryId));
});

export default router;
