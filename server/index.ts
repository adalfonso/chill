import express from "express";
import compression from "compression";
import fs from "node:fs";
import https from "node:https";

import { init } from "./init";
import { upgradeServer } from "./lib/io/upgradeServer";

const app = express();
const { env, wss } = await init(app);

Object.assign(app, { _wss: wss });

const options = {
  key: fs.readFileSync(`${env.SSL_PATH}/chill.key`),
  cert: fs.readFileSync(`${env.SSL_PATH}/chill.crt`),
};

app.use(compression());

// Must run after history fallback
app.use(express.static(env.SOURCE_DIR));

// Start server
const server = https.createServer(options, app).listen(env.NODE_PORT, () => {
  console.info(`Server started: ${env.HOST}:${env.NODE_PORT}`);
  console.info(`Serving content from ${env.SOURCE_DIR}`);
});

// Upgrade for websockets
upgradeServer(server, wss);
