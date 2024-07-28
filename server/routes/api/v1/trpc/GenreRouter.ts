import { GenreController, schema } from "@server/controllers/GenreController";
import { procedure, router } from "@server/trpc";

export const GenreRouter = (routes: typeof router) =>
  routes({
    get: procedure.input(schema.get).query(GenreController.get),
    getTiles: procedure
      .input(schema.getGenreTiles)
      .query(GenreController.getGenreTiles),
  });
