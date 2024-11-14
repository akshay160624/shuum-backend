import { Router } from "express";
import { getOtp, register, updateUserInfo, verifyOtp } from "../controllers/auth.controller.js";
import { verifyUserAuthToken } from "../middleware/verify-token.js";

const router = Router();

router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/get-otp", getOtp);
router.post("/update", verifyUserAuthToken, updateUserInfo);

export default router;
