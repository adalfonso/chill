import admin from "./admin/index.mjs";
import api from "./api/index.mjs";
import auth from "./auth/index.mjs";
import historyApiFallback from "connect-history-api-fallback";
import { Express } from "express";
import { isAuthenticated } from "./middleware/isAuthenticated.mjs";

export const initRouter = (app: Express) => {
  // Register open routes
  app.use("/admin", admin);
  app.use("/auth", auth);

  app.use(
    isAuthenticated,
    historyApiFallback({
      verbose: false,
      rewrites: [
        { from: /^\/(api)\/.*$/, to: (context) => context.parsedUrl.path },
      ],
    }),
  );

  // Register all API routes
  app.use("/api/v1", isAuthenticated, api);
};
