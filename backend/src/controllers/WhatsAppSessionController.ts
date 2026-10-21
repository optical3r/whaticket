import { Request, Response } from "express";
import { whatsappProvider } from "../providers/WhatsApp";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";
import UpdateWhatsAppService from "../services/WhatsappService/UpdateWhatsAppService";
import AppError from "../errors/AppError";
import { isQrcodeAllowed } from "../helpers/PlanFeatures";
import Whatsapp from "../models/Whatsapp";

// Says why a QR code session will not start, instead of failing silently.
const assertSessionAllowed = async (whatsapp: Whatsapp): Promise<void> => {
  if (
    (whatsapp.channel || "qrcode") === "qrcode" &&
    !(await isQrcodeAllowed(whatsapp.companyId))
  ) {
    throw new AppError("ERR_QRCODE_NOT_IN_PLAN", 403);
  }
};

const store = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const whatsapp = await ShowWhatsAppService(whatsappId, req.user.companyId);
  await assertSessionAllowed(whatsapp);

  StartWhatsAppSession(whatsapp);

  return res.status(200).json({ message: "Starting session." });
};

const update = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  await assertSessionAllowed(
    await ShowWhatsAppService(whatsappId, req.user.companyId)
  );

  const { whatsapp } = await UpdateWhatsAppService({
    whatsappId,
    whatsappData: { session: "" },
    companyId: req.user.companyId
  });

  StartWhatsAppSession(whatsapp);

  return res.status(200).json({ message: "Starting session." });
};

const remove = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const whatsapp = await ShowWhatsAppService(whatsappId, req.user.companyId);

  await whatsappProvider.logout(whatsapp.id);

  return res.status(200).json({ message: "Session disconnected." });
};

export default { store, remove, update };
