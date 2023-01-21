import express from "express";
import { MediaFileController } from "../../../controllers/MediaFileController.mjs";
import { isAdmin } from "../../../middleware/isAdmin.mjs";

/** /api/v1/media **/

const router = express.Router();

router.get("/:id/load", MediaFileController.load);
router.get("/cover/:filename", MediaFileController.cover);
router.get("/scan", isAdmin, MediaFileController.scan);
router.post("/search", MediaFileController.search);
router.post("/query", MediaFileController.query);

export default router;
