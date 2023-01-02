import express, { Express } from "express";
import passport from "passport";
import { AuthController } from "@server/controllers/AuthController";

/** /auth **/
export const auth = (app: Express) => {
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

  return router;
};
