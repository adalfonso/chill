import express from "express";
import { InviteController } from "../../../controllers/InviteController.mjs";

const router = express.Router();

router.post("/invite", InviteController.create);

export default router;
