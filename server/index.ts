import "core-js";
import "regenerator-runtime";
import api from "./api";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import express from "express";
import historyApiFallback from "connect-history-api-fallback";
import passport from "passport";
import { Connection } from "./db/Client";
import { InviteController } from "./controllers/InviteController";
import { auth } from "./auth";
import { configurePassport } from "./passportConfig";
import { enableHmr } from "./hmr";

dotenv.config();
configurePassport(passport);

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

const auth_middleware = passport.authenticate("jwt", {
  session: false,
  failureRedirect: "/login?failure=true",
});

const app = express();
app.use(cookieParser());
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: false }));

// Register open routes
app.get("/login", (_req, res) => res.render("pages/login"));
app.get("/invite", (_req, res) => res.render("pages/invite"));
app.post("/invite", InviteController.create);
app.use("/auth", auth(app));

// This needs to run before HMR
app.use(
  historyApiFallback({
    verbose: false,
    rewrites: [
      { from: /^\/(api)\/.*$/, to: (context) => context.parsedUrl.path },
    ],
  }),
  auth_middleware,
);

// Enable hot module replacement during dev
if (process.env.NODE_ENV === "development") {
  enableHmr(app);
}

// Register static assets
app.use(express.static(process.env.SOURCE_DIR));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Register all API routes
app.use("/api/v1", auth_middleware, api(app));

// Start server
app.listen(process.env.NODE_PORT, () => {
  console.info(`Server started: http://localhost:${process.env.NODE_PORT}`);
  console.info(`Serving content from /${process.env.SOURCE_DIR}/`);
});

// Connect to the database
Connection.create(process.env.MONGO_HOST, process.env.MONGO_PORT);
