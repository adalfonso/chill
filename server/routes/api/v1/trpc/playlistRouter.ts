import {
  PlaylistController,
  schema,
} from "../../../../controllers/PlaylistController";
import { procedure, router } from "../../../../trpc";

export const playlist = (routes: typeof router) =>
  routes({
    create: procedure.input(schema.create).mutation(PlaylistController.create),
    get: procedure.input(schema.get).query(PlaylistController.get),
    index: procedure.input(schema.index).query(PlaylistController.index),
    search: procedure.input(schema.search).query(PlaylistController.search),
    tracks: procedure.input(schema.tracks).query(PlaylistController.tracks),
    update: procedure.input(schema.update).mutation(PlaylistController.update),
  });
