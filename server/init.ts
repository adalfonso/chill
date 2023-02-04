import "core-js";
import "regenerator-runtime";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import express, { Express } from "express";
import passport from "passport";
import { Connection } from "./db/Client";
import { configurePassport } from "./passportConfig";
import { initRouter } from "./routes/router";

/**
 * Initialize the express app
 *
 * @param app - express app
 * @returns env var store
 */
export const init = (app: Express) => {
  const env = initEnvVars();

  configurePassport(passport);

  app.use(cookieParser(env.SIGNING_KEY));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  initRouter(app);

  Connection.create(env.MONGO_HOST, env.MONGO_PORT);

  return env;
};

// List of required env vars
const required_vars = [
  "GOOGLE_OAUTH_ID",
  "GOOGLE_OAUTH_SECRET",
  "HOST",
  "MONGO_HOST",
  "MONGO_PORT",
  "NODE_PORT",
  "SIGNING_KEY",
  "SOURCE_DIR",
] as const;

export type EnvStore = {
  [K in (typeof required_vars)[number]]: string;
};

// "Singleton" that stores all the env vars
// TODO: make this an actual singleton class
export const env = Object.fromEntries(
  required_vars.map((key) => [key, ""]),
) as EnvStore;

/** Initialize env vars */
const initEnvVars = () => {
  dotenv.config();

  // Check for required env vars
  required_vars.map((key) => {
    const value = process.env[key];

    if (value === undefined) {
      throw new Error(`Missing env value for ${key}`);
    }

    env[key] = value;
  });

  return env;
};
