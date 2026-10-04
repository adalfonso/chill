import express from "express";
import passport from "passport";

import { AuthController } from "@controllers/AuthController";
import { ChillWss } from "@server/registerServerSocket";
import { isAuthenticatedApi } from "@server/middleware/isAuthenticated";
import { isValidChallenge, nativeState } from "@server/lib/auth/NativeHandoff";

export default (wss: ChillWss) => {
  const router = express.Router();

  router.get("/login", AuthController.loginPage);
  router.get("/login.js", AuthController.loginScript);
  // POST (not GET) so logout can report failure to the caller instead of
  // an anchor tag doing a fire-and-forget navigation (ADR-0009 R8).
  router.post("/logout", isAuthenticatedApi, AuthController.logout(wss));
  router.post("/refresh", AuthController.refresh(wss));

  router.get("/google", (req, res, next) => {
    const is_native = req.query.platform === "native";

    // A native login must bring the challenge for its handoff verifier; it is
    // what binds the tokens minted at the end of the flow to the app that
    // started it.
    if (is_native && !isValidChallenge(req.query.challenge)) {
      return res.status(400).send("Missing or invalid challenge");
    }

    // Threaded through as an OAuth `state` value (no server session exists to
    // stash it in) so `/google/cb` knows to hand off to the native app via
    // deep link instead of redirecting the browser to "/", and which
    // challenge to bind the handoff to.
    const state = is_native
      ? nativeState(req.query.challenge as string)
      : undefined;

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
