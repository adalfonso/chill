import admin from "./admin";
import api from "./api";
import auth from "./auth";
import express, { Express } from "express";
import historyApiFallback from "connect-history-api-fallback";
import { isAuthenticated } from "./middleware";

export const initRouter = (app: Express) => {
  // Register open routes
  app.use("/admin", admin);
  app.use("/auth", auth);

  // Must run before HMR
  app.use(
    historyApiFallback({
      verbose: false,
      rewrites: [
        { from: /^\/(api)\/.*$/, to: (context) => context.parsedUrl.path },
      ],
    }),
    isAuthenticated,
  );

  // Must run after history fallback
  app.use(express.static(process.env.SOURCE_DIR));

  // Register all API routes
  app.use("/api/v1", isAuthenticated, api(app));
};
