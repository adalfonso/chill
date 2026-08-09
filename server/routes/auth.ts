import express from "express";
import passport from "passport";

import { AuthController } from "@controllers/AuthController";
import { ChillWss } from "@server/registerServerSocket";
import { isAuthenticatedApi } from "@server/middleware/isAuthenticated";

export default (wss: ChillWss) => {
  const router = express.Router();

  router.get("/login", AuthController.login);
  // POST (not GET) so logout can report failure to the caller instead of
  // an anchor tag doing a fire-and-forget navigation (ADR-0009 R8).
  router.post("/logout", isAuthenticatedApi, AuthController.logout(wss));
  router.post("/refresh", AuthController.refresh);

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
