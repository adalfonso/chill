import express, { Request } from "express";
import passport from "passport";

import { AuthController } from "@controllers/AuthController";
import { ChillWss } from "@server/registerServerSocket";
import { isAuthenticatedApi } from "@server/middleware/isAuthenticated";
import {
  challengeFromState,
  isValidChallenge,
  nativeCallbackUrl,
  nativeState,
} from "@server/lib/auth/NativeHandoff";

export default (wss: ChillWss) => {
  const router = express.Router();

  router.get("/login", AuthController.loginPage);
  router.get("/login.js", AuthController.loginScript);
  // POST (not GET) so logout can report failure to the caller instead of
  // an anchor tag doing a fire-and-forget navigation (ADR-0009 R8).
  router.post("/logout", isAuthenticatedApi, AuthController.logout(wss));
  router.post("/refresh", AuthController.refresh(wss));

  /**
   * Start the Google OAuth flow
   *
   * A web login goes straight to Google. A native login (`platform=native`)
   * must also bring a `challenge`, which is carried through Google in the
   * OAuth `state` so the callback can bind the resulting handoff to the app
   * that started it.
   *
   * @param req - request, with `platform` and (for native) `challenge` query
   *   params
   * @param res - response; 400 when a native login has no valid challenge
   * @param next - next middleware, handed to passport
   * @returns passport's redirect to Google, or the 400 response
   */
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
    (req, res, next) => {
      const is_native = challengeFromState(req.query.state) !== undefined;

      // A custom callback (rather than passport's `failureRedirect`) so a
      // failed or denied native login can deep-link back to the app instead
      // of stranding the user on the web login page inside the Custom Tab.
      passport.authenticate(
        "google",
        { session: false },
        (err: unknown, user: Request["user"] | false) => {
          if (err && !is_native) {
            return next(err);
          }

          if (err || !user) {
            return is_native
              ? res.redirect(nativeCallbackUrl())
              : res.redirect("/auth/login?failure=true");
          }

          req.user = user;
          next();
        },
      )(req, res, next);
    },
    AuthController.authCallback,
  );

  router.post("/native/exchange", AuthController.nativeTokenExchange);

  return router;
};
