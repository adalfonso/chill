import express, { Express, type RequestHandler } from "express";
import historyApiFallback from "connect-history-api-fallback";

import auth from "./auth";
import cast_media from "./cast_media";
import v1 from "./api/v1";
import { ChillWss } from "@server/registerServerSocket";
import { env } from "@server/init";
import {
  isAuthenticatedApi,
  isAuthenticatedPage,
} from "@middleware/isAuthenticated";

export const initRouter = (app: Express, wss: ChillWss) => {
  // Register open routes
  app.use("/auth", auth(wss));

  // Chromecast receiver app
  app.use("/receiver", express.static(env.RECEIVER_SOURCE_DIR));

  // Chromecast media access routes
  app.use("/cast/media", cast_media);

  // Register all API routes. Mounted ahead of the SPA shell fallback below
  // so a matched API route is fully handled (and its own isAuthenticatedApi
  // check is the only auth check that runs) rather than also running the
  // page-shell's isAuthenticatedPage first -- the two used to run back to
  // back on every API request.
  app.use("/api/v1", isAuthenticatedApi, v1);

  app.use(
    isAuthenticatedPage,
    historyApiFallback({ verbose: false }) as RequestHandler,
  );
};
