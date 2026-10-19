import { Router } from "express";
import isAuth from "../middleware/isAuth";
import isSuper from "../middleware/isSuper";

import * as CompanyController from "../controllers/CompanyController";
import * as PlanController from "../controllers/PlanController";

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

export default companyRoutes;
