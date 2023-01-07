import express from "express";
import media from "./media/index.mjs";
import { playlist, playlists } from "./playlist/index.mjs";

const router = express.Router();

/** /api/v1/* */
router.use("/media", media);
router.use("/playlist", playlist());
router.use("/playlists", playlists());

export default router;
