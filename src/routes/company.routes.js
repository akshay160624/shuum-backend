import { Router } from "express";
import { addCompany, companyList, importCompanies } from "../controllers/company.controller.js";
import { uploadS3Image, validMulterUploadMiddleware } from "../middleware/image-upload.js";
import { verifyUserAuthToken } from "../middleware/verify-token.js";
import { uploadS3File } from "../middleware/file-upload.js";

const router = Router();

router.post("/add", verifyUserAuthToken, validMulterUploadMiddleware(uploadS3Image.single("image")), addCompany);
router.get("/list", companyList);
router.post("/insert", validMulterUploadMiddleware(uploadS3File.single("file")), importCompanies);

export default router;
