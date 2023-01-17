import express from "express";
import { UserController } from "../../controllers/UserController.mjs";

/** /api/v1/media **/
const router = express.Router();

router.get("/", UserController.get);
router.patch("/settings", UserController.updateSettings);

export default router;
