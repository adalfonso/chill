import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import express from "express";
import passport from "passport";
import { configurePassport } from "./passportConfig";

/**
 * Initialize the app
 *
 * @returns app
 */
export const initApp = () => {
  const app = express();
  configurePassport(passport);

  app.use(cookieParser());
  app.set("view engine", "ejs");

  // Register static assets
  app.use(express.static(process.env.SOURCE_DIR));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  return app;
};

/** Initialize env vars */
export const initEnvVars = () => {
  dotenv.config();

  const required_vars = [
    "NODE_PORT",
    "SOURCE_DIR",
    "GOOGLE_OAUTH_ID",
    "GOOGLE_OAUTH_SECRET",
    "JWT_SIGNING_KEY",
  ];

  // Check for required env vars
  required_vars.forEach((key) => {
    if (process.env[key] === undefined) {
      throw new Error(`Missing env value for ${key}`);
    }
  });
};
