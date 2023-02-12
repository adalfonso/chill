import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import express, { Express } from "express";
import passport from "passport";
import { Cache } from "./lib/data/Cache";
import { Database } from "./lib/data/Database";
import { configurePassport } from "./passportConfig";
import { initRouter } from "@routes/router";

/**
 * Initialize the express app
 *
 * @param app - express app
 * @returns env var store
 */
export const init = async (app: Express) => {
  const env = initEnvVars();

  configurePassport(passport);

  app.use(cookieParser(env.SIGNING_KEY));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  initRouter(app);

  await Promise.all([
    Database.connect(env.MONGO_HOST, env.MONGO_PORT),
    Cache.connect(env.REDIS_HOST),
  ]);

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
  "REDIS_HOST",
  "SIGNING_KEY",
  "SOURCE_DIR",
] as const;

const defaults: Record<string, string> = {
  MONGO_HOST: "mongo",
  MONGO_PORT: "27017",
  NODE_PORT: "1337",
  REDIS_HOST: "redis",
  SOURCE_DIR: "dist/client",
} as const;

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
    const value = process.env[key] ?? defaults[key];

    if (value === undefined) {
      throw new Error(`Missing env value for ${key}`);
    }

    env[key] = value;
  });

  return env;
};
