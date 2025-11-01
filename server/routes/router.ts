import auth from "./auth";
import cast_media from "./cast_media";
import express, { Express } from "express";
import historyApiFallback from "connect-history-api-fallback";
import v1 from "./api/v1";
import { ChillWss, env } from "@server/init";
import { isAuthenticated } from "@middleware/isAuthenticated";

export const initRouter = (app: Express, wss: ChillWss) => {
  // Register open routes
  app.use("/auth", auth(wss));

  // Chromecast receiver app
  app.use("/receiver", express.static(env.RECEIVER_SOURCE_DIR));

  // Chromecast media access routes
  app.use("/cast/media", cast_media);

  app.use(
    isAuthenticated,
    historyApiFallback({
      verbose: false,
      rewrites: [
        // ignore for api routes
        {
          from: /^\/(api)\/.*$/,
          to: (context) => context.parsedUrl.path ?? "/missing",
        },
      ],
    }),
  );

  // Register all API routes
  app.use("/api/v1", isAuthenticated, v1);
};
