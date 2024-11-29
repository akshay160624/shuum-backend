import { Router } from "express";
import { verifyUserAuthToken } from "../middleware/verify-token.js";
import { introductionList, introductionSearch, introductionView, requestIntroduction, updateIntroduction } from "../controllers/introduction.controller.js";

const router = Router();

router.post("/request", verifyUserAuthToken, requestIntroduction);
router.get("/list", verifyUserAuthToken, introductionList);
router.get("/search", verifyUserAuthToken, introductionSearch);
router.get("/view/:introduction_id", verifyUserAuthToken, introductionView);
router.put("/update", verifyUserAuthToken, updateIntroduction);

export default router;
