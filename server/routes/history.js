//Code basically copied and pasted from services.js
//Altered to be for the history - I hope I'm doing this right

import { Router } from "express";
import {
  createHistory,
  getHistoryById,
  listHistory,
  updateHistory,
} from "../logic/historyLogic.js";
import { hasErrors, validateHistory } from "../validators/historyValidator.js";
import { requireLogin } from "../middleware/auth.js";

const router = Router();

// GET /api/services
router.get("/", (req, res) => {
  res.json(listHistory());
});

// GET /api/history/mine
// THU: return records for logged-in user
router.get("/mine", requireLogin, (req, res) => {
  const history = listHistory()
    .filter((item) => item.userId === req.user.id)
    .sort((a, b) => b.id - a.id);

  res.json(history);
});

// GET /api/services/:id
router.get("/:id", (req, res) => {
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

// POST /api/history   body: { name, description, duration, priority, isOpen }
router.post("/", (req, res) => {
  const errors = validateHistory(req.body);
  if (hasErrors(errors)) {
    // fields has one message per field, so the page can show each under its input
    return res
      .status(400)
      .json({ error: "Some fields are invalid.", fields: errors });
  }

  const history = createHistory(req.body);
  // 201 = something new was created
  res.status(201).json(history);
});

// PUT /api/services/:id   same body as POST, replaces the service's fields
router.put("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res
      .status(400)
      .json({ error: "History id must be a whole number." });
  }
  if (!getHistoryById(id)) {
    return res.status(404).json({ error: "History not found." });
  }

  const errors = validateHistory(req.body);
  if (hasErrors(errors)) {
    return res
      .status(400)
      .json({ error: "Some fields are invalid.", fields: errors });
  }

  res.json(updateHistory(id, req.body));
});

export default router;
