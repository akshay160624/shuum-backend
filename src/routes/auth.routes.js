import { Router } from "express";
import { getOtp, passwordLogin, register, updateUserInfo, updateUserProfile, verifyOtp } from "../controllers/auth.controller.js";
import { verifyUserAuthToken } from "../middleware/verify-token.js";
import { uploadS3Image, validMulterUploadMiddleware } from "../middleware/image-upload.js";

const router = Router();

router.post("/register", register); // password login API
router.post("/verify-otp", verifyOtp); // otp login API
router.post("/get-otp", getOtp); // for register and get-otp verify
router.post("/login", passwordLogin); // password login API
router.post("/update-info", verifyUserAuthToken, updateUserInfo); // update basic details
router.post("/update-profile", verifyUserAuthToken, validMulterUploadMiddleware(uploadS3Image.single("image")), updateUserProfile); // update profile with image required

export default router;
