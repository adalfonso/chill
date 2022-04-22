import "core-js";
import "regenerator-runtime";
import * as dotenv from "dotenv";
import * as express from "express";
import { Connection } from "./db/Client";
import { enableHmr } from "./hmr";
import { registerRoutes } from "./routes";

dotenv.config();

// Check for required env vars
["NODE_PORT", "SOURCE_DIR"].forEach((key) => {
  if (process.env[key] === undefined) {
    throw new Error(`Missing env value for ${key}`);
  }
});

const app = express();

// Enable hot module replacement during dev
if (process.env.NODE_ENV === "development") {
  enableHmr(app);
}

// Register static assets
app.use(express.static(process.env.SOURCE_DIR));

// Start server
app.listen(process.env.NODE_PORT, () => {
  console.info(`Server started: http://localhost:${process.env.NODE_PORT}`);
  console.info(`Serving content from /${process.env.SOURCE_DIR}/`);
});

// Setup routing
registerRoutes(app);

// Connect to the database
Connection.create(process.env.MONGO_HOST, process.env.MONGO_PORT);
