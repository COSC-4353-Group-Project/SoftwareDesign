import { Router } from "express";
import {
  joinQueue,
  getQueueEntry,
  getQueueSummary,
} from "../logic/queueLogic.js";
import { validateJoinQueue } from "../validators/queueValidator.js";
import { store } from "../data/store.js";

const router = Router();

// POST /api/queues/join
router.post("/join", (req, res) => {
  // validate request body
  const errors = validateJoinQueue(req.body);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      error: "Invalid queue information.",
      fields: errors,
    });
  }

  // temp user ID
  const userId = 1;

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
router.get("/:entryId", (req, res) => {
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

  res.json(entry);
});

export default router;
