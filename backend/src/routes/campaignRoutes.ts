import { Router } from "express";

import isAuth from "../middleware/isAuth";
import { isManager } from "../middleware/hasProfile";
import * as CampaignController from "../controllers/CampaignController";

// Campaigns are run by admins and supervisors, and only on plans that
// include them (checked in the services).
const campaignRoutes = Router();

campaignRoutes.get("/campaigns", isAuth, isManager, CampaignController.index);
campaignRoutes.get(
  "/campaigns/audience",
  isAuth,
  isManager,
  CampaignController.audience
);
campaignRoutes.post("/campaigns", isAuth, isManager, CampaignController.store);
campaignRoutes.put(
  "/campaigns/:campaignId",
  isAuth,
  isManager,
  CampaignController.update
);
campaignRoutes.delete(
  "/campaigns/:campaignId",
  isAuth,
  isManager,
  CampaignController.remove
);
campaignRoutes.post(
  "/campaigns/:campaignId/:action(start|pause|resume|cancel)",
  isAuth,
  isManager,
  CampaignController.action
);
campaignRoutes.get(
  "/campaigns/:campaignId/contacts",
  isAuth,
  isManager,
  CampaignController.report
);

export default campaignRoutes;
