import express from "express";
import passport from "passport";
import { AuthController } from "@server/controllers/AuthController";

const router = express.Router();

router.get(
  "/google",
  passport.authenticate("google", { scope: ["email", "profile"] }),
);

router.get(
  "/google/cb",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login?failure=true",
  }),
  AuthController.authCallback,
);

export default router;
