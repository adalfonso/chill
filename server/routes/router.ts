import auth from "./auth";
import historyApiFallback from "connect-history-api-fallback";
import v1 from "./api/v1";
import { Express } from "express";
import { isAuthenticated } from "../middleware/isAuthenticated";

export const initRouter = (app: Express) => {
  // Register open routes
  app.use("/auth", auth);

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
