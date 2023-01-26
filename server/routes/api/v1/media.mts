import express from "express";
import { MediaFileController } from "../../../controllers/MediaFileController.mjs";

/** /media **/
const router = express.Router();

router.get("/:id/load", MediaFileController.load);
router.get("/cover/:filename", MediaFileController.cover);

export default router;
