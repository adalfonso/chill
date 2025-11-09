import express from "express";
import compression from "compression";
import http from "node:http";

import { init } from "./init";
import { upgradeServer } from "./lib/io/upgradeServer";

const app = express();
const { env, wss } = await init(app);

Object.assign(app, { _wss: wss });

app.use(compression());

// Must run after history fallback
app.use(express.static(env.SOURCE_DIR));

// Start server
const server = http.createServer({}, app).listen(env.NODE_PORT, () => {
  console.info(`Server started: ${env.HOST}:${env.NODE_PORT}`);
  console.info(`Serving content from ${env.SOURCE_DIR}`);
});

// Upgrade for websockets
upgradeServer(server, wss);
