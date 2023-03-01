import express from "express";
import { MediaFileController } from "@server/controllers/MediaFileController";
import { hasValidAudioToken } from "@server/middleware/hasValidAudioToken";

const router = express.Router();

/** /cast/media */
/**
 * These are routes the chromecast device will used to access the media and
 * images. Since these routes are not secured by user authentication we need
 * to manually verify the access token
 */
router.get("/:id", hasValidAudioToken, MediaFileController.load);
router.get("/cover/:filename", hasValidAudioToken, MediaFileController.cover);

export default router;
