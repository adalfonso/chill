import { procedure, router } from "@server/trpc";

import { AlbumController, schema } from "@server/controllers/AlbumController";

export const AlbumRouter = (routes: typeof router) =>
  routes({
    get: procedure.input(schema.get).query(AlbumController.get),
    getTiles: procedure
      .input(schema.getAlbumTiles)
      .query(AlbumController.getAlbumTiles),
    getAlbumTilesByGenre: procedure
      .input(schema.getAlbumTilesByGenre)
      .query(AlbumController.getAlbumTilesByGenre),
  });
