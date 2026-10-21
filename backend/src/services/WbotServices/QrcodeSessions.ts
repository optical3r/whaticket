import { Op } from "sequelize";

import EmitWhatsappSession from "../../helpers/EmitWhatsappSession";
import Company from "../../models/Company";
import Whatsapp from "../../models/Whatsapp";
import { whatsappProvider } from "../../providers/WhatsApp";
import { logger } from "../../utils/logger";
import { StartWhatsAppSession } from "./StartWhatsAppSession";

// Applies a plan change to the QR code connections of these companies:
// stops them when the plan no longer includes QR code (the stored login is
// kept, so turning it back on needs no new QR code) and starts them again
// when it does.
export const SyncQrcodeSessions = async (
  companyIds: number[],
  allowed: boolean
): Promise<void> => {
  if (companyIds.length === 0) return;
  const whatsapps = await Whatsapp.findAll({
    where: { companyId: { [Op.in]: companyIds }, channel: "qrcode" },
    include: [
      {
        model: Company,
        as: "company",
        attributes: ["id"],
        where: { status: "active" }
      }
    ]
  });

  await Promise.all(
    whatsapps.map(async whatsapp => {
      try {
        if (allowed) {
          StartWhatsAppSession(whatsapp);
          return;
        }
        whatsappProvider.removeSession(whatsapp.id);
        await whatsapp.update({ status: "DISCONNECTED", qrcode: "" });
        EmitWhatsappSession(whatsapp);
      } catch (err) {
        logger.error({
          info: "Error applying the plan to a QR code session",
          err,
          whatsappId: whatsapp.id
        });
      }
    })
  );
};
