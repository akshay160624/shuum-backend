import { Router } from "express";
import { uploadS3Image, validMulterUploadMiddleware } from "../middleware/image-upload.js";
import { verifyUserAuthToken } from "../middleware/verify-token.js";
import { addCompanyMember, updateCompanyMember } from "../controllers/company-member.controller.js";

const router = Router();

router.post("/add", verifyUserAuthToken, validMulterUploadMiddleware(uploadS3Image.single("image")), addCompanyMember);
router.put("/update", verifyUserAuthToken, updateCompanyMember);

export default router;
