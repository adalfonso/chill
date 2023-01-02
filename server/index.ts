import "core-js";
import "regenerator-runtime";
import { Connection } from "./db/Client";
import { initApp, initEnvVars } from "./init";
import { initRouter } from "./router";
import { enableHmr } from "./hmr";

initEnvVars();

const app = initApp();
initRouter(app);

// Enable hot module replacement during dev
if (process.env.NODE_ENV === "development") {
  enableHmr(app);
}

// Start server
app.listen(process.env.NODE_PORT, () => {
  console.info(`Server started: ${process.env.HOST}:${process.env.NODE_PORT}`);
  console.info(`Serving content from /${process.env.SOURCE_DIR}/`);
});

// Connect to the database
Connection.create(process.env.MONGO_HOST, process.env.MONGO_PORT);
