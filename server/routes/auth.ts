import express from "express";
import passport from "passport";

import { AuthController } from "@controllers/AuthController";
import { isAuthenticated } from "@server/middleware/isAuthenticated";

const router = express.Router();

router.get("/login", AuthController.login);
router.get("/logout", isAuthenticated, AuthController.logout);

router.get(
  "/google",
  passport.authenticate("google", { scope: ["email", "profile"] }),
);

router.get(
  "/google/cb",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/auth/login?failure=true",
  }),
  AuthController.authCallback,
);

export default router;
