import express from "express";
import { MediaFileController } from "@server/controllers/MediaFileController";
import { isAdmin } from "@server/middleware";

/** /api/v1/media **/

const router = express.Router();

router.get("/:id/load", MediaFileController.load);
router.get("/cover/:filename", MediaFileController.cover);
router.get("/scan", isAdmin, MediaFileController.scan);
router.post("/search", MediaFileController.search);
router.post("/query", MediaFileController.query);

export default router;
