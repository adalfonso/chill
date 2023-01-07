import express from "express";
import { InviteController } from "../controllers/InviteController.mjs";
import { isAdmin } from "../middleware/isAdmin.mjs";
import { isAuthenticated } from "../middleware/isAuthenticated.mjs";

const router = express.Router();

router.get("/invite", [isAuthenticated, isAdmin], (_req, res) =>
  res.render("pages/invite"),
);

router.post("/invite", [isAuthenticated, isAdmin], InviteController.create);

export default router;
