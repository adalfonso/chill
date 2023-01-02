import express, { Express } from "express";
import { MediaFileController } from "@server/controllers/MediaFileController";

/** /api/v1/media **/

const router = express.Router();

router.get("/:id/load", MediaFileController.load);
router.get("/cover/:filename", MediaFileController.cover);
router.get("/scan", MediaFileController.scan);
router.post("/search", MediaFileController.search);
router.post("/query", MediaFileController.query);

export default router;
