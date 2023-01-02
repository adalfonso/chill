import express from "express";
import media from "./media";
import { playlist, playlists } from "./playlist";

const router = express.Router();

/** /api/v1/* */
router.use("/media", media);
router.use("/playlist", playlist());
router.use("/playlists", playlists());

export default router;
