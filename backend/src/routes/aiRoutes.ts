import { Router } from "express";
import rateLimit from "express-rate-limit";

import isAuth from "../middleware/isAuth";
import isAdmin from "../middleware/isAdmin";
import * as AiController from "../controllers/AiController";

const aiRoutes = Router();

// The plan's monthly limit controls cost; this keeps one user from using it
// up in a burst.
const aiRequestLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: req => `ai-${req.user?.id || req.ip}`,
  message: { error: "ERR_AI_TOO_MANY_REQUESTS" }
});

aiRoutes.get("/ai/settings", isAuth, AiController.showSettings);
aiRoutes.put("/ai/settings", isAuth, isAdmin, AiController.updateSettings);

aiRoutes.get("/ai/knowledge", isAuth, isAdmin, AiController.listKnowledge);
aiRoutes.post("/ai/knowledge", isAuth, isAdmin, AiController.storeKnowledge);
aiRoutes.put(
  "/ai/knowledge/:articleId",
  isAuth,
  isAdmin,
  AiController.updateKnowledge
);
aiRoutes.delete(
  "/ai/knowledge/:articleId",
  isAuth,
  isAdmin,
  AiController.removeKnowledge
);

aiRoutes.post(
  "/tickets/:ticketId/ai/suggestion",
  isAuth,
  aiRequestLimit,
  AiController.suggest
);
aiRoutes.post(
  "/tickets/:ticketId/ai/summary",
  isAuth,
  aiRequestLimit,
  AiController.summarize
);
aiRoutes.post("/ai/rewrite", isAuth, aiRequestLimit, AiController.rewrite);

export default aiRoutes;
