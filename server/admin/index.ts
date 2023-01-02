import express from "express";
import { InviteController } from "@server/controllers/InviteController";
import { isAdmin, isAuthenticated } from "@server/middleware";

const router = express.Router();

router.get("/invite", [isAuthenticated, isAdmin], (_req, res) =>
  res.render("pages/invite"),
);

router.post("/invite", [isAuthenticated, isAdmin], InviteController.create);

export default router;
