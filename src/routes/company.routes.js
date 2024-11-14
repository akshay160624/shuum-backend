import { Router } from "express";
import { addCompany, companyList } from "../controllers/company.controller.js";
import { uploadS3, validMulterUploadMiddleware } from "../middleware/image-upload.js";
import { verifyUserAuthToken } from "../middleware/verify-token.js";

const router = Router();

router.post("/add", verifyUserAuthToken, validMulterUploadMiddleware(uploadS3.array("image")), addCompany);
router.get("/list", companyList);

export default router;
