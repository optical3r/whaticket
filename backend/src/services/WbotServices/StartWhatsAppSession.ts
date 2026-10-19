import Whatsapp from "../../models/Whatsapp";
import { whatsappProvider } from "../../providers/WhatsApp";
import EmitWhatsappSession from "../../helpers/EmitWhatsappSession";
import { logger } from "../../utils/logger";

export const StartWhatsAppSession = async (
  whatsapp: Whatsapp
): Promise<void> => {
  await whatsapp.update({ status: "OPENING" });

  EmitWhatsappSession(whatsapp);

  try {
    await whatsappProvider.init(whatsapp);
  } catch (err) {
    logger.error(err);
  }
};
