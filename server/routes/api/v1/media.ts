import express from "express";
import { TrackController } from "@server/controllers/TrackController";

/** /media **/
const router = express.Router();

router.get("/:id/load", TrackController.load);
router.get("/cover/:filename", TrackController.cover);

export default router;
