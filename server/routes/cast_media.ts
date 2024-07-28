import express from "express";

import { hasValidAudioToken } from "@server/middleware/hasValidAudioToken";
import { TrackController } from "@server/controllers/TrackController";

const router = express.Router();

/** /cast/media */
/**
 * These are routes the chromecast device will used to access the media and
 * images. Since these routes are not secured by user authentication we need
 * to manually verify the access token
 */
router.get("/:id", hasValidAudioToken("track"), TrackController.load);
router.get(
  "/cover/:filename",
  hasValidAudioToken("album_art"),
  TrackController.cover,
);

export default router;
