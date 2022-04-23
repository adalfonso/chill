import { Express } from "express";
import { MediaFileController } from "./controllers/MediaFileController";

export const registerRoutes = (app: Express) => {
  app.get("/media/scan", MediaFileController.scan);
  app.post("/media/query", MediaFileController.query);
};
