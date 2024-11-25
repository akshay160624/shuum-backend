import { Router } from "express";
import passport from "passport";
import { callbackNav, loginFailed, logout } from "../controllers/google-auth.controller.js";

const router = Router();

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"], prompt: "consent" })); // Google OAuth login
router.get("/google/callback", passport.authenticate("google", { failureRedirect: "/auth/login/failed" }), callbackNav); // Google OAuth callback
router.get("/google/logout", logout); // Logout
router.get("/login/failed", loginFailed); // Failure route for OAuth

export default router;
