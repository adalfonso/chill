import express from "express";
import passport from "passport";

import { AuthController } from "@controllers/AuthController";
import { ChillWss } from "@server/registerServerSocket";
import { isAuthenticatedPage } from "@server/middleware/isAuthenticated";

export default (wss: ChillWss) => {
  const router = express.Router();

  router.get("/login", AuthController.login);
  router.get("/logout", isAuthenticatedPage, AuthController.logout(wss));

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

  return router;
};
