import { Express } from "express";

import { AlbumController } from "./controllers/AlbumController";
import { MediaFileController } from "./controllers/MediaFileController";

export const registerRoutes = (app: Express) => {
  app.get("/api/albums", AlbumController.index);
  app.get("/media/scan", MediaFileController.scan);
  app.get("/media", MediaFileController.get);
};
