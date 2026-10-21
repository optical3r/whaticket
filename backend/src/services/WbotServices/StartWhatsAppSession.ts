import Whatsapp from "../../models/Whatsapp";
import { whatsappProvider } from "../../providers/WhatsApp";
import EmitWhatsappSession from "../../helpers/EmitWhatsappSession";
import { logger } from "../../utils/logger";
import { isQrcodeAllowed } from "../../helpers/PlanFeatures";

export const StartWhatsAppSession = async (
  whatsapp: Whatsapp
): Promise<void> => {
  // A plan without QR code never opens a browser for an unofficial session.
  if (
    (whatsapp.channel || "qrcode") === "qrcode" &&
    !(await isQrcodeAllowed(whatsapp.companyId))
  ) {
    await whatsapp.update({ status: "DISCONNECTED", qrcode: "" });
    EmitWhatsappSession(whatsapp);
    return;
  }

  await whatsapp.update({ status: "OPENING" });

  EmitWhatsappSession(whatsapp);

  try {
    await whatsappProvider.init(whatsapp);
  } catch (err) {
    logger.error(err);
  }
};
