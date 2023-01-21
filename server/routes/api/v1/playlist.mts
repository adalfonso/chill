import express from "express";
import { PlaylistController } from "../../../controllers/PlaylistController.mjs";

/** /api/v1/playlists */
export const playlist = () => {
  const router = express.Router();

  router.get("/:id", PlaylistController.read);
  router.get("/:id/tracks", PlaylistController.tracks);
  router.post("/search", PlaylistController.search);
  router.patch("/:id", PlaylistController.update);

  return router;
};

/** /api/v1/playlists */
export const playlists = () => {
  const router = express.Router();

  router.get("/", PlaylistController.index);
  router.post("/", PlaylistController.create);

  return router;
};
