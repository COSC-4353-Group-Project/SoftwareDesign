import { Router } from "express";
import { requireLogin } from "../middleware/auth.js";
import {
  listNotifications,
  markNotificationsRead,
} from "../logic/notificationLogic.js";

const router = Router();

// GET /api/notifications
router.get("/", requireLogin, (req, res) => {
  res.json(listNotifications(req.user.id));
});

// POST /api/notifications/read   marks all of the logged-in user's notifications as read
// (the bell calls this), sends back the updated list
router.post("/read", requireLogin, (req, res) => {
  markNotificationsRead(req.user.id);
  res.json(listNotifications(req.user.id));
});

export default router;
