import { Express } from "express";
import { MediaFileController } from "./controllers/MediaFileController";
import { PlaylistController } from "./controllers/PlaylistController";

export const registerRoutes = (app: Express) => {
  app.get("/media/:id/load", MediaFileController.load);
  app.get("/media/cover/:filename", MediaFileController.cover);
  app.get("/media/scan", MediaFileController.scan);
  app.post("/media/search", MediaFileController.search);
  app.post("/media/query", MediaFileController.query);
  app.get("/playlists", PlaylistController.index);
  app.get("/playlist/:id/tracks", PlaylistController.tracks);
  app.post("/playlists", PlaylistController.create);
  app.post("/playlist/search", PlaylistController.search);
  app.patch("/playlist/:id", PlaylistController.update);
};
