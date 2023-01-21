import admin from "./v1/admin.mjs";
import express from "express";
import media from "./v1/media.mjs";
import user from "./v1/user.mjs";
import { isAdmin } from "../../middleware/isAdmin.mjs";
import { playlist, playlists } from "./v1/playlist.mjs";

const router = express.Router();

/** /api/v1/* */
router.use("/admin", isAdmin, admin);
router.use("/media", media);
router.use("/playlist", playlist());
router.use("/playlists", playlists());
router.use("/user", user);

export default router;
