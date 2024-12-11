import { Router } from "express";
import { getOnboardingSteps, getOtp, getProfile, passwordLogin, register, sendInvite, updateUserInfo, updateUserProfile, verifyOtp } from "../controllers/auth.controller.js";
import { verifyUserAuthToken } from "../middleware/verify-token.js";
import { uploadUserProfileS3Image, validMulterUploadMiddleware } from "../middleware/image-upload.js";

const router = Router();

router.post("/register", register); // password login API
router.post("/verify-otp", verifyOtp); // otp login API
router.post("/get-otp", getOtp); // for register and get-otp verify
router.post("/login", passwordLogin); // password login API
router.post("/update-info", verifyUserAuthToken, updateUserInfo); // update basic details
router.post("/update-profile", verifyUserAuthToken, validMulterUploadMiddleware(uploadUserProfileS3Image.single("image")), updateUserProfile); // update profile with image required
router.get("/get-onboarding", verifyUserAuthToken, getOnboardingSteps);
router.get("/profile", verifyUserAuthToken, getProfile);
router.post("/send-invite", verifyUserAuthToken, sendInvite);

export default router;
