import { Router } from "express";

import userRoutes from "./userRoutes";
import authRoutes from "./authRoutes";
import settingRoutes from "./settingRoutes";
import contactRoutes from "./contactRoutes";
import ticketRoutes from "./ticketRoutes";
import whatsappRoutes from "./whatsappRoutes";
import messageRoutes from "./messageRoutes";
import whatsappSessionRoutes from "./whatsappSessionRoutes";
import queueRoutes from "./queueRoutes";
import quickAnswerRoutes from "./quickAnswerRoutes";
import apiRoutes from "./apiRoutes";
import companyRoutes from "./companyRoutes";
import catalogRoutes from "./catalogRoutes";
import healthRoutes from "./healthRoutes";
import aiRoutes from "./aiRoutes";
import campaignRoutes from "./campaignRoutes";
import cloudWebhookRoutes from "./cloudWebhookRoutes";

const routes = Router();

routes.use(healthRoutes);
routes.use(cloudWebhookRoutes);
routes.use(userRoutes);
routes.use("/auth", authRoutes);
routes.use(settingRoutes);
routes.use(contactRoutes);
routes.use(ticketRoutes);
routes.use(whatsappRoutes);
routes.use(messageRoutes);
routes.use(whatsappSessionRoutes);
routes.use(queueRoutes);
routes.use(quickAnswerRoutes);
routes.use(companyRoutes);
routes.use(catalogRoutes);
routes.use(aiRoutes);
routes.use(campaignRoutes);
routes.use("/api/messages", apiRoutes);

export default routes;
