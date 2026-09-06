import express from "express";
import passport from "passport";

import { AuthController } from "@controllers/AuthController";
import { ChillWss } from "@server/registerServerSocket";
import { isAuthenticatedApi } from "@server/middleware/isAuthenticated";

export default (wss: ChillWss) => {
  const router = express.Router();

  router.get("/login", AuthController.loginPage);
  // POST (not GET) so logout can report failure to the caller instead of
  // an anchor tag doing a fire-and-forget navigation (ADR-0009 R8).
  router.post("/logout", isAuthenticatedApi, AuthController.logout(wss));
  router.post("/refresh", AuthController.refresh(wss));

  router.get("/google", (req, res, next) => {
    // Threaded through as an OAuth `state` value (no server session exists to
    // stash it in) so `/google/cb` knows to hand off to the native app via
    // deep link instead of redirecting the browser to "/".
    const state = req.query.platform === "native" ? "native" : undefined;

    return passport.authenticate("google", {
      scope: ["email", "profile"],
      state,
    })(req, res, next);
  });

  router.get(
    "/google/cb",
    passport.authenticate("google", {
      session: false,
      failureRedirect: "/auth/login?failure=true",
    }),
    AuthController.authCallback,
  );

  router.post("/native/exchange", AuthController.nativeTokenExchange);

  return router;
};
