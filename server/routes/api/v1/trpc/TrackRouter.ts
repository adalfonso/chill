import { TrackController, schema } from "@server/controllers/TrackController";
import { procedure, router } from "@server/trpc";

export const TrackRouter = (routes: typeof router) =>
  routes({
    castInfo: procedure.input(schema.cast_info).query(TrackController.castInfo),
    get: procedure.input(schema.get).query(TrackController.get),
    getIds: procedure.input(schema.get).query(TrackController.getIds),
    getRandomTracks: procedure
      .input(schema.getRandomTracks)
      .query(TrackController.getRandomTracks),
  });
