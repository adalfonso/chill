import { Express } from "express";
import { MediaFileController } from "./controllers/MediaFileController";
import { PlaylistController } from "./controllers/PlaylistController";

export const registerRoutes = (app: Express) => {
  app.get("/media/:id/load", MediaFileController.load);
  app.get("/media/cover/:filename", MediaFileController.cover);
  app.get("/media/scan", MediaFileController.scan);
  app.post("/media/search", MediaFileController.search);
  app.post("/media/query", MediaFileController.query);
  app.post("/playlists", PlaylistController.create);
};
