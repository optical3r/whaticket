import { Router } from "express";
import isAuth from "../middleware/isAuth";
import { isManager } from "../middleware/hasProfile";

import * as TagController from "../controllers/TagController";
import * as CloseReasonController from "../controllers/CloseReasonController";
import * as ReportController from "../controllers/ReportController";
import * as WebhookController from "../controllers/WebhookController";
import isAdmin from "../middleware/isAdmin";

const catalogRoutes = Router();

catalogRoutes.get("/tags", isAuth, TagController.index);
catalogRoutes.post("/tags", isAuth, isManager, TagController.store);
catalogRoutes.put("/tags/:tagId", isAuth, isManager, TagController.update);
catalogRoutes.delete("/tags/:tagId", isAuth, isManager, TagController.remove);

// Any team member can tag the conversations and contacts they work on.
catalogRoutes.put(
  "/tickets/:ticketId/tags",
  isAuth,
  TagController.setTicketTags
);
catalogRoutes.put(
  "/contacts/:contactId/tags",
  isAuth,
  TagController.setContactTags
);

catalogRoutes.get("/closeReasons", isAuth, CloseReasonController.index);
catalogRoutes.post(
  "/closeReasons",
  isAuth,
  isManager,
  CloseReasonController.store
);
catalogRoutes.put(
  "/closeReasons/:reasonId",
  isAuth,
  isManager,
  CloseReasonController.update
);
catalogRoutes.delete(
  "/closeReasons/:reasonId",
  isAuth,
  isManager,
  CloseReasonController.remove
);

catalogRoutes.get("/reports", isAuth, isManager, ReportController.summary);
catalogRoutes.get(
  "/reports/tickets.csv",
  isAuth,
  isManager,
  ReportController.exportCsv
);

catalogRoutes.get("/webhooks", isAuth, isAdmin, WebhookController.index);
catalogRoutes.post("/webhooks", isAuth, isAdmin, WebhookController.store);
catalogRoutes.put(
  "/webhooks/:webhookId",
  isAuth,
  isAdmin,
  WebhookController.update
);
catalogRoutes.delete(
  "/webhooks/:webhookId",
  isAuth,
  isAdmin,
  WebhookController.remove
);
catalogRoutes.post(
  "/webhooks/:webhookId/test",
  isAuth,
  isAdmin,
  WebhookController.test
);

export default catalogRoutes;
