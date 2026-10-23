import { Router } from "express";
import { requireLogin } from "../middleware/auth.js";
import { listNotifications } from "../logic/notificationLogic.js";

const router = Router();

// GET /api/notifications
router.get("/", requireLogin, (req, res) => {
  res.json(listNotifications(req.user.id));
});

export default router;
