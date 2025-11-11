import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import express, { Express } from "express";
import passport from "passport";
import { UserType } from "@prisma/client";

import { Cache } from "./lib/data/Cache";
import { Search } from "./lib/data/Search";
import { SocketServer } from "./lib/io/SocketServer";
import { configurePassport } from "./passportConfig";
import { db } from "./lib/data/db";
import { initRouter } from "@routes/router";
import { ChillWss, registerServerSocket } from "./registerServerSocket";
import { accessLogs } from "./middleware/accessLogs";

/**
 * Initialize the express app
 *
 * @param app - express app
 * @returns env var store
 */
export const init = async (app: Express) => {
  const env = initEnvVars();

  const wss: ChillWss = new SocketServer();

  registerServerSocket(wss);
  configurePassport(passport);

  app.use(cookieParser(env.SIGNING_KEY));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(accessLogs);

  initRouter(app, wss);

  await Promise.all([
    Cache.connect(env.REDIS_HOST),
    Search.connect({
      node: env.SEARCH_ENGINE_URL,
      username: env.SEARCH_ENGINE_USERNAME,
      password: env.SEARCH_ENGINE_PASSWORD,
    }),
  ]);

  await createInitialAdminUser();

  return { env, wss };
};

// List of required env vars
const required_vars = [
  "ADMIN_EMAIL",
  "APP_PORT",
  "DATABASE_URL",
  "CAST_APP_ID",
  "GOOGLE_OAUTH_ID",
  "GOOGLE_OAUTH_SECRET",
  "HOST",
  "NODE_ENV",
  "NODE_PORT",
  "RECEIVER_SOURCE_DIR",
  "REDIS_HOST",
  "SEARCH_ENGINE_PASSWORD",
  "SEARCH_ENGINE_URL",
  "SEARCH_ENGINE_USERNAME",
  "SIGNING_KEY",
  "SOURCE_DIR",
  "SSL_PATH",
] as const;

const defaults: Record<string, string> = {
  APP_PORT: "3200",
  // Default receiver
  CAST_APP_ID: "CC1AD845",
  NODE_ENV: "development",
  NODE_PORT: "3201",
  REDIS_HOST: "redis",
  SOURCE_DIR: "dist/client",
  RECEIVER_SOURCE_DIR: "dist/receiver",
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

// Seed the database with an initial admin
const createInitialAdminUser = async () => {
  if (!env.ADMIN_EMAIL || (await db.user.count())) {
    return;
  }

  console.info("Creating initial admin...");

  await db.user.create({
    data: {
      email: env.ADMIN_EMAIL,
      type: UserType.Admin,
      settings: { create: {} },
    },
  });
};
