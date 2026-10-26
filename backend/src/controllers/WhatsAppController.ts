import { Request, Response } from "express";
import { emitToCompany } from "../libs/socket";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";

import CreateWhatsAppService from "../services/WhatsappService/CreateWhatsAppService";
import DeleteWhatsAppService from "../services/WhatsappService/DeleteWhatsAppService";
import ListWhatsAppsService, {
  cloudProvidersOf
} from "../services/WhatsappService/ListWhatsAppsService";
import { WatchCoexyChannel } from "../services/CoexyServices/CoexyChannelService";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import UpdateWhatsAppService from "../services/WhatsappService/UpdateWhatsAppService";
import { whatsappProvider } from "../providers/WhatsApp";
import { listTemplates } from "../providers/WhatsApp/Implementations/cloudapi";
import {
  CloudApiInput,
  publicCloudInfo,
  saveCloudCredentials
} from "../helpers/CloudApiCredentials";
import AppError from "../errors/AppError";
import Whatsapp from "../models/Whatsapp";

interface WhatsappData {
  name: string;
  queueIds: number[];
  greetingMessage?: string;
  farewellMessage?: string;
  status?: string;
  isDefault?: boolean;
  channel?: string;
  cloud?: CloudApiInput;
  flowId?: number | null;
}

// Connection as the list shows it, with how an official API connection
// reaches WhatsApp (meta or coexy).
const withProvider = async (whatsapp: Whatsapp) => {
  const providers = await cloudProvidersOf([whatsapp.id]);
  return { ...whatsapp.toJSON(), cloudProvider: providers[whatsapp.id] };
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const whatsapps = await ListWhatsAppsService(req.user.companyId);
  const providers = await cloudProvidersOf(whatsapps.map(item => item.id));

  return res.status(200).json(
    whatsapps.map(item => ({
      ...item.toJSON(),
      cloudProvider: providers[item.id]
    }))
  );
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const {
    name,
    status,
    isDefault,
    greetingMessage,
    farewellMessage,
    queueIds,
    channel,
    cloud,
    flowId
  }: WhatsappData = req.body;
  const { companyId } = req.user;

  const { whatsapp, oldDefaultWhatsapp } = await CreateWhatsAppService({
    companyId,
    name,
    status,
    isDefault,
    greetingMessage,
    farewellMessage,
    queueIds,
    channel,
    cloud,
    flowId
  });

  StartWhatsAppSession(whatsapp);

  const created = await withProvider(whatsapp);
  emitToCompany(companyId, "whatsapp", {
    action: "update",
    whatsapp: created
  });

  if (oldDefaultWhatsapp) {
    emitToCompany(companyId, "whatsapp", {
      action: "update",
      whatsapp: oldDefaultWhatsapp
    });
  }

  return res.status(200).json(created);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;

  const whatsapp = await ShowWhatsAppService(whatsappId, req.user.companyId);
  // Webhook details are for the admin who sets up the Meta app.
  const cloud =
    whatsapp.channel === "cloudapi" && req.user.profile === "admin"
      ? await publicCloudInfo(whatsapp.id)
      : undefined;

  return res.status(200).json({ ...whatsapp.toJSON(), cloud });
};

// Approved templates of a Cloud API connection.
export const templates = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const whatsapp = await ShowWhatsAppService(
    req.params.whatsappId,
    req.user.companyId
  );
  if (whatsapp.channel !== "cloudapi") {
    throw new AppError("ERR_CLOUD_TEMPLATES_ONLY");
  }

  return res.status(200).json(await listTemplates(whatsapp.id));
};

// Coexy connection: reads the channel now (after the admin opened the
// connect link) and keeps checking it often for a while.
export const syncCoexy = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const whatsapp = await ShowWhatsAppService(
    req.params.whatsappId,
    req.user.companyId
  );
  if (!(await WatchCoexyChannel(whatsapp.id))) {
    throw new AppError("ERR_COEXY_NOT_COEXY");
  }
  return res.status(200).json({
    status: (await whatsapp.reload()).status,
    cloud: await publicCloudInfo(whatsapp.id)
  });
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const whatsappData = req.body;
  const { companyId } = req.user;

  const { whatsapp, oldDefaultWhatsapp } = await UpdateWhatsAppService({
    whatsappData,
    whatsappId,
    companyId
  });

  // New Cloud API credentials take effect after a new connection check.
  if (whatsapp.channel === "cloudapi" && whatsappData.cloud) {
    await saveCloudCredentials(whatsapp.id, whatsappData.cloud);
    StartWhatsAppSession(whatsapp);
  }

  const updated = await withProvider(whatsapp);
  emitToCompany(companyId, "whatsapp", {
    action: "update",
    whatsapp: updated
  });

  if (oldDefaultWhatsapp) {
    emitToCompany(companyId, "whatsapp", {
      action: "update",
      whatsapp: oldDefaultWhatsapp
    });
  }

  return res.status(200).json(updated);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;

  const { companyId } = req.user;
  await DeleteWhatsAppService(whatsappId, companyId);
  whatsappProvider.removeSession(+whatsappId);

  emitToCompany(companyId, "whatsapp", {
    action: "delete",
    whatsappId: +whatsappId
  });

  return res.status(200).json({ message: "Whatsapp deleted." });
};
