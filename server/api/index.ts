import express, { Express } from "express";
import media from "./media";
import { playlist, playlists } from "./playlist";

export default (app: Express) => {
  const router = express.Router();

  router.use("/media", media);
  router.use("/playlist", playlist());
  router.use("/playlists", playlists());

  return router;
};
