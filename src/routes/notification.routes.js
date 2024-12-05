import { Router } from "express";
import { verifyUserAuthToken } from "../middleware/verify-token.js";
import { addNotification, notificationList, updateNotifications } from "../controllers/notification.controller.js";

const router = Router();

router.post("/send", verifyUserAuthToken, addNotification);
router.get("/list", verifyUserAuthToken, notificationList);
router.put("/update", verifyUserAuthToken, updateNotifications);

export default router;
