import { procedure, router } from "@server/trpc";

import {
  CompilationController,
  schema,
} from "@server/controllers/CompilationController";

export const CompilationRouter = (routes: typeof router) =>
  routes({
    getTiles: procedure
      .input(schema.getCompilationTiles)
      .query(CompilationController.getCompilationTiles),
  });
