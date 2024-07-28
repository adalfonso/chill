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

export default router;
