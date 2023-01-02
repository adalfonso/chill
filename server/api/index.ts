import express, { Express } from "express";
import { media } from "./media";
import { playlist, playlists } from "./playlist";

export default (app: Express) => {
  const router = express.Router();

  router.use("/media", media(app));
  router.use("/playlist", playlist(app));
  router.use("/playlists", playlists(app));

  return router;
};
