import express, { Express } from "express";
import { PlaylistController } from "@server/controllers/PlaylistController";

/** /api/v1/playlists */
export const playlist = (app: Express) => {
  const router = express.Router();

  router.get("/:id", PlaylistController.read);
  router.get("/:id/tracks", PlaylistController.tracks);
  router.post("/search", PlaylistController.search);
  router.patch("/:id", PlaylistController.update);

  return router;
};

/** /api/v1/playlists */
export const playlists = (app: Express) => {
  const router = express.Router();

  router.get("/", PlaylistController.index);
  router.post("/", PlaylistController.create);

  return router;
};
