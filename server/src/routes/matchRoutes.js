import express from "express";
import { getUserMatches } from "../controllers/matchController.js";

const router = express.Router();

router.get("/:userId", getUserMatches);

export default router;
