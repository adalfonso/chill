import { procedure, router } from "@server/trpc";

import { SplitController, schema } from "@server/controllers/SplitController";

export const SplitRouter = (routes: typeof router) =>
  routes({
    getTiles: procedure
      .input(schema.getSplitTiles)
      .query(SplitController.getSplitTiles),
  });
