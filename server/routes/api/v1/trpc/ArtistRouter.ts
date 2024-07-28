import { ArtistController, schema } from "@server/controllers/ArtistController";
import { procedure, router } from "@server/trpc";

export const ArtistRouter = (routes: typeof router) =>
  routes({
    get: procedure.input(schema.get).query(ArtistController.get),
    getTiles: procedure
      .input(schema.getArtistTiles)
      .query(ArtistController.getArtistTiles),
    getArtistTilesByGenre: procedure
      .input(schema.getArtistTilesByGenre)
      .query(ArtistController.getArtistTilesByGenre),
  });
