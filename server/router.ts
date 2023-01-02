import admin from "./admin";
import api from "./api";
import auth from "./auth";
import historyApiFallback from "connect-history-api-fallback";
import { Express } from "express";
import { isAuthenticated } from "./middleware";

export const initRouter = (app: Express) => {
  // Register open routes
  app.get("/login", (_req, res) => res.render("pages/login"));
  app.use("/admin", admin);
  app.use("/auth", auth);

  // This needs to run before HMR
  app.use(
    historyApiFallback({
      verbose: false,
      rewrites: [
        { from: /^\/(api)\/.*$/, to: (context) => context.parsedUrl.path },
      ],
    }),
    isAuthenticated,
  );

  // Register all API routes
  app.use("/api/v1", isAuthenticated, api(app));
};
