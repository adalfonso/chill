import { TrackController, schema } from "@server/controllers/TrackController";
import { procedure, router } from "@server/trpc";

export const TrackRouter = (routes: typeof router) =>
  routes({
    castInfo: procedure.input(schema.cast_info).query(TrackController.castInfo),
    getByAlbumAndOrArtist: procedure
      .input(schema.getByAlbumAndOrArtist)
      .query(TrackController.getByAlbumAndOrArtist),
    getByGenre: procedure
      .input(schema.getByGenre)
      .query(TrackController.getByGenre),
    getRandomTracks: procedure
      .input(schema.getRandomTracks)
      .query(TrackController.getRandomTracks),
  });
