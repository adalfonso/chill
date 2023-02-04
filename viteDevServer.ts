import express, { Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface ConfigOptions {
  port?: number;
  initializer?: (app: Express) => void;
}

/**
 * Start a Vite dev server
 *
 * n.b. This is intended for used during development only.
 *
 * This will bootstrap the client-side code and allow the user to intercept and
 * interact with an express instance.
 *
 * @param options - config options
 */
export async function createServer(options: ConfigOptions) {
  const { port = 5173, initializer } = options;
  const app = express();

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "custom",
  });

  app.use(vite.middlewares);

  if (initializer) {
    initializer(app);
  }

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      let template = fs.readFileSync(
        path.resolve(__dirname, "client/index.html"),
        "utf-8",
      );

      template = await vite.transformIndexHtml(url, template);

      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });

  app.listen(port);

  console.info(`App listening on http://localhost:${port}`);
}
