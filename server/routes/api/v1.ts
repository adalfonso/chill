import * as trpcExpress from "@trpc/server/adapters/express";
import express from "express";

import media from "./v1/media";
import { createContext, api_router } from "@server/trpc";

const router = express.Router();

/** /api/v1/* */
router.use("/media", media);

router.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: api_router,
    createContext,
  }),
);

// Terminal 404 for any /api/v1/* path that matched neither /media nor
// /trpc. Without this, an unmatched request falls through this router
// entirely and reaches the SPA-shell historyApiFallback mounted after it in
// router.ts, which rewrites it to index.html and returns 200 HTML instead
// of a 404 -- silently breaking any API caller that checks the status code
// or expects JSON.
router.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

export default router;
