import { Router } from "express";
import { addCompany, companyList, companyView, importCompanies, updateCompany } from "../controllers/company.controller.js";
import { uploadCompanyS3Image, validMulterUploadMiddleware } from "../middleware/image-upload.js";
import { verifyUserAuthToken } from "../middleware/verify-token.js";
import { uploadS3File } from "../middleware/file-upload.js";

const router = Router();

router.post("/add", verifyUserAuthToken, validMulterUploadMiddleware(uploadCompanyS3Image.single("image")), addCompany);
router.get("/list", companyList);
router.get("/view/:company_id", verifyUserAuthToken, companyView);
router.post("/insert", validMulterUploadMiddleware(uploadS3File.single("file")), importCompanies);
router.put("/update", verifyUserAuthToken, validMulterUploadMiddleware(uploadCompanyS3Image.single("image")), updateCompany);

export default router;
