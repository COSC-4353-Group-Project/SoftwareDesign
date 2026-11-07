//Code basically copied and pasted from services.js
//Altered to be for the history - I hope I'm doing this right

import { Router } from "express";
import {
  getHistoryById,
  listHistory,
  listHistoryForUser,
} from "../logic/historyLogic.js";
import { requireAdmin, requireLogin } from "../middleware/auth.js";

// BUG FIX (Justin, 11-06):
// - Removed POST and PUT. History is the queue_history view, so there's nothing to create or edit;
//   both routes crashed with a 500 (see historyLogic.js).
// - GET / and GET /:id had no login check, so anyone could read every guest's visits.
//   They're staff-only now. Guests use GET /mine, which only returns their own rows.

const router = Router();

// GET /api/history   every guest's history (staff only)
router.get("/", requireAdmin, (req, res) => {
  res.json(listHistory());
});

// GET /api/history/mine
// THU: return records for logged-in user
router.get("/mine", requireLogin, (req, res) => {
  res.json(listHistoryForUser(req.user.id));
});

// GET /api/history/:id   (staff only)
router.get("/:id", requireAdmin, (req, res) => {
  // URL params always arrive as strings, so turn it into a number first
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res
      .status(400)
      .json({ error: "History id must be a whole number." });
  }

  const history = getHistoryById(id);
  if (!history) {
    return res.status(404).json({ error: "History not found." });
  }

  res.json(history);
});

export default router;
