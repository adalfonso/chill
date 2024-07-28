import express from "express";
import compression from "compression";

import { init } from "./init";

const app = express();
const env = await init(app);

app.use(compression());

// Must run after history fallback
app.use(express.static(env.SOURCE_DIR));

// Start server
app.listen(env.NODE_PORT, () => {
  console.info(`Server started: ${env.HOST}:${env.NODE_PORT}`);
  console.info(`Serving content from ${env.SOURCE_DIR}`);
});
