import { Router } from "express";
import { joinQueue } from "../logic/queueLogic.js";
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

export default router;