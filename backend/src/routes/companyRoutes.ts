import { Router } from "express";
import isAuth from "../middleware/isAuth";
import isSuper from "../middleware/isSuper";

import * as CompanyController from "../controllers/CompanyController";
import * as PlanController from "../controllers/PlanController";
import * as TranscriptionController from "../controllers/TranscriptionController";
import * as CoexyController from "../controllers/CoexyController";

const companyRoutes = Router();

// Current company (any logged-in user)
companyRoutes.get("/company", isAuth, CompanyController.current);
companyRoutes.put("/company", isAuth, CompanyController.updateCurrent);
companyRoutes.post("/company/terms", isAuth, CompanyController.acceptTerms);

// Platform administration (Cerqueira Labs staff only)
companyRoutes.get("/companies", isAuth, isSuper, CompanyController.index);
companyRoutes.post("/companies", isAuth, isSuper, CompanyController.store);
companyRoutes.put(
  "/companies/:companyId",
  isAuth,
  isSuper,
  CompanyController.update
);

companyRoutes.get("/plans", isAuth, isSuper, PlanController.index);
companyRoutes.post("/plans", isAuth, isSuper, PlanController.store);
companyRoutes.put("/plans/:planId", isAuth, isSuper, PlanController.update);
companyRoutes.delete("/plans/:planId", isAuth, isSuper, PlanController.remove);

companyRoutes.get(
  "/platform/transcription",
  isAuth,
  isSuper,
  TranscriptionController.show
);
companyRoutes.put(
  "/platform/transcription/key",
  isAuth,
  isSuper,
  TranscriptionController.saveKey
);
companyRoutes.delete(
  "/platform/transcription/key",
  isAuth,
  isSuper,
  TranscriptionController.removeKey
);

companyRoutes.get("/platform/coexy", isAuth, isSuper, CoexyController.show);
companyRoutes.put(
  "/platform/coexy/key",
  isAuth,
  isSuper,
  CoexyController.saveKey
);
companyRoutes.delete(
  "/platform/coexy/key",
  isAuth,
  isSuper,
  CoexyController.removeKey
);
companyRoutes.post(
  "/platform/coexy/webhook",
  isAuth,
  isSuper,
  CoexyController.setupWebhook
);

export default companyRoutes;
